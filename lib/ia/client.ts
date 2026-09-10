/**
 * Appel au fournisseur — un seul endroit dans toute l'application.
 *
 * Deux chemins, dans cet ordre :
 *   1. le relais du serveur, quand l'installation en a un. La clé reste
 *      alors sur la machine du ministère et ne descend jamais au navigateur ;
 *   2. l'appel direct depuis le navigateur, avec la clé posée par
 *      l'administrateur. C'est ce qui permet de faire marcher la plateforme
 *      sans serveur, au prix d'une clé lisible par qui tient le poste.
 *
 * Le choix se fait tout seul et se lit dans l'espace Système.
 */

import type { ReglagesIA } from "@/lib/types";
import { ErreurIA, depuisStatut } from "./erreurs";
import { pointEntree } from "./reglages";

export interface MessageIA {
  role: "user" | "assistant";
  contenu: string;
}

export interface OptionsAppel {
  /** Consigne de cadrage, hors dialogue. */
  systeme?: string;
  maxJetons?: number;
  signal?: AbortSignal;
}

const VERSION_ANTHROPIC = "2023-06-01";

/* ------------------------------------------------------------------ */
/* Relais serveur                                                      */
/* ------------------------------------------------------------------ */

let relais: boolean | null = null;

/**
 * L'installation dispose-t-elle d'un relais ?
 *
 * Interrogé une fois par session. Une page servie sans serveur — la maquette
 * autonome, un export statique — répond du HTML : d'où la vérification du
 * corps et pas seulement du statut.
 */
export async function relaisDisponible(): Promise<boolean> {
  if (relais !== null) return relais;
  try {
    const r = await fetch("/api/ia/etat", { headers: { accept: "application/json" } });
    const j = r.ok ? await r.json() : null;
    relais = !!j?.relais;
  } catch {
    relais = false;
  }
  return relais;
}

/** À rappeler quand l'administrateur change de fournisseur. */
export const oublierRelais = () => { relais = null; };

/* ------------------------------------------------------------------ */
/* Corps de requête, par fournisseur                                   */
/* ------------------------------------------------------------------ */

function corpsRequete(r: ReglagesIA, messages: MessageIA[], o: OptionsAppel) {
  const max = o.maxJetons ?? r.maxJetons;
  if (r.fournisseur === "anthropic") {
    return {
      chemin: "/v1/messages",
      entetes: {
        "content-type": "application/json",
        "x-api-key": r.cle.trim(),
        "anthropic-version": VERSION_ANTHROPIC,
        // Sans cet en-tête, le fournisseur refuse tout appel venu d'une page.
        "anthropic-dangerous-direct-browser-access": "true",
      } as Record<string, string>,
      corps: {
        model: r.modele.trim(),
        max_tokens: max,
        ...(o.systeme ? { system: o.systeme } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.contenu })),
      },
    };
  }
  return {
    chemin: "/v1/chat/completions",
    entetes: {
      "content-type": "application/json",
      authorization: `Bearer ${r.cle.trim()}`,
    } as Record<string, string>,
    corps: {
      model: r.modele.trim(),
      max_tokens: max,
      messages: [
        ...(o.systeme ? [{ role: "system", content: o.systeme }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.contenu })),
      ],
    },
  };
}

/** Extrait le texte d'une réponse, quelle que soit la forme du fournisseur. */
function texteReponse(fournisseur: ReglagesIA["fournisseur"], data: any): string {
  if (fournisseur === "anthropic") {
    const blocs = Array.isArray(data?.content) ? data.content : [];
    const texte = blocs.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("").trim();
    if (!texte) throw new ErreurIA("Réponse vide du fournisseur.", "reponse");
    return texte;
  }
  const texte = String(data?.choices?.[0]?.message?.content ?? "").trim();
  if (!texte) throw new ErreurIA("Réponse vide du fournisseur.", "reponse");
  return texte;
}

/** Le message d'erreur du fournisseur, sans faire tomber l'appelant. */
async function detailErreur(r: Response): Promise<string | undefined> {
  try {
    const t = await r.text();
    const j = JSON.parse(t);
    return j?.error?.message ?? j?.message ?? t.slice(0, 300);
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Appel                                                               */
/* ------------------------------------------------------------------ */

export async function appelerIA(
  r: ReglagesIA, messages: MessageIA[], o: OptionsAppel = {}
): Promise<string> {
  if (await relaisDisponible()) return appelRelais(r, messages, o);

  const { chemin, entetes, corps } = corpsRequete(r, messages, o);
  let reponse: Response;
  try {
    reponse = await fetch(pointEntree(r) + chemin, {
      method: "POST", headers: entetes, body: JSON.stringify(corps), signal: o.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    throw new ErreurIA("Le fournisseur n'a pas pu être joint.", "reseau", String(e?.message ?? e));
  }
  if (!reponse.ok) throw depuisStatut(reponse.status, await detailErreur(reponse));
  return texteReponse(r.fournisseur, await reponse.json());
}

/** Même appel, mais c'est le serveur qui détient la clé. */
async function appelRelais(r: ReglagesIA, messages: MessageIA[], o: OptionsAppel): Promise<string> {
  let reponse: Response;
  try {
    reponse = await fetch("/api/ia/appel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        modele: r.modele, maxJetons: o.maxJetons ?? r.maxJetons,
        systeme: o.systeme, messages,
      }),
      signal: o.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    throw new ErreurIA("Le relais du ministère n'a pas répondu.", "reseau", String(e?.message ?? e));
  }
  if (!reponse.ok) throw depuisStatut(reponse.status, await detailErreur(reponse));
  const data = await reponse.json();
  const texte = String(data?.texte ?? "").trim();
  if (!texte) throw new ErreurIA("Réponse vide du relais.", "reponse");
  return texte;
}

/* ------------------------------------------------------------------ */
/* Catalogue des modèles                                               */
/* ------------------------------------------------------------------ */

/**
 * Ce à quoi la clé du ministère donne droit, demandé au fournisseur.
 *
 * Préférable à une liste écrite dans le code : elle ne vieillit pas, et
 * l'administrateur voit son propre catalogue plutôt qu'un catalogue supposé.
 */
export async function listerModeles(r: ReglagesIA, signal?: AbortSignal): Promise<string[]> {
  const entetes: Record<string, string> = r.fournisseur === "anthropic"
    ? {
      "x-api-key": r.cle.trim(),
      "anthropic-version": VERSION_ANTHROPIC,
      "anthropic-dangerous-direct-browser-access": "true",
    }
    : { authorization: `Bearer ${r.cle.trim()}` };

  let reponse: Response;
  try {
    reponse = await fetch(`${pointEntree(r)}/v1/models?limit=100`, { headers: entetes, signal });
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    throw new ErreurIA("Le fournisseur n'a pas pu être joint.", "reseau", String(e?.message ?? e));
  }
  if (!reponse.ok) throw depuisStatut(reponse.status, await detailErreur(reponse));
  const data = await reponse.json();
  const lignes: any[] = Array.isArray(data?.data) ? data.data : [];
  return lignes.map((m) => String(m?.id ?? "")).filter(Boolean).sort();
}
