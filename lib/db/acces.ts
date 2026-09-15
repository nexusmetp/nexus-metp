"use client";

import type { StoreName } from "./schema";
import { getDB } from "./connexion";
import { ensureSeed } from "./semis";

/* ------------------------------------------------------------------ */
/* Lire et écrire une ligne                                             */
/* ------------------------------------------------------------------ */

/*
 * `all` et `one` sèment avant de lire : une page ouverte sur une base neuve
 * doit trouver le décor, pas un tableau vide. `save` et `remove` ne sèment
 * pas — on n'écrit jamais sans avoir d'abord lu.
 */
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

