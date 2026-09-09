/**
 * Projection de carrière — cahier §06, §07, §15.
 *
 * L'état courant d'un agent n'est jamais stocké : il se calcule à partir des
 * entités historisées. C'est la seule façon de répondre à « quelle était la
 * situation de cet agent au 31 décembre 2019 ? », question que pose tout
 * contentieux.
 */

import type {
  Affectation, Agent, AgentProjete, Position, SituationCarriere, NaturePosition,
} from "@/lib/types";
import { categorieStatutaireDe, REGLES_CATEGORIE } from "@/lib/referentiels";

/** Enregistrement en vigueur à `date` : effet passé, fin nulle ou future. */
function envigueur<T extends { dateEffet: string; dateFin: string | null }>(
  rows: T[],
  date: string
): T | undefined {
  return rows
    .filter((r) => r.dateEffet <= date && (r.dateFin === null || r.dateFin > date))
    .sort((a, b) => b.dateEffet.localeCompare(a.dateEffet))[0];
}

const ans = (depuis?: string, jusqua?: string) => {
  if (!depuis) return 0;
  const d = new Date(depuis).getTime();
  const f = jusqua ? new Date(jusqua).getTime() : Date.now();
  return Math.max(0, Math.floor((f - d) / (365.25 * 864e5)));
};

/**
 * Complétude du dossier : proportion des blocs attendus qui sont renseignés.
 * Les blocs attendus dépendent de la catégorie — un vacataire n'a pas de
 * carrière statutaire, ne pas la lui compter comme manquante. §05
 */
export function tauxCompletude(
  agent: Agent,
  situation?: SituationCarriere,
  affectation?: Affectation
): number {
  const regle = REGLES_CATEGORIE[agent.categorie];
  const controles: boolean[] = [
    !!agent.matricule,
    !!agent.nom && !!agent.prenom,
    !!agent.dateNaissance && !!agent.lieuNaissance,
    !!agent.telephone || !!agent.email,
    !!agent.adresse,
    agent.diplomes.length > 0,
    !!agent.dateRecrutement,
    !!agent.datePriseService,
    !!affectation,
  ];
  if (regle.carriereStatutaire) controles.push(!!situation);
  if (regle.titularisation) controles.push(!!agent.dateTitularisation);
  const ok = controles.filter(Boolean).length;
  return Math.round((ok / controles.length) * 100);
}

export interface Historique {
  situations: SituationCarriere[];
  affectations: Affectation[];
  positions: Position[];
}

/** Projette un agent à une date donnée (par défaut : aujourd'hui). */
export function projeter(agent: Agent, h: Historique, date = new Date().toISOString().slice(0, 10)): AgentProjete {
  const situations = h.situations.filter((s) => s.agentId === agent.id);
  const affectations = h.affectations.filter((a) => a.agentId === agent.id);
  const positions = h.positions.filter((p) => p.agentId === agent.id);

  const situation = envigueur(situations, date);
  const affectation = envigueur(affectations, date);
  const position = envigueur(positions, date);

  return {
    ...agent,
    situation,
    affectation,
    position,
    gradeId: situation?.gradeId,
    echelon: situation?.echelon,
    indice: situation?.indice,
    categorieStatutaire: categorieStatutaireDe(situation?.gradeId),
    entiteId: affectation?.entiteId,
    fonction: affectation?.fonction,
    nature: (position?.nature ?? "ACTIVITE") as NaturePosition,
    anciennete: ans(agent.dateRecrutement, date),
    age: ans(agent.dateNaissance, date),
    tauxCompletude: tauxCompletude(agent, situation, affectation),
  };
}

/** Projette une population entière. Indexe une fois, pas par agent. */
export function projeterTous(
  agents: Agent[],
  h: Historique,
  date = new Date().toISOString().slice(0, 10)
): AgentProjete[] {
  const parAgent = <T extends { agentId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    rows.forEach((r) => {
      const l = m.get(r.agentId);
      if (l) l.push(r);
      else m.set(r.agentId, [r]);
    });
    return m;
  };
  const sM = parAgent(h.situations);
  const aM = parAgent(h.affectations);
  const pM = parAgent(h.positions);

  return agents.map((agent) =>
    projeter(agent, {
      situations: sM.get(agent.id) ?? [],
      affectations: aM.get(agent.id) ?? [],
      positions: pM.get(agent.id) ?? [],
    }, date)
  );
}

/** Ligne de vie d'un agent : tous ses événements, du plus récent au plus ancien. */
export interface EvenementCarriere {
  date: string;
  categorie: "carriere" | "affectation" | "position";
  libelle: string;
  detail?: string;
  acteId: string;
}

export function ligneDeVie(agentId: string, h: Historique): EvenementCarriere[] {
  const out: EvenementCarriere[] = [];
  h.situations.filter((s) => s.agentId === agentId).forEach((s) =>
    out.push({
      date: s.dateEffet, categorie: "carriere",
      libelle: "Situation de carrière",
      detail: `Classe ${s.classe} · échelon ${s.echelon} · indice ${s.indice}`,
      acteId: s.acteId,
    })
  );
  h.affectations.filter((a) => a.agentId === agentId).forEach((a) =>
    out.push({
      date: a.dateEffet, categorie: "affectation",
      libelle: "Affectation", detail: a.fonction, acteId: a.acteId,
    })
  );
  h.positions.filter((p) => p.agentId === agentId).forEach((p) =>
    out.push({
      date: p.dateEffet, categorie: "position",
      libelle: "Position administrative", detail: p.motif, acteId: p.acteId,
    })
  );
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Décisions prises mais pas encore en vigueur : un acte notifié dont la date
 * d'effet est future n'a pas encore déplacé l'agent. L'écran doit le dire,
 * sinon la fiche paraît contredire l'acte qu'on vient de signer.
 */
export interface Attente {
  categorie: "affectation" | "carriere" | "position";
  dateEffet: string;
  libelle: string;
  acteId: string;
}

export function decisionsAVenir(
  agentId: string,
  h: Historique,
  date = new Date().toISOString().slice(0, 10)
): Attente[] {
  const out: Attente[] = [];
  h.affectations
    .filter((a) => a.agentId === agentId && a.dateEffet > date)
    .forEach((a) => out.push({ categorie: "affectation", dateEffet: a.dateEffet, libelle: a.fonction, acteId: a.acteId }));
  h.situations
    .filter((s) => s.agentId === agentId && s.dateEffet > date)
    .forEach((s) => out.push({ categorie: "carriere", dateEffet: s.dateEffet, libelle: `Échelon ${s.echelon} · indice ${s.indice}`, acteId: s.acteId }));
  h.positions
    .filter((p) => p.agentId === agentId && p.dateEffet > date)
    .forEach((p) => out.push({ categorie: "position", dateEffet: p.dateEffet, libelle: p.motif ?? p.nature, acteId: p.acteId }));
  return out.sort((a, b) => a.dateEffet.localeCompare(b.dateEffet));
}
