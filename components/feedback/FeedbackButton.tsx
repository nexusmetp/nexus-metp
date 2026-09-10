"use client";

import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
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
        <span className="flex flex-col items-center gap-2.5 [writing-mode:vertical-rl] rotate-180">
          <MessagesSquare aria-hidden className="h-4 w-4 rotate-180" />
          <span className="text-[13px] font-semibold tracking-wide">Commentaires</span>
        </span>
      </button>

      <FeedbackDrawer ouvert={ouvert} onOuvertChange={setOuvert} />
    </>
  );
}
