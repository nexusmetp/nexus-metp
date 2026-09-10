/** Pièces communes à tous les modèles : timbre, visas, dates, signature. */

import { cheminDe, entiteById, DGARH_ID, METP_ID } from "@/lib/referentiels";

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « 14 novembre 2026 » — la forme des dates dans un acte administratif. */
export function dateLongue(d?: string | null): string {
  if (!d) return "……………";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const j = dt.getDate();
  return `${j === 1 ? "1er" : j} ${MOIS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export const aujourdHui = () => new Date().toISOString().slice(0, 10);

export const PAYS = "République du Congo";
export const MINISTERE = "Ministère de l'enseignement technique et professionnel";

/**
 * Timbre : la chaîne hiérarchique remontée depuis l'entité émettrice.
 * C'est elle qui dit, en haut à gauche, d'où le document sort.
 */
export function timbreDe(entiteId?: string | null): string[] {
  const lignes = [PAYS];
  const chemin = entiteId ? cheminDe(entiteId) : [];
  if (!chemin.length) return [...lignes, MINISTERE];
  // Le ministère ouvre toujours le timbre, sous son nom complet.
  lignes.push(MINISTERE);
  chemin.slice(1).forEach((e) => lignes.push(e.nom));
  return lignes;
}

/** Visas communs. Les textes cités sont réels et référencés au fonds (§18). */
export const VISA_CONSTITUTION = "Vu la Constitution du 25 octobre 2015";
export const VISA_STATUT =
  "Vu la loi n° 68-2022 du 16 août 2022 portant statut général de la fonction publique";
export const VISA_ARR_DGARH =
  "Vu l'arrêté n° 25567 du 17 octobre 2022 fixant les attributions et l'organisation "
  + "des services et des bureaux de la direction générale de l'administration et des ressources humaines";

export const VISAS_SOCLE = [VISA_CONSTITUTION, VISA_STATUT, VISA_ARR_DGARH];

/**
 * Mention portée sur chaque document produit par la maquette.
 *
 * Un document administratif qui ne dit pas qu'il est un essai peut être
 * pris pour un vrai : la mention est donc obligatoire, non désactivable,
 * et rendue sur le papier comme à l'écran.
 */
export const AVERTISSEMENT =
  "Document produit par NEXUS-METP à partir de données de démonstration. "
  + "Il ne constitue pas un acte administratif : il n'a été ni signé, ni enregistré, "
  + "ni publié au Journal officiel.";

export const AMPLIATIONS_USUELLES = [
  "Ministère de la fonction publique, du travail et de la sécurité sociale",
  "Direction générale de l'administration et des ressources humaines",
  "Direction des ressources humaines — dossier de l'intéressé(e)",
  "Intéressé(e)",
  "Journal officiel",
];

/** Qualité du signataire, déduite de l'entité qui émet. */
export function qualiteSignataire(entiteId?: string | null): string {
  const e = entiteId ? entiteById(entiteId) : null;
  if (!e) return "Le directeur général de l'administration et des ressources humaines";
  if (e.id === METP_ID) return "Le ministre de l'enseignement technique et professionnel";
  if (e.id === DGARH_ID) return "Le directeur général de l'administration et des ressources humaines";
  switch (e.niveau) {
    case "DIRECTION_GENERALE": return `Le directeur général — ${e.sigle}`;
    case "DIRECTION":
    case "DIRECTION_DEPARTEMENTALE": return `Le directeur — ${e.sigle}`;
    case "SERVICE": return `Le chef de service — ${e.sigle}`;
    case "BUREAU": return `Le chef de bureau — ${e.sigle}`;
    default: return `Le responsable — ${e.sigle}`;
  }
}

/** Numéro d'ordre stable : deux consultations du même document le rendent identique. */
export function numeroDocument(prefixe: string, graine: string, annee = new Date().getFullYear()) {
  let h = 7;
  for (let i = 0; i < graine.length; i++) h = (h * 31 + graine.charCodeAt(i)) >>> 0;
  return `${prefixe}-${String(h % 9000 + 1000)}/METP/DGARH-${annee}`;
}
