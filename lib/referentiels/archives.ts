import type { Communicabilite, SerieArchive, SortFinal } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Plan de classement des archives — cahier §14                        */
/* ------------------------------------------------------------------ */

/**
 * Le plan de classement.
 *
 * C'est lui qui fixe, par nature de dossier et une fois pour toutes, combien
 * de temps on garde et ce qu'on fait à l'échéance. Laisser chaque agent
 * trancher au moment du versement, c'est garantir qu'on éliminera un jour
 * ce qu'il fallait conserver.
 *
 * Les durées retenues suivent les usages archivistiques francophones. Le
 * tableau de gestion propre au METP n'a pas pu être consulté : ces durées
 * sont une recommandation, à confronter au texte quand il sera disponible.
 */
export const PLAN_CLASSEMENT: SerieArchive[] = [
  {
    code: "1 RH", intitule: "Dossiers individuels des agents",
    dua: 90, sortFinal: "CONSERVATION", communicabilite: "50_ANS",
    justification:
      "Se conserve jusqu'à 90 ans après la naissance de l'agent : c'est la pièce qui "
      + "prouve une carrière, et une pension se liquide parfois très tard.",
  },
  {
    code: "2 RH", intitule: "Actes réglementaires et décisions collectives",
    dua: 5, sortFinal: "CONSERVATION", communicabilite: "IMMEDIATE",
    justification:
      "Arrêtés et décisions publiés. Conservation intégrale : ils fondent les situations "
      + "individuelles et sont déjà publics par leur publication au Journal officiel.",
  },
  {
    code: "3 RH", intitule: "Recrutement, concours et candidatures",
    dua: 10, sortFinal: "TRI", communicabilite: "50_ANS",
    justification:
      "On conserve les procès-verbaux de jury et les listes d'admis ; les dossiers des "
      + "candidats non retenus s'éliminent à l'échéance.",
  },
  {
    code: "4 RH", intitule: "Congés, absences et positions",
    dua: 5, sortFinal: "ELIMINATION", communicabilite: "50_ANS",
    justification:
      "Le droit qui en résulte est déjà porté par le dossier individuel : au-delà de la "
      + "prescription, la pièce elle-même n'a plus d'utilité.",
  },
  {
    code: "5 RH", intitule: "Formation professionnelle",
    dua: 10, sortFinal: "TRI", communicabilite: "25_ANS",
    justification:
      "Les programmes et bilans se conservent, les feuilles de présence s'éliminent.",
  },
  {
    code: "6 RH", intitule: "Contentieux et discipline",
    dua: 30, sortFinal: "CONSERVATION", communicabilite: "75_ANS",
    justification:
      "Met en cause des personnes : délai de communicabilité long, et conservation "
      + "définitive parce qu'une sanction peut être contestée très longtemps après.",
  },
  {
    code: "7 RH", intitule: "Effectifs, statistiques et états de besoins",
    dua: 5, sortFinal: "CONSERVATION", communicabilite: "IMMEDIATE",
    justification:
      "Données agrégées, sans mention nominative : librement communicables et "
      + "irremplaçables pour retracer l'évolution des effectifs.",
  },
  {
    code: "8 AF", intitule: "Comptabilité, marchés et matériel",
    dua: 10, sortFinal: "ELIMINATION", communicabilite: "25_ANS",
    justification:
      "Durée alignée sur la prescription en matière de comptabilité publique.",
  },
  {
    code: "9 AD", intitule: "Correspondance générale et notes de service",
    dua: 5, sortFinal: "TRI", communicabilite: "IMMEDIATE",
    justification:
      "Le chrono se conserve, la correspondance courante s'élimine.",
  },
];

export const serieParCode = (code: string) => PLAN_CLASSEMENT.find((s) => s.code === code);

export const SORT_FINAL_LABELS: Record<SortFinal, string> = {
  CONSERVATION: "Conservation définitive",
  ELIMINATION: "Élimination",
  TRI: "Tri",
};

export const COMMUNICABILITE_LABELS: Record<Communicabilite, string> = {
  IMMEDIATE: "Immédiate",
  "25_ANS": "25 ans",
  "50_ANS": "50 ans",
  "75_ANS": "75 ans",
};

export const DELAI_COMMUNICABILITE: Record<Communicabilite, number> = {
  IMMEDIATE: 0, "25_ANS": 25, "50_ANS": 50, "75_ANS": 75,
};

export const STATUT_ARTICLE_LABELS = {
  EN_RAYON: "En rayon",
  COMMUNIQUE: "Communiqué",
  ELIMINE: "Éliminé",
  TRANSFERE: "Transféré",
} as const;

export const STATUT_VERSEMENT_LABELS = {
  PREPARE: "Préparé",
  VERSE: "Versé",
  RECOLE: "Récolé",
  REFUSE: "Refusé",
} as const;

/** Échéance de la DUA : elle court à partir de la clôture du dossier, pas de son ouverture. */
export const echeanceDua = (dateFin: string, dua: number) =>
  `${Number(dateFin.slice(0, 4)) + dua}${dateFin.slice(4)}`;

/**
 * Un article est communicable si son délai est écoulé.
 * Le délai court lui aussi depuis la clôture du dossier.
 */
export function communicable(dateFin: string, c: Communicabilite, aujourdHui = new Date()): boolean {
  const ouverture = Number(dateFin.slice(0, 4)) + DELAI_COMMUNICABILITE[c];
  return aujourdHui.getFullYear() >= ouverture;
}

/** Vrai quand la durée d'utilité administrative est échue : le sort final s'applique. */
export const duaEchue = (echeance: string, aujourdHui = new Date()) =>
  echeance <= aujourdHui.toISOString().slice(0, 10);
