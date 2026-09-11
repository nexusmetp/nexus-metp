/**
 * Archives — cahier §14, second fonds.
 *
 * L'archivage n'est pas du stockage : c'est ce qui décide, pour chaque
 * dossier, combien de temps on le garde, qui peut le consulter, et ce qu'on
 * en fait à l'échéance. Trois notions portent tout le reste : la cote qui
 * situe, la durée d'utilité administrative qui borne, le sort final qui
 * tranche entre conservation et élimination.
 */

/** Ce qu'on fait de l'article à l'échéance de sa DUA. */
export type SortFinal = "CONSERVATION" | "ELIMINATION" | "TRI";

/** Délai au terme duquel l'article devient librement communicable. */
export type Communicabilite = "IMMEDIATE" | "25_ANS" | "50_ANS" | "75_ANS";

export type SupportArchive = "PAPIER" | "NUMERIQUE" | "MIXTE";

/**
 * Une série du plan de classement.
 *
 * Le plan est ce qui doit rester stable : c'est lui qui fixe la DUA et le
 * sort final par nature de dossier, une fois pour toutes, plutôt que de
 * laisser chaque agent décider au versement.
 */
export interface SerieArchive {
  code: string;
  intitule: string;
  /** Durée d'utilité administrative, en années. */
  dua: number;
  sortFinal: SortFinal;
  communicabilite: Communicabilite;
  /** Texte qui fixe la durée, quand il est connu. */
  reference?: string;
  justification: string;
}

/** Un versement : un service remet un ensemble de dossiers au service des archives. */
export interface Versement {
  id: string;
  reference: string;
  intitule: string;
  /** Service versant. */
  entiteId: string;
  dateVersement: string;
  /** Dates extrêmes des dossiers versés. */
  dateDebut: string;
  dateFin: string;
  /** Métrage linéaire, en mètres. */
  metrage: number;
  statut: "PREPARE" | "VERSE" | "RECOLE" | "REFUSE";
  verseParId: string;
  recuParId?: string | null;
  observations?: string;
}

/** Un article coté : l'unité qu'on range, qu'on communique et qu'on élimine. */
export interface ArticleArchive {
  id: string;
  /** Cote : ce qui permet de retrouver la boîte sur la tablette. */
  cote: string;
  intitule: string;
  versementId: string;
  serieCode: string;
  dateDebut: string;
  dateFin: string;
  dua: number;
  /** Date à laquelle la DUA s'achève — calculée à partir de la date de clôture. */
  echeanceDua: string;
  sortFinal: SortFinal;
  communicabilite: Communicabilite;
  support: SupportArchive;
  /** Rattachement au dossier vivant, quand il existe. */
  acteId?: string | null;
  agentId?: string | null;
  statut: "EN_RAYON" | "COMMUNIQUE" | "ELIMINE" | "TRANSFERE";
  /** Magasin, travée, tablette. */
  emplacement?: string;
}

/** Une demande de communication : sortir un article du rayon laisse une trace. */
export interface CommunicationArchive {
  id: string;
  articleId: string;
  demandeurId: string;
  dateDemande: string;
  dateRetour?: string | null;
  motif: string;
  statut: "DEMANDEE" | "ACCORDEE" | "REFUSEE" | "RESTITUEE";
  /** Motif du refus, le cas échéant. */
  reponse?: string;
}
