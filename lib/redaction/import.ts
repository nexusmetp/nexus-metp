/**
 * Ouvrir un `.docx` venu de l'extérieur.
 *
 * Un ministère reçoit des courriers, des projets d'arrêté, des états
 * transmis par une direction départementale. Sans cette porte, l'agent
 * ressort de la plateforme pour les lire, les reprend ailleurs, et la
 * pièce repart sans jamais avoir été enregistrée nulle part.
 *
 * `mammoth` (BSD-2) ne rend que la **structure** du document — titres,
 * paragraphes, listes, tableaux, emphase — et laisse tomber la mise en
 * page d'origine. C'est exactement ce qu'il faut : le texte entre dans la
 * feuille de l'administration congolaise plutôt que d'y importer la
 * maquette de l'expéditeur.
 */

import { assainir } from "./assainir";

export interface Importation {
  /** Corps HTML assaini, prêt pour la feuille. */
  contenu: string;
  /** Titre déduit du fichier. */
  titre: string;
  /** Ce que la conversion n'a pas su rendre : images, styles, champs. */
  avertissements: string[];
}

/** Le moteur d'import est-il embarqué ? Faux dans la maquette autonome. */
export const IMPORT_DISPONIBLE = true;

const TAILLE_MAX = 8 * 1024 * 1024;

export async function importerDocx(fichier: File): Promise<Importation> {
  if (fichier.size > TAILLE_MAX) {
    throw new Error("Fichier trop volumineux : 8 Mo au maximum.");
  }
  // Chargé à l'ouverture du fichier, jamais à l'ouverture d'une page.
  const mammoth = await import("mammoth/mammoth.browser.js");
  const buffer = await fichier.arrayBuffer();
  const { value, messages } = await (mammoth as any).convertToHtml({ arrayBuffer: buffer });

  const corps = assainir(String(value ?? ""))
    // Les paragraphes entrent dans la classe du document : la feuille garde
    // sa justification et son retrait d'alinéa.
    .replace(/<p>/g, '<p class="doc-paragraphe">')
    .replace(/<table>/g, '<table class="doc-tableau">');

  return {
    contenu: corps.trim() || "<p class=\"doc-paragraphe\">Document vide ou illisible.</p>",
    titre: fichier.name.replace(/\.(docx?|DOCX?)$/, "").slice(0, 90) || "Document importé",
    avertissements: [...new Set(
      (messages ?? []).map((m: any) => String(m?.message ?? m)).filter(Boolean)
    )] as string[],
  };
}
