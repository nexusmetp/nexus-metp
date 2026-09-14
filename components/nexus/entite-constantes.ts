import type { Agent, NiveauEntite } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Constantes de la création et de la nomination                       */
/* ------------------------------------------------------------------ */

/**
 * Sorties du composant pour la seule raison qui vaille dans ce dépôt : la
 * règle des 500 lignes. Ce sont des tables, pas du rendu — elles se relisent
 * mieux seules, et `gestion-entite.tsx` les réexporte pour qu'aucun site
 * d'appel ne bouge.
 */

/**
 * Tous les niveaux qu'on peut créer, tous parents confondus. Le ministère
 * n'en est pas : il ne se crée pas, il préexiste à la plateforme.
 *
 * Ce n'est plus la liste que l'écran propose — celle-là dépend du parent
 * choisi et vient de `niveauxCreablesSous`. Elle ne sert qu'à décrire
 * l'ensemble, là où aucun parent n'est encore désigné.
 */
export const NIVEAUX_CREABLES: NiveauEntite[] = [
  "CABINET", "DIRECTION_GENERALE", "INSPECTION_GENERALE", "SECRETARIAT", "DIRECTION",
  "SERVICE", "BUREAU", "DIRECTION_DEPARTEMENTALE",
  "INSPECTION_INTERDEPARTEMENTALE", "ANTENNE_DEPARTEMENTALE", "ETABLISSEMENT",
];

/**
 * Le profil proposé selon le niveau vient du référentiel : le semis le lit
 * pour pourvoir les entités, l'écran pour préremplir la liste. Réexporté ici
 * pour qu'aucun site d'appel ne bouge.
 */
export { ROLE_ATTENDU } from "@/lib/referentiels";

/** Les catégories de personnel, et leur libellé. Le référentiel fait foi. */
export const CATEGORIES: Agent["categorie"][] = [
  "FONCTIONNAIRE", "CONTRACTUEL", "PRESTATAIRE", "VOLONTAIRE", "VACATAIRE",
];

export const LIBELLES_CATEGORIE: Record<Agent["categorie"], string> = {
  FONCTIONNAIRE: "Fonctionnaire",
  CONTRACTUEL: "Contractuel",
  PRESTATAIRE: "Prestataire",
  VOLONTAIRE: "Volontaire",
  VACATAIRE: "Vacataire",
};

export const videEntite = {
  sigle: "", nom: "", code: "", niveau: "DIRECTION" as NiveauEntite,
  parentId: "ENT-METP", ville: "", reference: "", lat: "", lon: "",
};

/**
 * Les champs de la désignation.
 *
 * `source` décide de la moitié du formulaire : nommer quelqu'un qui sert déjà
 * dans l'entité — le cas ordinaire — ou inscrire une personne au fichier, ce
 * qui ne se justifie que pour une entité qui vient de naître.
 */
/**
 * Le responsable en fonction, quand la désignation est une relève.
 *
 * Il vit ici et non dans le crochet : le dialogue le lit, le crochet le pose,
 * et les faire s'importer l'un l'autre fermerait le cercle.
 */
export interface Sortant {
  nom: string;
  profil: string;
  agentId?: string | null;
}

export interface ChampsResponsable {
  source: "EN_POSTE" | "A_INSCRIRE";
  /** Renseigné en mode « en poste » : l'agent choisi dans l'entité. */
  agentId: string;
  nom: string;
  prenom: string;
  sexe: Agent["sexe"];
  dateNaissance: string;
  email: string;
  telephone: string;
  fonction: string;
  categorie: Agent["categorie"];
  dateEffet: string;
  motif: string;
  role: string;
}

export const videResponsable: ChampsResponsable = {
  source: "EN_POSTE",
  agentId: "",
  nom: "", prenom: "", sexe: "M", dateNaissance: "",
  email: "", telephone: "", fonction: "",
  categorie: "FONCTIONNAIRE",
  dateEffet: new Date().toISOString().slice(0, 10),
  motif: "",
  role: "DIRECTEUR_CENTRAL",
};

/** Bornes du territoire congolais : refuser une coordonnée hors emprise vaut mieux
 *  que planter un marqueur au milieu de l'Atlantique. */
export function coordonneeValide(v: string): boolean {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && Math.abs(n) <= 180;
}
