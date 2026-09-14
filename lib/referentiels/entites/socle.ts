import type { Entite, NiveauEntite, Provenance } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Le socle de l'arborescence — comment une entité s'écrit             */
/* ------------------------------------------------------------------ */

/**
 * L'organigramme se déclare, il ne se devine pas.
 *
 * Les arrêtés d'organisation d'octobre 2022 disent tous la même chose de la
 * même façon : « Article N : <entité> comprend : — <enfant> ; — <enfant>. »
 * Ces fichiers les recopient. Deux formes seulement :
 *
 *  - `e(...)` pour une entité isolée ;
 *  - `deplier(...)` pour un sous-arbre, écrit comme le texte l'écrit —
 *    une direction, ses services, leurs bureaux — au lieu d'une liste plate
 *    où chaque ligne répète l'identifiant de son parent. Une liste plate se
 *    relit mal et se corrige encore plus mal : c'est là que se glissaient les
 *    rattachements faux.
 *
 * Le **niveau est écrit**, jamais déduit de l'intitulé. « Inspection
 * pédagogique » est un service et porte des divisions ; « inspection
 * interdépartementale » est un échelon déconcentré. Deux intitulés voisins,
 * deux niveaux étrangers : le déduire produirait un arbre plausible et faux.
 */

export type E = Omit<Entite, "ville"> & { ville?: string };

export const e = (
  id: string, sigle: string, nom: string, niveau: NiveauEntite,
  parentId: string | null, provenance: Provenance, reference?: string, ville?: string
): E => ({ id, code: id, sigle, nom, niveau, parentId, provenance, reference, ville });

/** Un nœud tel que l'arrêté l'écrit : son niveau, son sigle, son intitulé. */
export type Noeud = [
  niveau: NiveauEntite,
  sigle: string,
  nom: string,
  enfants?: Noeud[],
];

/**
 * Déplie un sous-arbre. Le sigle porte l'identifiant : `ENT-<sigle>`, si bien
 * qu'un identifiant se lit dans un journal d'audit sans table de conversion.
 */
export function deplier(
  noeuds: Noeud[], parentId: string | null,
  provenance: Provenance, reference?: string, ville?: string
): E[] {
  const out: E[] = [];
  for (const [niveau, sigle, nom, enfants] of noeuds) {
    const id = `ENT-${sigle}`;
    out.push(e(id, sigle, nom, niveau, parentId, provenance, reference, ville));
    if (enfants?.length) out.push(...deplier(enfants, id, provenance, reference, ville));
  }
  return out;
}
