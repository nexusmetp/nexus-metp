/* ------------------------------------------------------------------ */
/* Assistance par modèle de langage — réglages et échanges             */
/*                                                                     */
/* La clé d'accès est saisie par l'administrateur et par lui seul :     */
/* c'est un moyen de paiement autant qu'un secret. Rien ne part vers    */
/* un fournisseur tant qu'elle n'a pas été posée, et l'assistant reste  */
/* éteint — l'application entière fonctionne sans lui.                  */
/* ------------------------------------------------------------------ */

export type FournisseurIA = "anthropic" | "openai";

export interface ReglagesIA {
  actif: boolean;
  fournisseur: FournisseurIA;
  /** Clé d'accès au fournisseur. Vide = assistant éteint. */
  cle: string;
  /** Nom du modèle chez le fournisseur, tel qu'il l'écrit lui-même. */
  modele: string;
  /** Point d'entrée, pour un service compatible hébergé ailleurs. */
  urlBase?: string;
  /** Longueur maximale d'une réponse, en jetons. */
  maxJetons: number;
  /** Consigne permanente ajoutée en tête de chaque échange. */
  consigne?: string;
  /** L'assistant peut-il lire les données de l'écran courant ? */
  contexteAutorise: boolean;
  maj?: string;
  majPar?: string;
}

export interface EchangeIA {
  id: string;
  conversationId: string;
  role: "utilisateur" | "assistant";
  contenu: string;
  horodatage: string;
  /** La page depuis laquelle la question a été posée. */
  contexte?: string;
  /** Message d'erreur du fournisseur, le cas échéant. */
  echec?: string;
}

export interface ConversationIA {
  id: string;
  titre: string;
  utilisateurId: string;
  dateCreation: string;
  dateMaj: string;
}
