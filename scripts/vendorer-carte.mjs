/**
 * Dépose le travailleur de MapLibre dans /public.
 *
 * MapLibre 6 charge son travailleur par une adresse calculée depuis
 * `import.meta.url`. Une fois le paquet assemblé par le constructeur, cette
 * adresse pointe sur le morceau produit, où le fichier n'existe pas : la carte
 * échoue alors à l'ouverture, sans rien dire. On sert donc le travailleur
 * depuis /public, et `moteur.ts` l'annonce au moteur par `setWorkerUrl`.
 *
 * Les fichiers ne sont pas versionnés : ils sont recopiés avant chaque
 * `npm run dev` et chaque `npm run build`, depuis la version que le verrou de
 * dépendances a installée. Aucune copie à tenir à jour à la main.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(RACINE, "node_modules", "maplibre-gl", "dist");
const CIBLE = path.join(RACINE, "public", "maplibre");

// Le travailleur et le tronc commun qu'il importe, rien d'autre.
const FICHIERS = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

await fs.mkdir(CIBLE, { recursive: true });

let copies = 0;
for (const f of FICHIERS) {
  const de = path.join(SOURCE, f);
  const vers = path.join(CIBLE, f);
  try {
    const [a, b] = await Promise.all([fs.stat(de), fs.stat(vers).catch(() => null)]);
    if (b && b.size === a.size && b.mtimeMs >= a.mtimeMs) continue;
    await fs.copyFile(de, vers);
    copies++;
  } catch (e) {
    console.error(`Carte : ${f} introuvable dans maplibre-gl. Lancez d'abord « npm install ».`);
    process.exit(1);
  }
}

const version = JSON.parse(
  await fs.readFile(path.join(RACINE, "node_modules", "maplibre-gl", "package.json"), "utf8")
).version;
console.log(
  copies
    ? `Carte : travailleur MapLibre ${version} déposé dans public/maplibre (${copies} fichier(s)).`
    : `Carte : travailleur MapLibre ${version} déjà à jour.`
);
