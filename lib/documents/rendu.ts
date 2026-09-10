/**
 * Mise en page du document — format A4, présentation administrative.
 *
 * Un seul rendu sert trois usages : la prévisualisation à l'écran,
 * l'impression et le fichier téléchargé. Les faire diverger, c'est
 * s'exposer à imprimer autre chose que ce qui a été relu.
 */

import type { DocumentAdministratif } from "./types";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** « Article premier » : l'usage administratif français ne dit pas « Article 1 ». */
const numeroArticle = (i: number) => (i === 0 ? "Article premier" : `Article ${i + 1}`);

/**
 * Feuille de style du document. Volontairement en unités absolues :
 * un document administratif se mesure en millimètres, pas en pixels,
 * et doit sortir identique de l'écran et de l'imprimante.
 */
export const STYLES_DOCUMENT = `
.doc-feuille {
  width: 210mm; min-height: 297mm; padding: 18mm 20mm 16mm;
  background: #fff; color: #111; box-sizing: border-box;
  font-family: "Times New Roman", Times, Georgia, serif;
  font-size: 11.5pt; line-height: 1.5; text-align: justify;
}
.doc-feuille * { box-sizing: border-box; }
/* Paysage : un état des effectifs sur vingt colonnes ne tient pas en portrait.
   Les marges restent celles de l'imprimé administratif. */
.doc-feuille.doc-paysage { width: 297mm; min-height: 210mm; }
.doc-tete { display: flex; justify-content: space-between; gap: 12mm; align-items: flex-start; }
.doc-timbre { font-size: 9.5pt; line-height: 1.35; text-align: left; max-width: 95mm; }
.doc-timbre .doc-pays { font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
.doc-timbre .doc-devise { font-style: italic; font-size: 8.5pt; margin-bottom: 2mm; }
.doc-timbre .doc-ligne { text-transform: uppercase; font-size: 8.5pt; }
.doc-timbre .doc-ligne.doc-emetteur { font-weight: 700; }
.doc-filet { width: 22mm; border-top: 1px solid #111; margin: 1mm 0 1.5mm; }
.doc-lieu { font-size: 10pt; text-align: right; white-space: nowrap; padding-top: 2mm; }
.doc-intitule { text-align: center; margin: 10mm 0 2mm; }
.doc-intitule .doc-titre { font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
.doc-intitule .doc-reference { font-size: 11pt; margin-top: 1mm; }
.doc-objet { text-align: center; font-size: 10pt; font-style: italic; margin-bottom: 7mm; }
.doc-autorite { font-weight: 700; text-transform: uppercase; font-size: 10.5pt; margin: 5mm 0 3mm; }
.doc-visas { margin: 0 0 5mm; padding: 0; list-style: none; }
.doc-visas li { font-size: 10pt; margin-bottom: 1.2mm; text-indent: -6mm; padding-left: 6mm; }
.doc-formule { font-weight: 700; text-transform: uppercase; margin: 4mm 0 4mm; letter-spacing: .5px; }
.doc-article { margin-bottom: 3.5mm; }
.doc-article .doc-num { font-weight: 700; }
.doc-article .doc-alinea { display: block; margin-top: 1.5mm; padding-left: 8mm; font-size: 10.5pt; }
.doc-paragraphe { margin-bottom: 3.5mm; text-indent: 8mm; }
.doc-tableau { width: 100%; border-collapse: collapse; margin: 4mm 0 5mm; font-size: 9.5pt; }
.doc-tableau th, .doc-tableau td { border: 1px solid #444; padding: 1.6mm 2mm; text-align: left; }
.doc-tableau th { background: #ececec; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: .2px; }
.doc-tableau td.doc-nombre, .doc-tableau th.doc-nombre { text-align: right; font-variant-numeric: tabular-nums; }
.doc-tableau tr.doc-total td { font-weight: 700; border-top: 2px solid #111; background: #f6f6f6; }
.doc-signature { margin-top: 12mm; display: flex; justify-content: flex-end; }
.doc-signature .doc-bloc { text-align: center; min-width: 70mm; font-size: 10.5pt; }
.doc-signature .doc-qualite { font-weight: 700; }
.doc-signature .doc-espace { height: 20mm; }
.doc-signature .doc-nom { text-transform: uppercase; font-weight: 700; }
.doc-ampliations { margin-top: 10mm; font-size: 9pt; }
.doc-ampliations .doc-ampl-titre { font-weight: 700; text-decoration: underline; margin-bottom: 1.5mm; }
.doc-ampliations ul { margin: 0; padding-left: 6mm; }
.doc-avertissement {
  margin-top: 9mm; padding: 2.5mm 3mm; border: 1px dashed #999;
  font-size: 8.5pt; font-style: italic; color: #444; text-align: left;
}
.doc-feuille.doc-modifiable [data-modifiable] {
  outline: 1px dashed rgba(0,140,180,.45); outline-offset: 2px;
  border-radius: 2px; min-width: 2em; min-height: 1em; display: inline-block;
}
.doc-feuille.doc-modifiable p[data-modifiable],
.doc-feuille.doc-modifiable div[data-modifiable],
.doc-feuille.doc-modifiable li[data-modifiable] { display: block; }
.doc-feuille.doc-modifiable [data-modifiable]:focus {
  outline: 2px solid rgba(0,140,180,.9); background: rgba(0,180,216,.06);
}
@media print {
  @page { size: A4; margin: 0; }
  .doc-feuille.doc-paysage { width: auto; min-height: auto; }
  .doc-feuille.doc-modifiable [data-modifiable] { outline: none !important; background: none !important; }
  .doc-feuille { width: auto; min-height: auto; padding: 16mm 18mm; box-shadow: none !important; }
  .doc-avertissement { border-color: #bbb; }
}
`;

/** Corps du document, sans feuille de style : réutilisé à l'écran et au fichier. */
export function rendreDocument(d: DocumentAdministratif): string {
  const timbre = d.timbre
    .map((l, i) =>
      i === 0
        ? `<div class="doc-pays">${esc(l)}</div><div class="doc-devise">Unité &middot; Travail &middot; Progrès</div>`
        : `<div class="doc-ligne${i === d.timbre.length - 1 ? " doc-emetteur" : ""}">${esc(l)}</div>`
    )
    .join("");

  const visas = d.visas.length
    ? `<ul class="doc-visas">${d.visas.map((v) => `<li data-modifiable="visa">${esc(v)} ;</li>`).join("")}</ul>`
    : "";

  const articles = d.articles.length
    ? d.articles
        .map(
          (a, i) =>
            `<p class="doc-article"><span class="doc-num">${numeroArticle(i)} :</span> <span data-modifiable="article">${esc(a.texte)}</span>` +
            (a.alinea ? `<span class="doc-alinea" data-modifiable="alinea">${esc(a.alinea)}</span>` : "") +
            `</p>`
        )
        .join("")
    : "";

  const paragraphes = (d.paragraphes ?? [])
    .map((p) => `<p class="doc-paragraphe" data-modifiable="paragraphe">${esc(p)}</p>`)
    .join("");

  const nombre = (v: unknown) => typeof v === "number" || /^[\d\s.,%-]+$/.test(String(v ?? ""));
  const tableau = d.tableau
    ? `<table class="doc-tableau"><thead><tr>${d.tableau.colonnes
        .map((c, i) => `<th${i > 0 ? ' class="doc-nombre"' : ""}>${esc(c)}</th>`)
        .join("")}</tr></thead><tbody>${d.tableau.lignes
        .map(
          (l) =>
            `<tr>${l
              .map((c, i) => `<td${i > 0 && nombre(c) ? ' class="doc-nombre"' : ""}>${esc(c)}</td>`)
              .join("")}</tr>`
        )
        .join("")}${
        d.tableau.total
          ? `<tr class="doc-total">${d.tableau.total
              .map((c, i) => `<td${i > 0 && nombre(c) ? ' class="doc-nombre"' : ""}>${esc(c)}</td>`)
              .join("")}</tr>`
          : ""
      }</tbody></table>`
    : "";

  const ampliations = d.ampliations?.length
    ? `<div class="doc-ampliations"><div class="doc-ampl-titre">Ampliations :</div><ul>${d.ampliations
        .map((a) => `<li data-modifiable="ampliation">${esc(a)}</li>`)
        .join("")}</ul></div>`
    : "";

  return `<article class="doc-feuille">
  <div class="doc-tete">
    <div class="doc-timbre">${timbre}<div class="doc-filet"></div></div>
    <div class="doc-lieu" data-modifiable="lieu">${esc(d.signature.lieu)}, le ${esc(d.signature.date)}</div>
  </div>
  <div class="doc-intitule">
    <div class="doc-titre" data-modifiable="intitule">${esc(d.intitule)}</div>
    <div class="doc-reference" data-modifiable="reference">${esc(d.reference)}</div>
  </div>
  <div class="doc-objet" data-modifiable="objet">${esc(d.objet)}</div>
  ${d.autorite ? `<div class="doc-autorite" data-modifiable="autorite">${esc(d.autorite)},</div>` : ""}
  ${visas}
  ${d.formule ? `<div class="doc-formule">${esc(d.formule)}</div>` : ""}
  ${paragraphes}
  ${articles}
  ${tableau}
  <div class="doc-signature"><div class="doc-bloc">
    <div class="doc-qualite" data-modifiable="qualite">${esc(d.signature.qualite)}</div>
    <div class="doc-espace"></div>
    <div class="doc-nom" data-modifiable="nom">${esc(d.signature.nom ?? "")}</div>
  </div></div>
  ${ampliations}
  ${d.avertissement ? `<div class="doc-avertissement">${esc(d.avertissement)}</div>` : ""}
</article>`;
}

/** Fichier autonome : le document emporte sa mise en page. */
export function rendreFichier(d: DocumentAdministratif): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>${esc(d.reference)} — ${esc(d.objet)}</title>
<style>body{margin:0;background:#f2f2f2;display:flex;justify-content:center;padding:8mm 0}
@media print{body{background:#fff;padding:0}}
${STYLES_DOCUMENT}</style></head>
<body>${rendreDocument(d)}</body></html>`;
}

/** Version texte, pour le presse-papiers et la messagerie interne. */
export function rendreTexte(d: DocumentAdministratif): string {
  const l: string[] = [];
  l.push(d.timbre.join("\n"), "");
  l.push(`${d.signature.lieu}, le ${d.signature.date}`, "");
  l.push(d.intitule, d.reference, d.objet, "");
  if (d.autorite) l.push(`${d.autorite},`, "");
  d.visas.forEach((v) => l.push(`${v} ;`));
  if (d.visas.length) l.push("");
  if (d.formule) l.push(d.formule, "");
  (d.paragraphes ?? []).forEach((p) => l.push(p, ""));
  d.articles.forEach((a, i) => {
    l.push(`${numeroArticle(i)} : ${a.texte}`);
    if (a.alinea) l.push(`    ${a.alinea}`);
    l.push("");
  });
  if (d.tableau) {
    l.push(d.tableau.colonnes.join(" | "));
    d.tableau.lignes.forEach((r) => l.push(r.join(" | ")));
    if (d.tableau.total) l.push(d.tableau.total.join(" | "));
    l.push("");
  }
  l.push(d.signature.qualite, d.signature.nom ?? "", "");
  if (d.ampliations?.length) l.push("Ampliations :", ...d.ampliations.map((a) => `  - ${a}`), "");
  if (d.avertissement) l.push(d.avertissement);
  return l.join("\n");
}
