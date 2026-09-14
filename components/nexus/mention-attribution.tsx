"use client";

import { Scale } from "lucide-react";
import { type ModuleKey, motifHorsAttribution } from "@/lib/referentiels";
import type { Utilisateur } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Dire pourquoi un registre se consulte sans s'écrire                 */
/* ------------------------------------------------------------------ */

/**
 * Un bouton qui manque sans un mot est un bouton dont on accuse l'outil.
 *
 * Le directeur du personnel ouvrira la page de la rémunération et n'y trouvera
 * rien à saisir ; le directeur des finances fera de même sur les carrières.
 * Dans les deux cas la plateforme a raison, et dans les deux cas elle a
 * l'air en panne si elle se tait. Cette mention ne s'affiche que lorsque
 * c'est **l'attribution** qui ferme le geste — quand c'est le profil, la page
 * n'est pas ouverte du tout, et il n'y a rien à expliquer ici.
 */
export function MentionAttribution({ utilisateur, module }: {
  utilisateur: Utilisateur;
  module: ModuleKey;
}) {
  const motif = motifHorsAttribution(utilisateur, module);
  if (!motif) return null;

  return (
    <p className="flex items-start gap-2 rounded-md border border-sky-500/25 bg-sky-500/[0.05] px-3 py-2 text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
      <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{motif}</span>
    </p>
  );
}
