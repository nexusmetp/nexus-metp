"use client";

import type {
  AgentProjete, Entite, PointAccueil, PriseDeService, StatutPriseService,
} from "@/lib/types";
import {
  SEUIL_ARRIVEE_A_VERIFIER, joursEntre, pointDe, statutPriseEffectif,
} from "@/lib/referentiels";

/* ------------------------------------------------------------------ */
/* Arrivées et installations — de l'acte au poste réellement occupé    */
/* ------------------------------------------------------------------ */

export const AUJOURDHUI = "2026-09-10";

export interface LigneArrivee {
  id: string;
  prise: PriseDeService;
  agent: AgentProjete | null;
  entite: Entite | null;
  point: PointAccueil | null;
  statut: StatutPriseService;
  /** Jours écoulés depuis la date d'effet de l'acte. Négatif si à venir. */
  anciennete: number;
  /** Écart entre la date attendue et l'arrivée réelle. `null` si non arrivé. */
  retardArrivee: number | null;
  /** Jours entre l'arrivée et le PV d'installation. `null` si non installé. */
  delaiInstallation: number | null;
  /** L'arrivée dépasse le seuil sans nouvelle : dossier à vérifier. */
  aVerifier: boolean;
}

export function lignesArrivees({
  prises, agents, entites, points, date,
}: {
  prises: PriseDeService[];
  agents: AgentProjete[];
  entites: Entite[];
  points: PointAccueil[];
  date: string;
}): LigneArrivee[] {
  const parAgent = new Map(agents.map((a) => [a.id, a]));
  const parEntite = new Map(entites.map((e) => [e.id, e]));
  const parPoint = new Map(points.map((p) => [p.id, p]));
  /* Le point se résout en remontant l'arbre : un bureau de quatre agents
     n'a pas de secrétariat propre, il émarge à celui de son service. Le
     chercher sur la seule entité de l'agent faisait afficher « aucun point
     d'accueil » à des bureaux qui en ont un, un étage plus haut. */
  const resoudre = (entiteId: string) => pointDe(entiteId, parPoint, parEntite);

  return prises.map((prise) => {
    const statut = statutPriseEffectif(prise);
    const anciennete = joursEntre(prise.dateAttendue, date);
    return {
      id: prise.id,
      prise,
      agent: parAgent.get(prise.agentId) ?? null,
      entite: parEntite.get(prise.entiteId) ?? null,
      point: resoudre(prise.entiteId),
      statut,
      anciennete,
      retardArrivee: prise.dateArrivee ? joursEntre(prise.dateAttendue, prise.dateArrivee) : null,
      delaiInstallation: prise.dateArrivee && prise.dateInstallation
        ? joursEntre(prise.dateArrivee, prise.dateInstallation)
        : null,
      aVerifier: statut === "ATTENDUE" && anciennete >= SEUIL_ARRIVEE_A_VERIFIER.jours,
    };
  });
}

export interface ResumeArrivees {
  total: number;
  attendues: number;
  enregistrees: number;
  installees: number;
  nonPresentees: number;
  /** Arrivées attendues au-delà du seuil : les dossiers à vérifier. */
  aVerifier: number;
  /** Postes comptés occupés alors que personne n'a constaté d'arrivée. */
  postesSansOccupant: number;
  /** Délai moyen entre l'arrivée et le PV, en jours. `null` si rien à moyenner. */
  delaiMoyenInstallation: number | null;
}

/**
 * Le résumé, et le chiffre qui n'existait pas avant ce module.
 *
 * `postesSansOccupant` compte les affectations en vigueur dont personne n'a
 * jamais constaté l'arrivée. Jusqu'ici, le tableau des emplois comptait ces
 * postes comme occupés — c'est-à-dire qu'il affirmait, sans le savoir, que
 * quelqu'un y servait. Ce n'est pas une fraude et l'écran ne doit pas le
 * présenter ainsi : c'est un écart entre le papier et le terrain, et c'est
 * précisément ce qu'un ministère a besoin de voir.
 */
export function resumerArrivees(lignes: LigneArrivee[]): ResumeArrivees {
  const par = (s: StatutPriseService) => lignes.filter((l) => l.statut === s).length;
  const delais = lignes
    .map((l) => l.delaiInstallation)
    .filter((d): d is number => d !== null);
  return {
    total: lignes.length,
    attendues: par("ATTENDUE"),
    enregistrees: par("ENREGISTREE"),
    installees: par("INSTALLEE"),
    nonPresentees: par("NON_PRESENTEE"),
    aVerifier: lignes.filter((l) => l.aVerifier).length,
    postesSansOccupant: lignes.filter(
      (l) => (l.statut === "ATTENDUE" || l.statut === "NON_PRESENTEE") && l.anciennete >= 0
    ).length,
    delaiMoyenInstallation: delais.length
      ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
      : null,
  };
}

/**
 * Les arrivées par direction, pour savoir où le circuit se grippe.
 *
 * Un délai d'installation qui s'allonge dans une seule direction n'est pas le
 * même problème qu'un délai qui s'allonge partout : le premier se règle par
 * un appel, le second par une instruction.
 */
export interface TensionEntite {
  id: string;
  entite: Entite;
  attendues: number;
  aVerifier: number;
  installees: number;
  /** Part des arrivées de cette entité qui sont installées, de 0 à 1. */
  taux: number;
}

export function tensionsParEntite(lignes: LigneArrivee[]): TensionEntite[] {
  const m = new Map<string, { entite: Entite; att: number; av: number; ins: number; n: number }>();
  lignes.forEach((l) => {
    if (!l.entite) return;
    const c = m.get(l.entite.id) ?? { entite: l.entite, att: 0, av: 0, ins: 0, n: 0 };
    c.n++;
    if (l.statut === "ATTENDUE") c.att++;
    if (l.aVerifier) c.av++;
    if (l.statut === "INSTALLEE") c.ins++;
    m.set(l.entite.id, c);
  });
  return [...m.entries()]
    .map(([id, c]) => ({
      id, entite: c.entite, attendues: c.att, aVerifier: c.av, installees: c.ins,
      taux: c.n ? c.ins / c.n : 0,
    }))
    .filter((t) => t.attendues > 0)
    .sort((a, b) => b.aVerifier - a.aVerifier || b.attendues - a.attendues);
}
