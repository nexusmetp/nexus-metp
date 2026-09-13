/* ------------------------------------------------------------------ */
/* Présence quotidienne — le fait, pas le droit                        */
/* ------------------------------------------------------------------ */

/**
 * Un pointage n'est pas une position statutaire, et les confondre serait
 * l'erreur à ne pas commettre.
 *
 * La **position** (activité, détachement, disponibilité, suspension) est un
 * état de droit : elle naît d'un acte, elle dure des mois, elle se projette
 * depuis l'historique. La **présence** est un fait matériel, constaté un jour
 * donné dans un service donné, par quelqu'un qui en répond. Un agent en
 * position d'activité peut être absent ; un agent absent n'est pas pour
 * autant hors activité.
 *
 * D'où deux magasins séparés, et un pointage qui porte toujours le nom de
 * celui qui l'a saisi : une affirmation sur la présence de quelqu'un engage
 * son auteur.
 */

export type EtatPresence =
  | "PRESENT"
  | "RETARD"
  | "DEPART_ANTICIPE"
  | "ABSENT_JUSTIFIE"
  | "ABSENT_NON_JUSTIFIE"
  | "CONGE"
  | "MISSION"
  | "SORTIE_TERRITOIRE"
  | "TELETRAVAIL"
  | "AUTRE_AUTORISE";

/**
 * Ce qui fonde une absence régulière. Un pointage justifié par un congé ou
 * une autorisation de sortie pointe vers la pièce : sans elle, l'absence
 * n'est pas justifiée — elle est seulement déclarée comme telle.
 */
export interface Pointage {
  id: string;
  agentId: string;
  /** Jour constaté, au format AAAA-MM-JJ. Un agent, un jour, un pointage. */
  date: string;
  etat: EtatPresence;
  /** Heures relevées, quand le service les relève. HH:MM. */
  heureArrivee?: string | null;
  heureDepart?: string | null;
  /**
   * Minutes de retard. Calculées seulement si l'heure d'ouverture est
   * renseignée dans les paramètres — sinon le retard reste un constat humain,
   * et ce champ est absent.
   */
  minutesRetard?: number | null;
  motif?: string;
  /** Congé, sortie du territoire ou acte qui couvre l'absence. */
  congeId?: string | null;
  sortieId?: string | null;
  acteId?: string | null;
  /**
   * Entité au moment du constat, recopiée à la saisie. Un pointage appartient
   * au service qui l'a fait : une mutation ultérieure ne doit pas déplacer
   * l'historique de présence d'un agent.
   */
  entiteId?: string;
  saisiPar: string;
  saisiParNom: string;
  saisiLe: string;
}

/* ------------------------------------------------------------------ */
/* Sorties du territoire                                               */
/* ------------------------------------------------------------------ */

export type StatutSortie =
  | "DEMANDEE"
  | "AUTORISEE"
  | "EN_COURS"
  | "RENTREE"
  | "RETARD_RETOUR"
  | "REFUSEE"
  | "ANNULEE";

/**
 * Une absence du territoire national est un acte d'autorité : elle
 * s'autorise, elle se borne, et le retour se constate. Les trois dates sont
 * distinctes à dessein — `dateRetourPrevue` est ce qu'autorise l'acte,
 * `dateRetourReelle` est ce qui s'est passé, et l'écart entre les deux est
 * précisément ce qu'un ministère doit pouvoir lire.
 */
export interface SortieTerritoire {
  id: string;
  agentId: string;
  /** Recopiée à l'autorisation, pour la même raison que sur le pointage. */
  entiteId?: string;
  destination: string;
  pays: string;
  motif: string;
  /** Nature du motif, pour distinguer une mission d'un congé passé dehors. */
  nature: "MISSION" | "FORMATION" | "CONGE" | "SANTE" | "PERSONNEL" | "AUTRE";
  dateDepart: string;
  dateRetourPrevue: string;
  dateRetourReelle?: string | null;
  statut: StatutSortie;
  /** Le titre qui l'autorise : type, référence, et qui a signé. */
  typeActe: string;
  referenceActe?: string;
  autoriteSignataire?: string;
  acteId?: string | null;
  /** Prise en charge, quand elle est connue. Jamais devinée. */
  priseEnCharge?: "ETAT" | "PARTENAIRE" | "AGENT" | null;
  observations?: string;
}

/* ------------------------------------------------------------------ */
/* Rémunération des personnels non statutaires                         */
/* ------------------------------------------------------------------ */

/**
 * Les contractuels, prestataires, vacataires et volontaires n'ont pas de
 * carrière indiciaire : leur rémunération ne se déduit d'aucune grille, elle
 * est portée par un contrat. On ne peut donc pas la calculer — il faut
 * l'enregistrer, ou dire qu'on ne la connaît pas.
 *
 * `montant: null` signifie exactement cela : **donnée non renseignée**. Ce
 * n'est pas zéro, et les agrégats ne doivent jamais l'additionner comme tel.
 */
export type NatureRemuneration = "MENSUELLE" | "HORAIRE" | "VACATION" | "FORFAIT" | "INDEMNITE";

export interface RemunerationContractuelle {
  id: string;
  agentId: string;
  nature: NatureRemuneration;
  /** En francs CFA. `null` = non renseignée, et affichée comme telle. */
  montant: number | null;
  /** Nombre d'unités pour les natures horaires ou à la vacation. */
  quantite?: number | null;
  dateDebut: string;
  dateFin?: string | null;
  /** Contrat ou acte qui la fonde. */
  reference?: string;
  acteId?: string | null;
  /** Niveau de preuve, comme partout ailleurs dans le référentiel. */
  provenance: "TEXTE" | "A_VERIFIER" | "RECOMMANDATION";
  observations?: string;
}
