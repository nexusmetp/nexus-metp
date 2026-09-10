import type { TypeActe } from "./acte";
import type { Provenance } from "./organisation";

/* ------------------------------------------------------------------ */
/* Emplois — §03 : le poste existe avant l'agent qui l'occupe          */
/* ------------------------------------------------------------------ */

export type NatureConge =
  | "ANNUEL" | "MALADIE" | "MATERNITE" | "EXCEPTIONNEL" | "SANS_SOLDE";

/**
 * Un congé pris. La décision reste portée par un acte ; cet enregistrement
 * n'existe que pour tenir le solde et le planning, qui ne se déduisent pas
 * d'un acte isolé.
 */
export interface Conge {
  id: string;
  agentId: string;
  nature: NatureConge;
  dateDebut: string;
  dateFin: string;
  jours: number;
  /** Exercice d'imputation : le droit annuel se compte par année civile. */
  exercice: number;
  statut: "DEMANDE" | "ACCORDE" | "REFUSE" | "PRIS";
  acteId?: string | null;
  motif?: string;
}

/* ------------------------------------------------------------------ */
/* Délégation de signature et intérim — §11                            */
/* ------------------------------------------------------------------ */

export type PorteeDelegation = "SIGNATURE" | "INTERIM";

/**
 * Ce qui permet au circuit de continuer quand le signataire est absent.
 * Une délégation est bornée dans le temps et fondée sur un acte : sans elle,
 * un directeur général en mission bloque tous les dossiers.
 */
export interface Delegation {
  id: string;
  reference: string;
  portee: PorteeDelegation;
  delegantId: string;
  delegantNom: string;
  delegataireId: string;
  delegataireNom: string;
  entiteId: string;
  /** Types d'acte couverts ; vide = tous ceux du délégant. */
  typesActe: TypeActe[];
  dateDebut: string;
  dateFin: string;
  motif: string;
  acteId?: string | null;
  revoquee?: boolean;
}

/* ------------------------------------------------------------------ */
/* Fonds documentaire réglementaire — §14, second corpus               */
/* ------------------------------------------------------------------ */

export type NatureTexte =
  | "LOI" | "DECRET" | "ARRETE" | "CIRCULAIRE" | "NOTE_SERVICE" | "CONVENTION";

/**
 * Le texte qui fonde une décision. Sans ce fonds, un acte cite une référence
 * que personne ne peut ouvrir.
 */
export interface TexteReglementaire {
  id: string;
  reference: string;
  titre: string;
  nature: NatureTexte;
  dateSignature: string;
  datePublication?: string;
  /** Numéro du Journal officiel, quand la publication y est faite. */
  journalOfficiel?: string;
  resume: string;
  motsCles: string[];
  /** Entité que le texte organise, s'il en organise une. */
  entiteId?: string | null;
  /** Texte qui l'abroge ou le modifie. */
  abrogePar?: string | null;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
