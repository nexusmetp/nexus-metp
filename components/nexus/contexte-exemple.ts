"use client";

import { useMemo } from "react";
import { useActes, useAgentsProjetes, useConges } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { DGARH_ID, descendantsDe, entiteById } from "@/lib/referentiels";
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
 */
export function useContexteDocument(sujet: Sujet = {}): ContexteDocument {
  const user = useAuth((s) => s.user);
  const { data: agents = [] } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: conges = [] } = useConges();

  return useMemo<ContexteDocument>(() => {
    const agent = (sujet.agentId && agents.find((a) => a.id === sujet.agentId))
      || (sujet.agentIds?.length ? agents.find((a) => a.id === sujet.agentIds![0]) : undefined)
      || agents.find((a) => a.id === user?.agentId)
      || agents[0];
    /* La sélection dans l'ordre où elle a été faite, et sans les identifiants
       qui ne désignent plus personne : une note nommant un agent absent du
       fichier serait invérifiable. */
    const vises = sujet.agentIds?.length
      ? sujet.agentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as typeof agents
      : undefined;
    const acte = (sujet.acteId && actes.find((a) => a.id === sujet.acteId))
      || actes.find((a) => a.statut === "SIGNE" || a.statut === "NOTIFIE")
      || actes[0];
    /* Le timbre est celui de la structure qui écrit, et l'agent le porte
       seulement quand la pièce est faite *pour lui* — une attestation, une
       notification. Une note adressée à un lot n'appartient pas au service du
       premier de la liste : elle part de chez le rédacteur, et la qualité du
       signataire s'en déduit. */
    const entite = entiteById(
      sujet.entiteId
      ?? (vises ? user?.entiteId : agent?.entiteId ?? user?.entiteId)
      ?? DGARH_ID)
      ?? entiteById(DGARH_ID) ?? undefined;
    const conge = (agent && conges.find((c) => c.agentId === agent.id && c.statut === "ACCORDE"))
      || conges.find((c) => c.statut === "ACCORDE")
      || conges[0];
    const effectifs = entite
      ? descendantsDe(entite.id)
        .filter((e) => e.parentId === entite.id)
        .map((e) => {
          const branche = descendantsDe(e.id).map((d) => d.id);
          const direct = agents.filter((a) => a.entiteId === e.id).length;
          const total = agents.filter((a) => a.entiteId && branche.includes(a.entiteId)).length;
          return { entite: e, direct, total };
        })
      : [];
    return {
      agent, agents: vises, acte, entite, conge, effectifs,
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
