/* ------------------------------------------------------------------ */
/* Les tons des tuiles                                                 */
/*                                                                     */
/* La couleur d'une tuile dit ce qu'est le chiffre, elle ne décore pas :*/
/* l'ambre annonce une attente, le rose une échéance dépassée, le vert  */
/* ce qui est acquis. Un tableau de bord où tout est vert ne se lit pas */
/* mieux qu'un tableau de bord tout blanc.                             */
/*                                                                     */
/* Les classes sont écrites en toutes lettres : Tailwind ne génère que  */
/* ce qu'il trouve littéralement dans les sources.                     */
/* ------------------------------------------------------------------ */

export type Ton =
  | "bleu" | "cyan" | "emeraude" | "ambre" | "rose" | "violet" | "indigo" | "ardoise";

export interface Teinte {
  /** Pastille de l'icône. */
  puce: string;
  /** Voile d'angle, en fond de carte. */
  halo: string;
  /** Filet supérieur, sur toute la largeur. */
  filet: string;
  /** Le chiffre lui-même. */
  valeur: string;
  /** Fond de carte, très pâle. */
  fond: string;
}

export const TONS: Record<Ton, Teinte> = {
  bleu: {
    puce: "bg-blue-500/12 text-blue-600 dark:text-blue-300",
    halo: "bg-blue-500/20",
    filet: "bg-blue-500",
    valeur: "text-blue-700 dark:text-blue-300",
    fond: "from-blue-50/80 dark:from-blue-950/30",
  },
  cyan: {
    puce: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300",
    halo: "bg-cyan-500/20",
    filet: "bg-cyan-500",
    valeur: "text-cyan-700 dark:text-cyan-300",
    fond: "from-cyan-50/80 dark:from-cyan-950/30",
  },
  emeraude: {
    puce: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
    halo: "bg-emerald-500/20",
    filet: "bg-emerald-500",
    valeur: "text-emerald-700 dark:text-emerald-300",
    fond: "from-emerald-50/80 dark:from-emerald-950/30",
  },
  ambre: {
    puce: "bg-amber-500/14 text-amber-600 dark:text-amber-300",
    halo: "bg-amber-500/20",
    filet: "bg-amber-500",
    valeur: "text-amber-700 dark:text-amber-300",
    fond: "from-amber-50/80 dark:from-amber-950/30",
  },
  rose: {
    puce: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
    halo: "bg-rose-500/20",
    filet: "bg-rose-500",
    valeur: "text-rose-700 dark:text-rose-300",
    fond: "from-rose-50/80 dark:from-rose-950/30",
  },
  violet: {
    puce: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
    halo: "bg-violet-500/20",
    filet: "bg-violet-500",
    valeur: "text-violet-700 dark:text-violet-300",
    fond: "from-violet-50/80 dark:from-violet-950/30",
  },
  indigo: {
    puce: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300",
    halo: "bg-indigo-500/20",
    filet: "bg-indigo-500",
    valeur: "text-indigo-700 dark:text-indigo-300",
    fond: "from-indigo-50/80 dark:from-indigo-950/30",
  },
  ardoise: {
    puce: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
    halo: "bg-slate-500/20",
    filet: "bg-slate-400",
    valeur: "text-slate-700 dark:text-slate-200",
    fond: "from-slate-100/80 dark:from-slate-800/40",
  },
};

/**
 * Ordre de repli quand une tuile ne déclare pas son ton : quatre teintes
 * distinctes, toujours dans le même ordre. Une page qui ne se prononce pas
 * garde donc une rangée lisible, et la première colonne a la même couleur
 * d'un écran à l'autre.
 */
export const TON_PAR_RANG: Ton[] = ["cyan", "bleu", "violet", "ambre"];

export const tonDuRang = (rang: number): Ton => TON_PAR_RANG[rang % TON_PAR_RANG.length];
