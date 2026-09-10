/**
 * Assistance par modèle de langage.
 *
 * Toute l'application passe par ici : rien n'appelle un fournisseur
 * ailleurs, et rien ne suppose qu'un fournisseur soit configuré.
 */

export * from "./reglages";
export * from "./erreurs";
export * from "./invites";
export { appelerIA, listerModeles, relaisDisponible, oublierRelais, type MessageIA, type OptionsAppel } from "./client";
export { useIA, messageErreur } from "./hook";
