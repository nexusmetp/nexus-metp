"use client";

import type {
  AgentProjete, Entite, PointAccueil, RegistreJour,
} from "@/lib/types";
import {
  doitTenirUnPoint, etatCahier, idPoint, idRegistre, joursOuvres, type EtatCahier,
} from "@/lib/referentiels";

/* ------------------------------------------------------------------ */
/* Ce que tient chaque service — et ce qu'il ne tient pas              */
/* ------------------------------------------------------------------ */

/** Jour de référence du décor, comme partout ailleurs dans la plateforme. */
export const AUJOURDHUI = "2026-09-10";

/** Sur combien de jours ouvrés on juge la tenue d'un cahier. */
export const FENETRE_JOURS = 20;

export interface LigneService {
  /** L'identifiant de l'entité : `TableauModule` exige une clé par ligne. */
  id: string;
  entite: Entite;
  point: PointAccueil | null;
  /** Agents affectés dans cette entité seule, sans ses filles. */
  effectif: number;
  responsable: AgentProjete | null;
  /** Jours ouvrés de la fenêtre où un cahier a été ouvert. */
  joursTenus: number;
  /** Ceux qui ont été clos — seuls ceux-là attestent quelque chose. */
  joursClos: number;
  /** Part des jours de la fenêtre effectivement tenus, de 0 à 1. */
  regularite: number;
  etatDuJour: EtatCahier;
  /**
   * Ce que le service doit corriger, dans l'ordre où on le lui demanderait.
   * Vide quand tout est en ordre — et c'est alors le cas le plus fréquent
   * qu'il ne faut pas noyer sous des mentions inutiles.
   */
  manques: string[];
}

/**
 * Construit la vue « un service, une ligne ».
 *
 * L'effectif compté est celui de l'entité **seule**, pas de son arborescence :
 * un cahier n'atteste que des agents qui viennent y émarger, et additionner
 * les filles ferait porter à une direction générale la tenue des registres de
 * ses quarante bureaux.
 */
export function lignesServices({
  entites, points, registres, agents, date,
}: {
  entites: Entite[];
  points: PointAccueil[];
  registres: RegistreJour[];
  agents: AgentProjete[];
  date: string;
}): LigneService[] {
  const parPoint = new Map(points.map((p) => [p.id, p]));
  const parRegistre = new Map(registres.map((r) => [r.id, r]));
  const parAgent = new Map(agents.map((a) => [a.id, a]));

  const effectifs = new Map<string, number>();
  agents.forEach((a) => {
    if (!a.entiteId) return;
    effectifs.set(a.entiteId, (effectifs.get(a.entiteId) ?? 0) + 1);
  });

  const fenetre = joursOuvres(date, FENETRE_JOURS);

  return entites.filter(doitTenirUnPoint).map((entite) => {
    const point = parPoint.get(idPoint(entite.id)) ?? null;
    const effectif = effectifs.get(entite.id) ?? 0;

    let joursTenus = 0;
    let joursClos = 0;
    fenetre.forEach((j) => {
      const r = parRegistre.get(idRegistre(entite.id, j));
      if (!r) return;
      joursTenus++;
      if (r.closLe) joursClos++;
    });

    const manques: string[] = [];
    if (!point) manques.push("Aucun point d'accueil déclaré");
    else {
      if (!point.responsableId) manques.push("Responsable du registre non désigné");
      if (point.modeReleve === "NON_RENSEIGNE") manques.push("Mode de relevé non renseigné");
      if (!point.localisation) manques.push("Lieu non précisé");
      if (effectif > 0 && joursTenus === 0) manques.push("Cahier jamais ouvert sur la période");
    }

    return {
      id: entite.id,
      entite,
      point,
      effectif,
      responsable: point?.responsableId ? parAgent.get(point.responsableId) ?? null : null,
      joursTenus,
      joursClos,
      regularite: fenetre.length ? joursTenus / fenetre.length : 0,
      etatDuJour: etatCahier(entite.id, date, parRegistre, point),
      manques,
    };
  });
}

export interface ResumeAccueil {
  services: number;
  avecPoint: number;
  sansPoint: number;
  avecResponsable: number;
  tenuCeJour: number;
  /** Services dont le cahier n'a jamais été ouvert sur la fenêtre. */
  jamaisTenus: number;
  /** Agents servant dans une entité qui ne tient aucun cahier. */
  agentsSansCahier: number;
  /** Part des services qui ont tenu leur cahier ce jour, **en pour cent**. */
  tauxDuJour: number;
}

/**
 * Le résumé que lit un directeur général — et, plus haut, le ministre.
 *
 * `agentsSansCahier` est le chiffre qui compte : il dit combien d'agents la
 * plateforme est, aujourd'hui, incapable de suivre. C'est une mesure de ce
 * que l'outil ne sait pas, et elle vaut mieux qu'un taux de présence calculé
 * sur les seuls services qui jouent le jeu.
 */
export function resumerAccueil(lignes: LigneService[]): ResumeAccueil {
  const services = lignes.length;
  const avecPoint = lignes.filter((l) => l.point).length;
  const tenuCeJour = lignes.filter((l) => l.etatDuJour === "CLOS" || l.etatDuJour === "OUVERT").length;
  const jamaisTenus = lignes.filter((l) => l.joursTenus === 0).length;
  return {
    services,
    avecPoint,
    sansPoint: services - avecPoint,
    avecResponsable: lignes.filter((l) => l.point?.responsableId).length,
    tenuCeJour,
    jamaisTenus,
    agentsSansCahier: lignes.filter((l) => l.joursTenus === 0).reduce((n, l) => n + l.effectif, 0),
    tauxDuJour: services ? (tenuCeJour / services) * 100 : 0,
  };
}

/**
 * La tenue des cahiers, jour par jour, sur la fenêtre.
 *
 * Sert la courbe : un ministère voit d'un coup d'œil si la tenue progresse
 * ou si elle s'effondre après la première semaine — ce qui arrive, et ce
 * qu'aucun total mensuel ne montre.
 */
export function serieTenue(
  registres: RegistreJour[],
  attendus: number,
  date: string
): { jour: string; ouverts: number; clos: number; manquants: number }[] {
  const parJour = new Map<string, { ouverts: number; clos: number }>();
  registres.forEach((r) => {
    const c = parJour.get(r.date) ?? { ouverts: 0, clos: 0 };
    c.ouverts++;
    if (r.closLe) c.clos++;
    parJour.set(r.date, c);
  });
  return joursOuvres(date, FENETRE_JOURS).map((j) => {
    const c = parJour.get(j) ?? { ouverts: 0, clos: 0 };
    return {
      jour: j.slice(5),
      ouverts: c.ouverts - c.clos,
      clos: c.clos,
      manquants: Math.max(0, attendus - c.ouverts),
    };
  });
}
