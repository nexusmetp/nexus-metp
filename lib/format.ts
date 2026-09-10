import type { CategoriePersonnel, NaturePosition, Provenance, StatutActe } from "@/lib/types";

export const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n ?? 0);
export const fmtPct = (n: number) => `${Math.round(n ?? 0)} %`;

export const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Date et heure — « 14 nov. 2026, 09:32 ».
 *
 * L'heure ne s'affiche que là où elle porte une information : un
 * enregistrement, une version, une trace d'audit. Sur une date d'effet
 * d'acte, elle n'en porte aucune.
 */
export const fmtDateHeure = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export const ans = (d?: string) => {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 864e5)));
};

export const initiales = (prenom = "", nom = "") =>
  `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

/** Jours écoulés depuis une date — sert au calcul des délais d'instruction. §13 */
export const joursDepuis = (d?: string) =>
  d ? Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 864e5)) : 0;

/* ---------- Couleurs sémantiques ---------- */

const CLR = {
  vert: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  bleu: "bg-primary/10 text-primary border-primary/25",
  ciel: "bg-sky-500/12 text-sky-600 border-sky-500/25",
  indigo: "bg-indigo-500/12 text-indigo-600 border-indigo-500/25",
  violet: "bg-violet-500/12 text-violet-600 border-violet-500/25",
  ambre: "bg-amber-500/12 text-amber-600 border-amber-500/25",
  orange: "bg-orange-500/12 text-orange-600 border-orange-500/25",
  rouge: "bg-rose-500/12 text-rose-600 border-rose-500/25",
  ardoise: "bg-slate-500/12 text-slate-500 border-slate-500/25",
  teal: "bg-teal-500/12 text-teal-600 border-teal-500/25",
};

export const COULEUR_STATUT_ACTE: Record<StatutActe, string> = {
  BROUILLON: CLR.ardoise,
  SOUMIS: CLR.ciel,
  EN_INSTRUCTION: CLR.indigo,
  VALIDE_SERVICE: CLR.violet,
  VALIDE_DIRECTION: CLR.violet,
  SIGNE: CLR.vert,
  NOTIFIE: CLR.bleu,
  ARCHIVE: CLR.ardoise,
  REJETE: CLR.rouge,
  RETOURNE: CLR.orange,
};

export const COULEUR_CATEGORIE: Record<CategoriePersonnel, string> = {
  FONCTIONNAIRE: CLR.bleu,
  CONTRACTUEL: CLR.violet,
  PRESTATAIRE: CLR.orange,
  VOLONTAIRE: CLR.teal,
  VACATAIRE: CLR.ambre,
};

export const COULEUR_POSITION: Record<NaturePosition, string> = {
  ACTIVITE: CLR.vert,
  CONGE: CLR.ciel,
  DISPONIBILITE: CLR.ambre,
  DETACHEMENT: CLR.indigo,
  MISE_A_DISPOSITION: CLR.violet,
  SUSPENSION: CLR.rouge,
  RETRAITE: CLR.ardoise,
};

export const COULEUR_PROVENANCE: Record<Provenance, string> = {
  TEXTE: CLR.vert,
  A_VERIFIER: CLR.ambre,
  RECOMMANDATION: CLR.ciel,
};

export const COULEUR_STATUTAIRE: Record<string, string> = {
  A: CLR.bleu, B: CLR.violet, C: CLR.ambre, D: CLR.ardoise,
};

export const CHART_COLORS = ["#00B4D8", "#0077B6", "#48CAE4", "#90E0EF", "#023E8A", "#0096C7", "#ADE8F4"];
