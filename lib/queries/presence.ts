"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { remove, save } from "@/lib/db";
import type {
  Pointage, RemunerationContractuelle, SortieTerritoire, Utilisateur,
} from "@/lib/types";
import { liste } from "./base";
import { journaliser, nouvelId } from "./audit";

/* ------------------------------------------------------------------ */
/* Présences, sorties du territoire, rémunérations                     */
/* ------------------------------------------------------------------ */

export const usePointages = () => liste<Pointage>("pointages");
export const useSorties = () => liste<SortieTerritoire>("sorties");
export const useRemunerations = () => liste<RemunerationContractuelle>("remunerations");

/**
 * Enregistre un pointage — un agent, un jour.
 *
 * L'identifiant est déterministe (`PTG-<agent>-<date>`) : repointer le même
 * agent le même jour **corrige** le constat au lieu d'en empiler un second.
 * Deux pointages contradictoires pour une même journée seraient pires que
 * pas de pointage du tout, et la trace du journal garde la correction.
 */
export function useEnregistrerPointage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pointage, utilisateur, correction }: {
      pointage: Omit<Pointage, "id" | "saisiPar" | "saisiParNom" | "saisiLe">;
      utilisateur: Utilisateur;
      correction?: boolean;
    }) => {
      const ligne: Pointage = {
        ...pointage,
        id: `PTG-${pointage.agentId}-${pointage.date}`,
        saisiPar: utilisateur.id,
        saisiParNom: utilisateur.nomComplet,
        saisiLe: new Date().toISOString(),
      };
      await save<Pointage>("pointages", ligne);
      await journaliser(utilisateur, correction ? "MODIFICATION" : "CREATION", "Pointage", ligne.id, {
        champ: "etat",
        nouvelleValeur: ligne.etat,
        justification: ligne.motif || `Présence du ${ligne.date}`,
      });
      return ligne;
    },
    onSuccess: () => {
      ["pointages", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/**
 * Pointe une journée entière d'un coup, pour tout un service.
 *
 * Le pointage à la main, agent par agent, n'est pas tenable dans un service
 * de quarante personnes : personne ne le fait deux jours de suite. On pose
 * donc la journée en une fois, et le gestionnaire ne corrige que les écarts.
 */
export function useEnregistrerJournee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lignes, utilisateur, date }: {
      lignes: Omit<Pointage, "id" | "saisiPar" | "saisiParNom" | "saisiLe">[];
      utilisateur: Utilisateur;
      date: string;
    }) => {
      const horodatage = new Date().toISOString();
      await Promise.all(lignes.map((p) => save<Pointage>("pointages", {
        ...p,
        id: `PTG-${p.agentId}-${p.date}`,
        saisiPar: utilisateur.id,
        saisiParNom: utilisateur.nomComplet,
        saisiLe: horodatage,
      })));
      /* Une seule entrée de journal pour la journée : cent lignes de trace
         pour un même geste noieraient le journal d'audit. */
      await journaliser(utilisateur, "CREATION", "Journee de pointage", `PTG-JOUR-${date}`, {
        nouvelleValeur: `${lignes.length} agents`,
        justification: `Pointage de la journée du ${date}`,
      });
      return lignes.length;
    },
    onSuccess: () => {
      ["pointages", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useSupprimerPointage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, utilisateur }: { id: string; utilisateur: Utilisateur }) => {
      await remove("pointages", id);
      await journaliser(utilisateur, "SUPPRESSION", "Pointage", id, {
        justification: "Pointage retiré — constat erroné.",
      });
      return id;
    },
    onSuccess: () => {
      ["pointages", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/**
 * Enregistre une autorisation de sortie du territoire.
 *
 * Le statut n'est pas recalculé ici : il l'est à l'affichage, par
 * `statutEffectif`, parce qu'une sortie « autorisée » dont le retour était
 * prévu la semaine dernière est en réalité un retard que personne n'est venu
 * déclarer.
 */
export function useEnregistrerSortie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sortie, utilisateur, creation }: {
      sortie: SortieTerritoire; utilisateur: Utilisateur; creation: boolean;
    }) => {
      const ligne: SortieTerritoire = { ...sortie, id: sortie.id || nouvelId("SRT") };
      await save<SortieTerritoire>("sorties", ligne);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "SortieTerritoire", ligne.id, {
        champ: creation ? undefined : "statut",
        nouvelleValeur: ligne.statut,
        acteId: ligne.acteId ?? undefined,
        justification: `${ligne.destination} (${ligne.pays}) — ${ligne.typeActe}`,
      });
      return ligne;
    },
    onSuccess: () => {
      ["sorties", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/** Constate le retour d'un agent. C'est la seule façon de clore une sortie. */
export function useConstaterRetour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sortie, date, utilisateur }: {
      sortie: SortieTerritoire; date: string; utilisateur: Utilisateur;
    }) => {
      const ligne: SortieTerritoire = { ...sortie, dateRetourReelle: date, statut: "RENTREE" };
      await save<SortieTerritoire>("sorties", ligne);
      const ecart = Math.round(
        (new Date(date).getTime() - new Date(sortie.dateRetourPrevue).getTime()) / 864e5
      );
      await journaliser(utilisateur, "MODIFICATION", "SortieTerritoire", ligne.id, {
        champ: "dateRetourReelle",
        nouvelleValeur: date,
        justification: ecart > 0
          ? `Retour constaté avec ${ecart} jour(s) de retard sur l'autorisation.`
          : "Retour constaté dans le délai autorisé.",
      });
      return ligne;
    },
    onSuccess: () => {
      ["sorties", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/** Enregistre la rémunération contractuelle d'un personnel hors grille. */
export function useEnregistrerRemuneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ remuneration, utilisateur, creation }: {
      remuneration: RemunerationContractuelle; utilisateur: Utilisateur; creation: boolean;
    }) => {
      const ligne: RemunerationContractuelle = {
        ...remuneration,
        id: remuneration.id || nouvelId("REM"),
      };
      await save<RemunerationContractuelle>("remunerations", ligne);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Remuneration", ligne.id, {
        champ: "montant",
        nouvelleValeur: ligne.montant === null ? "non renseigné" : String(ligne.montant),
        acteId: ligne.acteId ?? undefined,
        justification: ligne.reference || "Rémunération contractuelle",
      });
      return ligne;
    },
    onSuccess: () => {
      ["remunerations", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
