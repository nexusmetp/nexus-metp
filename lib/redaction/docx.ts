/**
 * Export en `.docx` véritable.
 *
 * Jusqu'ici la plateforme sortait du HTML compatible Word : Word l'ouvre,
 * mais ce n'est pas un fichier Word — un service qui l'archive, le signe
 * électroniquement ou le fait passer dans une chaîne de parapheur découvre
 * la différence au mauvais moment. Ici le fichier est un vrai OOXML.
 *
 * La bibliothèque `docx` (MIT) pèse un mégaoctet : elle est chargée **au
 * moment de l'export** et jamais à l'ouverture d'une page. Une plateforme
 * ministérielle se juge aussi sur ce qu'elle ne télécharge pas.
 */

import { A_REMPLIR } from "./jetons";

/**
 * Le moteur est-il embarqué ?
 *
 * Faux dans la maquette autonome publiée en un seul fichier, où l'on ne
 * charge pas un mégaoctet pour un export : l'interface n'y propose alors
 * pas le format, plutôt que de proposer un bouton qui échoue.
 */
export const DOCX_DISPONIBLE = true;

/** Times, 11,5 pt — les demi-points de l'OOXML. */
const CORPS = 23;
const PETIT = 19;

/** Marges de l'imprimé administratif, en twips (1 cm = 567). */
const MARGES = { top: 1020, right: 1134, bottom: 907, left: 1134 };

interface Fragment {
  texte: string;
  gras?: boolean;
  italique?: boolean;
  souligne?: boolean;
  capitales?: boolean;
  /** Corps en demi-points, quand le rédacteur en a posé un. */
  corps?: number;
  police?: string;
}

/**
 * Les classes que la feuille de style met en capitales.
 *
 * Les majuscules du timbre et de l'intitulé sont posées par le CSS, pas
 * écrites dans le texte : sans cette table, le fichier Word sortirait en
 * minuscules alors que l'écran affiche des capitales. Ce qui est relu doit
 * être ce qui s'imprime — c'est la règle du module documentaire entier.
 */
const EN_CAPITALES = /doc-(pays|ligne|titre|autorite|formule|nom)\b/;

const capitalisant = (el: HTMLElement) =>
  EN_CAPITALES.test(el.className || "")
  || /text-transform:\s*uppercase/i.test(el.getAttribute("style") ?? "")
  || el.tagName.toLowerCase() === "th";

/** Découpe un bloc en fragments, en suivant l'emphase des balises. */
function fragments(noeud: Node, herite: Omit<Fragment, "texte"> = {}): Fragment[] {
  if (noeud.nodeType === Node.TEXT_NODE) {
    const texte = (noeud.textContent ?? "").replace(/\s+/g, " ");
    return texte.trim() ? [{ ...herite, texte }] : [];
  }
  if (noeud.nodeType !== Node.ELEMENT_NODE) return [];
  const el = noeud as HTMLElement;
  const nom = el.tagName.toLowerCase();
  const style = el.getAttribute("style") ?? "";
  const suivant: Omit<Fragment, "texte"> = {
    gras: herite.gras || nom === "strong" || nom === "b" || /font-weight:\s*(bold|[6-9]00)/i.test(style),
    italique: herite.italique || nom === "em" || nom === "i" || /font-style:\s*italic/i.test(style),
    souligne: herite.souligne || nom === "u" || /text-decoration:[^;]*underline/i.test(style),
    capitales: herite.capitales || capitalisant(el),
    // Le ruban pose le corps en points : on le reprend tel quel, sinon le
    // fichier sortirait dans le corps par défaut et démentirait l'écran.
    corps: pointsEnDemiPoints(style) ?? herite.corps,
    police: style.match(/font-family:\s*([^;]+)/i)?.[1]?.replace(/["']/g, "").trim() || herite.police,
  };
  return Array.from(el.childNodes).flatMap((n) => fragments(n, suivant));
}

/** « 12pt » → 24 demi-points, l'unité de l'OOXML. */
function pointsEnDemiPoints(style: string): number | undefined {
  const m = style.match(/font-size:\s*([\d.]+)pt/i);
  if (!m) return undefined;
  const points = Number(m[1]);
  return Number.isFinite(points) && points > 3 && points < 100 ? Math.round(points * 2) : undefined;
}

/** L'alignement dit par la classe du document, ou par le style. */
function alignement(el: HTMLElement): "left" | "center" | "right" | "both" {
  const classe = el.className || "";
  if (/doc-(intitule|titre|reference|objet)/.test(classe)) return "center";
  if (/doc-lieu/.test(classe)) return "right";
  if (/doc-paragraphe/.test(classe)) return "both";
  const style = el.getAttribute("style") ?? "";
  const m = style.match(/text-align:\s*(left|center|right|justify)/i);
  if (m) return m[1].toLowerCase() === "justify" ? "both" : (m[1].toLowerCase() as any);
  return "left";
}

/**
 * Compose le fichier.
 *
 * Le corps est lu depuis le DOM plutôt qu'analysé à la main : le navigateur
 * sait déjà lire du HTML, et un analyseur maison se tromperait sur le
 * premier document mal fermé.
 */
export async function versDocx(html: string, titre: string): Promise<Blob> {
  const {
    AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell,
    TableRow, TextRun, WidthType,
  } = await import("docx");

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const racine = doc.body.querySelector(".doc-feuille") ?? doc.body;

  const ALIGNE: Record<string, any> = {
    left: AlignmentType.LEFT, center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT, both: AlignmentType.JUSTIFIED,
  };

  const runs = (el: HTMLElement) => {
    const parts = fragments(el, { capitales: capitalisant(el) });
    if (!parts.length) return [new TextRun({ text: "", size: CORPS })];
    return parts.map((f) => new TextRun({
      text: f.texte, bold: f.gras, italics: f.italique,
      underline: f.souligne ? {} : undefined, allCaps: f.capitales,
      size: f.corps ?? CORPS, font: f.police,
    }));
  };

  const paragraphe = (el: HTMLElement, extras: Record<string, any> = {}) =>
    new Paragraph({
      alignment: ALIGNE[alignement(el)],
      spacing: { after: 120 },
      children: runs(el),
      ...extras,
    });

  const tableau = (t: HTMLTableElement) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: Array.from(t.rows).map((ligne) => new TableRow({
      children: Array.from(ligne.cells).map((cellule) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: (cellule.textContent ?? "").trim(),
            bold: cellule.tagName.toLowerCase() === "th",
            allCaps: cellule.tagName.toLowerCase() === "th",
            size: PETIT,
          })],
        })],
      })),
    })),
  });

  const blocs: any[] = [];
  const parcourir = (parent: Element) => {
    Array.from(parent.children).forEach((enfant) => {
      const el = enfant as HTMLElement;
      const nom = el.tagName.toLowerCase();
      const classe = el.className || "";

      if (nom === "table") { blocs.push(tableau(el as HTMLTableElement)); return; }
      if (nom === "ul" || nom === "ol") {
        Array.from(el.children).forEach((li) => blocs.push(new Paragraph({
          children: runs(li as HTMLElement),
          bullet: nom === "ul" ? { level: 0 } : undefined,
          numbering: undefined,
          indent: nom === "ol" ? { left: 340 } : undefined,
          spacing: { after: 60 },
        })));
        return;
      }
      if (nom === "h1" || nom === "h2") {
        blocs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(el) }));
        return;
      }
      if (nom === "h3" || nom === "h4") {
        blocs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(el) }));
        return;
      }

      // Un conteneur sans texte propre : on descend d'un cran.
      const propre = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "").join("").trim();
      if (!propre && el.children.length && !/doc-(article|paragraphe|visas)/.test(classe)) {
        parcourir(el);
        return;
      }

      const texte = (el.textContent ?? "").trim();
      if (!texte) return;
      // L'espace de signature du modèle : une respiration, pas une ligne vide.
      blocs.push(paragraphe(el, /doc-signature/.test(classe) ? { spacing: { before: 480, after: 120 } } : {}));
    });
  };
  parcourir(racine);

  if (!blocs.length) blocs.push(new Paragraph({ children: [new TextRun({ text: A_REMPLIR, size: CORPS })] }));

  const fichier = new Document({
    creator: "NEXUS-METP",
    title: titre,
    description: "Document établi par la plateforme de gestion du personnel de la DGARH.",
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: CORPS } },
      },
    },
    sections: [{
      properties: { page: { margin: MARGES } },
      children: blocs,
    }],
  });

  return Packer.toBlob(fichier);
}
