"use client";

import { openDB, type IDBPDatabase } from "idb";
import { buildDataset, type Dataset } from "@/lib/seed";

const DB_NAME = "nexus-metp";
const DB_VERSION = 1;
const STORES = ["agents", "postes", "actes", "conges", "utilisateurs", "entites", "grades", "journal", "notifications", "meta"] as const;
type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (typeof window === "undefined") return null as any;
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
        });
      },
    });
  }
  return dbp;
};

/** Semène la base navigateur (IndexedDB) au premier lancement. */
export async function ensureSeed(force = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const meta = await db.get("meta", "seed");
  if (meta && !force) return;

  const data: Dataset = buildDataset();
  const tx = db.transaction(STORES as unknown as string[], "readwrite");
  if (force) await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
  const put = (s: StoreName, rows: any[]) => rows.map((r) => tx.objectStore(s).put(r));
  await Promise.all([
    ...put("entites", data.entites),
    ...put("grades", data.grades),
    ...put("postes", data.postes),
    ...put("agents", data.agents),
    ...put("actes", data.actes),
    ...put("conges", data.conges),
    ...put("utilisateurs", data.utilisateurs),
    ...put("journal", data.journal),
    ...put("notifications", data.notifications),
    tx.objectStore("meta").put({ id: "seed", version: DB_VERSION, date: new Date().toISOString(), source: "donnees-fictives" }),
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
