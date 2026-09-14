"use client";

import { openDB, type IDBPDatabase } from "idb";
import { buildDataset, type Dataset } from "@/lib/seed";

const DB_NAME = "nexus-metp";
/**
 * v21 : tout agent a un compte. Le profil Agent, sur son entité
 *        d'affectation, est l'accès de base du ministère : consulter son
 *        dossier, l'annuaire, les notes de service. La plateforme cesse
 *        d'être réservée à l'encadrement.
 * v20 : tous les profils passent en table — ministre et directeur général
 *        compris. Il n'y avait aucune raison que le ministère puisse créer
 *        un profil sans pouvoir corriger ceux qu'on lui avait livrés.
 * v19 : profils d'accès — les droits cessent d'être une matrice écrite en
 *        dur pour devenir une donnée que l'administrateur système règle.
 * v18 : mutations récentes — le semis ne donnait qu'une affectation par
 *        agent, datée du recrutement : un ministère où personne n'avait
 *        bougé depuis 1992, et donc aucune arrivée à suivre.
 * v17 : habilitations — l'accès cesse d'être un champ posé sur un compte
 *        pour devenir un acte daté, accordé par quelqu'un, sur un périmètre.
 * v16 : points d'accueil, prises de service, registres d'émargement — le
 *        lieu où l'agent est reçu, et le cahier dont quelqu'un répond.
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
const DB_VERSION = 28;

const STORES = [
  "entites", "corps", "grades", "postes", "agents",
  "situations", "affectations", "positions",
  "actes", "besoins", "utilisateurs", "journal", "notifications",
  "tickets", "messagesTicket", "conversations", "messages", "annonces", "parametres",
  "conges", "delegations", "textes", "campagnes", "candidatures",
  "offresFormation", "inscriptions", "cartes", "documents",
  "versements", "articlesArchives", "communications",
  "pointages", "sorties", "remunerations",
  "pointsAccueil", "prisesService", "registres", "habilitations", "profils",
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

/**
 * Les tiroirs qu'une montée de version doit **rafraîchir**, et pas seulement
 * compléter.
 *
 * Le complément par identifiant absent — posé en v15 pour cesser de détruire
 * ce qu'un agent avait saisi — a une limite qu'il fallait bien rencontrer un
 * jour : il ne sait pas *corriger* une ligne du décor. En v18, les mutations
 * ferment l'affectation qu'elles remplacent ; ajouter les nouvelles sans
 * mettre à jour les anciennes laisserait deux affectations en vigueur pour
 * le même agent, et chaque agent muté compterait deux fois dans l'effectif.
 *
 * Le rafraîchissement **n'efface jamais rien** : il réécrit les lignes du
 * décor dont l'identifiant figure dans le jeu de données, et laisse
 * intactes toutes les autres — dont celles qu'un service a créées, qui
 * portent des identifiants que le semis ne produit pas.
 *
 * Le prix, assumé et le seul : une ligne du décor qu'un agent aurait
 * modifiée à la main retrouve sa valeur d'origine. Cela ne vaut que pour les
 * tiroirs listés ici, et seulement à la version qui les y inscrit.
 */
/**
 * Les lignes du décor qu'une montée de version doit **retirer**.
 *
 * Le rafraîchissement réécrit, il ne supprime pas — et il le faut bien, sans
 * quoi une ligne créée par un service disparaîtrait au déploiement suivant.
 * Mais il laisse alors derrière lui les lignes que le semis ne produit plus.
 *
 * En v17, quatorze comptes `USR-S…` avaient été ouverts pour les secrétaires.
 * En v21, ces mêmes personnes ont un compte d'agent dont l'habilitation a été
 * élevée : deux comptes pour un seul agent, c'est-à-dire deux historiques et
 * aucun des deux complet. Il faut donc les retirer, et le dire.
 *
 * La liste est **explicite et bornée à un préfixe** : on ne devine jamais
 * qu'une ligne « vient du semis », on nomme celles qu'on retire.
 */
const PURGER: { version: number; tiroir: StoreName; prefixe: string; motif: string }[] = [
  {
    version: 21,
    tiroir: "utilisateurs",
    prefixe: "USR-S",
    motif: "Comptes de secrétaires de la v17, remplacés par le compte d'agent de la même personne.",
  },
];

const RAFRAICHIR: { version: number; tiroirs: StoreName[] }[] = [
  { version: 18, tiroirs: ["affectations", "postes", "actes", "prisesService"] },
  /* v21 ouvre un compte à chaque agent. Les vingt-huit comptes semés jusque-là
     gardent leur identifiant et sont réécrits à l'identique ; les deux mille
     quatre cents autres s'ajoutent. Un compte ouvert depuis l'application
     porte un identifiant que le semis ne produit pas : il n'est pas touché. */
  { version: 21, tiroirs: ["utilisateurs", "habilitations"] },
  /* v22 : le profil Agent devient le socle de tous les autres. Chaque profil
     ne garde donc plus que ce qu'il **ajoute**, et trois modules devenus des
     onglets de « Présences » disparaissent des matrices. Une base montée sans
     cette réécriture garderait les anciennes lignes, droits périmés compris —
     et l'écran des profils montrerait des modules qui n'existent plus. */
  { version: 22, tiroirs: ["profils"] },
  /* v23 : l'administrateur système cesse d'être un agent du ministère. Son
     profil devient **technique** — il n'hérite plus du socle — et sa matrice
     se réduit à ce qu'il fait vraiment : les entités, les profils, le journal.
     Sans cette réécriture, une base montée garderait l'ancienne matrice et
     continuerait de lui ouvrir les dossiers et les documents. */
  { version: 23, tiroirs: ["profils"] },
  /* v24 : les comptes du semis cessent de porter « mot de passe à changer ».
     Le drapeau ne vaut désormais que pour un compte réellement ouvert par
     quelqu'un, avec un mot de passe provisoire qui n'appartient qu'à lui — et
     il force alors le changement à la première connexion. */
  { version: 24, tiroirs: ["utilisateurs"] },
  /* v25 : la chaîne de délégation s'ouvre sur toute la hauteur de
     l'organigramme. Chaque chef désigne désormais la tête de ses sous-entités
     dans son périmètre, le secrétariat inscrit le personnel de sa direction,
     et il ne reste que deux profils que nul ne peut accorder. Une base montée
     sans cette réécriture garderait les anciennes matrices : la chaîne y
     mourrait au deuxième niveau, comme avant. */
  { version: 25, tiroirs: ["profils"] },
  /* v26 : chaque profil porte désormais sa **portée**. Sans cette réécriture,
     les profils en base n'en auraient aucune et retomberaient sur le défaut —
     qui est le bon, mais qui priverait le ministre, son cabinet, la DGARH et
     l'inspection de la vue d'ensemble dont ils ont besoin. */
  { version: 26, tiroirs: ["profils"] },
  /* v27 : trois corrections de fond des profils livrés.
     — Le **directeur général** et le **secrétaire général** administrent
       désormais le ministère entier et non leur seule direction : tout, dans
       ce ministère, est géré par la DGARH, cabinet compris. Sans cela le DG
       ne pouvait créer une entité ni désigner un chef hors de chez lui, et
       la chaîne s'arrêtait à sa première marche.
     — Le **ministre** perd l'écriture sur l'organisation : il voit tout et
       n'administre rien, son compte étant ouvert par l'administrateur au même
       titre que celui du directeur général.
     — L'**inspecteur général** cesse d'être de rang nul — il dirige une
       inspection et ne pouvait y désigner personne — et le **chef
       d'établissement** reçoit la lecture des congés, carrières, sorties et
       retraites de son établissement.
     Sans cette réécriture, une base déjà montée garderait les anciennes
     lignes, et la portée d'administration y serait absente. */
  { version: 27, tiroirs: ["profils"] },
  /* v28 : le semis désigne enfin la tête de chaque entité qu'il peuple.
     Jusqu'ici il dressait l'organigramme, y affectait deux mille quatre cents
     agents, et ne nommait de responsable que pour les quinze entités portant
     un compte de démonstration : soixante-seize services, directions
     départementales et lycées techniques arrivaient **peuplés et acéphales**.
     Le tableau de bord le comptait comme une anomalie du ministère alors que
     l'anomalie était dans le décor.

     Quatre tiroirs sont réécrits parce que la désignation les touche tous :
     l'**entité** reçoit son responsable, le **compte** de l'intéressé passe du
     profil d'agent à celui de son niveau, son **affectation** prend le titre
     de la fonction, et une **habilitation** dit de qui il le tient — le chef
     de l'entité de rattachement, puisque l'arbre est pourvu de haut en bas.
     Personne n'est inventé : le chef est le plus ancien en service parmi les
     agents déjà affectés là, et une entité sans personne en poste reste sans
     chef. */
  { version: 28, tiroirs: ["entites", "utilisateurs", "habilitations", "affectations"] },
];

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

  /* Les tiroirs à rafraîchir : ceux des versions franchies par cette montée,
     et eux seuls. Repasser sur tous à chaque fois réécrirait le décor sans
     raison, et reposerait chaque fois une ligne qu'un service a corrigée. */
  const aRafraichir = new Set<StoreName>(
    jamaisSeme || force
      ? []
      : RAFRAICHIR.filter((r) => r.version > (meta.version ?? 0) && r.version <= DB_VERSION)
        .flatMap((r) => r.tiroirs)
  );

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
    ["pointsAccueil", data.pointsAccueil],
    ["prisesService", data.prisesService],
    ["registres", data.registres],
    ["habilitations", data.habilitations],
    ["profils", data.profils],
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
  /* Les purges déclarées pour les versions franchies. Elles s'exécutent
     avant les écritures : retirer d'abord, reposer ensuite. */
  const purges = jamaisSeme || force
    ? []
    : PURGER.filter((p) => p.version > (meta.version ?? 0) && p.version <= DB_VERSION);

  const tx = db.transaction([...aRemplir, ...aCompleter, "meta"] as unknown as string[], "readwrite");

  await Promise.all(purges.map(async (p) => {
    const magasin = tx.objectStore(p.tiroir as string);
    const cles = (await magasin.getAllKeys()) as IDBValidKey[];
    await Promise.all(
      cles.filter((k) => String(k).startsWith(p.prefixe)).map((k) => magasin.delete(k))
    );
  }));
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
        /* Rafraîchir : on réécrit la ligne du décor. Compléter : on n'ajoute
           que ce qui manque, et on ne touche à rien d'existant. */
        .filter((r) => r?.id && (aRafraichir.has(s) || !dejaLa.get(s)!.has(String(r.id))))
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
      /* Ce que ce semis a réécrit, pour que la question « pourquoi cette
         ligne a-t-elle changé ? » ait une réponse. */
      rafraichis: [...aRafraichir].join(","),
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
