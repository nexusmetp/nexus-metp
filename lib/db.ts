"use client";

import { openDB, type IDBPDatabase } from "idb";
import { buildDataset, type Dataset } from "@/lib/seed";

const DB_NAME = "nexus-metp";
/** v3 : ajout du niveau établissement (§10). v2 : passage au modèle événementiel du cahier (§15). */
const DB_VERSION = 4;

const STORES = [
  "entites", "corps", "grades", "postes", "agents",
  "situations", "affectations", "positions",
  "actes", "besoins", "utilisateurs", "journal", "notifications", "meta",
] as const;
export type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (typeof window === "undefined") return null as any;
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, ancienne) {
        // v1 → v2 : le schéma change de fond en comble, on repart des stores.
        if (ancienne < 3) {
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

/** Sème la base navigateur au premier lancement. */
export async function ensureSeed(force = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const meta = await db.get("meta", "seed");
  if (meta?.version === DB_VERSION && !force) return;

  const data: Dataset = buildDataset();
  const tx = db.transaction(STORES as unknown as string[], "readwrite");
  await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));

  const put = (s: StoreName, rows: any[]) => rows.map((r) => tx.objectStore(s).put(r));
  await Promise.all([
    ...put("entites", data.entites as any[]),
    ...put("corps", data.corps as any[]),
    ...put("grades", data.grades as any[]),
    ...put("postes", data.postes),
    ...put("agents", data.agents),
    ...put("situations", data.situations),
    ...put("affectations", data.affectations),
    ...put("positions", data.positions),
    ...put("actes", data.actes),
    ...put("besoins", data.besoins),
    ...put("utilisateurs", data.utilisateurs),
    ...put("journal", data.journal),
    ...put("notifications", data.notifications),
    tx.objectStore("meta").put({
      id: "seed",
      version: DB_VERSION,
      date: new Date().toISOString(),
      source: "donnees-fictives",
    }),
  ]);
  await tx.done;
}

export async function all<T = any>(store: StoreName): Promise<T[]> {
  await ensureSeed();
  const db = await getDB();
  if (!db) return [];
  return (await db.getAll(store)) as T[];
}

export async function one<T = any>(store: StoreName, id: string): Promise<T | undefined> {
  await ensureSeed();
  const db = await getDB();
  if (!db) return undefined;
  return (await db.get(store, id)) as T;
}

export async function save<T extends { id: string }>(store: StoreName, row: T): Promise<T> {
  const db = await getDB();
  await db.put(store, row);
  return row;
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export async function resetDB(): Promise<void> {
  await ensureSeed(true);
}
