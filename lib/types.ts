export type Role =
  | "MINISTRE"
  | "DIRECTEUR_CABINET"
  | "SECRETAIRE_GENERAL"
  | "INSPECTEUR_GENERAL"
  | "SUPER_ADMIN"
  | "DIRECTEUR_GENERAL"
  | "DIRECTEUR_CENTRAL"
  | "DIRECTEUR_DEPARTEMENTAL"
  | "GESTIONNAIRE_RH"
  | "AGENT";

export type Categorie = "A" | "B" | "C" | "D";
export type StatutAgent = "Titulaire" | "Contractuel" | "Vacataire" | "Stagiaire";
export type EtatAgent = "Actif" | "Détachement" | "Disponibilité" | "Suspendu" | "Retraité";
export type Sexe = "M" | "F";

export interface Entite {
  id: string;
  code: string;
  nom: string;
  sigle: string;
  type:
    | "MINISTERE"
    | "CABINET"
    | "INSPECTION"
    | "SECRETARIAT"
    | "DIRECTION_GENERALE"
    | "DIRECTION_CENTRALE"
    | "DIRECTION_DEPARTEMENTALE"
    | "SERVICE";
  parentId: string | null;
  ville: string;
  budgetRh?: number;
}

export interface Grade {
  id: string;
  corps: string;
  libelle: string;
  categorie: Categorie;
  echelons: number;
  indiceDebut: number;
  indiceFin: number;
}

export interface Poste {
  id: string;
  code: string;
  intitule: string;
  entiteId: string;
  gradeRequisId: string;
  niveau: "Stratégique" | "Encadrement" | "Exécution" | "Support";
  statut: "Occupé" | "Vacant" | "Gelé";
  titulaireId: string | null;
  budgetise: boolean;
}

export interface Diplome {
  intitule: string;
  etablissement: string;
  annee: number;
}

export interface CarriereEvent {
  id: string;
  date: string;
  type: "Recrutement" | "Nomination" | "Affectation" | "Mutation" | "Avancement" | "Promotion" | "Reclassement";
  libelle: string;
  reference: string;
}

export interface Evaluation {
  id: string;
  annee: number;
  noteGlobale: number;
  competences: number;
  resultats: number;
  comportement: number;
  equipe: number;
  innovation: number;
  appreciation: string;
  evaluateur: string;
}

export interface DocumentRh {
  id: string;
  nom: string;
  categorie: string;
  date: string;
  taille: string;
}

export interface Agent {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  sexe: Sexe;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  situationFamiliale: "Célibataire" | "Marié(e)" | "Divorcé(e)" | "Veuf(ve)";
  enfants: number;
  telephone: string;
  email: string;
  adresse: string;
  photo?: string;
  statut: StatutAgent;
  etat: EtatAgent;
  gradeId: string;
  echelon: number;
  categorie: Categorie;
  entiteId: string;
  posteId: string | null;
  dateRecrutement: string;
  dateDernierAvancement: string;
  indice: number;
  soldeConges: number;
  tauxCompletude: number;
  diplomes: Diplome[];
  competences: string[];
  langues: string[];
  carriere: CarriereEvent[];
  evaluations: Evaluation[];
  documents: DocumentRh[];
  sanctions: { id: string; date: string; groupe: 1 | 2 | 3; nature: string; motif: string }[];
  formations: { id: string; intitule: string; type: string; annee: number; statut: string }[];
}

export type StatutActe =
  | "Brouillon"
  | "Soumis"
  | "Validation SG"
  | "Validation Ministre"
  | "Signé"
  | "Rejeté"
  | "Publié";

export interface Acte {
  id: string;
  reference: string;
  type: "Nomination" | "Mutation" | "Avancement" | "Promotion" | "Recrutement" | "Sanction" | "Retraite";
  objet: string;
  agentId: string;
  entiteId: string;
  posteCibleId?: string | null;
  statut: StatutActe;
  dateCreation: string;
  dateEcheance: string;
  initiateur: string;
  etapes: { libelle: string; acteur: string; statut: "Terminé" | "En cours" | "À venir"; date?: string }[];
}

export interface DemandeConge {
  id: string;
  reference: string;
  agentId: string;
  type: "Annuel" | "Maladie" | "Maternité" | "Paternité" | "Exceptionnel" | "Formation" | "Sans solde";
  dateDebut: string;
  dateFin: string;
  jours: number;
  motif: string;
  statut: "En attente" | "Approuvé" | "Refusé" | "En cours";
  validateur?: string;
}

export interface Utilisateur {
  id: string;
  email: string;
  motDePasse: string;
  nomComplet: string;
  role: Role;
  entiteId: string;
  agentId?: string | null;
  fonction: string;
  actif: boolean;
  derniereConnexion?: string;
  mfa: boolean;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  date: string;
  type: "info" | "alerte" | "succes";
  lu: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  utilisateur: string;
  action: string;
  cible: string;
  ip: string;
}
