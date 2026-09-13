import type { EtatPresence, StatutSortie } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Présence — libellés, seuils, et ce qu'on ne sait pas encore        */
/* ------------------------------------------------------------------ */

export const ETAT_PRESENCE_LABELS: Record<EtatPresence, string> = {
  PRESENT: "Présent",
  RETARD: "En retard",
  DEPART_ANTICIPE: "Départ anticipé",
  ABSENT_JUSTIFIE: "Absence justifiée",
  ABSENT_NON_JUSTIFIE: "Absence non justifiée",
  CONGE: "En congé",
  MISSION: "En mission",
  SORTIE_TERRITOIRE: "Hors du territoire",
  TELETRAVAIL: "Travail à distance",
  AUTRE_AUTORISE: "Autre situation autorisée",
};

/**
 * Ce que chaque état dit de l'agent au regard du service.
 *
 *  - `servi`   : l'agent a servi ce jour-là, même en retard.
 *  - `couvert` : il n'a pas servi, mais une pièce le couvre.
 *  - `nu`      : il n'a pas servi et rien ne le couvre. C'est le seul cas qui
 *                appelle une vérification — et jamais une sanction d'office.
 */
export const PORTEE_ETAT: Record<EtatPresence, "servi" | "couvert" | "nu"> = {
  PRESENT: "servi",
  RETARD: "servi",
  DEPART_ANTICIPE: "servi",
  TELETRAVAIL: "servi",
  CONGE: "couvert",
  MISSION: "couvert",
  SORTIE_TERRITOIRE: "couvert",
  AUTRE_AUTORISE: "couvert",
  ABSENT_JUSTIFIE: "couvert",
  ABSENT_NON_JUSTIFIE: "nu",
};

export const COULEUR_ETAT: Record<EtatPresence, string> = {
  PRESENT: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  RETARD: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  DEPART_ANTICIPE: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  ABSENT_JUSTIFIE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  ABSENT_NON_JUSTIFIE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
  CONGE: "bg-violet-500/12 text-violet-600 border-violet-500/20",
  MISSION: "bg-indigo-500/12 text-indigo-600 border-indigo-500/20",
  SORTIE_TERRITOIRE: "bg-cyan-500/12 text-cyan-600 border-cyan-500/20",
  TELETRAVAIL: "bg-teal-500/12 text-teal-600 border-teal-500/20",
  AUTRE_AUTORISE: "bg-slate-500/12 text-slate-600 border-slate-500/20",
};

export const ETATS_PRESENCE = Object.keys(ETAT_PRESENCE_LABELS) as EtatPresence[];

/**
 * Le seuil au-delà duquel une absence continue mérite d'être regardée.
 *
 * **Ce n'est pas une règle de droit.** Aucun texte ne nous a été fourni, et
 * cinq jours est une proposition de l'outil, pas une disposition du statut
 * général — d'où la provenance `RECOMMANDATION`, celle que le dépôt réserve
 * à ce que la plateforme suggère sans pouvoir s'en autoriser. La DGARH
 * renseignera le vrai seuil ; l'écran le dira jusque-là.
 */
export const SEUIL_ABSENCE_PROLONGEE = {
  jours: 5,
  provenance: "RECOMMANDATION" as const,
  note: "Proposition de l'outil, en attente du seuil réglementaire de la DGARH.",
};

/**
 * L'heure d'ouverture des services n'est **pas** écrite ici.
 *
 * La poser en dur reviendrait à inventer une donnée d'organisation que nous
 * n'avons pas. Elle se règle dans Système ; tant qu'elle manque, le retard
 * reste un constat que le gestionnaire porte lui-même, et aucune minute
 * n'est calculée.
 */
export const HEURE_OUVERTURE_NON_RENSEIGNEE = "Donnée non renseignée";

/** Minutes de retard, si et seulement si l'heure d'ouverture est connue. */
export function minutesDeRetard(heureArrivee?: string | null, heureOuverture?: string): number | null {
  if (!heureArrivee || !heureOuverture) return null;
  const enMinutes = (h: string) => {
    const [a, b] = h.split(":").map(Number);
    return Number.isFinite(a) && Number.isFinite(b) ? a * 60 + b : null;
  };
  const arrivee = enMinutes(heureArrivee);
  const ouverture = enMinutes(heureOuverture);
  if (arrivee === null || ouverture === null) return null;
  return Math.max(0, arrivee - ouverture);
}

/** Jour ouvré ? Samedi et dimanche exclus — les fériés ne sont pas connus. */
export const estOuvre = (iso: string) => {
  const j = new Date(iso + "T12:00:00").getDay();
  return j !== 0 && j !== 6;
};

/** Les `n` derniers jours ouvrés, du plus ancien au plus récent. */
export function joursOuvres(jusqua: string, n: number): string[] {
  const out: string[] = [];
  const d = new Date(jusqua + "T12:00:00");
  while (out.length < n) {
    const iso = d.toISOString().slice(0, 10);
    if (estOuvre(iso)) out.unshift(iso);
    d.setDate(d.getDate() - 1);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Sorties du territoire                                               */
/* ------------------------------------------------------------------ */

export const STATUT_SORTIE_LABELS: Record<StatutSortie, string> = {
  DEMANDEE: "Demandée",
  AUTORISEE: "Autorisée",
  EN_COURS: "En cours",
  RENTREE: "Rentrée",
  RETARD_RETOUR: "Retard de retour",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
};

export const COULEUR_SORTIE: Record<StatutSortie, string> = {
  DEMANDEE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  AUTORISEE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  EN_COURS: "bg-cyan-500/12 text-cyan-600 border-cyan-500/20",
  RENTREE: "bg-slate-500/12 text-slate-600 border-slate-500/20",
  RETARD_RETOUR: "bg-rose-500/12 text-rose-600 border-rose-500/20",
  REFUSEE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
  ANNULEE: "bg-slate-500/12 text-slate-500 border-slate-500/20",
};

export const NATURE_SORTIE_LABELS = {
  MISSION: "Mission officielle",
  FORMATION: "Formation",
  CONGE: "Congé passé hors du pays",
  SANTE: "Raison de santé",
  PERSONNEL: "Motif personnel",
  AUTRE: "Autre motif",
} as const;

/**
 * Le statut qu'une sortie **devrait** porter aujourd'hui, d'après ses dates.
 *
 * Un statut enregistré vieillit : une sortie « autorisée » dont le retour
 * était prévu la semaine dernière est en réalité un retard, et personne ne
 * l'a rouverte pour le dire. On le recalcule donc à l'affichage, sans
 * toucher à l'enregistrement — c'est la même règle que pour la position
 * d'un agent, projetée et jamais figée.
 */
export function statutEffectif(s: {
  statut: StatutSortie;
  dateDepart: string;
  dateRetourPrevue: string;
  dateRetourReelle?: string | null;
}, aujourdhui: string): StatutSortie {
  if (s.statut === "REFUSEE" || s.statut === "ANNULEE" || s.statut === "DEMANDEE") return s.statut;
  if (s.dateRetourReelle) return "RENTREE";
  if (aujourdhui < s.dateDepart) return "AUTORISEE";
  if (aujourdhui > s.dateRetourPrevue) return "RETARD_RETOUR";
  return "EN_COURS";
}
