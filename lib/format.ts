export const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n ?? 0);

export const fmtFcfa = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n ?? 0) + " FCFA";

export const fmtDate = (d?: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

export const age = (d?: string) => {
  if (!d) return "—";
  return Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 864e5));
};

export const anciennete = (d?: string) => {
  if (!d) return "—";
  return Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 864e5));
};

export const initials = (prenom = "", nom = "") =>
  `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

export const STATUT_COLORS: Record<string, string> = {
  Actif: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  "Détachement": "bg-sky-500/12 text-sky-600 border-sky-500/25",
  "Disponibilité": "bg-amber-500/12 text-amber-600 border-amber-500/25",
  Suspendu: "bg-rose-500/12 text-rose-600 border-rose-500/25",
  "Retraité": "bg-slate-500/12 text-slate-500 border-slate-500/25",
  Titulaire: "bg-primary/10 text-primary border-primary/25",
  Contractuel: "bg-violet-500/12 text-violet-600 border-violet-500/25",
  Vacataire: "bg-orange-500/12 text-orange-600 border-orange-500/25",
  Stagiaire: "bg-teal-500/12 text-teal-600 border-teal-500/25",
  "Occupé": "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  Vacant: "bg-amber-500/12 text-amber-600 border-amber-500/25",
  "Gelé": "bg-slate-500/12 text-slate-500 border-slate-500/25",
  Brouillon: "bg-slate-500/12 text-slate-500 border-slate-500/25",
  Soumis: "bg-sky-500/12 text-sky-600 border-sky-500/25",
  "Validation SG": "bg-indigo-500/12 text-indigo-600 border-indigo-500/25",
  "Validation Ministre": "bg-violet-500/12 text-violet-600 border-violet-500/25",
  "Signé": "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  "Publié": "bg-primary/10 text-primary border-primary/25",
  "Rejeté": "bg-rose-500/12 text-rose-600 border-rose-500/25",
  "En attente": "bg-amber-500/12 text-amber-600 border-amber-500/25",
  "Approuvé": "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  Refusé: "bg-rose-500/12 text-rose-600 border-rose-500/25",
  "En cours": "bg-sky-500/12 text-sky-600 border-sky-500/25",
  A: "bg-primary/10 text-primary border-primary/25",
  B: "bg-violet-500/12 text-violet-600 border-violet-500/25",
  C: "bg-amber-500/12 text-amber-600 border-amber-500/25",
  D: "bg-slate-500/12 text-slate-500 border-slate-500/25",
};

export const CHART_COLORS = ["#00B4D8", "#0077B6", "#48CAE4", "#90E0EF", "#023E8A", "#0096C7", "#ADE8F4"];
