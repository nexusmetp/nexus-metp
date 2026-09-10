"use client";

import { useEffect } from "react";
import { STYLES_DOCUMENT } from "@/lib/documents";

/** L'élément dont l'impression garde le contenu, tout le reste étant masqué. */
export const ID_IMPRESSION = "document-a-imprimer";

/**
 * Pose la feuille de style du document, une fois pour toute la session.
 *
 * `visibility` plutôt que `display` : la feuille est rendue dans un portail,
 * masquer les enfants de `body` masquerait aussi ses ancêtres — et donc la
 * feuille elle-même.
 */
export function useStylesDocument() {
  useEffect(() => {
    const cle = "styles-document-administratif";
    if (document.getElementById(cle)) return;
    const el = document.createElement("style");
    el.id = cle;
    el.textContent = `${STYLES_DOCUMENT}
@media print {
  body * { visibility: hidden !important; }
  #${ID_IMPRESSION}, #${ID_IMPRESSION} * { visibility: visible !important; }
  #${ID_IMPRESSION} {
    position: absolute !important; left: 0; top: 0;
    transform: none !important; margin: 0 !important; box-shadow: none !important;
  }
}`;
    document.head.appendChild(el);
  }, []);
}
