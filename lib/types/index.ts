/**
 * Modèle de domaine du SIRH du METP.
 *
 * Réécrit d'après le cahier fonctionnel de la DGARH (§05, §06, §07, §08, §15).
 * Trois principes structurants :
 *   1. L'organisation est UNE arborescence récursive, pas quatre tables.
 *   2. La carrière est une suite d'événements datés ; l'état courant se calcule.
 *   3. Rien ne change dans un dossier sans acte.
 *
 * Le modèle est découpé par domaine plutôt qu'en un seul fichier : chaque
 * partie tient sous les yeux, et l'ordre des importations dit dans quel sens
 * les notions se fondent — l'organisation d'abord, l'agent ensuite, l'acte
 * qui les relie, puis ce qui gravite autour.
 */

export type * from "./organisation";
export type * from "./agent";
export type * from "./acte";
export type * from "./acces";
export type * from "./profil";
export type * from "./habilitation";
export type * from "./collaboration";
export type * from "./rh";
export type * from "./presence";
export type * from "./accueil";
export type * from "./parcours";
export type * from "./document";
export type * from "./archives";
export type * from "./redaction";
export type * from "./ia";
