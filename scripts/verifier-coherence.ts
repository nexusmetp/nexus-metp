/**
 * Les chiffres que plusieurs écrans affichent doivent tomber sur le même.
 *
 * Pourquoi ce contrôle existe. `npm run taille` garde la lisibilité,
 * `npm run entites` garde les identifiants ; il manquait le troisième, celui
 * qui garde les **comptes**. Un chiffre faux ne lève rien : ni `tsc`, ni
 * `next build`, ni la console du navigateur. Il s'affiche, il ressemble à un
 * chiffre, et personne ne le recompte.
 *
 * Trois défauts réels lui ont donné naissance, tous trouvés à la main :
 *
 *  - le graphique « Effectifs par direction » du tableau de bord mettait côte
 *    à côte une direction générale et les directions qu'elle contient. Ses
 *    barres totalisaient **4 169 agents pour un ministère qui en compte
 *    3 830** — chaque agent du cabinet et de la DGARH compté deux fois ;
 *  - la liste des niveaux d'organigramme « susceptibles de porter des agents »
 *    existait en trois copies, écrites de mémoire, et les trois oubliaient
 *    division, section, secrétariat et antenne départementale — **472 agents**
 *    qu'aucun filtre ne pouvait isoler ;
 *  - le tableau des emplois n'ouvrait rien de ce que son lien annonçait.
 *
 * Ce ne sont pas des tests unitaires : ce sont des **invariants du domaine**,
 * vérifiés sur le jeu de données que la plateforme sème. Ils disent ce qui
 * doit rester vrai quel que soit l'écran qui le montre.
 */

import { buildDataset } from "../lib/seed";
import { NIVEAUX_PORTEURS } from "../lib/referentiels/grammaire";
import { POSITIONS_HORS_SERVICE, POSITION_LABELS } from "../lib/referentiels/actes";

const jeu = buildDataset();
const entites = jeu.entites;
const parId = new Map(entites.map((e) => [e.id, e]));
const enfantsDe = (id: string) => entites.filter((e) => e.parentId === id && e.actif !== false);

/** Les affectations en vigueur — celles qui n'ont pas de date de fin. */
const enCours = jeu.affectations.filter((a) => !a.dateFin);
const effectifDirect = new Map<string, number>();
enCours.forEach((a) => effectifDirect.set(a.entiteId, (effectifDirect.get(a.entiteId) ?? 0) + 1));

const effectifBranche = (id: string): number => {
  const pile = [id];
  let n = 0;
  for (let i = 0; i < pile.length; i++) {
    n += effectifDirect.get(pile[i]) ?? 0;
    enfantsDe(pile[i]).forEach((e) => pile.push(e.id));
  }
  return n;
};

const echecs: string[] = [];
const verifier = (titre: string, ok: boolean, detail: string) => {
  if (ok) console.log(`  ✓ ${titre}`);
  else { console.log(`  ✗ ${titre}`); echecs.push(`${titre}\n      ${detail}`); }
};

console.log(
  `Cohérence des comptes — ${entites.length} entités, ${jeu.agents.length} agents, `
  + `${enCours.length} affectations en vigueur.\n`
);

/* ------------------------------------------------------------------ */
/* 1. L'organigramme se tient                                          */
/* ------------------------------------------------------------------ */

const orphelines = entites.filter((e) => e.parentId && !parId.has(e.parentId));
verifier(
  "Chaque entité est rattachée à une entité qui existe",
  orphelines.length === 0,
  orphelines.slice(0, 5).map((e) => `${e.id} pend à ${e.parentId}, inconnue`).join("\n      ")
);

const racines = entites.filter((e) => !e.parentId);
verifier(
  "L'organigramme a une racine et une seule",
  racines.length === 1,
  `${racines.length} entités sans parent : ${racines.map((e) => e.sigle).join(", ")}`
);

/* Un cycle rendrait `descendantsDe` infini : l'écran fige sans rien dire. */
const enBoucle = entites.filter((e) => {
  const vus = new Set<string>();
  let c: string | null | undefined = e.id;
  while (c) {
    if (vus.has(c)) return true;
    vus.add(c);
    c = parId.get(c)?.parentId;
  }
  return false;
});
verifier(
  "Aucune entité n'est son propre ancêtre",
  enBoucle.length === 0,
  enBoucle.slice(0, 5).map((e) => e.id).join(", ")
);

/* ------------------------------------------------------------------ */
/* 2. Les effectifs s'additionnent                                     */
/* ------------------------------------------------------------------ */

const racine = racines[0];
const sousLaRacine = racine ? effectifBranche(racine.id) : 0;
verifier(
  "Tout agent affecté relève de la racine du ministère",
  sousLaRacine === enCours.length,
  `${enCours.length} affectations en vigueur, ${sousLaRacine} retrouvées sous ${racine?.sigle}. `
  + `${enCours.length - sousLaRacine} agents sont hors de l'arbre.`
);

/* L'invariant qui manquait au tableau de bord : les structures du premier
   cran, additionnées, valent l'effectif entier. Il tombe dès qu'on mélange
   deux crans de l'organigramme dans un même graphique. */
const premierCran = racine ? enfantsDe(racine.id) : [];
const sommeDuCran = premierCran.reduce((s, e) => s + effectifBranche(e.id), 0);
verifier(
  `Les ${premierCran.length} structures du premier cran totalisent l'effectif entier`,
  sommeDuCran === sousLaRacine,
  premierCran.map((e) => `${e.sigle} ${effectifBranche(e.id)}`).join(" + ")
  + ` = ${sommeDuCran}, attendu ${sousLaRacine}`
);

/* ------------------------------------------------------------------ */
/* 3. Les listes de niveaux couvrent ce que la donnée contient         */
/* ------------------------------------------------------------------ */

const niveauxPeuples = new Map<string, number>();
enCours.forEach((a) => {
  const n = parId.get(a.entiteId)?.niveau ?? "INCONNU";
  niveauxPeuples.set(n, (niveauxPeuples.get(n) ?? 0) + 1);
});
const oublies = [...niveauxPeuples.entries()]
  .filter(([n]) => !NIVEAUX_PORTEURS.includes(n as never));
verifier(
  "Tout niveau qui porte des agents figure dans NIVEAUX_PORTEURS",
  oublies.length === 0,
  oublies.map(([n, c]) => `${n} porte ${c} agents et n'est proposé par aucun filtre`).join("\n      ")
);

/* ------------------------------------------------------------------ */
/* 4. Les positions se répartissent sans trou                          */
/* ------------------------------------------------------------------ */

const naturesConnues = Object.keys(POSITION_LABELS);
const naturesInconnues = [...new Set(jeu.positions.map((p) => p.nature))]
  .filter((n) => !naturesConnues.includes(n));
verifier(
  "Toute position portée par un acte a un libellé",
  naturesInconnues.length === 0,
  naturesInconnues.join(", ")
);
verifier(
  "Les positions « hors service » sont toutes des positions connues",
  POSITIONS_HORS_SERVICE.every((p) => naturesConnues.includes(p)),
  POSITIONS_HORS_SERVICE.filter((p) => !naturesConnues.includes(p)).join(", ")
);

/* ------------------------------------------------------------------ */
/* 5. Ce qui est présenté comme fondé sur un texte l'est               */
/* ------------------------------------------------------------------ */

const texteSansReference = entites.filter((e) => e.provenance === "TEXTE" && !e.reference);
verifier(
  "Aucune entité marquée « TEXTE » n'est sans référence",
  texteSansReference.length === 0,
  texteSansReference.slice(0, 5).map((e) => `${e.id} — ${e.nom}`).join("\n      ")
);

/* ------------------------------------------------------------------ */

console.log("");
if (echecs.length === 0) {
  console.log("Tous les invariants tiennent.");
  process.exit(0);
}
for (const e of echecs) console.error(`  ✗ ${e}`);
console.error(
  `\n${echecs.length} invariant(s) rompu(s). Un chiffre faux ne lève rien : `
  + "il s'affiche, et personne ne le recompte."
);
process.exit(1);
