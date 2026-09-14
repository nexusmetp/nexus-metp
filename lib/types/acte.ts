import type { Agent, NaturePosition } from "./agent";
import type { CategoriePersonnel } from "./organisation";

/* ------------------------------------------------------------------ */
/* Actes administratifs — le pivot du système, cahier §08              */
/* ------------------------------------------------------------------ */

export type TypeActe =
  | "RECRUTEMENT"
  | "PRISE_DE_SERVICE"
  | "TITULARISATION"
  | "AFFECTATION"
  | "MUTATION"
  | "AVANCEMENT"
  | "PROMOTION"
  | "FORMATION"
  | "CONGE"
  | "POSITION"
  | "SANCTION"
  | "CONTENTIEUX"
  | "INDEMNITE"
  | "FIN_CARRIERE";

export type StatutActe =
  | "BROUILLON"
  | "SOUMIS"
  | "EN_INSTRUCTION"
  | "VALIDE_SERVICE"
  | "VALIDE_DIRECTION"
  | "SIGNE"
  | "NOTIFIE"
  | "ARCHIVE"
  | "REJETE"
  /** Celui que les systèmes oublient et que l'administration pratique. §08 */
  | "RETOURNE";

export interface EtapeActe {
  id: string;
  ordre: number;
  libelle: string;
  entiteId: string;
  statut: "TERMINEE" | "EN_COURS" | "A_VENIR";
  dateEntree?: string;
  dateSortie?: string;
  utilisateur?: string;
  commentaire?: string;
}

/** Ce que l'acte changera dans le dossier une fois notifié. */
export interface CibleActe {
  entiteId?: string;
  posteId?: string;
  fonction?: string;
  gradeId?: string;
  classe?: number;
  echelon?: number;
  nature?: NaturePosition;
  motif?: string;
  /** Date d'effet de la décision, distincte de la date de signature. */
  dateEffet?: string;
  /**
   * Le profil d'accès que la nomination confère, quand l'acte en est une.
   *
   * Il voyage dans l'acte parce qu'une nomination soumise à l'approbation du
   * ministre s'applique **à la notification**, parfois des jours après avoir
   * été établie : sans cela, il faudrait redemander au ministre un
   * renseignement qu'il n'a pas à fournir — il approuve une nomination, pas
   * un formulaire.
   */
  profil?: string;
}

export interface Acte {
  id: string;
  reference: string;
  type: TypeActe;
  objet: string;
  agentId: string;
  /** Bureau ou service qui instruit. */
  entiteInstructriceId: string;
  statut: StatutActe;
  dateCreation: string;
  dateEcheance: string;
  dateSignature?: string;
  initiateur: string;
  /** Agent instructeur à qui le dossier est confié — sa bannette. */
  assigneA?: string;
  /** Qui a instruit : sert la séparation instruction / validation (§11). */
  instruitPar?: string;
  /** Vrai une fois les effets reportés dans le dossier (étape 10 du §09). */
  effetsAppliques?: boolean;
  cible?: CibleActe;
  etapes: EtapeActe[];
  pieces: Piece[];
}

export interface Piece {
  id: string;
  nom: string;
  categorie: string;
  date: string;
  taille: string;
  /** Empreinte enregistrée à l'import, pour prouver la non-altération. §14 */
  empreinte?: string;
}

/* ------------------------------------------------------------------ */
/* Besoins ascendants — cahier §04, §10                                */
/* ------------------------------------------------------------------ */

export interface BesoinPersonnel {
  id: string;
  reference: string;
  etablissementId: string;
  departementId: string;
  categorie: CategoriePersonnel;
  discipline: string;
  effectifDemande: number;
  effectifRetenu?: number;
  anneeScolaire: string;
  statut: "EXPRIME" | "TRANSMIS" | "INSTRUIT" | "ARBITRE";
}
