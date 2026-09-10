"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ARMOIRIES_URL, DRAPEAU_URL, MINISTERE_NOM } from "@/lib/referentiels";

/* ------------------------------------------------------------------ */
/* La marque de l'État                                                 */
/*                                                                     */
/* Le blason et le drapeau ne vivent qu'à un seul endroit :            */
/* /public/armoiries-congo.svg et /public/drapeau-congo.svg. Pour      */
/* poser les fichiers officiels du ministère, il suffit d'écraser ces  */
/* deux fichiers — aucun composant n'est à retoucher.                  */
/*                                                                     */
/* Le bloc-marque n'est volontairement pas une image : le blason reste */
/* une image, la barre tricolore et le libellé sont du texte. Le nom   */
/* du ministère se lit donc par un lecteur d'écran, se sélectionne, et */
/* reste net à toutes les tailles.                                     */
/* ------------------------------------------------------------------ */

/** Le blason seul. `rond` l'inscrit dans un disque blanc (avatar, favicon). */
export function Armoiries({
  taille = 48, rond = false, className,
}: { taille?: number; rond?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0",
        rond && "overflow-hidden rounded-full bg-white ring-1 ring-black/10",
        className
      )}
      style={{ width: taille, height: taille }}
    >
      <Image
        src={ARMOIRIES_URL}
        alt="Armoiries de la République du Congo"
        fill
        sizes={`${taille}px`}
        className={cn("object-contain", rond && "p-1")}
        priority
      />
    </span>
  );
}

/** Le drapeau national, au format 3:2. */
export function DrapeauCongo({ largeur = 30, className }: { largeur?: number; className?: string }) {
  return (
    <Image
      src={DRAPEAU_URL}
      alt="Drapeau de la République du Congo"
      width={largeur}
      height={Math.round((largeur * 2) / 3)}
      className={cn("rounded-[2px] ring-1 ring-black/10", className)}
    />
  );
}

/**
 * Le bloc-marque officiel : blason, filet tricolore, timbre de l'État.
 * `compact` réduit le libellé à une ligne, pour les barres de navigation.
 */
export function LogoMETP({
  taille = 52, compact = false, className,
}: { taille?: number; compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <Armoiries taille={taille} />
      {/* Filet tricolore : sépare le blason du timbre, comme sur le papier à en-tête. */}
      <span aria-hidden className="flex h-full flex-col overflow-hidden rounded-[2px]"
            style={{ height: taille * 0.78, width: 5 }}>
        <span className="flex-1 bg-[#009543]" />
        <span className="flex-1 bg-[#FBDE4A]" />
        <span className="flex-1 bg-[#DC241F]" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          République du Congo
        </span>
        <span
          className={cn(
            "block font-extrabold uppercase tracking-tight text-foreground",
            compact ? "truncate text-[13px]" : "text-[15px] sm:text-[17px]"
          )}
        >
          {compact ? "Ministère de l'Enseignement Technique" : MINISTERE_NOM}
        </span>
      </span>
    </span>
  );
}
