/**
 * Modèle de domaine du SIRH du METP.
 *
 * Réécrit d'après le cahier fonctionnel de la DGARH (§05, §06, §07, §08, §15).
 * Trois principes structurants :
 *   1. L'organisation est UNE arborescence récursive, pas quatre tables.
 *   2. La carrière est une suite d'événements datés ; l'état courant se calcule.
 *   3. Rien ne change dans un dossier sans acte.
 */

/* ------------------------------------------------------------------ */
/* Provenance — chaque donnée de référence porte son niveau de preuve  */
/* ------------------------------------------------------------------ */

/** Cf. cahier §01. Ne jamais présenter du « A_VERIFIER » comme du droit. */
export type Provenance = "TEXTE" | "A_VERIFIER" | "RECOMMANDATION";

/* ------------------------------------------------------------------ */
/* Organisation                                                        */
/* ------------------------------------------------------------------ */

export type NiveauEntite =
  | "MINISTERE"
  | "CABINET"
  | "INSPECTION_GENERALE"
  | "DIRECTION_GENERALE"
  | "SECRETARIAT"
  | "DIRECTION"
  | "SERVICE"
  | "BUREAU"
  | "INSPECTION_INTERDEPARTEMENTALE"
  | "ANTENNE_DEPARTEMENTALE"
  | "DIRECTION_DEPARTEMENTALE"
  | "ETABLISSEMENT";

export interface Entite {
  id: string;
  code: string;
  sigle: string;
  nom: string;
  niveau: NiveauEntite;
  parentId: string | null;
  ville?: string;
  /** Niveau de preuve de l'existence de cette entité. Cf. §01. */
  provenance: Provenance;
  /** Texte qui la fonde, quand il est connu. */
  reference?: string;
  /** Une entité désactivée sort des listes sans disparaître de l'historique. */
  actif?: boolean;
  /** Renseignés quand l'entité a été créée dans l'outil, non semée. */
  creePar?: string;
  dateCreation?: string;
  responsableId?: string | null;
}

/* ------------------------------------------------------------------ */
/* Référentiel statutaire                                              */
/* ------------------------------------------------------------------ */

export type CategorieStatutaire = "A" | "B" | "C" | "D";

export interface Corps {
  id: string;
  libelle: string;
  categorie: CategorieStatutaire;
  enseignant: boolean;
}

export interface Grade {
  id: string;
  corpsId: string;
  libelle: string;
  classes: number;
  echelons: number;
  indiceDebut: number;
  indiceFin: number;
}

/* ------------------------------------------------------------------ */
/* Catégories de personnel — cahier §05                                */
/* ------------------------------------------------------------------ */

/**
 * Discriminant, pas simple libellé : conditionne quels blocs du dossier
 * existent et quels actes sont possibles.
 */
export type CategoriePersonnel =
  | "FONCTIONNAIRE"
  | "CONTRACTUEL"
  | "PRESTATAIRE"
  | "VOLONTAIRE"
  | "VACATAIRE";

export interface RegleCategorie {
  libelle: string;
  lien: string;
  /** Grade, classe, échelon, indice et grille indiciaire. */
  carriereStatutaire: boolean;
  titularisation: boolean;
  avancement: boolean;
  promotion: boolean;
  /** Effectifs remontés par les établissements via les directions départementales. */
  besoinAscendant: boolean;
}
