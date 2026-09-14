import type { Agent, NiveauEntite, Role } from "@/lib/types";

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
 * Profil **proposé** selon le niveau de l'entité que l'on vient de créer.
 *
 * Une proposition, non une règle : la correspondance entre un niveau
 * d'organigramme et un profil d'accès relève de l'organisation du ministère,
 * pas de l'outil. Elle évite de choisir au jugé dans une liste de quinze, et
 * se corrige d'un clic.
 */
export const ROLE_ATTENDU: Partial<Record<NiveauEntite, Role>> = {
  MINISTERE: "MINISTRE",
  /* Le cabinet est dirigé par le directeur de cabinet, dont le profil porte
     ce nom et ce rang. Y proposer « directeur central » le plaçait deux
     marches en dessous de sa fonction réelle, et lui interdisait de désigner
     les chefs de service de son propre cabinet. */
  CABINET: "CABINET",
  DIRECTION_GENERALE: "DIRECTEUR_GENERAL",
  /* L'inspection générale est dirigée par un inspecteur, pas par un directeur
     central : c'est un corps distinct, et la confusion se voyait à l'écran. */
  INSPECTION_GENERALE: "INSPECTEUR",
  SECRETARIAT: "CHEF_SERVICE",
  DIRECTION: "DIRECTEUR_CENTRAL",
  SERVICE: "CHEF_SERVICE",
  BUREAU: "CHEF_BUREAU",
  DIRECTION_DEPARTEMENTALE: "DIRECTEUR_DEPARTEMENTAL",
  INSPECTION_INTERDEPARTEMENTALE: "DIRECTEUR_DEPARTEMENTAL",
  ANTENNE_DEPARTEMENTALE: "CHEF_SERVICE",
  ETABLISSEMENT: "CHEF_ETABLISSEMENT",
};

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

export const videResponsable = {
  nom: "", prenom: "", sexe: "M" as Agent["sexe"], dateNaissance: "",
  email: "", telephone: "", fonction: "",
  categorie: "FONCTIONNAIRE" as Agent["categorie"],
  dateEffet: new Date().toISOString().slice(0, 10),
  motif: "",
  role: "DIRECTEUR_CENTRAL" as string,
};

/** Bornes du territoire congolais : refuser une coordonnée hors emprise vaut mieux
 *  que planter un marqueur au milieu de l'Atlantique. */
export function coordonneeValide(v: string): boolean {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && Math.abs(n) <= 180;
}
