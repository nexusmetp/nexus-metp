/**
 * Le vocabulaire de la carte : ce qu'est une implantation, et comment elle va.
 *
 * Trois signes portent trois informations distinctes, et jamais deux fois la
 * même : la FORME dit la nature du site, la TAILLE dit l'effectif, la
 * COULEUR DU HALO dit l'état. Un lecteur qui apprend ces trois règles une
 * fois lit la carte entière sans légende.
 *
 * Les symboles sont fabriqués ici, en SVG, et non tirés d'un lutin distant :
 * un style MapLibre va normalement chercher ses images chez un hébergeur, ce
 * que la plateforme s'interdit.
 */

import type { Entite } from "@/lib/types";

export type Famille = "CENTRALE" | "DEPARTEMENTALE" | "ETABLISSEMENT" | "CONTROLE";

interface DefinitionFamille {
  libelle: string;
  /** Le pictogramme que l'utilisateur a en tête, pour les listes et l'aide. */
  emoji: string;
  couleur: string;
  /** Tracé du glyphe, dans un carré de 24. */
  glyphe: string;
}

export const FAMILLES: Record<Famille, DefinitionFamille> = {
  CENTRALE: {
    libelle: "Administration centrale", emoji: "🏛️", couleur: "#0B4F6C",
    glyphe: "M12 2.2 22 8.4H2ZM5.4 10.4h2.4v9H5.4Zm5.4 0h2.4v9h-2.4Zm5.4 0h2.4v9h-2.4ZM2.6 20.4h18.8v1.8H2.6Z",
  },
  DEPARTEMENTALE: {
    libelle: "Directions départementales", emoji: "🏢", couleur: "#0077B6",
    glyphe: "M5 2.4h14v19.4H5Zm2.6 3h2.6v2.6H7.6Zm6.2 0h2.6v2.6h-2.6Zm-6.2 5h2.6v2.6H7.6Zm6.2 0h2.6v2.6h-2.6Zm-2.2 5.4h2.8v6h-2.8Z",
  },
  ETABLISSEMENT: {
    libelle: "Établissements", emoji: "🏫", couleur: "#00B4D8",
    glyphe: "M11.2 1h4.4v2.6h-4.4ZM12 3.4 21 9.2H3ZM4.6 10.6h14.8v11.2H4.6Zm5.4 5h4v6.2h-4Z",
  },
  CONTROLE: {
    libelle: "Inspections et antennes", emoji: "🛡️", couleur: "#F4A261",
    glyphe: "M12 1.6 20.4 4.8v6.4c0 5.2-3.6 8.8-8.4 11.2-4.8-2.4-8.4-6-8.4-11.2V4.8Zm-.9 12.6 5.4-5.4-1.7-1.7-3.7 3.7-1.8-1.8-1.7 1.7Z",
  },
};

const PAR_NIVEAU: Partial<Record<Entite["niveau"], Famille>> = {
  DIRECTION_DEPARTEMENTALE: "DEPARTEMENTALE",
  ETABLISSEMENT: "ETABLISSEMENT",
  ANTENNE_DEPARTEMENTALE: "CONTROLE",
  INSPECTION_INTERDEPARTEMENTALE: "CONTROLE",
};

/** Tout ce qui n'est ni déconcentré ni établissement relève de la centrale. */
export const familleDe = (niveau: Entite["niveau"]): Famille =>
  PAR_NIVEAU[niveau] ?? "CENTRALE";

export const ORDRE_FAMILLES: Famille[] = ["CENTRALE", "DEPARTEMENTALE", "ETABLISSEMENT", "CONTROLE"];

/* ------------------------------------------------------------------ états */

export type Etat = "ACTIVITE" | "CONGE" | "VACANCE" | "MOUVEMENT";

export const ETATS: Record<Etat, { libelle: string; couleur: string; pastille: string; regle: string }> = {
  ACTIVITE: {
    libelle: "En activité", couleur: "#059669", pastille: "🟢",
    regle: "Postes pourvus et personnel présent.",
  },
  CONGE: {
    libelle: "Absences marquées", couleur: "#d97706", pastille: "🟠",
    regle: "Au moins un agent sur dix en congé ou hors service.",
  },
  VACANCE: {
    libelle: "Postes vacants", couleur: "#dc2626", pastille: "🔴",
    regle: "Au moins un poste vacant pour vingt agents.",
  },
  MOUVEMENT: {
    libelle: "Mouvements récents", couleur: "#0284c7", pastille: "🔵",
    regle: "Au moins un agent sur dix affecté ou muté dans l'année.",
  },
};

export const ORDRE_ETATS: Etat[] = ["ACTIVITE", "MOUVEMENT", "CONGE", "VACANCE"];

/**
 * L'état dominant, du plus urgent au plus rassurant.
 *
 * Une carte qui peint tout en vert ne sert à rien : on remonte d'abord ce qui
 * appelle une décision. Les chiffres bruts restent dans la fiche — la couleur
 * ne les remplace pas, elle dit où regarder.
 */
export function etatDominant(s: {
  effectif: number; conge: number; horsService: number; vacants: number; mouvements: number;
}): Etat {
  const base = Math.max(1, s.effectif);
  if (s.vacants / base >= 0.05) return "VACANCE";
  if ((s.conge + s.horsService) / base >= 0.1) return "CONGE";
  if (s.mouvements / base >= 0.1) return "MOUVEMENT";
  return "ACTIVITE";
}

/* --------------------------------------------------------------- symboles */

const DISQUE = 34;

/**
 * Le symbole d'une famille : disque plein, glyphe évidé.
 *
 * Dessiné au double de sa taille d'affichage et déclaré à MapLibre en
 * `pixelRatio: 2` — sans quoi il bave sur tout écran dense, c'est-à-dire sur
 * la plupart des portables de service.
 */
export function svgFamille(f: Famille, densite = 2): string {
  const d = FAMILLES[f];
  const c = DISQUE / 2;
  const px = DISQUE * densite;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${DISQUE} ${DISQUE}">
<circle cx="${c}" cy="${c}" r="${c - 2.5}" fill="${d.couleur}" stroke="#ffffff" stroke-width="2.5"/>
<g transform="translate(${c - 8} ${c - 8}) scale(0.6667)"><path d="${d.glyphe}" fill="#ffffff"/></g>
</svg>`;
}

export const dataUri = (svg: string) =>
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

export const CLE_ICONE = (f: Famille) => `famille-${f.toLowerCase()}`;
