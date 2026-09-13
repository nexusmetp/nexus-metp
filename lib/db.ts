"use client";

import { openDB, type IDBPDatabase } from "idb";
import { buildDataset, type Dataset } from "@/lib/seed";

const DB_NAME = "nexus-metp";
/**
 * v14 : modèles écrits par la maison, rangés à côté des modèles livrés.
 * v13 : brouillons de rédaction et échanges avec l'assistant.
 * v12 : fonds d'archives — versements, articles cotés, communications.
 * v11 : horodatages du semis ramenés avant le jour de référence.
 * v10 : registre des documents établis.
 * v9 : cartes professionnelles et photographies.
 * v15 : présences, sorties du territoire, rémunérations non statutaires — et
 *        le semis cesse de détruire ce qui a été saisi (voir `ensureSeed`).
 * v8 : emplois, délégations, fonds documentaire, recrutement et formation.
 * v7 : inspections détaillées. v6 : cabinet du ministre. v5 : collaboration.
 * v4 : dossier personnel pour tous les rôles. v3 : niveau établissement (§10).
 */
const DB_VERSION = 15;

const STORES = [
  "entites", "corps", "grades", "postes", "agents",
  "situations", "affectations", "positions",
  "actes", "besoins", "utilisateurs", "journal", "notifications",
  "tickets", "messagesTicket", "conversations", "messages", "annonces", "parametres",
  "conges", "delegations", "textes", "campagnes", "candidatures",
  "offresFormation", "inscriptions", "cartes", "documents",
  "versements", "articlesArchives", "communications",
  "pointages", "sorties", "remunerations",
  "brouillons", "modelesMaison", "conversationsIA", "echangesIA", "meta",
] as const;
export type StoreName = (typeof STORES)[number];

/**
 * Ce que le semis n'a pas le droit d'effacer.
 *
 * Le reste de la base est un jeu de données fictif qu'on peut refaire à
 * volonté ; un brouillon, lui, a été écrit par quelqu'un. Le réinitialiser
 * avec le décor reviendrait à jeter son travail pour rafraîchir l'exemple.
 */
const STORES_UTILISATEUR: StoreName[] = [
  "brouillons", "modelesMaison", "conversationsIA", "echangesIA",
];
const STORES_SEMES = STORES.filter((s) => !STORES_UTILISATEUR.includes(s));

let dbp: Promise<IDBPDatabase> | null = null;

const getDB = () => {
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

/**
 * Sème la base navigateur — et ne détruit jamais ce qu'un agent a saisi.
 *
 * La première version vidait tous les tiroirs semés dès que `DB_VERSION`
 * changeait. Conséquence, jamais écrite nulle part et pourtant certaine :
 * une entité, un acte, un agent créés par un service **disparaissaient au
 * déploiement suivant**. Le décor était protégé, le travail non.
 *
 * Trois cas, et un seul efface :
 *
 *  - **base neuve** (aucune trace de semis) : on remplit tout ;
 *  - **montée de version** : on ne vide RIEN. On ne remplit que les tiroirs
 *    restés vides — ceux qu'ajoute la migration — et on laisse les autres
 *    exactement dans l'état où l'utilisateur les a mis ;
 *  - **`force`** : on refait le décor, parce que quelqu'un l'a demandé
 *    explicitement depuis Système → réinitialiser. C'est le seul chemin qui
 *    efface, et il porte un avertissement à l'écran.
 */
export async function ensureSeed(force = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const meta = await db.get("meta", "seed");
  const jamaisSeme = !meta;
  if (!jamaisSeme && meta.version === DB_VERSION && !force) return;

  /* Quels tiroirs remplir, et lesquels seulement compléter. Les lectures se
     font dans leur propre transaction : compter puis écrire dans la même
     laisserait IndexedDB refermer la transaction entre les deux. */
  let aRemplir: StoreName[];
  /** Clés déjà présentes, par tiroir non vide. Sert au complément. */
  const dejaLa = new Map<StoreName, Set<string>>();

  if (force || jamaisSeme) {
    aRemplir = [...STORES_SEMES];
  } else {
    const lecture = db.transaction(STORES_SEMES as unknown as string[], "readonly");
    const etats = await Promise.all(STORES_SEMES.map(async (s) => {
      const cles = (await lecture.objectStore(s).getAllKeys()) as IDBValidKey[];
      return [s, cles] as const;
    }));
    await lecture.done;
    aRemplir = etats.filter(([, c]) => c.length === 0).map(([s]) => s);
    etats.filter(([, c]) => c.length > 0)
      .forEach(([s, c]) => dejaLa.set(s, new Set(c.map(String))));
  }

  let data: Dataset;
  try {
    data = buildDataset();
  } catch (e) {
    // Sans ce relais, un semis qui échoue laisse une base vide et muette :
    // l'application s'ouvre sur des listes vides sans dire pourquoi.
    console.error("[semis] construction du jeu de données impossible", e);
    throw e;
  }

  const cible = new Set(aRemplir);
  const tiroirs: [StoreName, any[]][] = [
    ["entites", data.entites as any[]],
    ["corps", data.corps as any[]],
    ["grades", data.grades as any[]],
    ["postes", data.postes],
    ["agents", data.agents],
    ["situations", data.situations],
    ["affectations", data.affectations],
    ["positions", data.positions],
    ["actes", data.actes],
    ["besoins", data.besoins],
    ["utilisateurs", data.utilisateurs],
    ["journal", data.journal],
    ["notifications", data.notifications],
    ["tickets", data.tickets],
    ["messagesTicket", data.messagesTicket],
    ["conversations", data.conversations],
    ["messages", data.messages],
    ["annonces", data.annonces],
    ["conges", data.conges],
    ["delegations", data.delegations],
    ["textes", data.textes],
    ["campagnes", data.campagnes],
    ["candidatures", data.candidatures],
    ["offresFormation", data.offresFormation],
    ["inscriptions", data.inscriptions],
    ["cartes", data.cartes],
    ["versements", data.versements],
    ["articlesArchives", data.articlesArchives],
    ["communications", data.communications],
    ["pointages", data.pointages],
    ["sorties", data.sorties],
    ["remunerations", data.remunerations],
  ];

  /*
   * Le complément, et sa limite.
   *
   * Remplir les seuls tiroirs vides suffit à protéger le travail, mais prive
   * une base existante de toute ligne de référence ajoutée depuis — les quatre
   * comptes du sommet de l'État, en v15, n'atteindraient jamais un poste déjà
   * ouvert. On ajoute donc les lignes **dont l'identifiant est absent**, et
   * elles seules : rien n'est écrasé, rien n'est supprimé, et une ligne qu'un
   * agent a modifiée garde ses modifications.
   *
   * Le prix, assumé : une ligne du décor que quelqu'un a supprimée revient à
   * la montée de version suivante. C'est le semis qui la repose, pas une
   * résurrection — et cela vaut mieux qu'un ministre sans compte.
   */
  const aCompleter = [...dejaLa.keys()];
  const tx = db.transaction([...aRemplir, ...aCompleter, "meta"] as unknown as string[], "readwrite");
  // Vider n'a de sens que sur demande explicite : ailleurs les tiroirs visés
  // sont vides par construction.
  if (force) await Promise.all(aRemplir.map((s) => tx.objectStore(s).clear()));

  await Promise.all([
    ...tiroirs
      .filter(([s]) => cible.has(s))
      .flatMap(([s, rows]) => rows.map((r) => tx.objectStore(s).put(r))),
    ...tiroirs
      .filter(([s]) => dejaLa.has(s))
      .flatMap(([s, rows]) => rows
        .filter((r) => r?.id && !dejaLa.get(s)!.has(String(r.id)))
        .map((r) => tx.objectStore(s).put(r))),
    ...(cible.has("parametres") ? [tx.objectStore("parametres").put(data.parametres)] : []),
    tx.objectStore("meta").put({
      id: "seed",
      version: DB_VERSION,
      date: meta?.date ?? new Date().toISOString(),
      maj: new Date().toISOString(),
      source: "donnees-fictives",
      /* Ce que ce semis a réellement rempli : de quoi comprendre, plus tard,
         pourquoi un tiroir est peuplé et un autre non. */
      tiroirs: aRemplir.join(","),
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
