"use client";

import { buildDataset, type Dataset } from "@/lib/seed";
import { DB_VERSION, STORES, STORES_SEMES, type StoreName } from "./schema";
import { PURGER, RAFRAICHIR, VIDER } from "./migrations";
import { getDB } from "./connexion";

/* ------------------------------------------------------------------ */
/* Le semis                                                             */
/* ------------------------------------------------------------------ */

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

  /* Les vidages déclarés pour les versions franchies. Ils précèdent les
     écritures — vider après aurait effacé ce qu'on vient de poser — et ne
     portent que sur des tiroirs déjà dans la transaction, `aRemplir` et
     `aCompleter` couvrant ensemble tout le semis. */
  const aVider = new Set<StoreName>(
    jamaisSeme || force
      ? []
      : VIDER.filter((v) => v.version > (meta.version ?? 0) && v.version <= DB_VERSION)
        .flatMap((v) => v.tiroirs)
        .filter((t) => dejaLa.has(t))
  );
  await Promise.all([...aVider].map((t) => tx.objectStore(t as string).clear()));
  /* Vidé, le tiroir n'a plus de ligne « déjà là » : sans cela le complément
     n'y reposerait que ce qui manquait avant le vidage, c'est-à-dire rien. */
  aVider.forEach((t) => dejaLa.set(t, new Set()));

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
      /* Et ce qu'il a vidé : c'est la seule opération du semis qui retire
         quelque chose en masse, elle ne doit pas être silencieuse. */
      vides: [...aVider].join(","),
    }),
  ]);
  await tx.done;
}
