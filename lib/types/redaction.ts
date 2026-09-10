/* ------------------------------------------------------------------ */
/* Rédaction assistée — le traitement de texte du ministère            */
/*                                                                     */
/* Un brouillon n'est pas un acte : il n'a ni numéro ni portée tant     */
/* qu'il n'a pas été arrêté par son rédacteur, puis versé au circuit.   */
/* Le distinguer de l'acte est ce qui permet d'écrire librement sans    */
/* que rien ne bouge dans le dossier d'un agent.                       */
/* ------------------------------------------------------------------ */

export type StatutBrouillon = "BROUILLON" | "RELECTURE" | "ARRETE";

/** D'où vient un état du texte : la main, le modèle, ou l'assistant. */
export type OrigineVersion = "MODELE" | "SAISIE" | "ASSISTANT";

export interface VersionBrouillon {
  horodatage: string;
  auteur: string;
  origine: OrigineVersion;
  /** Ce qui a été fait, en une ligne : « reformulé l'article 2 ». */
  resume: string;
  /** Le corps HTML complet, assaini. Une version se relit entière. */
  contenu: string;
}

export interface Brouillon {
  id: string;
  titre: string;
  /** Clé du modèle livré dont la pièce est partie, s'il y en a une. */
  modele?: string;
  /** Modèle de la maison dont elle est partie — pour pouvoir le mettre à jour. */
  modeleMaisonId?: string;
  /** Corps HTML assaini de la feuille A4. */
  contenu: string;
  statut: StatutBrouillon;
  auteurId: string;
  auteur: string;
  entiteId: string;
  dateCreation: string;
  dateMaj: string;
  /**
   * Vrai dès qu'un passage a été écrit ou remanié par l'assistant.
   * Se transmet au document établi : le lecteur doit savoir ce qu'il relit.
   */
  assiste: boolean;
  /** Les dix derniers états, du plus récent au plus ancien. */
  versions: VersionBrouillon[];
}

/* ------------------------------------------------------------------ */
/* Modèles de la maison                                                */
/*                                                                     */
/* Les modèles livrés avec la plateforme sont du code : ils garantissent */
/* la forme réglementaire et ne se modifient pas depuis l'écran. Ceux   */
/* que la DGARH écrit elle-même vivent ici — repris d'un modèle livré   */
/* ou partis d'une feuille blanche, puis rangés dans la bibliothèque.   */
/* ------------------------------------------------------------------ */

export type FamilleModele = "Actes" | "Attestations" | "États" | "Correspondance" | "Archives";

export interface ModeleMaison {
  id: string;
  libelle: string;
  /** À quoi il sert et quand on l'établit — la phrase lue dans la bibliothèque. */
  usage: string;
  famille: FamilleModele;
  /** Clé du modèle livré dont il est la reprise, s'il y en a une. */
  base?: string;
  /** Corps HTML, jetons de fusion compris. */
  contenu: string;
  auteurId: string;
  auteur: string;
  entiteId: string;
  dateCreation: string;
  dateMaj: string;
  /** Ouvert à tout le ministère, ou réservé à son auteur. */
  partage: boolean;
  /**
   * États successifs du modèle, du plus récent au plus ancien.
   *
   * Les pièces déjà établies ne changent pas quand le modèle change — ce
   * sont des copies. Mais sans cet historique, plus personne ne saurait à
   * quoi ressemblait le modèle le jour où une pièce en est sortie, et c'est
   * une question qui finit toujours par se poser dans une administration.
   */
  versions: VersionModele[];
}

export interface VersionModele {
  horodatage: string;
  auteur: string;
  /** Ce qui a changé, en une ligne. */
  resume: string;
  contenu: string;
  libelle: string;
}
