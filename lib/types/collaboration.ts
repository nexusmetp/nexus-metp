import type { ReglagesIA } from "./ia";
import type { Acte } from "./acte";
import type { Agent } from "./agent";

/* ------------------------------------------------------------------ */
/* Collaboration — §16 : ce qui circule autour de l'acte                */
/* ------------------------------------------------------------------ */

export type CategorieTicket =
  | "RECLAMATION"      // l'agent conteste une situation
  | "ASSISTANCE"       // demande d'aide sur l'outil
  | "INCIDENT"         // anomalie constatée
  | "DEMANDE_PIECE"    // pièce manquante réclamée
  | "SUGGESTION";

export type PrioriteTicket = "BASSE" | "NORMALE" | "HAUTE" | "CRITIQUE";

export type StatutTicket =
  | "OUVERT"
  | "PRIS_EN_CHARGE"
  | "EN_ATTENTE_DEMANDEUR"
  | "RESOLU"
  | "CLOS";

/**
 * Une réclamation ou une demande d'assistance. Le ticket ne décide rien :
 * quand il aboutit à un changement de situation, il ouvre un acte, qui seul
 * fait foi (§05). Le lien `acteId` matérialise ce passage de relais.
 */
export interface Ticket {
  id: string;
  reference: string;
  objet: string;
  description: string;
  categorie: CategorieTicket;
  priorite: PrioriteTicket;
  statut: StatutTicket;
  /** Compte qui a ouvert le ticket. */
  ouvertPar: string;
  ouvertParNom: string;
  /** Agent concerné, quand le ticket porte sur un dossier. */
  agentId?: string | null;
  /** Entité de traitement — détermine qui le voit (§11). */
  entiteId: string;
  assigneA?: string | null;
  dateOuverture: string;
  /** Échéance de traitement, calculée d'après la priorité. */
  echeance: string;
  dateCloture?: string | null;
  /** Acte ouvert pour donner suite, s'il y en a un. */
  acteId?: string | null;
  satisfaction?: number | null;
}

export interface MessageTicket {
  id: string;
  ticketId: string;
  auteurId: string;
  auteur: string;
  corps: string;
  horodatage: string;
  /** Note de service non visible du demandeur. */
  interne: boolean;
}

export type TypeConversation = "DIRECT" | "GROUPE" | "ENTITE";

export interface Conversation {
  id: string;
  type: TypeConversation;
  titre: string;
  /** Identifiants de comptes. Pour un fil d'entité, tout le périmètre. */
  participants: string[];
  entiteId?: string | null;
  dateCreation: string;
  dernierMessage?: string;
  dateDernierMessage?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  auteurId: string;
  auteur: string;
  corps: string;
  horodatage: string;
  luPar: string[];
  /** Renvoi vers un dossier : un échange reste rattaché à ce dont il parle. */
  acteId?: string | null;
}

export type PorteeAnnonce = "MINISTERE" | "ENTITE";

/**
 * Note de service ou circulaire. L'accusé de lecture est nominatif : c'est ce
 * qui distingue une circulaire d'un simple message.
 */
export interface Annonce {
  id: string;
  reference: string;
  titre: string;
  corps: string;
  auteurId: string;
  auteur: string;
  portee: PorteeAnnonce;
  entiteId: string;
  dateEmission: string;
  /** Lecture exigée : la liste des accusés devient un état de diffusion. */
  accuseRequis: boolean;
  accuses: { utilisateurId: string; date: string }[];
  epingle: boolean;
}

/* ------------------------------------------------------------------ */
/* Paramétrage système — la main de l'administrateur (§11)              */
/* ------------------------------------------------------------------ */

export interface ParametresSysteme {
  id: "PARAMETRES";
  nomInstitution: string;
  exercice: number;
  /** Délai cible d'instruction d'un acte, en jours. §13 */
  delaiCibleActe: number;
  /**
   * Valeur du point indiciaire, et ce qui la fonde.
   *
   * Absente = jamais renseignée : les montants statutaires s'affichent alors
   * « À vérifier » et aucun total général n'est présenté. Voir
   * `lib/referentiels/remuneration.ts`, qui explique pourquoi l'outil ne la
   * pose pas de lui-même.
   */
  valeurPoint?: number | null;
  valeurPointDateEffet?: string;
  valeurPointReference?: string;
  /**
   * Heure d'ouverture des services, HH:MM. Absente = non renseignée, et le
   * retard reste un constat humain plutôt qu'un calcul.
   */
  heureOuverture?: string;
  /** Jours d'absence continue au-delà desquels un dossier remonte. */
  seuilAbsenceProlongee?: number;
  /** Délai cible de réponse à un ticket, par priorité, en heures. */
  delaiTicket: Record<PrioriteTicket, number>;
  /** Droits surchargés par l'administrateur, par rôle et par module. */
  droitsSurcharges: Record<string, Record<string, "R" | "W" | "N">>;
  messagerieActive: boolean;
  ticketsActifs: boolean;
  annoncesActives: boolean;
  /** Réglages de l'assistant. Absent = jamais configuré, donc éteint. */
  ia?: ReglagesIA;
  maj: string;
}
