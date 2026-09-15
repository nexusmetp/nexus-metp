import type { Entite } from "@/lib/types";
import { ENTITES } from "../entites";
import { CABINET } from "./cabinet";
import { DECONCENTRATION } from "./deconcentration";
import { DGARH } from "./dgarh";
import { ENSEIGNEMENT } from "./enseignement";
import { EQUIPEMENT } from "./equipement";
import { INSPECTION } from "./inspection";
import type { Attribution, AttributionsParTexte } from "./socle";

export type { Attribution, AttributionsParTexte } from "./socle";

/* ------------------------------------------------------------------ */
/* Retrouver les attributions d'une entité                             */
/* ------------------------------------------------------------------ */

const TOUTES: AttributionsParTexte = {
  ...CABINET, ...DGARH, ...ENSEIGNEMENT, ...EQUIPEMENT, ...INSPECTION, ...DECONCENTRATION,
};

/** L'intitulé, réduit à ce qui l'identifie : casse, accents et articles ôtés. */
const nu = (s: string) => s
  .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  /* « Direction départementale de l'enseignement technique — Bouenza » : le
     département est notre ajout, le texte n'en nomme aucun. On le retire pour
     retrouver la structure que l'arrêté décrit. */
  .split(" — ")[0]
  .replace(/^(le |la |les |l'|du |de la |des |de l'|d')/, "")
  .replace(/\(.*?\)/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

/**
 * Le texte décrit **un** exemplaire au pluriel, la plateforme en porte trente.
 *
 * « Les directions départementales de l'enseignement technique sont chargées
 * de… » vaut pour chacune des quinze, et chacune s'appelle chez nous « la
 * direction départementale … ». Sans cette forme singulière, l'article existe
 * dans le fichier et n'est jamais trouvé.
 */
const PLURIELS: Record<string, string> = {
  directions: "direction", inspections: "inspection", antennes: "antenne",
  services: "service", bureaux: "bureau", divisions: "division", sections: "section",
};

const singulier = (cle: string) => {
  const mots = cle.split(" ");
  const tete = PLURIELS[mots[0]];
  if (!tete) return cle;
  mots[0] = tete;
  // L'adjectif qui suit s'accorde : « départementales » -> « départementale ».
  if (mots[1]?.endsWith("s")) mots[1] = mots[1].slice(0, -1);
  return mots.join(" ");
};

/* L'index est construit une fois, à plat : arrêté + intitulé réduit. */
/* L'entité par identifiant, pour retrouver le parent sans passer par
   `entiteById` — qui vit dans le même paquet et créerait un cycle. */
const PAR_ID = new Map(ENTITES.map((e) => [e.id, e]));

const parCle = new Map<string, Attribution>();
for (const [arrete, structures] of Object.entries(TOUTES)) {
  for (const [intitule, attribution] of Object.entries(structures)) {
    const cle = intitule.includes(" > ")
      ? intitule.split(" > ").map(nu).join(" > ")
      : nu(intitule);
    parCle.set(`${arrete}|${cle}`, attribution);
    const sing = singulier(cle);
    if (sing !== cle && !parCle.has(`${arrete}|${sing}`)) {
      parCle.set(`${arrete}|${sing}`, attribution);
    }
  }
}

/**
 * Les intitulés que le Journal officiel écrit autrement que la plateforme.
 *
 * Un seul cas, et il tient à une faute d'accord du Journal : l'article 14 de
 * l'arrêté n° 25564 écrit « bureau des certificats des études d'aptitude
 * professionnel ». Le référentiel garde l'accord correct — « professionnelle »,
 * comme le certificat d'aptitude professionnelle du droit commun — et c'est
 * ici, et nulle part ailleurs, qu'on reconnaît la graphie du texte. Corriger
 * le texte en silence serait pire ; le recopier fautif aussi.
 */
const GRAPHIES_DU_TEXTE: Record<string, string> = {
  "bureau des certificats des etudes d aptitude professionnelle":
    "bureau des certificats des etudes d aptitude professionnel",
};

/** Le numéro de l'arrêté que porte la référence d'une entité. */
const numeroDe = (reference?: string | null) =>
  reference?.match(/n°\s?(\d{5})/)?.[1] ?? null;

export interface FicheAttributions {
  /** L'arrêté, tel qu'on le cite. */
  reference: string;
  /** L'article qui fixe ces attributions. */
  article: number;
  /** Les attributions, dans l'ordre du texte. Vide si le texte renvoie ailleurs. */
  missions: string[];
  /**
   * Vrai quand l'article nomme la structure et renvoie à d'autres textes —
   * « la direction des études et de la planification est régie par des textes
   * spécifiques » (art. 3). Ce n'est pas une lacune de la plateforme, c'est
   * ce que le texte dit, et l'écran doit le dire à son tour.
   */
  renvoiTexteSpecifique: boolean;
}

/**
 * Pourquoi cette entité n'a pas d'attributions — de quoi l'écrire à l'écran.
 *
 * Soixante-treize entités sur six cent trente-neuf n'en ont pas, et aucune
 * par oubli. Un cadre vide donnerait à croire à une donnée manquante ; la
 * phrase dit laquelle des trois raisons s'applique.
 */
export function motifSansAttributions(entite?: Entite | null): string | null {
  if (!entite || attributionsDe(entite)) return null;
  if (entite.niveau === "ETABLISSEMENT") {
    return "Les établissements ne sont régis par aucun des neuf arrêtés d'organisation "
      + "du 17 octobre 2022 : leur organisation relève de la carte scolaire, qui n'est pas publiée.";
  }
  if (["MINISTERE", "CABINET", "DIRECTION_GENERALE", "INSPECTION_GENERALE"].includes(entite.niveau)) {
    return "Les arrêtés du 17 octobre 2022 organisent les services et les bureaux ; les "
      + "attributions de cet échelon sont fixées par les décrets de mars 2022, dont le "
      + "dispositif n'a pas été consulté.";
  }
  if (["INSPECTION_INTERDEPARTEMENTALE", "ANTENNE_DEPARTEMENTALE"].includes(entite.niveau)) {
    return "L'arrêté n° 25570 définit cette structure et fixe les attributions de chacune de "
      + "ses divisions, sans lui en assigner en propre.";
  }
  return "Aucun article des arrêtés d'organisation ne décrit cette entité. "
    + "Elle a été créée depuis la plateforme, ou son intitulé diffère de celui du texte.";
}

/**
 * Ce dont cette entité est chargée, d'après son arrêté — `null` si le texte
 * ne la décrit pas.
 *
 * `null` est un cas ordinaire et non une lacune : le ministère lui-même, les
 * établissements scolaires — qu'aucun de ces neuf arrêtés ne régit — et toute
 * entité créée depuis l'application n'ont pas d'article. L'écran doit le dire
 * plutôt que d'afficher un cadre vide.
 */
export function attributionsDe(entite?: Entite | null): FicheAttributions | null {
  if (!entite) return null;
  const numero = numeroDe(entite.reference);
  if (!numero) return null;
  /* Le parent d'abord : « bureau du traitement » existe au service des bourses
     et au service des aides sociales du même arrêté, et seul le service dit
     duquel il s'agit. Le nom seul ensuite, pour les milliers de cas où il est
     unique. */
  const parent = entite.parentId ? PAR_ID.get(entite.parentId) : undefined;
  const propre = nu(entite.nom);
  const trouve = (parent && parCle.get(`${numero}|${nu(parent.nom)} > ${propre}`))
    ?? parCle.get(`${numero}|${propre}`)
    ?? parCle.get(`${numero}|${GRAPHIES_DU_TEXTE[propre] ?? propre}`);
  if (!trouve) return null;
  const [article, ...missions] = trouve;
  return {
    reference: entite.reference!,
    article,
    missions,
    renvoiTexteSpecifique: missions.length === 0,
  };
}

/** Combien d'entités le texte décrit — pour les écrans qui comptent. */
export const NOMBRE_STRUCTURES_DECRITES = parCle.size;
