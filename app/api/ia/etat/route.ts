import { NextResponse } from "next/server";

/**
 * L'installation détient-elle la clé côté serveur ?
 *
 * Quand `ASSISTANT_CLE` est posée dans l'environnement du serveur, le
 * navigateur n'a plus besoin de connaître le secret : il passe par le relais.
 * C'est le montage à retenir dès que la plateforme quitte la maquette.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const cle = process.env.ASSISTANT_CLE ?? process.env.ANTHROPIC_API_KEY ?? "";
  return NextResponse.json({
    relais: cle.trim().length > 8,
    fournisseur: process.env.ASSISTANT_FOURNISSEUR ?? "anthropic",
  });
}
