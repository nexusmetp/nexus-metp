"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { save } from "@/lib/db";
import type {
  PointAccueil, PriseDeService, RegistreJour, Utilisateur,
} from "@/lib/types";
import { idRegistre } from "@/lib/referentiels/accueil";
import { liste } from "./base";
import { journaliser } from "./audit";

/* ------------------------------------------------------------------ */
/* Points d'accueil, arrivées, cahiers d'émargement                    */
/* ------------------------------------------------------------------ */

export const usePointsAccueil = () => liste<PointAccueil>("pointsAccueil");
export const usePrisesService = () => liste<PriseDeService>("prisesService");
export const useRegistres = () => liste<RegistreJour>("registres");

const invalider = (qc: ReturnType<typeof useQueryClient>, cles: string[]) =>
  [...cles, "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

/**
 * Déclare ou corrige le point d'accueil d'une entité.
 *
 * L'identifiant venant de l'entité (`PTA-<entiteId>`), réenregistrer un point
 * le **corrige** au lieu d'en créer un second : une direction ne peut pas
 * avoir deux cahiers, ce serait deux versions de la même journée et aucune
 * des deux opposable.
 */
export function useEnregistrerPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ point, utilisateur, creation }: {
      point: PointAccueil; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<PointAccueil>("pointsAccueil", point);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "PointAccueil", point.id, {
        champ: "responsableId",
        nouvelleValeur: point.responsableId ?? "non désigné",
        justification: `${point.libelle} — ${point.entiteId}`,
      });
      return point;
    },
    onSuccess: () => invalider(qc, ["pointsAccueil"]),
  });
}

/**
 * Constate l'arrivée d'un agent au point d'accueil de son affectation.
 *
 * C'est le geste qui fait passer un agent de « affecté sur le papier » à
 * « présent dans le service ». Le nom de celui qui reçoit est enregistré :
 * attester qu'un agent s'est présenté engage son auteur, exactement comme
 * un pointage.
 */
export function useEnregistrerArrivee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ prise, date, utilisateur, recuPar, recuParNom }: {
      prise: PriseDeService;
      date: string;
      utilisateur: Utilisateur;
      recuPar?: string | null;
      recuParNom?: string | null;
    }) => {
      const ligne: PriseDeService = {
        ...prise,
        dateArrivee: date,
        statut: "ENREGISTREE",
        recuPar: recuPar ?? utilisateur.agentId ?? null,
        recuParNom: recuParNom ?? utilisateur.nomComplet,
        enregistrePar: utilisateur.id,
        enregistreLe: new Date().toISOString(),
      };
      await save<PriseDeService>("prisesService", ligne);
      const retard = Math.round(
        (new Date(date).getTime() - new Date(prise.dateAttendue).getTime()) / 864e5
      );
      await journaliser(utilisateur, "MODIFICATION", "PriseDeService", ligne.id, {
        champ: "dateArrivee",
        nouvelleValeur: date,
        justification: retard > 0
          ? `Agent présenté ${retard} jour(s) après la date d'effet de l'acte.`
          : "Agent présenté à la date d'effet de l'acte.",
      });
      return ligne;
    },
    onSuccess: () => invalider(qc, ["prisesService"]),
  });
}

/**
 * Établit l'installation : le procès-verbal est dressé, l'agent est en poste.
 *
 * L'installation suppose l'arrivée. On refuse de l'enregistrer sans elle
 * plutôt que de la déduire — un PV d'installation pour un agent dont
 * personne n'a constaté la venue serait une pièce fausse.
 */
export function useInstaller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ prise, date, reference, utilisateur }: {
      prise: PriseDeService; date: string; reference?: string; utilisateur: Utilisateur;
    }) => {
      if (!prise.dateArrivee) {
        throw new Error("L'arrivée de l'agent doit être constatée avant son installation.");
      }
      const ligne: PriseDeService = {
        ...prise,
        dateInstallation: date,
        referencePV: reference ?? prise.referencePV ?? null,
        statut: "INSTALLEE",
        enregistrePar: utilisateur.id,
        enregistreLe: new Date().toISOString(),
      };
      await save<PriseDeService>("prisesService", ligne);
      await journaliser(utilisateur, "MODIFICATION", "PriseDeService", ligne.id, {
        champ: "dateInstallation",
        nouvelleValeur: date,
        acteId: ligne.acteId ?? undefined,
        justification: ligne.referencePV
          ? `Installation constatée — ${ligne.referencePV}`
          : "Installation constatée.",
      });
      return ligne;
    },
    onSuccess: () => invalider(qc, ["prisesService"]),
  });
}

/**
 * Constate qu'un agent attendu ne s'est pas présenté.
 *
 * Jamais automatique, et c'est délibéré : le seuil de quinze jours ouvre un
 * dossier à vérifier, il ne conclut rien. Seul un agent qui a cherché à
 * joindre l'intéressé peut porter ce constat, et la justification est
 * **obligatoire** — sans elle, ce serait une accusation sans motif.
 */
export function useConstaterNonPresentation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ prise, justification, utilisateur }: {
      prise: PriseDeService; justification: string; utilisateur: Utilisateur;
    }) => {
      if (!justification.trim()) {
        throw new Error("Une non-présentation ne se constate pas sans motif écrit.");
      }
      const ligne: PriseDeService = {
        ...prise,
        statut: "NON_PRESENTEE",
        observations: justification,
        enregistrePar: utilisateur.id,
        enregistreLe: new Date().toISOString(),
      };
      await save<PriseDeService>("prisesService", ligne);
      await journaliser(utilisateur, "MODIFICATION", "PriseDeService", ligne.id, {
        champ: "statut",
        ancienneValeur: prise.statut,
        nouvelleValeur: "NON_PRESENTEE",
        justification,
      });
      return ligne;
    },
    onSuccess: () => invalider(qc, ["prisesService"]),
  });
}

/**
 * Ouvre le cahier du jour dans un service.
 *
 * Identifiant déterministe : rouvrir un cahier déjà ouvert ne le duplique
 * pas. C'est ce qui permet de dire, pour un jour donné et sans ambiguïté,
 * si le service a tenu son registre — la distinction que toute la
 * plateforme attendait entre « tout le monde est absent » et « personne n'a
 * ouvert le cahier ».
 */
export function useOuvrirRegistre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entiteId, pointAccueilId, date, utilisateur }: {
      entiteId: string; pointAccueilId: string; date: string; utilisateur: Utilisateur;
    }) => {
      const ligne: RegistreJour = {
        id: idRegistre(entiteId, date),
        entiteId,
        pointAccueilId,
        date,
        ouvertPar: utilisateur.id,
        ouvertParNom: utilisateur.nomComplet,
        ouvertLe: new Date().toISOString(),
        closPar: null,
        closParNom: null,
        closLe: null,
        attendus: null,
        emarges: null,
      };
      await save<RegistreJour>("registres", ligne);
      await journaliser(utilisateur, "CREATION", "RegistreJour", ligne.id, {
        justification: `Ouverture du cahier d'émargement du ${date}.`,
      });
      return ligne;
    },
    onSuccess: () => invalider(qc, ["registres"]),
  });
}

/**
 * Clôt le cahier du jour, et fige ce qu'il atteste.
 *
 * `attendus` et `emarges` sont recopiés plutôt que recalculés : l'effectif
 * d'un service change avec les mutations, et un cahier de mars doit rester
 * lisible en décembre sans que ses chiffres bougent sous les yeux du
 * lecteur.
 */
export function useCloreRegistre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ registre, attendus, emarges, utilisateur, observations }: {
      registre: RegistreJour;
      attendus: number;
      emarges: number;
      utilisateur: Utilisateur;
      observations?: string;
    }) => {
      const ligne: RegistreJour = {
        ...registre,
        closPar: utilisateur.id,
        closParNom: utilisateur.nomComplet,
        closLe: new Date().toISOString(),
        attendus,
        emarges,
        observations: observations || registre.observations,
      };
      await save<RegistreJour>("registres", ligne);
      await journaliser(utilisateur, "MODIFICATION", "RegistreJour", ligne.id, {
        champ: "closLe",
        nouvelleValeur: `${emarges} émargés sur ${attendus} attendus`,
        justification: observations || `Clôture du cahier du ${registre.date}.`,
      });
      return ligne;
    },
    onSuccess: () => invalider(qc, ["registres"]),
  });
}
