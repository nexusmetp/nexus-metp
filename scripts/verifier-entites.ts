/**
 * Tout identifiant d'entité écrit en dur dans le code doit exister.
 *
 * Pourquoi ce contrôle existe. Un identifiant d'entité est une **chaîne de
 * caractères** : `"ENT-DD-02"`. `npx tsc --noEmit` ne la vérifie pas, `next
 * build` non plus, et rien ne lève à l'exécution — la fonction qui la reçoit
 * rend simplement `undefined`, l'écran affiche zéro, et le zéro ressemble à un
 * chiffre.
 *
 * C'est arrivé. La réécriture du référentiel sur les arrêtés n° 25564 à 25572
 * a renommé les directions départementales : `ENT-DD-01` est devenu
 * `ENT-DDET-01` et `ENT-DDEP-01`, puisqu'il en existe deux séries. La vue
 * nationale, qui **fabriquait** l'identifiant à partir d'un index, a cessé de
 * trouver quoi que ce soit : elle annonçait 355 agents déployés en département
 * là où il y en a près de deux mille. Aucune erreur, aucun avertissement, un
 * chiffre faux. Les offres de formation, elles, pendaient à `ENT-SPC-BFC`, un
 * bureau qui n'existe dans aucun texte.
 *
 * Les commentaires sont retirés avant l'examen : ils citent à dessein des
 * identifiants disparus — c'est même ainsi qu'on explique pourquoi ils l'ont
 * été.
 *
 *   npx tsx scripts/verifier-entites.ts     (ou : npm run entites)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildDataset } from "../lib/seed";

const DOSSIERS = ["app", "components", "lib"];
const IGNORES = new Set(["node_modules", ".next", ".git", "dist"]);

/** Retire commentaires de bloc et de ligne, pour ne lire que du code. */
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

function fichiersTypeScript(racine: string, out: string[] = []): string[] {
  for (const nom of readdirSync(racine)) {
    if (IGNORES.has(nom)) continue;
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) fichiersTypeScript(chemin, out);
    else if (/\.tsx?$/.test(chemin)) out.push(chemin);
  }
  return out;
}

const connus = new Set(buildDataset().entites.map((e) => e.id));
const fichiers = DOSSIERS.flatMap((d) => fichiersTypeScript(d));

const morts: { fichier: string; ligne: number; id: string }[] = [];
for (const fichier of fichiers) {
  const lignes = sansCommentaires(readFileSync(fichier, "utf8")).split("\n");
  lignes.forEach((ligne, i) => {
    for (const m of ligne.matchAll(/["'`](ENT-[A-Z0-9-]+)["'`]/g)) {
      if (!connus.has(m[1])) morts.push({ fichier, ligne: i + 1, id: m[1] });
    }
  });
}

console.log(
  `Identifiants d'entité — ${connus.size} entités au référentiel, `
  + `${fichiers.length} fichiers examinés.\n`
);

if (morts.length === 0) {
  console.log("Aucun identifiant mort.");
  process.exit(0);
}

for (const m of morts) console.error(`  ${m.fichier}:${m.ligne}  ${m.id}`);
console.error(
  `\n${morts.length} identifiant(s) ne désigne(nt) aucune entité. `
  + "Ils ne lèveront jamais d'erreur : ils rendront un chiffre faux."
);
process.exit(1);
