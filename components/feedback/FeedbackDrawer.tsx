"use client";

import { MessagesSquare } from "lucide-react";
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FeedbackForm } from "./FeedbackForm";

/**
 * Le panneau de commentaires : un tiroir qui glisse depuis la droite.
 *
 * Bâti sur le composant Sheet de shadcn/ui (Radix Dialog), qui apporte déjà
 * ce qu'il faut et qu'il serait fautif de réécrire : fermeture à l'Échap et
 * au clic sur le voile, piège de focus, restitution du focus au bouton
 * d'origine à la fermeture, et `aria-modal` pour les lecteurs d'écran.
 */
export function FeedbackDrawer({
  ouvert, onOuvertChange,
}: {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  return (
    <Sheet open={ouvert} onOpenChange={onOuvertChange}>
      <SheetContent
        side="right"
        // Pleine largeur sur téléphone, colonne lisible au-delà.
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        {/* Filet tricolore : le tiroir appartient à la même administration. */}
        <div aria-hidden className="flex h-1 shrink-0">
          <span className="flex-1 bg-[#009543]" />
          <span className="flex-1 bg-[#FBDE4A]" />
          <span className="flex-1 bg-[#DC241F]" />
        </div>

        <SheetHeader className="space-y-2 border-b px-6 py-5 text-left">
          <SheetTitle className="flex items-center gap-2.5 text-lg">
            <MessagesSquare className="h-5 w-5 text-primary" />
            Commentaires
          </SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            Votre avis oriente les prochaines versions de NEXUS-METP. Dites-nous
            ce qui vous a aidé, ce qui vous a manqué, ou ce qui vous a arrêté.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
          {/* Le tiroir se ferme une fois le commentaire parti. */}
          <FeedbackForm onEnvoye={() => onOuvertChange(false)} />
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <SheetClose asChild>
            <Button variant="outline" className="w-full">Fermer</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
