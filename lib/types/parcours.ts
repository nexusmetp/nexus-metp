import type { Sexe } from "./agent";
import type { CategoriePersonnel } from "./organisation";

/* Recrutement — de l'état de besoins à la prise de service            */
/* ------------------------------------------------------------------ */

export type StatutCampagne =
  | "PREPARATION" | "OUVERTE" | "CLOSE" | "CORRECTION" | "PROCLAMEE" | "ANNULEE";

export interface CampagneRecrutement {
  id: string;
  reference: string;
  intitule: string;
  annee: number;
  categorie: CategoriePersonnel;
  /** Postes ouverts au concours, par discipline. */
  postesOuverts: number;
  disciplines: string[];
  dateOuverture: string;
  dateCloture: string;
  dateEpreuves?: string;
  statut: StatutCampagne;
  entiteId: string;
  /** États de besoins qui la justifient. */
  besoinIds: string[];
}

export type StatutCandidature =
  | "DEPOSEE" | "RECEVABLE" | "IRRECEVABLE" | "ADMISSIBLE" | "ADMIS" | "NON_ADMIS";

export interface Candidature {
  id: string;
  campagneId: string;
  numero: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  diplome: string;
  discipline: string;
  departement: string;
  statut: StatutCandidature;
  note?: number | null;
  rang?: number | null;
  /** Renseigné à la nomination : l'agent créé au fichier. */
  agentId?: string | null;
}

/* ------------------------------------------------------------------ */
/* Formation — catalogue et sessions                                   */
/* ------------------------------------------------------------------ */

export type NatureFormation =
  | "INITIALE" | "CONTINUE" | "PERFECTIONNEMENT" | "RECONVERSION" | "CERTIFIANTE";

export interface OffreFormation {
  id: string;
  reference: string;
  intitule: string;
  nature: NatureFormation;
  organisme: string;
  lieu: string;
  dureeJours: number;
  places: number;
  dateDebut: string;
  dateFin: string;
  coutUnitaire: number;
  publicVise: string;
  statut: "PROGRAMMEE" | "OUVERTE" | "COMPLETE" | "REALISEE" | "ANNULEE";
  entiteId: string;
}

export interface InscriptionFormation {
  id: string;
  offreId: string;
  agentId: string;
  dateInscription: string;
  statut: "PROPOSEE" | "RETENUE" | "REFUSEE" | "SUIVIE" | "ABANDONNEE";
  acteId?: string | null;
  resultat?: "ACQUIS" | "PARTIEL" | "NON_ACQUIS" | null;
}

/* ------------------------------------------------------------------ */
/* Carte professionnelle — la pièce qui atteste la qualité d'agent      */
/* ------------------------------------------------------------------ */

export type StatutCarte = "A_EDITER" | "EDITEE" | "REMISE" | "PERDUE" | "EXPIREE";

/**
 * Elle n'attribue aucun droit : elle atteste ce que les actes ont établi.
 * Une carte se périme, se perd et se renouvelle sans que la situation
 * administrative de l'agent en soit affectée.
 */
export interface CarteProfessionnelle {
  id: string;
  numero: string;
  agentId: string;
  /** Entité portée sur la carte, figée à l'émission. */
  entiteId: string;
  fonction: string;
  dateEmission: string;
  dateExpiration: string;
  statut: StatutCarte;
  emisePar: string;
  dateRemise?: string | null;
  motifReedition?: string;
}

/* ------------------------------------------------------------------ */
