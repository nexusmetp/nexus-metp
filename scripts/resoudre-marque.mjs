/**
 * Résout les fichiers de marque, une fois, avant la construction.
 *
 * `public/LISEZMOI.md` promet qu'on dépose un fichier officiel dans /public et
 * que « la première présente gagne ». Le code tenait cette promesse à
 * l'exécution, et le prix était lourd :
 *
 *  - les armoiries et le bloc-marque étaient cherchés par une cascade de
 *    <img> qui essayait chaque nom et attendait l'erreur. Six requêtes
 *    perdues à chaque ouverture de page, et un journal serveur constellé de
 *    404 qui donnaient à croire que l'application était cassée ;
 *  - le fond était pire. `background-image` avec plusieurs `url()` n'est pas
 *    une cascade : CSS les EMPILE. Le navigateur téléchargeait les cinq fonds
 *    présents — 2,4 Mo — pour n'en afficher qu'un de 122 Ko, sur l'écran
 *    d'ouverture, c'est-à-dire au pire endroit possible.
 *
 * On résout donc ici, à la construction, en lisant /public. La promesse tient :
 * un fichier déposé prime toujours, il prend effet à la construction suivante
 * — celle qu'on fait de toute façon pour déployer.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(RACINE, "public");
const SORTIE = path.join(RACINE, "lib", "referentiels", "marque.ts");

/** L'ordre déclaré, celui que documente public/LISEZMOI.md. */
const CASCADES = {
  ARMOIRIES_SOURCES: ["/amoirie.png", "/armoiries-congo.png", "/armoiries-congo.svg"],
  LOGO_SOURCES: ["/metplogo.webp", "/metplogo.png", "/logo-metp.svg"],
  // Le bâtiment du ministère, et lui seul. Il a remplacé la photographie du
  // bureau du ministre : c'est la maison qu'on reconnaît, et la façade porte
  // son nom. Les cinq anciens fonds ont été retirés de /public avec leurs
  // noms — 2,4 Mo qui ne servaient plus, et une cascade qui mentait sur ce
  // qu'elle proposait.
  FONDS_MINISTERE: ["/batiment-metp.webp", "/batiment-metp.jpg", "/batiment-metp.png"],
  DRAPEAUX: ["/drapeau-congo.svg"],
};

const existe = async (f) =>
  fs.access(path.join(PUBLIC, f.replace(/^\//, ""))).then(() => true, () => false);

const presents = async (liste) => {
  const out = [];
  for (const f of liste) if (await existe(f)) out.push(f);
  return out;
};

const [armoiries, logos, fonds, drapeaux] = await Promise.all([
  presents(CASCADES.ARMOIRIES_SOURCES),
  presents(CASCADES.LOGO_SOURCES),
  presents(CASCADES.FONDS_MINISTERE),
  presents(CASCADES.DRAPEAUX),
]);

const liste = (v) => "[" + v.map((x) => JSON.stringify(x)).join(", ") + "] as const";

const contenu = `/**
 * ENGENDRÉ par scripts/resoudre-marque.mjs — ne pas modifier à la main.
 *
 * Les fichiers de marque réellement présents dans /public, dans l'ordre
 * déclaré par public/LISEZMOI.md. Déposez un fichier officiel, reconstruisez :
 * il prend sa place ici et prime sur les suivants.
 *
 * Les cascades gardent plusieurs entrées quand plusieurs fichiers existent :
 * le composant essaie la suivante si l'une devient illisible après coup. Ce
 * qui a disparu, ce sont les noms qui n'ont jamais existé — et les requêtes
 * perdues qu'ils coûtaient à chaque ouverture de page.
 */

export const ARMOIRIES_SOURCES = ${liste(armoiries)};
export const LOGO_SOURCES = ${liste(logos)};
export const DRAPEAU_URL = ${JSON.stringify(drapeaux[0] ?? "")};

/** Le fond de l'écran d'ouverture et de la connexion : un seul, le premier trouvé. */
export const FOND_MINISTERE = ${JSON.stringify(fonds[0] ?? "")};
`;

const ancien = await fs.readFile(SORTIE, "utf8").catch(() => null);
if (ancien === contenu) {
  console.log("Marque : rien n'a changé dans /public.");
} else {
  await fs.writeFile(SORTIE, contenu);
  console.log(
    `Marque : armoiries ${armoiries[0] ?? "(aucune)"}, ` +
    `bloc-marque ${logos[0] ?? "(composé)"}, fond ${fonds[0] ?? "(aucun)"}.`
  );
}
if (fonds.length > 1) {
  console.log(`  ${fonds.length - 1} autre(s) fond(s) présent(s), non servis : ${fonds.slice(1).join(", ")}`);
}
