import type {
  Entite, ModeReleve, PointAccueil, PriseDeService, RegistreJour, StatutPriseService,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Points d'accueil, arrivées, registres — libellés et règles          */
/* ------------------------------------------------------------------ */

export const MODE_RELEVE_LABELS: Record<ModeReleve, string> = {
  REGISTRE_PAPIER: "Cahier papier, reporté",
  SAISIE_DIRECTE: "Saisie directe",
  MIXTE: "Cahier et saisie",
  NON_RENSEIGNE: "Mode non renseigné",
};

export const STATUT_PRISE_LABELS: Record<StatutPriseService, string> = {
  ATTENDUE: "Attendue",
  ENREGISTREE: "Arrivée enregistrée",
  INSTALLEE: "Installée",
  NON_PRESENTEE: "Non présentée",
  ANNULEE: "Affectation rapportée",
};

export const COULEUR_PRISE: Record<StatutPriseService, string> = {
  ATTENDUE: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  ENREGISTREE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  INSTALLEE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  NON_PRESENTEE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
  ANNULEE: "bg-slate-500/12 text-slate-500 border-slate-500/20",
};

export const STATUTS_PRISE = Object.keys(STATUT_PRISE_LABELS) as StatutPriseService[];

/**
 * Au-delà de combien de jours une arrivée qui n'est pas venue se regarde.
 *
 * **Aucun texte ne fixe ce délai** — c'est une proposition de l'outil, d'où
 * la provenance `RECOMMANDATION`. Quinze jours ouvrés laissent le temps d'un
 * déplacement depuis un département éloigné sans laisser un poste compté
 * comme occupé pendant un trimestre.
 *
 * Et ce que le seuil déclenche compte autant que le seuil : il ouvre un
 * **dossier à vérifier**, jamais une procédure. Un agent attendu depuis
 * quarante jours peut être hospitalisé, retenu faute de titre de transport,
 * ou installé depuis longtemps sans que le secrétariat l'ait saisi.
 */
export const SEUIL_ARRIVEE_A_VERIFIER = {
  jours: 15,
  provenance: "RECOMMANDATION" as const,
  note: "Proposition de l'outil, en attente du délai retenu par la DGARH.",
};

/**
 * Les niveaux d'entité qui tiennent normalement leur propre point d'accueil.
 *
 * Un bureau de quatre agents émarge au secrétariat de son service ; une
 * direction départementale en tient un. La liste dit donc quelles entités
 * **doivent** en avoir un — et permet de compter celles qui n'en ont pas,
 * ce qui est une question d'organisation et non de discipline.
 */
export const NIVEAUX_AVEC_POINT: Entite["niveau"][] = [
  "MINISTERE", "CABINET", "INSPECTION_GENERALE", "DIRECTION_GENERALE",
  "SECRETARIAT", "DIRECTION", "SERVICE", "DIRECTION_DEPARTEMENTALE",
  "INSPECTION_INTERDEPARTEMENTALE", "ETABLISSEMENT",
];

/** Une entité de ce niveau doit-elle tenir son propre point d'accueil ? */
export const doitTenirUnPoint = (e: Entite) =>
  e.actif !== false && NIVEAUX_AVEC_POINT.includes(e.niveau);

/** Identifiants déterministes : une entité, un point ; un service, un jour, un cahier. */
export const idPoint = (entiteId: string) => `PTA-${entiteId}`;
export const idRegistre = (entiteId: string, date: string) => `REG-${entiteId}-${date}`;

/**
 * Le point où un agent de cette entité émarge.
 *
 * Une entité sans point propre n'est pas sans point : elle émarge chez celle
 * dont elle dépend. On suit d'abord le rattachement déclaré, puis la chaîne
 * hiérarchique — c'est ainsi que l'administration fonctionne, et le code n'a
 * pas à inventer autre chose.
 *
 * `null` signifie qu'aucun point n'a été trouvé jusqu'à la racine : l'agent
 * n'a nulle part où émarger, et c'est cela qu'il faut afficher plutôt qu'un
 * blanc.
 */
export function pointDe(
  entiteId: string | undefined,
  points: Map<string, PointAccueil>,
  entites: Map<string, Entite>
): PointAccueil | null {
  let courant = entiteId;
  // Borne de sécurité : une arborescence corrompue ne doit pas figer la page.
  for (let garde = 0; courant && garde < 20; garde++) {
    const p = points.get(idPoint(courant));
    if (p?.actif) return p;
    if (p?.rattacheA) { courant = p.rattacheA; continue; }
    courant = entites.get(courant)?.parentId ?? undefined;
  }
  return null;
}

/** Nombre de jours entre deux dates ISO. Négatif si la seconde précède. */
export const joursEntre = (depuis: string, jusqua: string) =>
  Math.round((new Date(jusqua + "T12:00:00").getTime() - new Date(depuis + "T12:00:00").getTime()) / 864e5);

/**
 * Le statut qu'une prise de service porte réellement aujourd'hui.
 *
 * Même principe que pour les sorties du territoire : un statut enregistré
 * vieillit. Une arrivée « attendue » le 1er août l'est toujours en septembre
 * parce que personne n'est revenu la clore. On recalcule à l'affichage sans
 * toucher à l'enregistrement.
 */
export function statutPriseEffectif(p: PriseDeService): StatutPriseService {
  if (p.statut === "ANNULEE" || p.statut === "NON_PRESENTEE") return p.statut;
  if (p.dateInstallation) return "INSTALLEE";
  if (p.dateArrivee) return "ENREGISTREE";
  return "ATTENDUE";
}

/**
 * Une arrivée qui traîne au-delà du seuil, et de combien.
 *
 * Retourne `null` quand il n'y a rien à signaler — l'appelant n'a donc pas à
 * réécrire la règle du seuil à chaque écran.
 */
export function arriveeEnAttente(p: PriseDeService, aujourdhui: string): number | null {
  if (statutPriseEffectif(p) !== "ATTENDUE") return null;
  const jours = joursEntre(p.dateAttendue, aujourdhui);
  return jours >= SEUIL_ARRIVEE_A_VERIFIER.jours ? jours : null;
}

/* ------------------------------------------------------------------ */
/* Ce que le registre permet enfin de distinguer                       */
/* ------------------------------------------------------------------ */

/**
 * L'état du cahier d'un service, un jour donné.
 *
 * C'est la distinction qui manquait à toute la plateforme. Sans registre,
 * l'absence de pointage était muette : agent absent, ou service qui ne tient
 * pas son cahier ? Les deux appellent une décision, mais pas la même — l'une
 * est une question de discipline individuelle, l'autre une question
 * d'organisation, et les confondre revient à reprocher à deux mille agents
 * ce qui est un défaut de tenue de quatre-vingt-dix secrétariats.
 */
export type EtatCahier = "CLOS" | "OUVERT" | "NON_TENU" | "SANS_POINT";

export const ETAT_CAHIER_LABELS: Record<EtatCahier, string> = {
  CLOS: "Cahier clos",
  OUVERT: "Cahier ouvert",
  NON_TENU: "Cahier non ouvert ce jour",
  SANS_POINT: "Aucun point d'accueil",
};

export const COULEUR_CAHIER: Record<EtatCahier, string> = {
  CLOS: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  OUVERT: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  NON_TENU: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  SANS_POINT: "bg-slate-500/12 text-slate-500 border-slate-500/20",
};

export function etatCahier(
  entiteId: string,
  date: string,
  registres: Map<string, RegistreJour>,
  point: PointAccueil | null
): EtatCahier {
  if (!point) return "SANS_POINT";
  const r = registres.get(idRegistre(entiteId, date));
  if (!r) return "NON_TENU";
  return r.closLe ? "CLOS" : "OUVERT";
}
