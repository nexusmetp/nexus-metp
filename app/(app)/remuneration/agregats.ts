"use client";

import {
  REGLES_CATEGORIE, ajouter, coutMensuelContractuel, entiteById, ligneVide,
  traitementIndiciaire, type LigneCout,
} from "@/lib/referentiels";
import type { AgentProjete, CategoriePersonnel, RemunerationContractuelle } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Agrégation des coûts — et l'aveu de ce qui manque                   */
/* ------------------------------------------------------------------ */

/**
 * La règle de calcul, en trois lignes et dans cet ordre :
 *
 *  1. si l'agent a une **rémunération contractuelle** enregistrée, c'est elle
 *     qui vaut — c'est ce qu'il perçoit réellement, et un contrat prime sur
 *     une grille ;
 *  2. sinon, s'il a une **carrière statutaire** et un indice, son traitement
 *     vaut `indice × valeur du point` — et reste inconnu tant que la valeur
 *     du point n'est pas renseignée ;
 *  3. sinon, son coût est **inconnu**, et il est compté comme tel.
 *
 * Jamais de zéro par défaut. Un agent sans montant connu n'est pas un agent
 * gratuit, et l'additionner à zéro produirait une masse salariale
 * systématiquement sous-évaluée — le pire des chiffres, parce qu'il a l'air
 * juste.
 */
export function coutDe(
  agent: AgentProjete,
  contractuelle: RemunerationContractuelle | undefined,
  valeurPoint: number | null | undefined
): number | null {
  if (contractuelle) return coutMensuelContractuel(contractuelle);
  if (REGLES_CATEGORIE[agent.categorie].carriereStatutaire) {
    return traitementIndiciaire(agent.indice, valeurPoint);
  }
  return null;
}

export interface Regroupement {
  id: string;
  libelle: string;
  effectif: number;
  cout: LigneCout;
}

function agreger(
  agents: AgentProjete[],
  remus: Map<string, RemunerationContractuelle>,
  valeurPoint: number | null | undefined,
  cle: (a: AgentProjete) => { id: string; libelle: string } | null
): Regroupement[] {
  const m = new Map<string, Regroupement>();
  agents.forEach((a) => {
    const k = cle(a);
    if (!k) return;
    const ligne = m.get(k.id) ?? { id: k.id, libelle: k.libelle, effectif: 0, cout: ligneVide() };
    ligne.effectif++;
    ligne.cout = ajouter(ligne.cout, coutDe(a, remus.get(a.id), valeurPoint));
    m.set(k.id, ligne);
  });
  return [...m.values()].sort((x, y) => y.effectif - x.effectif);
}

/** Par entité de rattachement direct. */
export const parEntite = (
  agents: AgentProjete[],
  remus: Map<string, RemunerationContractuelle>,
  valeurPoint: number | null | undefined
) => agreger(agents, remus, valeurPoint, (a) => {
  const e = entiteById(a.entiteId);
  return e ? { id: e.id, libelle: `${e.sigle} — ${e.nom}` } : null;
});

/** Par catégorie de personnel : c'est l'axe qui sépare grille et contrat. */
export const parCategorie = (
  agents: AgentProjete[],
  remus: Map<string, RemunerationContractuelle>,
  valeurPoint: number | null | undefined
) => agreger(agents, remus, valeurPoint, (a) => ({
  id: a.categorie,
  libelle: REGLES_CATEGORIE[a.categorie as CategoriePersonnel].libelle,
}));

/** Le total, avec le compte de ce qu'il laisse dehors. */
export function total(
  agents: AgentProjete[],
  remus: Map<string, RemunerationContractuelle>,
  valeurPoint: number | null | undefined
): LigneCout {
  let l = ligneVide();
  agents.forEach((a) => { l = ajouter(l, coutDe(a, remus.get(a.id), valeurPoint)); });
  return l;
}
