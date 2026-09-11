/**
 * Assainissement du HTML rédigé.
 *
 * Le corps d'un brouillon vient de trois sources dont aucune n'est sûre :
 * la frappe, le collage depuis un autre traitement de texte, et la réponse
 * d'un modèle de langage. Tout ce qui n'est pas dans la liste blanche
 * disparaît — y compris le `style` collé depuis Word, qui déformerait la
 * feuille A4 sans qu'on comprenne pourquoi.
 */

/** Ce qu'un document administratif a besoin d'exprimer, et rien de plus. */
const BALISES = new Set([
  "article", "div", "section", "p", "br", "hr", "span",
  "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "sup", "sub",
  "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "a",
  // `font` : ce que produisent encore certains navigateurs pour la police et
  // le corps du texte. On le garde plutôt que de perdre la mise en forme.
  "font",
]);

/**
 * Propriétés de style conservées.
 *
 * Un document a besoin de police, de corps, de couleur et d'alignement — et
 * de rien d'autre. Tout le reste (positionnement, dimensions, images de
 * fond, contenus générés) ne sert qu'à déformer la feuille A4 ou à masquer
 * du texte, et disparaît.
 */
const STYLES_ADMIS = new Set([
  "font-family", "font-size", "font-weight", "font-style",
  "color", "background-color", "text-align", "text-decoration", "text-indent",
]);

/** Les attributs conservés, par balise. `*` vaut pour toutes. */
const ATTRIBUTS: Record<string, string[]> = {
  "*": ["class", "style", "data-modifiable", "data-mention"],
  a: ["href", "title"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
  font: ["face", "size", "color"],
};

/** Classes admises : celles de la feuille, pour que la mise en page tienne. */
const PREFIXE_CLASSE = /^doc-/;

function nettoyerClasses(el: Element) {
  const gardees = Array.from(el.classList).filter((c) => PREFIXE_CLASSE.test(c));
  el.removeAttribute("class");
  if (gardees.length) el.setAttribute("class", gardees.join(" "));
}

/** Ne garde du style que les propriétés admises, et sans valeur exotique. */
function nettoyerStyle(el: Element) {
  const brut = el.getAttribute("style") ?? "";
  const gardees = brut
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const coupe = d.indexOf(":");
      if (coupe < 0) return null;
      const propriete = d.slice(0, coupe).trim().toLowerCase();
      const valeur = d.slice(coupe + 1).trim();
      if (!STYLES_ADMIS.has(propriete)) return null;
      // `url(`, `expression(` et consorts : le vecteur classique d'un style piégé.
      if (/[(){}<>;]|url|expression|import/i.test(valeur)) return null;
      return `${propriete}: ${valeur}`;
    })
    .filter(Boolean);
  el.removeAttribute("style");
  if (gardees.length) el.setAttribute("style", gardees.join("; "));
}

function nettoyerElement(el: Element) {
  const nom = el.tagName.toLowerCase();

  if (!BALISES.has(nom)) {
    // On garde le texte : supprimer la balise ne doit pas supprimer la phrase.
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
    return;
  }

  const admis = [...(ATTRIBUTS["*"] ?? []), ...(ATTRIBUTS[nom] ?? [])];
  Array.from(el.attributes).forEach((a) => {
    if (!admis.includes(a.name.toLowerCase())) el.removeAttribute(a.name);
  });
  if (el.hasAttribute("class")) nettoyerClasses(el);
  if (el.hasAttribute("style")) nettoyerStyle(el);

  // Un lien ne peut mener qu'à une page ou à une adresse : `javascript:` est
  // le vecteur classique d'un collage piégé.
  const href = el.getAttribute("href");
  if (href && !/^(https?:|mailto:|#|\/)/i.test(href.trim())) el.removeAttribute("href");
}

/** Retire d'un coup ce qui n'a rien à faire dans un document. */
const DANGEREUX = "script,style,iframe,object,embed,link,meta,form,input,button,noscript,svg,math";

export function assainir(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // Repli côté serveur : jamais utilisé en pratique, mais un rendu SSR ne
    // doit pas planter au premier caractère.
    return html.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "");
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.body.querySelectorAll(DANGEREUX).forEach((n) => n.remove());
  // Parcours en profondeur d'abord : déballer une balise pendant l'itération
  // sur une liste vivante ferait sauter des nœuds.
  Array.from(doc.body.querySelectorAll("*")).reverse().forEach(nettoyerElement);
  return doc.body.innerHTML;
}

/** Texte nu d'un corps HTML — pour le compte de mots et le presse-papiers. */
export function enTexte(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return (doc.body.textContent ?? "").replace(/ /g, " ").trim();
}

/** Nombre de mots, tel qu'un rédacteur le compte. */
export const compterMots = (html: string) =>
  enTexte(html).split(/\s+/).filter(Boolean).length;
