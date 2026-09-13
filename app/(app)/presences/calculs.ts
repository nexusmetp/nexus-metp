"use client";

import { PORTEE_ETAT, estOuvre, joursOuvres } from "@/lib/referentiels";
import type { AgentProjete, EtatPresence, Pointage } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Ce que la présence permet de calculer — et ce qu'elle ne dit pas    */
/* ------------------------------------------------------------------ */

/** Le jour de référence. Le décor est daté ; l'écran suit la même horloge. */
export const AUJOURDHUI = "2026-09-10";

export interface LigneJour {
  /** L'agent fait la ligne : une ligne par agent et par jour. */
  id: string;
  agent: AgentProjete;
  pointage?: Pointage;
  /** Faute de pointage, on ne dit pas « absent » : on dit « non pointé ». */
  etat: EtatPresence | null;
}

/**
 * L'état d'un service un jour donné.
 *
 * La distinction qui compte : un agent **non pointé** n'est pas un agent
 * absent. Le confondre transformerait le retard d'un service à remplir son
 * cahier en absence imputée à des agents — exactement le genre de chiffre
 * qui met en cause quelqu'un à tort.
 */
export function journeeDe(
  agents: AgentProjete[],
  pointages: Pointage[],
  date: string
): LigneJour[] {
  const duJour = new Map(pointages.filter((p) => p.date === date).map((p) => [p.agentId, p]));
  return agents.map((agent) => {
    const pointage = duJour.get(agent.id);
    return { id: agent.id, agent, pointage, etat: pointage?.etat ?? null };
  });
}

export interface ResumeJour {
  servis: number;
  couverts: number;
  nus: number;
  nonPointes: number;
  retards: number;
  pointes: number;
  effectif: number;
}

export function resumerJournee(lignes: LigneJour[]): ResumeJour {
  const r: ResumeJour = {
    servis: 0, couverts: 0, nus: 0, nonPointes: 0, retards: 0,
    pointes: 0, effectif: lignes.length,
  };
  lignes.forEach((l) => {
    if (!l.etat) { r.nonPointes++; return; }
    r.pointes++;
    if (l.etat === "RETARD") r.retards++;
    const portee = PORTEE_ETAT[l.etat];
    if (portee === "servi") r.servis++;
    else if (portee === "couvert") r.couverts++;
    else r.nus++;
  });
  return r;
}

/**
 * Depuis combien de jours ouvrés consécutifs un agent est-il absent ?
 *
 * On remonte depuis le jour de référence et on s'arrête au premier jour où
 * l'agent a servi. Un jour **non pointé** interrompt le comptage : il ne
 * prouve rien, ni la présence ni l'absence, et l'inclure gonflerait la durée
 * d'une absence avec des jours où personne n'a rien constaté.
 */
export function absenceContinue(pointages: Pointage[], agentId: string, depuis: string): {
  jours: number;
  debut: string | null;
  justifiee: boolean;
} {
  const parDate = new Map(
    pointages.filter((p) => p.agentId === agentId).map((p) => [p.date, p])
  );
  let jours = 0;
  let debut: string | null = null;
  let justifiee = true;
  const curseur = new Date(depuis + "T12:00:00");
  while (jours < 120) {
    const iso = curseur.toISOString().slice(0, 10);
    if (estOuvre(iso)) {
      const p = parDate.get(iso);
      if (!p) break;
      if (PORTEE_ETAT[p.etat] === "servi") break;
      if (PORTEE_ETAT[p.etat] === "nu") justifiee = false;
      jours++;
      debut = iso;
    }
    curseur.setDate(curseur.getDate() - 1);
  }
  return { jours, debut, justifiee };
}

export interface Anomalie {
  id: string;
  agent: AgentProjete;
  jours: number;
  debut: string | null;
  justifiee: boolean;
  /** Ce qui appelle une vérification, dit sans accuser personne. */
  libelle: string;
}

/**
 * Les dossiers qui appellent un contrôle.
 *
 * Le vocabulaire est délibéré : « à vérifier », « situation à contrôler ».
 * La plateforme signale, elle n'impute pas. Une absence prolongée a mille
 * causes légitimes qu'un cahier de pointage ne connaît pas — hospitalisation,
 * ordre de mission jamais transmis, agent affecté ailleurs sans acte.
 */
export function anomalies(
  agents: AgentProjete[],
  pointages: Pointage[],
  seuil: number,
  date = AUJOURDHUI
): Anomalie[] {
  const out: Anomalie[] = [];
  agents.forEach((agent) => {
    const { jours, debut, justifiee } = absenceContinue(pointages, agent.id, date);
    if (jours < seuil) return;
    out.push({
      id: agent.id, agent, jours, debut, justifiee,
      libelle: justifiee
        ? `Absence couverte depuis ${jours} jours ouvrés — vérifier que la pièce court toujours`
        : `Absence non justifiée depuis ${jours} jours ouvrés — dossier à contrôler`,
    });
  });
  return out.sort((a, b) => b.jours - a.jours);
}

/** La courbe des vingt derniers jours ouvrés : ce qui se dégrade se voit. */
export function serie(pointages: Pointage[], agents: AgentProjete[], jusqua = AUJOURDHUI, n = 20) {
  const permis = new Set(agents.map((a) => a.id));
  return joursOuvres(jusqua, n).map((jour) => {
    const r = resumerJournee(journeeDe(agents, pointages.filter((p) => permis.has(p.agentId)), jour));
    return {
      jour: jour.slice(8) + "/" + jour.slice(5, 7),
      date: jour,
      servis: r.servis,
      couverts: r.couverts,
      nus: r.nus,
    };
  });
}

/** Taux de service : ce qui a servi sur ce qui a été constaté. */
export const tauxDeService = (r: ResumeJour) => (r.pointes ? (r.servis / r.pointes) * 100 : 0);

/** Taux de couverture du pointage : le service tient-il son cahier ? */
export const tauxDePointage = (r: ResumeJour) => (r.effectif ? (r.pointes / r.effectif) * 100 : 0);
