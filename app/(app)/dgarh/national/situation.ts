"use client";

/**
 * La situation d'une implantation, telle qu'elle se lit sur la carte.
 *
 * Un effectif seul ne dit rien : cent trente-cinq agents dont vingt en congé
 * et huit postes vacants n'est pas la même direction que cent trente-cinq
 * agents tous présents. Ce module projette, pour chaque entité portée sur la
 * carte, ce qu'un directeur général regarde avant de décider — présents,
 * absents, vacances, mouvements récents — et rien de plus.
 *
 * Tout se calcule depuis les actes historisés, jamais depuis un état stocké :
 * c'est la règle du domaine, et c'est ce qui rend le chiffre défendable.
 */

import { useMemo } from "react";
import { useAffectations, useAgentsProjetes, usePostes } from "@/lib/queries";
import { descendantsDe } from "@/lib/referentiels";
import type { AgentProjete, CategoriePersonnel, NaturePosition } from "@/lib/types";

/** Un mouvement est « récent » sur douze mois : la durée d'un exercice. */
const FENETRE_MOUVEMENT = 365;

export interface Situation {
  effectif: number;
  activite: number;
  conge: number;
  /** Détachement, disponibilité, mise à disposition, suspension. */
  horsService: number;
  vacants: number;
  /** Agents affectés ou mutés ici dans les douze derniers mois. */
  mouvements: number;
  responsable?: { nom: string; fonction: string };
  parCategorie: { categorie: CategoriePersonnel; nombre: number }[];
}

const HORS_SERVICE: NaturePosition[] = [
  "DISPONIBILITE", "DETACHEMENT", "MISE_A_DISPOSITION", "SUSPENSION",
];

/** Le responsable se reconnaît à sa fonction, pas à un champ « chef » stocké. */
const EST_RESPONSABLE = /^(le |la )?(directeur|directrice|chef|proviseur|principal|inspecteur)/i;

/**
 * Situation par entité, branche comprise.
 *
 * On indexe une fois pour toutes plutôt que de rebalayer la population à
 * chaque marqueur : la carte porte plus de deux cents implantations, et un
 * balayage par marqueur se compterait en secondes.
 */
export function useSituations(): (entiteId: string) => Situation {
  const { data: agents = [] } = useAgentsProjetes();
  const { data: postes = [] } = usePostes();
  const { data: affectations = [] } = useAffectations();

  return useMemo(() => {
    const limite = Date.now() - FENETRE_MOUVEMENT * 864e5;

    /** Les affectations ouvertes récemment, par agent. */
    const recents = new Set(
      affectations
        .filter((a) => !a.dateFin && new Date(a.dateEffet).getTime() >= limite)
        .map((a) => a.entiteId + "|" + a.agentId)
    );

    const parEntite = new Map<string, AgentProjete[]>();
    agents.forEach((a) => {
      if (!a.entiteId) return;
      const liste = parEntite.get(a.entiteId) ?? [];
      liste.push(a);
      parEntite.set(a.entiteId, liste);
    });

    const vacantsParEntite = new Map<string, number>();
    postes.forEach((p) => {
      if (p.statut !== "VACANT") return;
      vacantsParEntite.set(p.entiteId, (vacantsParEntite.get(p.entiteId) ?? 0) + 1);
    });

    const out = new Map<string, Situation>();
    const brancheDe = new Map<string, string[]>();

    const situationDe = (id: string): Situation => {
      let branche = brancheDe.get(id);
      if (!branche) {
        branche = descendantsDe(id).map((e) => e.id);
        brancheDe.set(id, branche);
      }
      const population = branche.flatMap((e) => parEntite.get(e) ?? []);
      const categories = new Map<CategoriePersonnel, number>();
      let activite = 0, conge = 0, horsService = 0, mouvements = 0;
      let responsable: Situation["responsable"];

      population.forEach((a) => {
        if (a.nature === "ACTIVITE") activite++;
        else if (a.nature === "CONGE") conge++;
        else if (HORS_SERVICE.includes(a.nature)) horsService++;
        categories.set(a.categorie, (categories.get(a.categorie) ?? 0) + 1);
        if (a.entiteId && recents.has(a.entiteId + "|" + a.id)) mouvements++;
        // Le responsable de l'entité elle-même, pas d'un service qui en dépend.
        if (!responsable && a.entiteId === id && a.fonction && EST_RESPONSABLE.test(a.fonction)) {
          responsable = { nom: `${a.prenom} ${a.nom}`, fonction: a.fonction };
        }
      });

      return {
        effectif: population.length,
        activite, conge, horsService,
        vacants: branche.reduce((s, e) => s + (vacantsParEntite.get(e) ?? 0), 0),
        mouvements,
        responsable,
        parCategorie: [...categories.entries()]
          .map(([categorie, nombre]) => ({ categorie, nombre }))
          .sort((a, b) => b.nombre - a.nombre),
      };
    };

    // Calcul à la demande, retenu ensuite : la carte porte plus de deux cents
    // implantations et n'en ouvre qu'une poignée.
    return (id: string) => {
      const dejaVu = out.get(id);
      if (dejaVu) return dejaVu;
      const s = situationDe(id);
      out.set(id, s);
      return s;
    };
  }, [agents, postes, affectations]);
}

export const LIBELLE_CATEGORIE: Record<CategoriePersonnel, string> = {
  FONCTIONNAIRE: "Fonctionnaires",
  CONTRACTUEL: "Contractuels",
  PRESTATAIRE: "Prestataires",
  VOLONTAIRE: "Volontaires",
  VACATAIRE: "Vacataires",
};

/** Les lignes de la fiche, dans l'ordre où on les lit. */
export function lignesSituation(s: Situation): { libelle: string; valeur: string; ton: string }[] {
  return [
    { libelle: "En activité", valeur: String(s.activite), ton: "#059669" },
    { libelle: "En congé", valeur: String(s.conge), ton: "#d97706" },
    ...(s.horsService ? [{ libelle: "Hors service", valeur: String(s.horsService), ton: "#7c3aed" }] : []),
    { libelle: "Postes vacants", valeur: String(s.vacants), ton: "#dc2626" },
    ...(s.mouvements ? [{ libelle: "Mouvements (12 mois)", valeur: String(s.mouvements), ton: "#0284c7" }] : []),
  ];
}
