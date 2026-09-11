import type { CategoriePersonnel, Corps, Grade, RegleCategorie } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Catégories de personnel — cahier §05                                */
/* ------------------------------------------------------------------ */

export const REGLES_CATEGORIE: Record<CategoriePersonnel, RegleCategorie> = {
  FONCTIONNAIRE: {
    libelle: "Fonctionnaire", lien: "Loi n° 68-2022 portant statut général de la fonction publique",
    carriereStatutaire: true, titularisation: true, avancement: true, promotion: true, besoinAscendant: false,
  },
  CONTRACTUEL: {
    libelle: "Contractuel", lien: "Contrat de droit public",
    carriereStatutaire: true, titularisation: false, avancement: false, promotion: false, besoinAscendant: false,
  },
  PRESTATAIRE: {
    libelle: "Prestataire", lien: "Prestation de service",
    carriereStatutaire: false, titularisation: false, avancement: false, promotion: false, besoinAscendant: true,
  },
  VOLONTAIRE: {
    libelle: "Volontaire", lien: "Volontariat",
    carriereStatutaire: false, titularisation: false, avancement: false, promotion: false, besoinAscendant: true,
  },
  VACATAIRE: {
    libelle: "Vacataire", lien: "Vacation horaire",
    carriereStatutaire: false, titularisation: false, avancement: false, promotion: false, besoinAscendant: true,
  },
};

export const CATEGORIES: CategoriePersonnel[] =
  ["FONCTIONNAIRE", "CONTRACTUEL", "PRESTATAIRE", "VOLONTAIRE", "VACATAIRE"];

/* ------------------------------------------------------------------ */
/* Corps et grades — à confirmer sur les statuts particuliers          */
/* ------------------------------------------------------------------ */

export const CORPS: Corps[] = [
  { id: "C-INSP", libelle: "Inspection", categorie: "A", enseignant: false },
  { id: "C-DIR", libelle: "Direction et administration générale", categorie: "A", enseignant: false },
  { id: "C-ADM", libelle: "Administration", categorie: "A", enseignant: false },
  { id: "C-ENS-SUP", libelle: "Enseignement technique — professeurs", categorie: "A", enseignant: true },
  { id: "C-ENS-CERT", libelle: "Enseignement technique — certifiés", categorie: "B", enseignant: true },
  { id: "C-ENC", libelle: "Encadrement administratif", categorie: "B", enseignant: false },
  { id: "C-GEST", libelle: "Gestion administrative", categorie: "C", enseignant: false },
  { id: "C-TECH", libelle: "Technique", categorie: "C", enseignant: false },
  { id: "C-SERV", libelle: "Services", categorie: "D", enseignant: false },
];

export const GRADES: Grade[] = [
  { id: "GR-INSP-1", corpsId: "C-INSP", libelle: "Inspecteur général 1er grade", classes: 3, echelons: 8, indiceDebut: 1000, indiceFin: 1400 },
  { id: "GR-INSP-2", corpsId: "C-INSP", libelle: "Inspecteur général 2e grade", classes: 3, echelons: 8, indiceDebut: 900, indiceFin: 1300 },
  { id: "GR-DIR-DG", corpsId: "C-DIR", libelle: "Directeur général", classes: 2, echelons: 6, indiceDebut: 850, indiceFin: 1200 },
  { id: "GR-DIR-DC", corpsId: "C-DIR", libelle: "Directeur central", classes: 2, echelons: 6, indiceDebut: 800, indiceFin: 1100 },
  { id: "GR-ADM-1", corpsId: "C-ADM", libelle: "Administrateur des services administratifs", classes: 3, echelons: 8, indiceDebut: 720, indiceFin: 1020 },
  { id: "GR-ENS-PT", corpsId: "C-ENS-SUP", libelle: "Professeur technique", classes: 3, echelons: 8, indiceDebut: 700, indiceFin: 1050 },
  { id: "GR-ENS-PTC", corpsId: "C-ENS-CERT", libelle: "Professeur technique certifié", classes: 3, echelons: 8, indiceDebut: 620, indiceFin: 880 },
  { id: "GR-ENC-CS1", corpsId: "C-ENC", libelle: "Chef de service 1er grade", classes: 2, echelons: 8, indiceDebut: 700, indiceFin: 950 },
  { id: "GR-ENC-CS2", corpsId: "C-ENC", libelle: "Chef de service 2e grade", classes: 2, echelons: 8, indiceDebut: 650, indiceFin: 900 },
  { id: "GR-GEST-1", corpsId: "C-GEST", libelle: "Gestionnaire des ressources humaines", classes: 3, echelons: 12, indiceDebut: 400, indiceFin: 650 },
  { id: "GR-GEST-2", corpsId: "C-GEST", libelle: "Comptable", classes: 3, echelons: 12, indiceDebut: 350, indiceFin: 600 },
  { id: "GR-GEST-3", corpsId: "C-GEST", libelle: "Secrétaire principal", classes: 3, echelons: 12, indiceDebut: 380, indiceFin: 620 },
  { id: "GR-TECH-1", corpsId: "C-TECH", libelle: "Technicien supérieur", classes: 3, echelons: 12, indiceDebut: 400, indiceFin: 650 },
  { id: "GR-SERV-1", corpsId: "C-SERV", libelle: "Agent administratif", classes: 2, echelons: 9, indiceDebut: 250, indiceFin: 400 },
  { id: "GR-SERV-2", corpsId: "C-SERV", libelle: "Agent technique", classes: 2, echelons: 9, indiceDebut: 250, indiceFin: 400 },
];

const gradeIndex = new Map(GRADES.map((g) => [g.id, g]));
const corpsIndex = new Map(CORPS.map((c) => [c.id, c]));
export const gradeById = (id?: string) => (id ? gradeIndex.get(id) : undefined);
export const corpsById = (id?: string) => (id ? corpsIndex.get(id) : undefined);
export const categorieStatutaireDe = (gradeId?: string) => corpsById(gradeById(gradeId)?.corpsId)?.categorie;

/* ------------------------------------------------------------------ */
