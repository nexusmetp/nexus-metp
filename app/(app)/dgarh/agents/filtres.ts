"use client";

import {
  CATEGORIES, CORPS, POSITION_LABELS, REGLES_CATEGORIE, corpsById, gradeById,
} from "@/lib/referentiels";
import type { AgentProjete } from "@/lib/types";
import type { Filtre } from "@/components/nexus/module";

/* ------------------------------------------------------------------ */
/* Ce qu'on demande au fichier du personnel                            */
/* ------------------------------------------------------------------ */

/**
 * La DGARH voit les trois mille huit cent trente agents du ministère — c'est
 * son objet, et c'était déjà le cas. Ce qui manquait n'était pas la vue, mais
 * les questions qu'on peut lui poser.
 *
 * Trois filtres existaient : la structure, le régime, la position statutaire.
 * Or les questions qu'une direction des ressources humaines se pose tous les
 * jours sont ailleurs : **qui part à la retraite dans les trois ans**, **quels
 * dossiers sont trop maigres pour passer un contrôle**, **combien
 * d'enseignants dans ce département**, **quelle est la parité de ce corps**.
 * Le tableau de bord donnait ces chiffres ; le fichier ne savait pas les
 * ouvrir, et il fallait donc les recompter à la main.
 *
 * Les seuils ne sont pas inventés ici : `58 ans` et `60 %` sont ceux que la
 * fiche de structure affiche déjà (`organisation/[id]/donnees.ts`), et les
 * deux écrans doivent tomber sur le même compte. Le premier n'est pas l'âge de
 * la retraite — il ne nous appartient pas de le fixer — mais celui à partir
 * duquel un départ se prépare.
 */
export const AGE_DEPART_PROCHE = 58;
export const COMPLETUDE_INSUFFISANTE = 60;
export const COMPLETUDE_SATISFAISANTE = 75;

/** L'état de la sélection, tel que l'URL et les menus le portent. */
export type Filtres = Record<string, string>;

export const FILTRES_VIDES: Filtres = {
  entite: "all", categorie: "all", position: "all",
  corps: "all", profil: "all", sexe: "all", dossier: "all", age: "all",
};

/** Les valeurs qu'une adresse peut poser en arrivant — les mêmes clés. */
export function filtresDeLUrl(params: URLSearchParams | null): Filtres {
  const lu = { ...FILTRES_VIDES };
  Object.keys(lu).forEach((cle) => {
    const v = params?.get(cle);
    if (v) lu[cle] = v;
  });
  return lu;
}

export const FILTRES_AGENTS: Filtre[] = [
  {
    cle: "categorie", libelle: "Tous régimes",
    options: CATEGORIES.map((c) => ({ valeur: c, libelle: REGLES_CATEGORIE[c].libelle })),
  },
  {
    cle: "position", libelle: "Toutes positions",
    options: Object.entries(POSITION_LABELS).map(([k, v]) => ({ valeur: k, libelle: v as string })),
  },
  {
    cle: "corps", libelle: "Tous corps",
    options: CORPS.map((c) => ({ valeur: c.id, libelle: c.libelle })),
  },
  {
    cle: "profil", libelle: "Enseignants et autres",
    options: [
      { valeur: "enseignant", libelle: "Personnel enseignant" },
      { valeur: "administratif", libelle: "Personnel non enseignant" },
    ],
  },
  {
    cle: "sexe", libelle: "Femmes et hommes",
    options: [{ valeur: "F", libelle: "Femmes" }, { valeur: "M", libelle: "Hommes" }],
  },
  {
    cle: "dossier", libelle: "État du dossier",
    options: [
      { valeur: "incomplet", libelle: `Sous ${COMPLETUDE_INSUFFISANTE} % de pièces` },
      { valeur: "partiel", libelle: `De ${COMPLETUDE_INSUFFISANTE} à ${COMPLETUDE_SATISFAISANTE} %` },
      { valeur: "complet", libelle: `${COMPLETUDE_SATISFAISANTE} % et plus` },
    ],
  },
  {
    cle: "age", libelle: "Âge et ancienneté",
    options: [
      { valeur: "departs", libelle: `Départs à préparer — ${AGE_DEPART_PROCHE} ans et plus` },
      { valeur: "jeunes", libelle: "Moins de 35 ans" },
      { valeur: "nouveaux", libelle: "Moins de 3 ans de service" },
    ],
  },
];

/**
 * Le filtre appliqué à un agent. Il **réduit**, il n'élargit jamais : la borne
 * du périmètre est vérifiée avant, sur l'écran qui appelle.
 */
export function retenu(a: AgentProjete, f: Filtres): boolean {
  if (f.categorie !== "all" && a.categorie !== f.categorie) return false;
  if (f.position !== "all" && a.nature !== f.position) return false;
  if (f.sexe !== "all" && a.sexe !== f.sexe) return false;

  if (f.corps !== "all" && corpsById(gradeById(a.gradeId)?.corpsId)?.id !== f.corps) return false;

  if (f.profil === "enseignant" && !a.enseignant) return false;
  if (f.profil === "administratif" && a.enseignant) return false;

  if (f.dossier === "incomplet" && a.tauxCompletude >= COMPLETUDE_INSUFFISANTE) return false;
  if (f.dossier === "partiel"
    && (a.tauxCompletude < COMPLETUDE_INSUFFISANTE || a.tauxCompletude >= COMPLETUDE_SATISFAISANTE)) return false;
  if (f.dossier === "complet" && a.tauxCompletude < COMPLETUDE_SATISFAISANTE) return false;

  if (f.age === "departs" && a.age < AGE_DEPART_PROCHE) return false;
  if (f.age === "jeunes" && a.age >= 35) return false;
  if (f.age === "nouveaux" && a.anciennete >= 3) return false;

  return true;
}
