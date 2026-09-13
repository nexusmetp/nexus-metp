"use client";

import { REGLES_CATEGORIE, corpsById, departementDe, entiteById, gradeById } from "@/lib/referentiels";
import type { AgentProjete } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* « Combien sommes-nous ? » — les onze axes, calculés une fois        */
/* ------------------------------------------------------------------ */

/**
 * Les axes existaient déjà tous dans la donnée : sexe, date de naissance,
 * catégorie, corps, grade, entité, département, fonction, position. Ce qui
 * manquait, c'était l'écran qui les croise. Ce fichier ne crée aucune donnée
 * nouvelle — il projette celle qui dormait dans le dossier.
 */

export interface Part {
  cle: string;
  libelle: string;
  effectif: number;
  /** Part de l'effectif total, en points de pourcentage. */
  part: number;
}

const compter = (
  agents: AgentProjete[],
  cle: (a: AgentProjete) => { cle: string; libelle: string } | null
): Part[] => {
  const m = new Map<string, { libelle: string; n: number }>();
  agents.forEach((a) => {
    const k = cle(a);
    if (!k) return;
    const cur = m.get(k.cle) ?? { libelle: k.libelle, n: 0 };
    cur.n++;
    m.set(k.cle, cur);
  });
  const total = agents.length || 1;
  return [...m.entries()]
    .map(([cle, v]) => ({ cle, libelle: v.libelle, effectif: v.n, part: (v.n / total) * 100 }))
    .sort((x, y) => y.effectif - x.effectif);
};

export const parSexe = (agents: AgentProjete[]) =>
  compter(agents, (a) => ({ cle: a.sexe, libelle: a.sexe === "F" ? "Femmes" : "Hommes" }));

export const parCategorie = (agents: AgentProjete[]) =>
  compter(agents, (a) => ({ cle: a.categorie, libelle: REGLES_CATEGORIE[a.categorie].libelle }));

export const parCorps = (agents: AgentProjete[]) =>
  compter(agents, (a) => {
    const c = corpsById(gradeById(a.gradeId)?.corpsId);
    return c ? { cle: c.id, libelle: c.libelle } : null;
  });

export const parDepartement = (agents: AgentProjete[]) =>
  compter(agents, (a) => {
    const d = departementDe(a.entiteId);
    return d ? { cle: d.id, libelle: d.nom } : null;
  });

export const parEntite = (agents: AgentProjete[]) =>
  compter(agents, (a) => {
    const e = entiteById(a.entiteId);
    return e ? { cle: e.id, libelle: `${e.sigle} — ${e.nom}` } : null;
  });

export const parFonction = (agents: AgentProjete[]) =>
  compter(agents, (a) => (a.fonction ? { cle: a.fonction, libelle: a.fonction } : null));

/**
 * Les tranches d'âge, coupées là où l'administration prend ses décisions :
 * le seuil des 55 ans ouvre la préparation du départ, celui des 60 ans le
 * départ lui-même. Des tranches décennales régulières auraient été plus
 * jolies et moins utiles.
 */
const TRANCHES: [string, number, number][] = [
  ["Moins de 30 ans", 0, 29],
  ["30 à 39 ans", 30, 39],
  ["40 à 49 ans", 40, 49],
  ["50 à 54 ans", 50, 54],
  ["55 à 59 ans", 55, 59],
  ["60 ans et plus", 60, 200],
];

export const parAge = (agents: AgentProjete[]): Part[] => {
  const total = agents.length || 1;
  return TRANCHES.map(([libelle, min, max]) => {
    const n = agents.filter((a) => a.age >= min && a.age <= max).length;
    return { cle: libelle, libelle, effectif: n, part: (n / total) * 100 };
  }).filter((t) => t.effectif > 0);
};

/** Les axes offerts à l'écran, dans l'ordre où un ministre les demande. */
export const AXES: { cle: string; libelle: string; calcul: (a: AgentProjete[]) => Part[] }[] = [
  { cle: "categorie", libelle: "Par catégorie", calcul: parCategorie },
  { cle: "sexe", libelle: "Par sexe", calcul: parSexe },
  { cle: "age", libelle: "Par tranche d'âge", calcul: parAge },
  { cle: "corps", libelle: "Par corps", calcul: parCorps },
  { cle: "departement", libelle: "Par département", calcul: parDepartement },
  { cle: "entite", libelle: "Par direction", calcul: parEntite },
  { cle: "fonction", libelle: "Par fonction", calcul: parFonction },
];
