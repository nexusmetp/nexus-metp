/**
 * Les échecs de l'assistant, dits en français et sans jargon.
 *
 * Un agent de la DGARH n'a pas à décoder un code HTTP : il doit savoir si
 * c'est à lui de recommencer, à l'administrateur de corriger la clé, ou à
 * personne parce que le service du fournisseur est en panne.
 */

export type CodeErreurIA =
  | "hors-service" | "cle" | "quota" | "modele" | "reseau" | "reponse" | "requete";

export class ErreurIA extends Error {
  constructor(message: string, readonly code: CodeErreurIA, readonly detail?: string) {
    super(message);
    this.name = "ErreurIA";
  }
}

/** Ce que l'utilisateur peut faire lui-même, par code d'échec. */
export const CONSEIL: Record<CodeErreurIA, string> = {
  "hors-service": "L'administrateur système doit poser une clé dans l'espace Système, onglet Assistant.",
  cle: "La clé a été refusée par le fournisseur. L'administrateur doit la vérifier ou la remplacer.",
  quota: "Le compte du ministère a atteint sa limite. Réessayez plus tard ou relevez le plafond chez le fournisseur.",
  modele: "Le modèle nommé dans le paramétrage n'existe pas ou n'est pas ouvert à ce compte.",
  reseau: "Le navigateur n'a pas pu joindre le fournisseur : réseau coupé, filtrage, ou page servie sans accès sortant.",
  reponse: "Le fournisseur a répondu dans un format inattendu.",
  requete: "La demande a été refusée telle qu'elle était formée.",
};

/** Traduit une réponse HTTP en échec nommé. */
export function depuisStatut(statut: number, detail?: string): ErreurIA {
  if (statut === 401 || statut === 403) return new ErreurIA("Clé d'accès refusée.", "cle", detail);
  if (statut === 404) return new ErreurIA("Modèle ou point d'entrée introuvable.", "modele", detail);
  if (statut === 429) return new ErreurIA("Limite d'usage atteinte.", "quota", detail);
  if (statut >= 500) return new ErreurIA("Le service du fournisseur ne répond pas.", "reseau", detail);
  return new ErreurIA("Demande refusée par le fournisseur.", "requete", detail);
}
