"use client";

import { save } from "@/lib/db";
import type { EntreeJournal, Utilisateur } from "@/lib/types";

/**
 * Outils d'écriture partagés par les modules de mutation.
 *
 * Volontairement hors de l'API publique : une page n'a pas à journaliser
 * elle-même, c'est la mutation qui s'en charge — sans quoi la trace
 * dépendrait de la vigilance de chaque écran.
 */

let compteurJournal = 0;

export async function journaliser(
  u: Pick<Utilisateur, "id" | "nomComplet">,
  action: EntreeJournal["action"],
  cibleType: string,
  cibleId: string,
  details: Partial<Pick<EntreeJournal, "champ" | "ancienneValeur" | "nouvelleValeur" | "justification" | "acteId">> = {}
): Promise<void> {
  compteurJournal++;
  await save<EntreeJournal>("journal", {
    id: `JRN-${cibleId}-${Date.now()}-${compteurJournal}`,
    horodatage: new Date().toISOString(),
    utilisateurId: u.id,
    utilisateur: u.nomComplet,
    adresseIp: "session locale",
    action,
    cibleType,
    cibleId,
    ...details,
  });
}

export const nouvelId = (prefixe: string) =>
  `${prefixe}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
