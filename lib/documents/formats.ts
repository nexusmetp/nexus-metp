/**
 * Sorties du document : ce qui en fait une pièce qu'on peut reprendre.
 *
 * Un document qu'on ne peut qu'imprimer est un cul-de-sac. Trois formats
 * couvrent les usages réels : le traitement de texte pour reprendre le
 * fond, la page web pour transmettre, le texte brut pour coller ailleurs.
 */

import type { DocumentAdministratif } from "./types";
import { rendreDocument, rendreTexte, STYLES_DOCUMENT } from "./rendu";

export type Format = "word" | "html" | "texte";

export interface Sortie {
  extension: string;
  mime: string;
  contenu: string;
}

/**
 * Document Word.
 *
 * Word ouvre nativement du HTML servi sous son propre type MIME et le rend
 * modifiable : pas de conversion, pas de dépendance, et la mise en page
 * survit. L'en-tête `xmlns:w` et la déclaration `WordDocument` sont ce qui
 * fait entrer le fichier en mode page plutôt qu'en mode web.
 */
function versWord(corps: string, titre: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<title>${titre}</title>
<!--[if gte mso 9]><xml><w:WordDocument>
  <w:View>Print</w:View><w:Zoom>100</w:Zoom>
</w:WordDocument></xml><![endif]-->
<style>
@page WordSection1 { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 2cm; }
div.WordSection1 { page: WordSection1; }
${STYLES_DOCUMENT}
.doc-feuille { width: auto; min-height: auto; padding: 0; }
</style></head>
<body><div class="WordSection1">${corps}</div></body></html>`;
}

function versHTML(corps: string, titre: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>${titre}</title>
<style>body{margin:0;background:#f2f2f2;display:flex;justify-content:center;padding:8mm 0}
@media print{body{background:#fff;padding:0}}
${STYLES_DOCUMENT}</style></head>
<body>${corps}</body></html>`;
}

/**
 * Compose la sortie demandée.
 *
 * `corps` permet de passer le document tel qu'il a été relu et corrigé à
 * l'écran plutôt que tel qu'il a été composé : exporter autre chose que ce
 * qui a été modifié serait pire que de ne pas laisser modifier du tout.
 */
export function exporter(d: DocumentAdministratif, format: Format, corps?: string): Sortie {
  const titre = `${d.reference} — ${d.objet}`;
  if (format === "texte") {
    return { extension: "txt", mime: "text/plain;charset=utf-8", contenu: rendreTexte(d) };
  }
  return envelopper(corps ?? rendreDocument(d), titre, format);
}

/**
 * Même mise sous enveloppe, pour un corps qui ne vient pas d'un modèle.
 *
 * Le traitement de texte interne produit du HTML libre : il doit sortir dans
 * les mêmes fichiers que les pièces composées, sinon deux documents du même
 * ministère s'ouvriraient différemment.
 */
export function envelopper(corps: string, titre: string, format: Exclude<Format, "texte">): Sortie {
  return format === "word"
    ? { extension: "doc", mime: "application/msword", contenu: versWord(corps, titre) }
    : { extension: "html", mime: "text/html;charset=utf-8", contenu: versHTML(corps, titre) };
}

export const LIBELLE_FORMAT: Record<Format, string> = {
  word: "Word (.doc)",
  html: "Page web (.html)",
  texte: "Texte brut (.txt)",
};

/** Nom de fichier : lisible, sans accent ni caractère qui gêne un système de fichiers. */
export function nomFichier(d: DocumentAdministratif, extension: string): string {
  const base = `${d.reference} ${d.objet}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return `${base || "document"}.${extension}`;
}
