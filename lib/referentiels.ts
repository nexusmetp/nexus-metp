import type { Entite, Grade, Role } from "@/lib/types";

export const APP_NAME = "NEXUS-METP";
export const APP_TAGLINE = "Système Intégré de Gestion des Ressources Humaines";
export const MINISTERE_NOM = "Ministère de l'Enseignement Technique et Professionnel";
export const LOGO_URL =
  "https://customer-assets-4nw71qhi.emergentagent.net/job_609b8195-c10e-4b71-8d33-e31431d5ad2a/artifacts/knsy5ozk_metp-logo.jpeg";

/** Les 15 départements de la République du Congo (lois du 08 octobre 2024) */
export const DEPARTEMENTS: { nom: string; chefLieu: string }[] = [
  { nom: "Bouenza", chefLieu: "Madingou" },
  { nom: "Brazzaville", chefLieu: "Brazzaville" },
  { nom: "Congo-Oubangui", chefLieu: "Mossaka" },
  { nom: "Cuvette", chefLieu: "Owando" },
  { nom: "Cuvette-Ouest", chefLieu: "Ewo" },
  { nom: "Djoué-Léfini", chefLieu: "Odziba" },
  { nom: "Kouilou", chefLieu: "Loango" },
  { nom: "Lékoumou", chefLieu: "Sibiti" },
  { nom: "Likouala", chefLieu: "Impfondo" },
  { nom: "Niari", chefLieu: "Dolisie" },
  { nom: "Nkéni-Alima", chefLieu: "Gamboma" },
  { nom: "Plateaux", chefLieu: "Djambala" },
  { nom: "Pointe-Noire", chefLieu: "Pointe-Noire" },
  { nom: "Pool", chefLieu: "Kinkala" },
  { nom: "Sangha", chefLieu: "Ouesso" },
];

const centrales: Entite[] = [
  { id: "ENT-METP", code: "METP", nom: MINISTERE_NOM, sigle: "METP", type: "MINISTERE", parentId: null, ville: "Brazzaville", budgetRh: 42_000_000_000 },
  { id: "ENT-CAB", code: "METP-CAB", nom: "Cabinet du Ministre", sigle: "CAB", type: "CABINET", parentId: "ENT-METP", ville: "Brazzaville", budgetRh: 1_400_000_000 },
  { id: "ENT-IG", code: "METP-IG", nom: "Inspection Générale", sigle: "IG", type: "INSPECTION", parentId: "ENT-METP", ville: "Brazzaville", budgetRh: 900_000_000 },
  { id: "ENT-SG", code: "METP-SG", nom: "Secrétariat Général", sigle: "SG", type: "SECRETARIAT", parentId: "ENT-METP", ville: "Brazzaville", budgetRh: 2_100_000_000 },
  { id: "ENT-DGARH", code: "METP-DGARH", nom: "Direction Générale de l'Administration et des Ressources Humaines", sigle: "DGARH", type: "DIRECTION_GENERALE", parentId: "ENT-METP", ville: "Brazzaville", budgetRh: 6_800_000_000 },
  { id: "ENT-DGEQP", code: "METP-DGEQP", nom: "Direction Générale de l'Équipement et du Patrimoine", sigle: "DGEQP", type: "DIRECTION_GENERALE", parentId: "ENT-METP", ville: "Brazzaville", budgetRh: 4_200_000_000 },
  { id: "ENT-DGET", code: "METP-DGET", nom: "Direction Générale de l'Enseignement Technique", sigle: "DGET", type: "DIRECTION_GENERALE", parentId: "ENT-METP", ville: "Brazzaville", budgetRh: 7_500_000_000 },
  { id: "ENT-DGEP", code: "METP-DGEP", nom: "Direction Générale de l'Enseignement Professionnel", sigle: "DGEP", type: "DIRECTION_GENERALE", parentId: "ENT-METP", ville: "Brazzaville", budgetRh: 6_900_000_000 },

  // Rattachées au Cabinet
  { id: "ENT-CT", code: "METP-CAB-CT", nom: "Conseillers Techniques", sigle: "CT", type: "SERVICE", parentId: "ENT-CAB", ville: "Brazzaville" },
  { id: "ENT-COM", code: "METP-CAB-COM", nom: "Cellule de Communication", sigle: "COM", type: "SERVICE", parentId: "ENT-CAB", ville: "Brazzaville" },

  // Rattachées à l'Inspection Générale
  { id: "ENT-IGET", code: "METP-IG-ET", nom: "Inspection de l'Enseignement Technique", sigle: "IGET", type: "DIRECTION_CENTRALE", parentId: "ENT-IG", ville: "Brazzaville" },
  { id: "ENT-IGEP", code: "METP-IG-EP", nom: "Inspection de l'Enseignement Professionnel", sigle: "IGEP", type: "DIRECTION_CENTRALE", parentId: "ENT-IG", ville: "Brazzaville" },

  // Rattachées au Secrétariat Général
  { id: "ENT-DEP", code: "METP-SG-DEP", nom: "Direction des Études et de la Planification", sigle: "DEP", type: "DIRECTION_CENTRALE", parentId: "ENT-SG", ville: "Brazzaville" },
  { id: "ENT-DECTP", code: "METP-SG-DECTP", nom: "Direction des Examens et Concours Techniques et Professionnels", sigle: "DECTP", type: "DIRECTION_CENTRALE", parentId: "ENT-SG", ville: "Brazzaville" },
  { id: "ENT-DSIC", code: "METP-SG-DSIC", nom: "Direction des Systèmes d'Information et de la Communication", sigle: "DSIC", type: "DIRECTION_CENTRALE", parentId: "ENT-SG", ville: "Brazzaville" },
  { id: "ENT-DCP", code: "METP-SG-DCP", nom: "Direction de la Coopération et du Partenariat", sigle: "DCP", type: "DIRECTION_CENTRALE", parentId: "ENT-SG", ville: "Brazzaville" },
  { id: "ENT-DEPRIV", code: "METP-SG-DEPRIV", nom: "Direction des Établissements Privés", sigle: "DEPRIV", type: "DIRECTION_CENTRALE", parentId: "ENT-SG", ville: "Brazzaville" },

  // Rattachées à la DGARH
  { id: "ENT-DRH", code: "METP-DGARH-DRH", nom: "Direction des Ressources Humaines", sigle: "DRH", type: "DIRECTION_CENTRALE", parentId: "ENT-DGARH", ville: "Brazzaville" },
  { id: "ENT-DAF", code: "METP-DGARH-DAF", nom: "Direction Administrative et Financière", sigle: "DAF", type: "DIRECTION_CENTRALE", parentId: "ENT-DGARH", ville: "Brazzaville" },
  { id: "ENT-DAJ", code: "METP-DGARH-DAJ", nom: "Direction des Affaires Juridiques", sigle: "DAJ", type: "DIRECTION_CENTRALE", parentId: "ENT-DGARH", ville: "Brazzaville" },
  { id: "ENT-DFC", code: "METP-DGARH-DFC", nom: "Direction de la Formation Continue", sigle: "DFC", type: "DIRECTION_CENTRALE", parentId: "ENT-DGARH", ville: "Brazzaville" },

  // Rattachées à la DGEQP
  { id: "ENT-DPAT", code: "METP-DGEQP-DPAT", nom: "Direction du Patrimoine", sigle: "DPAT", type: "DIRECTION_CENTRALE", parentId: "ENT-DGEQP", ville: "Brazzaville" },
  { id: "ENT-DINF", code: "METP-DGEQP-DINF", nom: "Direction des Infrastructures et Équipements", sigle: "DINF", type: "DIRECTION_CENTRALE", parentId: "ENT-DGEQP", ville: "Brazzaville" },

  // Rattachées à la DGET
  { id: "ENT-DEPRG", code: "METP-DGET-DEPRG", nom: "Direction des Études et Programmes", sigle: "DEPRG", type: "DIRECTION_CENTRALE", parentId: "ENT-DGET", ville: "Brazzaville" },
  { id: "ENT-DSE", code: "METP-DGET-DSE", nom: "Direction du Suivi et de l'Évaluation", sigle: "DSE", type: "DIRECTION_CENTRALE", parentId: "ENT-DGET", ville: "Brazzaville" },

  // Rattachées à la DGEP
  { id: "ENT-DFP", code: "METP-DGEP-DFP", nom: "Direction de la Formation Professionnelle", sigle: "DFP", type: "DIRECTION_CENTRALE", parentId: "ENT-DGEP", ville: "Brazzaville" },
  { id: "ENT-DIP", code: "METP-DGEP-DIP", nom: "Direction de l'Insertion Professionnelle", sigle: "DIP", type: "DIRECTION_CENTRALE", parentId: "ENT-DGEP", ville: "Brazzaville" },
];

const departementales: Entite[] = DEPARTEMENTS.map((d, i) => ({
  id: `ENT-DD-${String(i + 1).padStart(2, "0")}`,
  code: `METP-DD-${d.nom.slice(0, 3).toUpperCase()}`,
  nom: `Direction Départementale du METP – ${d.nom}`,
  sigle: `DD-${d.nom.slice(0, 4).toUpperCase()}`,
  type: "DIRECTION_DEPARTEMENTALE" as const,
  parentId: "ENT-METP",
  ville: d.chefLieu,
  budgetRh: 400_000_000 + i * 37_000_000,
}));

export const ENTITES: Entite[] = [...centrales, ...departementales];
export const entiteById = (id: string) => ENTITES.find((e) => e.id === id);

export const GRADES: Grade[] = [
  { id: "GR-A1", corps: "Inspection Générale", libelle: "Inspecteur Général 1er grade", categorie: "A", echelons: 8, indiceDebut: 1000, indiceFin: 1400 },
  { id: "GR-A2", corps: "Inspection Générale", libelle: "Inspecteur Général 2ème grade", categorie: "A", echelons: 8, indiceDebut: 900, indiceFin: 1300 },
  { id: "GR-A3", corps: "Direction", libelle: "Directeur Général", categorie: "A", echelons: 6, indiceDebut: 850, indiceFin: 1200 },
  { id: "GR-A4", corps: "Direction", libelle: "Directeur Central", categorie: "A", echelons: 6, indiceDebut: 800, indiceFin: 1100 },
  { id: "GR-A5", corps: "Conseil", libelle: "Conseiller Technique", categorie: "A", echelons: 6, indiceDebut: 750, indiceFin: 1050 },
  { id: "GR-A6", corps: "Administration", libelle: "Administrateur des Services Administratifs", categorie: "A", echelons: 8, indiceDebut: 720, indiceFin: 1020 },
  { id: "GR-B1", corps: "Encadrement", libelle: "Chef de Service 1er grade", categorie: "B", echelons: 8, indiceDebut: 700, indiceFin: 950 },
  { id: "GR-B2", corps: "Encadrement", libelle: "Chef de Service 2ème grade", categorie: "B", echelons: 8, indiceDebut: 650, indiceFin: 900 },
  { id: "GR-B3", corps: "Administration", libelle: "Directeur d'Administration", categorie: "B", echelons: 6, indiceDebut: 600, indiceFin: 850 },
  { id: "GR-B4", corps: "Enseignement", libelle: "Professeur Technique Certifié", categorie: "B", echelons: 8, indiceDebut: 620, indiceFin: 880 },
  { id: "GR-C1", corps: "Administration", libelle: "Gestionnaire RH", categorie: "C", echelons: 12, indiceDebut: 400, indiceFin: 650 },
  { id: "GR-C2", corps: "Administration", libelle: "Comptable", categorie: "C", echelons: 12, indiceDebut: 350, indiceFin: 600 },
  { id: "GR-C3", corps: "Technique", libelle: "Technicien Supérieur", categorie: "C", echelons: 12, indiceDebut: 400, indiceFin: 650 },
  { id: "GR-C4", corps: "Administration", libelle: "Secrétaire Principal", categorie: "C", echelons: 12, indiceDebut: 380, indiceFin: 620 },
  { id: "GR-D1", corps: "Service", libelle: "Agent Administratif", categorie: "D", echelons: 9, indiceDebut: 250, indiceFin: 400 },
  { id: "GR-D2", corps: "Service", libelle: "Technicien", categorie: "D", echelons: 9, indiceDebut: 250, indiceFin: 400 },
];
export const gradeById = (id: string) => GRADES.find((g) => g.id === id);

export const ROLE_LABELS: Record<Role, string> = {
  MINISTRE: "Ministre",
  DIRECTEUR_CABINET: "Directeur de Cabinet",
  SECRETAIRE_GENERAL: "Secrétaire Général",
  INSPECTEUR_GENERAL: "Inspecteur Général",
  SUPER_ADMIN: "Super Administrateur (DGARH)",
  DIRECTEUR_GENERAL: "Directeur Général",
  DIRECTEUR_CENTRAL: "Directeur Central",
  DIRECTEUR_DEPARTEMENTAL: "Directeur Départemental",
  GESTIONNAIRE_RH: "Gestionnaire RH",
  AGENT: "Agent",
};

export type ModuleKey =
  | "dashboard"
  | "agents"
  | "organigramme"
  | "carrieres"
  | "recrutement"
  | "conges"
  | "formations"
  | "evaluations"
  | "discipline"
  | "referentiels"
  | "documents"
  | "rapports"
  | "administration"
  | "mon-dossier";

/** Matrice de droits : R = lecture, W = écriture (inclut lecture), null = aucun accès */
export const DROITS: Record<Role, Partial<Record<ModuleKey, "R" | "W">>> = {
  MINISTRE: { dashboard: "W", agents: "R", organigramme: "R", carrieres: "W", recrutement: "R", conges: "R", formations: "R", evaluations: "R", discipline: "W", referentiels: "R", documents: "R", rapports: "W" },
  DIRECTEUR_CABINET: { dashboard: "W", agents: "R", organigramme: "R", carrieres: "W", recrutement: "R", conges: "R", formations: "R", evaluations: "R", discipline: "R", referentiels: "R", documents: "R", rapports: "W" },
  SECRETAIRE_GENERAL: { dashboard: "W", agents: "W", organigramme: "R", carrieres: "W", recrutement: "W", conges: "R", formations: "W", evaluations: "R", discipline: "W", referentiels: "W", documents: "W", rapports: "W", administration: "W" },
  INSPECTEUR_GENERAL: { dashboard: "R", agents: "R", organigramme: "R", carrieres: "R", recrutement: "R", conges: "R", formations: "R", evaluations: "R", discipline: "R", referentiels: "R", documents: "R", rapports: "R" },
  SUPER_ADMIN: { dashboard: "W", agents: "W", organigramme: "W", carrieres: "W", recrutement: "W", conges: "W", formations: "W", evaluations: "W", discipline: "W", referentiels: "W", documents: "W", rapports: "W", administration: "W" },
  DIRECTEUR_GENERAL: { dashboard: "W", agents: "W", organigramme: "R", carrieres: "W", recrutement: "W", conges: "R", formations: "W", evaluations: "R", discipline: "W", referentiels: "R", documents: "W", rapports: "W" },
  DIRECTEUR_CENTRAL: { dashboard: "R", agents: "W", organigramme: "R", carrieres: "R", recrutement: "R", conges: "W", formations: "R", evaluations: "W", discipline: "R", referentiels: "R", documents: "W", rapports: "R" },
  DIRECTEUR_DEPARTEMENTAL: { dashboard: "R", agents: "W", organigramme: "R", carrieres: "W", recrutement: "R", conges: "W", formations: "W", evaluations: "R", discipline: "R", referentiels: "R", documents: "W", rapports: "R" },
  GESTIONNAIRE_RH: { dashboard: "R", agents: "W", organigramme: "R", carrieres: "W", recrutement: "W", conges: "W", formations: "W", evaluations: "W", discipline: "W", referentiels: "R", documents: "W", rapports: "R" },
  AGENT: { "mon-dossier": "W", conges: "W", formations: "R", evaluations: "R", documents: "R", organigramme: "R" },
};

export const can = (role: Role, mod: ModuleKey, mode: "R" | "W" = "R") => {
  const d = DROITS[role]?.[mod];
  if (!d) return false;
  return mode === "R" ? true : d === "W";
};
