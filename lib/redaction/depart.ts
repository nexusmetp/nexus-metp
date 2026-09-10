/**
 * De quoi part une rédaction.
 *
 * Deux entrées : la feuille blanche, et le modèle rempli par les données du
 * dossier. La seconde n'est pas un confort — elle garantit que le timbre, la
 * référence et la formule exécutoire sont conformes avant qu'on écrive la
 * première phrase, plutôt que rattrapés à la relecture.
 */

import {
  AVERTISSEMENT, composer, dateLongue, rendreDocument, timbreDe,
  type CleModele, type ContexteDocument,
} from "@/lib/documents";
import type { Utilisateur } from "@/lib/types";
import { assainir } from "./assainir";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Feuille blanche : le timbre et la date, puis la place d'écrire. */
export function pageVierge(u: Pick<Utilisateur, "nomComplet" | "entiteId" | "fonction">): string {
  const timbre = timbreDe(u.entiteId)
    .map((l, i) => (i === 0
      ? `<div class="doc-pays">${esc(l)}</div><div class="doc-devise">Unité · Travail · Progrès</div>`
      : `<div class="doc-ligne">${esc(l)}</div>`))
    .join("");

  return `<article class="doc-feuille">
  <div class="doc-tete">
    <div class="doc-timbre">${timbre}<div class="doc-filet"></div></div>
    <div class="doc-lieu">Brazzaville, le ${esc(dateLongue(new Date().toISOString()))}</div>
  </div>
  <div class="doc-intitule">
    <div class="doc-titre">NOTE</div>
    <div class="doc-reference">N° …… /METP/DGARH-${new Date().getFullYear()}</div>
  </div>
  <div class="doc-objet">Objet : …</div>
  <p class="doc-paragraphe">Rédigez ici. La feuille est au format A4 : ce que vous voyez est ce qui s'imprime.</p>
  <div class="doc-signature"><div class="doc-bloc">
    <div class="doc-qualite">${esc(u.fonction || "Le rédacteur")}</div>
    <div class="doc-espace"></div>
    <div class="doc-nom">${esc(u.nomComplet)}</div>
  </div></div>
  <div class="doc-avertissement">${esc(AVERTISSEMENT)}</div>
</article>`;
}

/** Modèle de la bibliothèque, composé sur un dossier réel puis ouvert à la main. */
export function depuisModele(cle: CleModele, contexte: ContexteDocument): string {
  return rendreDocument(composer(cle, contexte));
}

/**
 * Mention portée sur un texte passé par l'assistant.
 *
 * Le lecteur d'une pièce doit savoir ce qu'il relit. La mention se pose au
 * moment de l'export ; elle ne remplace pas l'avertissement de maquette,
 * elle s'y ajoute.
 */
export const MENTION_ASSISTANCE =
  "Des passages de ce document ont été rédigés avec l'assistance d'un modèle de "
  + "langage, puis relus par leur auteur. L'assistance n'engage ni le ministère "
  + "ni le signataire : seule la signature engage.";

/** Ajoute la mention si elle manque, sans toucher au reste du corps. */
export function porterMention(html: string, assiste: boolean): string {
  if (!assiste || html.includes('data-mention="assistance"')) return html;
  const bloc = `<div class="doc-avertissement" data-mention="assistance">${esc(MENTION_ASSISTANCE)}</div>`;
  // La mention entre dans la feuille quand il y en a une, sinon à la suite :
  // posée après </article>, elle sortirait du cadre imprimé.
  return /<\/article>\s*$/.test(html)
    ? html.replace(/<\/article>\s*$/, `${bloc}</article>`)
    : html + bloc;
}

/** Un titre lisible tiré du corps, quand le rédacteur n'en a pas donné. */
export function titreDeduit(html: string, defaut = "Document sans titre"): string {
  const m = html.match(/class="doc-titre"[^>]*>([^<]+)</)
    ?? html.match(/<h1[^>]*>([^<]+)</)
    ?? html.match(/class="doc-objet"[^>]*>([^<]+)</);
  const t = m?.[1]?.replace(/\s+/g, " ").trim();
  return t && t.length > 2 ? t.slice(0, 90) : defaut;
}

/** Tout corps entrant est assaini avant d'être stocké : une seule porte. */
export const preparer = (html: string) => assainir(html);
