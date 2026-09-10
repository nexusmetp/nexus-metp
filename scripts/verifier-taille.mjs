#!/usr/bin/env node
/**
 * Règle de taille — 500 lignes par fichier.
 *
 * Un fichier qu'on ne peut pas lire d'un bout à l'autre ne se relit pas : on
 * n'y corrige qu'à l'aveugle. La règle du projet est donc simple et vérifiable
 * par une machine, pour qu'elle ne dépende pas de la vigilance de chacun.
 *
 *   npm run taille        -> échoue si un fichier dépasse la limite
 *   npm run taille -- -v  -> affiche aussi les fichiers qui s'en approchent
 *
 * Sortie : code 1 dès qu'un fichier est en infraction, ce qui suffit à faire
 * échouer un hook de pré-commit ou une intégration continue.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Au-delà, le fichier est en infraction. */
const LIMITE = 500;
/** En deçà de la limite mais au-dessus, le fichier est signalé comme à surveiller. */
const VIGILANCE = 450;

/** Racines auditées : tout le code que nous écrivons nous-mêmes. */
const RACINES = ["app", "components", "lib", "hooks", "scripts"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];

/** Répertoires jamais parcourus. */
const IGNORES = new Set(["node_modules", ".next", ".git", "dist", "build", "out"]);

/**
 * Dérogations explicites, avec leur motif. Une dérogation sans motif écrit
 * n'en est pas une : on la relit à chaque fois qu'on lit ce fichier.
 */
const DEROGATIONS = new Map([
  [
    "components/ui/sidebar.jsx",
    "composant shadcn/ui repris tel quel — le découper interdirait de le régénérer",
  ],
]);

const fichiers = [];

const parcourir = (dossier) => {
  let entrees;
  try {
    entrees = readdirSync(dossier, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entree of entrees) {
    if (IGNORES.has(entree.name)) continue;
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) parcourir(chemin);
    else if (EXTENSIONS.some((e) => entree.name.endsWith(e))) fichiers.push(chemin);
  }
};

for (const racine of RACINES) {
  try {
    if (statSync(racine).isDirectory()) parcourir(racine);
  } catch {
    /* racine absente : rien à auditer */
  }
}

const mesures = fichiers
  .map((chemin) => {
    const relatif = relative(process.cwd(), chemin).split(sep).join("/");
    return {
      chemin: relatif,
      lignes: readFileSync(chemin, "utf8").split("\n").length,
      derogation: DEROGATIONS.get(relatif),
    };
  })
  .sort((a, b) => b.lignes - a.lignes);

const fautifs = mesures.filter((m) => m.lignes > LIMITE && !m.derogation);
const surveilles = mesures.filter((m) => m.lignes > VIGILANCE && m.lignes <= LIMITE);
const derogations = mesures.filter((m) => m.derogation && m.lignes > LIMITE);
const bavard = process.argv.includes("-v") || process.argv.includes("--verbeux");

const ligne = (m) => `  ${String(m.lignes).padStart(4)}  ${m.chemin}`;

console.log(`Règle de taille : ${LIMITE} lignes — ${mesures.length} fichiers audités.`);

if (derogations.length) {
  console.log(`\nDérogations (${derogations.length}) :`);
  for (const m of derogations) console.log(`${ligne(m)}\n        ${m.derogation}`);
}

if (bavard && surveilles.length) {
  console.log(`\nÀ surveiller — au-dessus de ${VIGILANCE} lignes (${surveilles.length}) :`);
  for (const m of surveilles) console.log(ligne(m));
}

if (fautifs.length) {
  console.error(`\nINFRACTION — ${fautifs.length} fichier(s) au-dessus de ${LIMITE} lignes :`);
  for (const m of fautifs) console.error(ligne(m));
  console.error(
    "\nDécoupez-les : extrayez un sous-dossier du même nom, répartissez le code,\n" +
    "et laissez un index.ts qui réexporte — les appelants n'ont rien à changer.\n"
  );
  process.exit(1);
}

const plusGros = mesures[0];
console.log(`\nAucune infraction. Plus gros fichier : ${plusGros.chemin} (${plusGros.lignes} lignes).`);
