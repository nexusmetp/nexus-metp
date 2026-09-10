"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fr, type Dictionnaire } from "./fr";
import { en } from "./en";

/* ------------------------------------------------------------------ */
/* La langue de l'interface                                            */
/*                                                                     */
/* Portée : les écrans d'accueil — ouverture, connexion, confirmation, */
/* commentaires. L'intérieur de l'application reste en français, et    */
/* c'est délibéré : « arrêté », « corps », « échelon », « position     */
/* statutaire » désignent des catégories du droit congolais. Les       */
/* traduire donnerait à lire un texte qui n'a pas de valeur juridique. */
/* ------------------------------------------------------------------ */

export type CodeLangue = "fr" | "en";

export const LANGUES: Record<CodeLangue, Dictionnaire> = { fr, en };

/** Ce que propose le sélecteur, dans l'ordre d'affichage. */
export const LANGUES_OFFERTES: { code: CodeLangue; nom: string }[] = [
  { code: "fr", nom: fr.nomLocal },
  { code: "en", nom: en.nomLocal },
];

interface EtatLangue {
  code: CodeLangue;
  choisir: (code: CodeLangue) => void;
}

/**
 * Le choix est conservé d'une visite à l'autre : c'est un réglage de la
 * personne, pas de la session — il survit donc à la déconnexion.
 */
export const useLangue = create<EtatLangue>()(
  persist(
    (set) => ({
      code: "fr",
      choisir: (code) => {
        set({ code });
        if (typeof document !== "undefined") document.documentElement.lang = code;
      },
    }),
    { name: "nexus-metp-langue" }
  )
);

/** Les textes de la langue courante. */
export const useTextes = (): Dictionnaire => LANGUES[useLangue((s) => s.code)];

export type { Dictionnaire };
