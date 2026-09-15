"use client";

import { openDB, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION, STORES } from "./schema";

/* ------------------------------------------------------------------ */
/* L'ouverture de la base, et elle seule                                */
/* ------------------------------------------------------------------ */

/**
 * Une seule promesse d'ouverture pour toute l'application : `openDB` appelé
 * deux fois en parallèle ouvre deux connexions, et la seconde bloque la
 * montée de version de la première.
 */
let dbp: Promise<IDBPDatabase> | null = null;

export const getDB = () => {
  if (typeof window === "undefined") return null as any;
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, ancienne) {
        // v1 → v2 : le schéma change de fond en comble, on repart des stores.
        // À partir de v12, les montées de version ajoutent des tiroirs sans
        // vider ceux qui existent — les brouillons survivent à la mise à jour.
        if (ancienne < 12) {
          Array.from(db.objectStoreNames).forEach((s) => db.deleteObjectStore(s));
        }
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
        });
      },
    });
  }
  return dbp;
};
