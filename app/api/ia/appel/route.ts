import { NextResponse } from "next/server";

/**
 * Relais vers le fournisseur — la clé ne descend jamais au navigateur.
 *
 * Le relais ne prend que ce dont il a besoin : le modèle, la consigne, les
 * messages. Il n'accepte ni point d'entrée ni en-tête venus du client, sans
 * quoi il deviendrait un proxy ouvert que n'importe qui pourrait détourner
 * vers l'adresse de son choix, aux frais du ministère.
 *
 * En production, cette route doit se trouver derrière l'authentification de
 * la plateforme : elle engage le compte du ministère à chaque appel.
 */
export const dynamic = "force-dynamic";

const VERSION_ANTHROPIC = "2023-06-01";
const MAX_JETONS = 4000;

interface Corps {
  modele?: string;
  systeme?: string;
  maxJetons?: number;
  messages?: { role: "user" | "assistant"; contenu: string }[];
}

export async function POST(requete: Request) {
  const cle = (process.env.ASSISTANT_CLE ?? process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (cle.length < 9) {
    return NextResponse.json({ erreur: "Aucune clé n'est posée sur le serveur." }, { status: 503 });
  }

  let corps: Corps;
  try {
    corps = await requete.json();
  } catch {
    return NextResponse.json({ erreur: "Demande illisible." }, { status: 400 });
  }

  const messages = (corps.messages ?? []).filter((m) => m?.contenu?.trim());
  const modele = (corps.modele ?? process.env.ASSISTANT_MODELE ?? "").trim();
  if (!messages.length) return NextResponse.json({ erreur: "Aucun message." }, { status: 400 });
  if (!modele) return NextResponse.json({ erreur: "Aucun modèle nommé." }, { status: 400 });

  const fournisseur = process.env.ASSISTANT_FOURNISSEUR ?? "anthropic";
  const base = (process.env.ASSISTANT_URL ?? (fournisseur === "openai"
    ? "https://api.openai.com" : "https://api.anthropic.com")).replace(/\/+$/, "");
  const maxJetons = Math.min(Math.max(corps.maxJetons ?? 1600, 200), MAX_JETONS);

  const anthropique = fournisseur !== "openai";
  const reponse = await fetch(base + (anthropique ? "/v1/messages" : "/v1/chat/completions"), {
    method: "POST",
    headers: anthropique
      ? { "content-type": "application/json", "x-api-key": cle, "anthropic-version": VERSION_ANTHROPIC }
      : { "content-type": "application/json", authorization: `Bearer ${cle}` },
    body: JSON.stringify(anthropique
      ? {
        model: modele, max_tokens: maxJetons,
        ...(corps.systeme ? { system: corps.systeme } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.contenu })),
      }
      : {
        model: modele, max_tokens: maxJetons,
        messages: [
          ...(corps.systeme ? [{ role: "system", content: corps.systeme }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.contenu })),
        ],
      }),
  });

  if (!reponse.ok) {
    // Le détail du fournisseur est renvoyé tel quel : l'administrateur en a
    // besoin pour corriger, et il ne contient pas la clé.
    const detail = await reponse.text().catch(() => "");
    return NextResponse.json({ erreur: detail.slice(0, 500) }, { status: reponse.status });
  }

  const data = await reponse.json();
  const texte = anthropique
    ? (data?.content ?? []).filter((b: any) => b?.type === "text").map((b: any) => b.text).join("")
    : data?.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ texte: String(texte).trim() });
}
