"use client";

import { useMemo } from "react";
import { useActes, useAgentsProjetes, useConges } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  DGARH_ID, descendantsDe, entiteById, perimetreVisible, visible,
} from "@/lib/referentiels";
import type { ContexteDocument } from "@/lib/documents";

/** Le dossier sur lequel la pièce se compose, quand il est désigné. */
export interface Sujet {
  agentId?: string | null;
  /** Une sélection d'agents, quand la pièce en vise plusieurs. */
  agentIds?: string[] | null;
  acteId?: string | null;
  entiteId?: string | null;
}

/**
 * Le dossier que reçoit un modèle.
 *
 * Sans sujet, on sert un exemple — le dossier de l'utilisateur s'il en a un,
 * sinon le premier venu : un modèle se juge sur ce qu'il produit, pas sur sa
 * description. Avec un sujet, on sert le dossier désigné, et c'est ce qui
 * permet de rédiger *pour* un agent plutôt qu'à côté de lui.
 *
 * **Le sujet vient de l'adresse, donc il se vérifie.** Le dossier d'un agent
 * est refusé à qui n'a pas le périmètre — `/dgarh/agents/[id]` le dit en
 * toutes lettres —, mais la même identité repassait ici par
 * `/redaction?agent=…` : la pièce composée nommait l'agent, son matricule, sa
 * fonction et sa structure. Une porte fermée d'un côté et ouverte de l'autre
 * n'est pas une porte. Tout ce qui est désigné par l'URL est donc borné au
 * périmètre du lecteur, et ce qui en sort est **compté**, pour que l'écran
 * puisse le dire plutôt que de retirer des noms en silence.
 */
export function useContexteDocument(sujet: Sujet = {}): ContexteDocument {
  const user = useAuth((s) => s.user);
  const { data: agents = [] } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: conges = [] } = useConges();

  return useMemo<ContexteDocument>(() => {
    /* Le périmètre du lecteur, une fois. `null` vaut « tout le ministère » —
       le ministre, la DGARH, l'inspection générale et le cabinet. */
    const perimetre = user ? perimetreVisible(user) : new Set<string>();
    const permis = (entiteId?: string | null) => visible(perimetre, entiteId);

    /* L'exemple lui-même se prend dans le périmètre. Ce n'était pas le cas :
       « à défaut de sujet, le premier venu » allait chercher le premier agent
       et le premier acte signé du ministère entier — c'est-à-dire, pour un
       chef de service, un dossier qu'il n'a pas le droit d'ouvrir, avec le nom
       et le matricule dedans. Une démonstration ne justifie pas de montrer le
       dossier de quelqu'un. */
    const agentsPermis = perimetre === null ? agents : agents.filter((a) => permis(a.entiteId));
    const actesPermis = perimetre === null
      ? actes : actes.filter((a) => permis(a.entiteInstructriceId));

    /* La sélection dans l'ordre où elle a été faite, sans les identifiants qui
       ne désignent plus personne — une note nommant un agent absent du fichier
       serait invérifiable — et sans ceux qui sortent du périmètre. */
    const demandes = sujet.agentIds?.length
      ? sujet.agentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as typeof agents
      : undefined;
    const vises = demandes?.filter((a) => permis(a.entiteId));
    /* Le sujet unique se prend dans la sélection **déjà bornée** : le premier
       de la liste demandée passerait sinon la borne à lui seul, et les modèles
       individuels le nommeraient. */
    const agent = (sujet.agentId && agents.find((a) => a.id === sujet.agentId && permis(a.entiteId)))
      || vises?.[0]
      || agentsPermis.find((a) => a.id === user?.agentId)
      || agentsPermis[0];
    const acte = (sujet.acteId
      && actesPermis.find((a) => a.id === sujet.acteId))
      || actesPermis.find((a) => a.statut === "SIGNE" || a.statut === "NOTIFIE")
      || actesPermis[0];
    /* Le timbre est celui de la structure qui écrit, et l'agent le porte
       seulement quand la pièce est faite *pour lui* — une attestation, une
       notification. Une note adressée à un lot n'appartient pas au service du
       premier de la liste : elle part de chez le rédacteur, et la qualité du
       signataire s'en déduit. */
    const entite = entiteById(
      (sujet.entiteId && permis(sujet.entiteId) ? sujet.entiteId : null)
      ?? (vises ? user?.entiteId : agent?.entiteId ?? user?.entiteId)
      ?? DGARH_ID)
      ?? entiteById(DGARH_ID) ?? undefined;
    /* Le congé suit l'agent, et l'agent est borné : passer par un congé
       quelconque ramènerait un nom hors périmètre par la bande. */
    const dansLePerimetre = new Set(agentsPermis.map((a) => a.id));
    const conge = (agent && conges.find((c) => c.agentId === agent.id && c.statut === "ACCORDE"))
      || conges.find((c) => c.statut === "ACCORDE" && dansLePerimetre.has(c.agentId))
      || conges.find((c) => dansLePerimetre.has(c.agentId));
    const effectifs = entite
      ? descendantsDe(entite.id)
        .filter((e) => e.parentId === entite.id)
        .map((e) => {
          const branche = descendantsDe(e.id).map((d) => d.id);
          const direct = agentsPermis.filter((a) => a.entiteId === e.id).length;
          const total = agentsPermis.filter((a) => a.entiteId && branche.includes(a.entiteId)).length;
          return { entite: e, direct, total };
        })
      : [];
    return {
      agent, agents: vises, acte, entite, conge, effectifs,
      /* Ce que le périmètre a retiré de la demande. Zéro le plus souvent ;
         l'écran ne le dit que lorsqu'il y a quelque chose à dire. */
      horsPerimetre: (demandes?.length ?? 0) - (vises?.length ?? 0),
      saisie: {
        objet: "Objet à préciser",
        corps: "Corps de la note à rédiger.",
        destinataire: "Tous services",
      },
      signataire: { nom: user?.nomComplet },
    };
  }, [agents, actes, conges, user, sujet.agentId, sujet.acteId, sujet.entiteId,
    sujet.agentIds?.join(",")]);
}

/** Le cas sans dossier désigné — la bibliothèque, l'éditeur ouvert à vide. */
export const useContexteExemple = () => useContexteDocument();
