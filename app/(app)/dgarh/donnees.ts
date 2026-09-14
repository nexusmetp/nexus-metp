"use client";

/**
 * Séries du tableau de bord.
 *
 * Sorties du composant : la page dit ce qu'elle montre, ce fichier dit
 * comment on l'obtient. Chaque série est projetée depuis les actes, jamais
 * lue telle quelle — c'est ce qui garantit qu'un chiffre affiché ici et un
 * dossier ouvert ailleurs racontent la même chose.
 *
 * **Toutes les séries sont bornées au périmètre du lecteur**, et elles ne
 * l'étaient pas. Le tableau de bord est ouvert en lecture au directeur
 * central, au chef de service et au chef de bureau ; il leur servait les
 * chiffres du ministère entier — effectif, pyramide des âges, positions
 * administratives, dossiers en circulation. Mesuré : un directeur de la DAFM,
 * dont le périmètre compte dix entités, lisait « effectif du ministère
 * 3 830 » et la répartition nominative de tout le monde.
 *
 * La borne est celle du modèle, `perimetreVisible` — pas une règle écrite ici.
 * Six comptes sur trois mille huit cents la franchissent : le ministre, le
 * directeur de cabinet, le secrétaire général, l'inspecteur général, le
 * directeur général de la DGARH et l'administrateur système. Pour eux, rien ne
 * change ; pour les autres, la page parle enfin de leur maison.
 */

import { useMemo } from "react";
import {
  CABINET_ID, DGARH_ID, ENTITES, METP_ID, POSITION_LABELS, REGLES_CATEGORIE, STATUTS_EN_COURS,
  cheminDe, descendantsDe, enfantsDe, entiteById, perimetreVisible, typeActeById, visible,
} from "@/lib/referentiels";
import { joursDepuis } from "@/lib/format";
import { useAuth } from "@/lib/store";
import { useActes, useAgentsProjetes, useTickets, useUtilisateurs } from "@/lib/queries";
import type { Acte, AgentProjete } from "@/lib/types";

export function useTableauDeBord() {
  const user = useAuth((s) => s.user);
  const { data: tousAgents, pret } = useAgentsProjetes();
  const { data: tousActes = [] } = useActes();
  const { data: tousTickets = [] } = useTickets();
  const { data: comptes = [] } = useUtilisateurs();

  /* `null` = le ministère entier ; sinon l'ensemble des entités de ma branche. */
  const perimetre = useMemo(() => (user ? perimetreVisible(user) : new Set<string>()), [user]);
  /* La racine de ce que je regarde. Le ministère pour qui porte la vue
     ministérielle, ma propre entité pour les autres : c'est elle qui décide de
     ce que « la structure » désigne plus bas. */
  const racine = perimetre === null ? METP_ID : (user?.entiteId ?? METP_ID);
  const ministeriel = perimetre === null;

  const agents = useMemo(
    () => tousAgents.filter((a) => visible(perimetre, a.entiteId)),
    [tousAgents, perimetre]);
  /* Un acte se rattache à l'entité qui l'instruit : c'est elle qui dit s'il
     appartient à mon périmètre, et non l'agent qu'il concerne — lequel peut
     avoir changé d'affectation depuis. */
  const actes = useMemo(
    () => tousActes.filter((a) => visible(perimetre, a.entiteInstructriceId)),
    [tousActes, perimetre]);
  const tickets = useMemo(
    () => tousTickets.filter((t) => visible(perimetre, t.entiteId)),
    [tousTickets, perimetre]);

const effectif = useMemo(() => {
    const direct = new Map<string, number>();
    agents.forEach((a) => a.entiteId && direct.set(a.entiteId, (direct.get(a.entiteId) ?? 0) + 1));
    const total = (id: string) => descendantsDe(id).reduce((s, e) => s + (direct.get(e.id) ?? 0), 0);
    return { direct, total };
  }, [agents]);

  const stats = useMemo(() => {
    const ouverts = actes.filter((a) => STATUTS_EN_COURS.includes(a.statut));
    const clos = actes.filter((a) => a.dateSignature);
    return {
      ministere: agents.length,
      /* Hors vue ministérielle, ces deux chiffres ne veulent rien dire : on
         donne alors l'effectif propre de la structure et celui de sa tête. */
      dgarh: ministeriel ? effectif.total(DGARH_ID) : effectif.direct.get(racine) ?? 0,
      cabinet: ministeriel ? effectif.total(CABINET_ID) : descendantsDe(racine).length,
      enseignants: agents.filter((a) => a.enseignant).length,
      ouverts: ouverts.length,
      horsDelai: ouverts.filter((a) => joursDepuis(a.dateCreation) > 15).length,
      delaiMoyen: clos.length
        ? Math.round(clos.reduce((s, a) =>
            s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5, 0) / clos.length)
        : 0,
      reclamations: tickets.filter((t) => !["RESOLU", "CLOS"].includes(t.statut)).length,
      completude: agents.length
        ? Math.round(agents.reduce((s, a) => s + a.tauxCompletude, 0) / agents.length)
        : 0,
      incomplets: agents.filter((a) => a.tauxCompletude < 60).length,
    };
  }, [agents, actes, tickets, effectif, ministeriel, racine]);

  /* La structure du ministère : ce qui pend directement au ministère.
     La branche est dépliée **une fois** par grande structure, puis interrogée
     par un ensemble. L'écrire dans le filtre la redépliait à chaque acte : six
     mille actes multipliés par six cents entités, cinq fois — le tableau de
     bord figeait l'onglet plusieurs minutes sans rien afficher. */
  const structure = useMemo(() => {
    const ouvertsParEntite = new Map<string, number>();
    actes.forEach((a) => {
      if (!a.entiteInstructriceId || !STATUTS_EN_COURS.includes(a.statut)) return;
      ouvertsParEntite.set(a.entiteInstructriceId, (ouvertsParEntite.get(a.entiteInstructriceId) ?? 0) + 1);
    });
    const responsableDe = new Map<string, string>();
    comptes.forEach((c) => {
      if (c.entiteId && !responsableDe.has(c.entiteId)) responsableDe.set(c.entiteId, c.nomComplet);
    });
    return enfantsDe(racine)
      .map((e) => {
        const branche = descendantsDe(e.id);
        return {
          entite: e,
          effectif: effectif.total(e.id),
          entites: branche.length,
          responsable: responsableDe.get(e.id),
          ouverts: branche.reduce((s, x) => s + (ouvertsParEntite.get(x.id) ?? 0), 0),
        };
      })
      .sort((a, b) => b.effectif - a.effectif);
  }, [effectif, comptes, actes, racine]);

  /* Effectifs par direction — le chiffre que le directeur général réclame.
     Hors vue ministérielle, on descend d'un cran : les trois entités sous la
     mienne valent mieux que les six directions générales du ministère, dont
     cinq me sont fermées. */
  const parDirection = useMemo(() => ENTITES
    .filter((e) => visible(perimetre, e.id) && e.id !== racine)
    .filter((e) => ministeriel
      ? ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "INSPECTION_GENERALE", "SECRETARIAT"].includes(e.niveau)
        && cheminDe(e.id).length <= 3
      : cheminDe(e.id).length <= cheminDe(racine).length + 1)
    .filter((e) => e.actif !== false)
    .map((e) => ({ id: e.id, nom: e.sigle, intitule: e.nom, effectif: effectif.total(e.id) }))
    .filter((d) => d.effectif > 0)
    .sort((a, b) => b.effectif - a.effectif)
    .slice(0, 10), [effectif, perimetre, racine, ministeriel]);

  const parDepartement = useMemo(() => ENTITES
    .filter((e) => e.niveau === "DIRECTION_DEPARTEMENTALE" && e.actif !== false)
    .filter((e) => visible(perimetre, e.id))
    .map((e) => ({ id: e.id, nom: e.ville ?? e.sigle, effectif: effectif.total(e.id) }))
    .filter((d) => d.effectif > 0)
    .sort((a, b) => b.effectif - a.effectif), [effectif, perimetre]);

  const parCategorie = useMemo(() => {
    const m = new Map<string, number>();
    agents.forEach((a) => m.set(a.categorie, (m.get(a.categorie) ?? 0) + 1));
    return [...m.entries()]
      .map(([k, v]) => ({ nom: REGLES_CATEGORIE[k as keyof typeof REGLES_CATEGORIE]?.libelle ?? k, valeur: v, cle: k }))
      .sort((a, b) => b.valeur - a.valeur);
  }, [agents]);

  const parPosition = useMemo(() => {
    const m = new Map<string, number>();
    agents.forEach((a) => m.set(a.nature, (m.get(a.nature) ?? 0) + 1));
    return [...m.entries()]
      .map(([k, v]) => ({ cle: k, nom: POSITION_LABELS[k as keyof typeof POSITION_LABELS] ?? k, valeur: v }))
      .sort((a, b) => b.valeur - a.valeur);
  }, [agents]);

  /* Pyramide des âges — ce qui dit si le ministère prépare sa relève. */
  const pyramide = useMemo(() => {
    const tranches = [
      { nom: "moins de 30", min: 0, max: 29 },
      { nom: "30 à 39", min: 30, max: 39 },
      { nom: "40 à 49", min: 40, max: 49 },
      { nom: "50 à 54", min: 50, max: 54 },
      { nom: "55 à 59", min: 55, max: 59 },
      { nom: "60 et plus", min: 60, max: 200 },
    ];
    return tranches.map((t) => ({
      nom: t.nom,
      hommes: agents.filter((a) => a.sexe === "M" && a.age >= t.min && a.age <= t.max).length,
      femmes: agents.filter((a) => a.sexe === "F" && a.age >= t.min && a.age <= t.max).length,
    }));
  }, [agents]);

  const parTypeActe = useMemo(() => {
    const m = new Map<string, number>();
    actes.filter((a) => STATUTS_EN_COURS.includes(a.statut))
      .forEach((a) => m.set(a.type, (m.get(a.type) ?? 0) + 1));
    return [...m.entries()]
      .map(([k, v]) => ({ nom: typeActeById(k as any)?.libelle ?? k, valeur: v }))
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, 8);
  }, [actes]);

  /* Départs à la retraite prévisibles : 60 ans, borne usuelle de la fonction publique. */
  const departsProches = useMemo(() => agents.filter((a) => a.age >= 58 && a.age < 60).length, [agents]);

  return {
    pret, agents, actes, tickets, comptes,
    /* La page en a besoin pour dire de quoi elle parle : « le ministère » ou
       « ma structure » ne se devinent pas d'un chiffre. */
    perimetre, racine, ministeriel,
    effectif, stats, structure, parDirection, parDepartement,
    parCategorie, parPosition, pyramide, parTypeActe, departsProches,
  };
}
