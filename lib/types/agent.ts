import type { CategoriePersonnel } from "./organisation";

/* ------------------------------------------------------------------ */
/* Agent — identité seule. La carrière vit dans les entités historisées */
/* ------------------------------------------------------------------ */

export type Sexe = "M" | "F";

export type SituationFamiliale = "Célibataire" | "Marié(e)" | "Divorcé(e)" | "Veuf(ve)";

export interface Agent {
  id: string;
  /** Clé fonctionnelle, jamais clé technique : historisée, parfois provisoire. */
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  situationFamiliale: SituationFamiliale;
  enfants: number;
  telephone: string;
  email: string;
  adresse: string;
  categorie: CategoriePersonnel;
  enseignant: boolean;
  /** Photographie d'identité, en données incorporées. Absente le plus souvent. */
  photo?: string | null;
  dateRecrutement: string;
  datePriseService?: string;
  dateTitularisation?: string;
  diplomes: Diplome[];
  competences: string[];
  langues: string[];
}

export interface Diplome {
  intitule: string;
  etablissement: string;
  annee: number;
}

/* ------------------------------------------------------------------ */
/* Entités historisées — cahier §15                                    */
/* ------------------------------------------------------------------ */

/** Chacune porte une date d'effet, une date de fin et l'acte qui l'a créée. */
interface Historisee {
  id: string;
  agentId: string;
  dateEffet: string;
  dateFin: string | null;
  acteId: string;
}

export interface SituationCarriere extends Historisee {
  gradeId: string;
  classe: number;
  echelon: number;
  indice: number;
}

export interface Affectation extends Historisee {
  entiteId: string;
  posteId: string | null;
  fonction: string;
}

export type NaturePosition =
  | "ACTIVITE"
  | "CONGE"
  | "DISPONIBILITE"
  | "DETACHEMENT"
  | "MISE_A_DISPOSITION"
  | "SUSPENSION"
  | "RETRAITE";

export interface Position extends Historisee {
  nature: NaturePosition;
  motif?: string;
}

/* ------------------------------------------------------------------ */
/* Postes                                                              */
/* ------------------------------------------------------------------ */

export type StatutPoste = "OCCUPE" | "VACANT" | "GELE";

export interface Poste {
  id: string;
  code: string;
  intitule: string;
  entiteId: string;
  gradeRequisId: string;
  statut: StatutPoste;
  budgetise: boolean;
}
