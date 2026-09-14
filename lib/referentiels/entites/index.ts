import type { Entite } from "@/lib/types";
import { DEPARTEMENTS } from "../geo";
import { MINISTERE_NOM, TEXTES } from "../textes";
import { type E, e } from "./socle";
import { cabinet } from "./cabinet";
import { inspectionGenerale } from "./inspection";
import { dgarh } from "./dgarh";
import {
  directionGeneraleEnseignementProfessionnel, directionGeneraleEnseignementTechnique,
} from "./enseignement";
import { directionGeneraleEquipement } from "./equipement";
import { deconcentration, etablissements } from "./deconcentration";

/* ------------------------------------------------------------------ */
/* L'organigramme du ministère — assemblé depuis les arrêtés           */
/* ------------------------------------------------------------------ */

/**
 * Ce dossier remplace un fichier unique, et la raison n'est pas la taille.
 *
 * L'arborescence tenait dans `entites.ts` parce qu'elle était **fausse et
 * courte** : une seule direction générale sur quatre, un cabinet inventé de
 * toutes pièces, trois inspections aux noms imaginés, un seul réseau
 * départemental sur deux. Lue sur les textes — Journal officiel n° 44-2022 et
 * n° 45-2022, arrêtés n° 25564 à 25572 du 17 octobre 2022 — elle triple.
 *
 * Un fichier par arrêté, donc : chacun se relit en regard de son texte, et
 * une correction se fait là où le texte la porte. L'`index.ts` n'assemble et
 * ne calcule ; il ne déclare rien.
 *
 * **La leçon du chantier.** Presque tout ce qui était faux portait la mention
 * « à vérifier » avec, en référence, « texte non consulté ». La mention était
 * honnête et le résultat inutilisable : personne ne vérifie une hypothèse
 * signalée, on l'oublie. Les textes étaient publics et lisibles. Ce qui reste
 * marqué « à vérifier » aujourd'hui l'est pour une raison précise et écrite —
 * le découpage des inspections interdépartementales, que l'arrêté ne donne
 * pas, et la carte scolaire, qui n'appartient pas à ces textes.
 */

const sommet: E[] = [
  e("ENT-METP", "METP", MINISTERE_NOM, "MINISTERE", null, "TEXTE", TEXTES.DECRET_ORG, "Brazzaville"),
];

/** La semence : l'organigramme tel que les arrêtés d'organisation le fixent. */
export const ENTITES_SEMENCE: Entite[] = [
  ...sommet,
  ...cabinet,
  ...inspectionGenerale,
  ...directionGeneraleEnseignementTechnique,
  ...directionGeneraleEnseignementProfessionnel,
  ...dgarhComplet(),
  ...directionGeneraleEquipement,
  ...deconcentration,
  ...etablissements,
] as Entite[];

/** La direction générale de l'administration et des ressources humaines. */
function dgarhComplet(): E[] {
  return [
    e("ENT-DGARH", "DGARH",
      "Direction générale de l'administration et des ressources humaines",
      "DIRECTION_GENERALE", "ENT-METP", "TEXTE", TEXTES.ARR_25567, "Brazzaville"),
    ...dgarh,
  ];
}
/**
 * L'arborescence vivante. Elle part de la semence puis suit la base :
 * l'administrateur système crée des directions, et tout ce qui calcule un
 * périmètre doit en tenir compte immédiatement. Le tableau garde la même
 * référence pour ne pas invalider les appelants — il est modifié sur place.
 */
export const ENTITES: Entite[] = [...ENTITES_SEMENCE];

export const ETABLISSEMENTS = etablissements as Entite[];
/** Département (direction départementale) dont relève une entité locale. */
export const departementDe = (entiteId?: string | null) =>
  entiteId ? cheminDe(entiteId).find((x) => x.niveau === "DIRECTION_DEPARTEMENTALE") : undefined;

/* — Accès à l'arborescence — */

let parIdIndex = new Map<string, Entite>();
/**
 * Les enfants, indexés par parent — et ce n'est pas une optimisation de
 * confort.
 *
 * `enfantsDe` balayait le tableau entier à chaque appel. `descendantsDe`
 * l'appelle une fois par nœud visité : parcourir une branche coûtait donc le
 * carré du nombre d'entités. Tant que le référentiel tenait dans cent
 * cinquante lignes, personne ne l'a vu. En le rebâtissant sur les arrêtés, il
 * est passé à six cent trente-neuf : le carré a été multiplié par dix-huit, et
 * le tableau de bord — qui appelle `descendantsDe` une fois par acte — a figé
 * l'onglet pendant huit minutes de calcul, sans un message.
 *
 * Avec cet index, descendre une branche coûte la taille de la branche. Les
 * deux index sont refaits ensemble dans `hydraterEntites` : ils ne peuvent
 * pas diverger.
 */
let parParentIndex = new Map<string, Entite[]>();

function reindexer(): void {
  parIdIndex = new Map(ENTITES.map((x) => [x.id, x]));
  parParentIndex = new Map();
  for (const x of ENTITES) {
    if (x.actif === false || !x.parentId) continue;
    const fratrie = parParentIndex.get(x.parentId);
    if (fratrie) fratrie.push(x);
    else parParentIndex.set(x.parentId, [x]);
  }
}
reindexer();

/**
 * Remplace l'arborescence vivante par celle de la base. Appelé une fois au
 * démarrage, puis après chaque création ou modification d'entité.
 */
export function hydraterEntites(liste: Entite[]): void {
  if (!liste?.length) return;
  ENTITES.splice(0, ENTITES.length, ...liste);
  reindexer();
}

export const entiteById = (id?: string | null) => (id ? parIdIndex.get(id) : undefined);
/* La copie est délibérée : l'index est partagé, et un appelant qui trie ou
   filtre sa liste d'enfants ne doit pas réordonner l'arbre de tout le monde. */
export const enfantsDe = (id: string) => [...(parParentIndex.get(id) ?? [])];

/** Toutes les entités sous `id`, `id` compris. Base du calcul de périmètre. §11 */
export function descendantsDe(id: string): Entite[] {
  const out: Entite[] = [];
  const pile = [id];
  while (pile.length) {
    const cur = pile.pop()!;
    const ent = parIdIndex.get(cur);
    if (ent) out.push(ent);
    const fratrie = parParentIndex.get(cur);
    if (fratrie) for (const c of fratrie) pile.push(c.id);
  }
  return out;
}

/** Chemin depuis la racine, pour l'affichage « METP › DGARH › DPCEF › … ». */
export function cheminDe(id: string): Entite[] {
  const out: Entite[] = [];
  let cur = parIdIndex.get(id);
  while (cur) {
    out.unshift(cur);
    cur = cur.parentId ? parIdIndex.get(cur.parentId) : undefined;
  }
  return out;
}

/**
 * Situe une entité par le chef-lieu qu'elle porte. Plusieurs entités partagent
 * le même chef-lieu ; un décalage déterministe, tiré de leur identifiant, les
 * empêche de se superposer exactement sans les déplacer d'une ville à l'autre.
 */
export function coordonneesDe(entite: Entite): { lat: number; lon: number } | undefined {
  // Une localisation saisie prime sur toute reconstitution : c'est la seule
  // qui dise où la structure se trouve vraiment.
  if (typeof entite.lat === "number" && typeof entite.lon === "number") {
    return { lat: entite.lat, lon: entite.lon };
  }
  const d = entite.ville ? DEPARTEMENTS.find((x) => x.chefLieu === entite.ville) : undefined;
  if (!d) return undefined;
  let h = 0;
  for (let i = 0; i < entite.id.length; i++) h = (h * 31 + entite.id.charCodeAt(i)) & 0xffff;
  const angle = (h / 0xffff) * Math.PI * 2;
  const rayon = entite.niveau === "DIRECTION_DEPARTEMENTALE" ? 0 : 0.07 + (h % 7) * 0.018;
  return { lat: d.lat + Math.sin(angle) * rayon, lon: d.lon + Math.cos(angle) * rayon };
}

export const DGARH_ID = "ENT-DGARH";
export const METP_ID = "ENT-METP";
export const CABINET_ID = "ENT-CAB";

/**
 * Périmètre de gestion des ressources humaines de la DGARH : le ministère
 * entier, cabinet compris. La direction générale gère le personnel de toutes
 * les entités, pas seulement celui de sa propre arborescence — c'est sa
 * raison d'être. §02
 */
export const PERIMETRE_RH_ID = METP_ID;
export const entitesDGARH = () => descendantsDe(DGARH_ID);
export const bureaux = () => ENTITES.filter((x) => x.niveau === "BUREAU" && x.actif !== false);
export const SERVICES = ENTITES.filter((x) => x.niveau === "SERVICE");

export const NIVEAU_LABELS: Record<Entite["niveau"], string> = {
  MINISTERE: "Ministère",
  CABINET: "Cabinet",
  INSPECTION_GENERALE: "Inspection générale",
  DIRECTION_GENERALE: "Direction générale",
  SECRETARIAT: "Secrétariat",
  DIRECTION: "Direction",
  SERVICE: "Service",
  DIVISION: "Division",
  BUREAU: "Bureau",
  SECTION: "Section",
  INSPECTION_INTERDEPARTEMENTALE: "Inspection interdépartementale",
  ANTENNE_DEPARTEMENTALE: "Antenne départementale",
  DIRECTION_DEPARTEMENTALE: "Direction départementale",
  ETABLISSEMENT: "Établissement",
};
