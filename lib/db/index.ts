"use client";

/**
 * La base du navigateur, en cinq morceaux.
 *
 * `lib/db.ts` approchait les cinq cents lignes, et la règle du dépôt les
 * refuse. Le découpage suit les questions qu'on se pose en l'ouvrant : quels
 * tiroirs existent (`schema`), ce qu'une montée de version fait au décor
 * (`migrations`), comment la base s'ouvre (`connexion`), comment le décor est
 * posé sans détruire ce qu'un agent a saisi (`semis`), et comment on lit et
 * écrit une ligne (`acces`).
 *
 * L'`index` réexporte l'ensemble : les dix-sept fichiers qui importent
 * `@/lib/db` n'ont pas bougé.
 */

export { DB_NAME, DB_VERSION, STORES, STORES_SEMES, STORES_UTILISATEUR } from "./schema";
export type { StoreName } from "./schema";
export { PURGER, RAFRAICHIR, VIDER } from "./migrations";
export { getDB } from "./connexion";
export { ensureSeed } from "./semis";
export { all, one, save, remove, resetDB } from "./acces";
