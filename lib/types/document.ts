/* Documents établis — cahier §14                                      */
/* ------------------------------------------------------------------ */

/**
 * Trace d'un document effectivement édité (imprimé, enregistré ou transmis).
 *
 * Prévisualiser n'est pas éditer : seul le geste qui fait sortir le document
 * de l'écran est enregistré ici. Le registre répond ensuite à la question qui
 * se pose toujours après coup — qui a sorti cette attestation, et quand.
 */
export interface DocumentEmis {
  id: string;
  /** Clé du modèle, au sens de la bibliothèque documentaire. */
  modele: string;
  intitule: string;
  reference: string;
  objet: string;
  /** Nature du sujet : acte, agent, entite, conge ou libre. */
  sujetType: string;
  sujetId?: string;
  /** Ce qui a été fait du document : imprimé, téléchargé, transféré. */
  canal: "IMPRESSION" | "TELECHARGEMENT" | "TRANSFERT" | "COPIE";
  emisPar: string;
  dateEmission: string;
}
