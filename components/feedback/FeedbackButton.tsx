"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTextes } from "@/lib/langues";
import { FeedbackDrawer } from "./FeedbackDrawer";

/**
 * L'onglet « Commentaires », fixé au bord droit de l'écran.
 *
 * Il reste à la même place pendant le défilement : c'est le geste attendu
 * d'un tel onglet — on doit pouvoir le trouver sans remonter la page.
 *
 * Le libellé est écrit verticalement (`writing-mode: vertical-rl` puis une
 * rotation d'un demi-tour, pour qu'il se lise de bas en haut). La rotation
 * porte sur le libellé et non sur l'onglet : appliquée à l'onglet, elle
 * annulerait le `translateY(-50%)` qui le centre.
 */
export function FeedbackButton({ className }: { className?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const t = useTextes();

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        className={cn(
          "fixed right-0 top-1/2 z-40 -translate-y-1/2",
          "flex items-center gap-2 rounded-l-md bg-primary px-2 py-4 text-white shadow-lg",
          "transition-[padding,background-color] hover:bg-[#0077B6] hover:pr-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "print:hidden",
          className
        )}
      >
        {/* Le libellé seul : une icône couchée dans un texte vertical se lit
            de travers, et n'ajoute rien que le mot ne dise déjà. */}
        <span className="[writing-mode:vertical-rl] rotate-180 text-[13px] font-semibold tracking-wide">
          {t.commentaires.onglet}
        </span>
      </button>

      <FeedbackDrawer ouvert={ouvert} onOuvertChange={setOuvert} />
    </>
  );
}
