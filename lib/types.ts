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

/* ------------------------------------------------------------------ */
/* Utilisateurs, rôles et périmètres — cahier §11                      */
/* ------------------------------------------------------------------ */

export type Role =
  | "ADMIN_SYSTEME"
  | "DIRECTEUR_GENERAL"
  | "DIRECTEUR_CENTRAL"
  | "CHEF_SERVICE"
  | "CHEF_BUREAU"
  | "AGENT_INSTRUCTEUR"
  | "DIRECTEUR_DEPARTEMENTAL"
  | "CHEF_ETABLISSEMENT"
  | "AGENT";

export interface Utilisateur {
  id: string;
  email: string;
  motDePasse: string;
  nomComplet: string;
  role: Role;
  /** Le périmètre se déduit de l'arborescence, il ne se saisit pas. §11 */
  entiteId: string;
  agentId?: string | null;
  fonction: string;
  actif: boolean;
  derniereConnexion?: string;
}

/* ------------------------------------------------------------------ */
/* Journal d'audit — en ajout seul, cahier §12                         */
/* ------------------------------------------------------------------ */

export interface EntreeJournal {
  id: string;
  horodatage: string;
  utilisateurId: string;
  utilisateur: string;
  adresseIp: string;
  action: "CREATION" | "MODIFICATION" | "CONSULTATION" | "VALIDATION" | "SIGNATURE" | "REJET";
  cibleType: string;
  cibleId: string;
  champ?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  /** Une modification sans acte de référence est une anomalie. §12 */
  acteId?: string;
  justification?: string;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  date: string;
  type: "info" | "alerte" | "succes";
  lu: boolean;
}

/* ------------------------------------------------------------------ */
/* Projection — l'état courant est calculé, jamais stocké. §06, §07     */
/* ------------------------------------------------------------------ */

export interface AgentProjete extends Agent {
  situation?: SituationCarriere;
  affectation?: Affectation;
  position?: Position;
  gradeId?: string;
  echelon?: number;
  indice?: number;
  categorieStatutaire?: CategorieStatutaire;
  entiteId?: string;
  fonction?: string;
  nature: NaturePosition;
  anciennete: number;
  age: number;
  tauxCompletude: number;
}
