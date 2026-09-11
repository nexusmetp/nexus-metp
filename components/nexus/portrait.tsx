"use client";

import { cn } from "@/lib/utils";
import { initiales } from "@/lib/format";

/**
 * La figure d'un agent.
 *
 * Presque aucun dossier ne porte de photographie : plutôt qu'un carré vide
 * répété des milliers de fois, on rend un jeton d'initiales dont la teinte
 * découle du matricule. Deux agents homonymes se distinguent donc à l'œil,
 * et la même personne garde la même couleur d'un écran à l'autre.
 */

const TEINTES = [
  { fond: "#0077B6", texte: "#FFFFFF" },
  { fond: "#00B4D8", texte: "#04293A" },
  { fond: "#023E8A", texte: "#FFFFFF" },
  { fond: "#0096C7", texte: "#FFFFFF" },
  { fond: "#48CAE4", texte: "#04293A" },
  { fond: "#2A6F97", texte: "#FFFFFF" },
  { fond: "#014F86", texte: "#FFFFFF" },
  { fond: "#61A5C2", texte: "#04293A" },
];

export const teinteDe = (cle: string) => {
  let h = 0;
  for (let i = 0; i < cle.length; i++) h = (h * 31 + cle.charCodeAt(i)) & 0xffff;
  return TEINTES[h % TEINTES.length];
};

const TAILLES = {
  xs: "h-7 w-7 text-[9px]",
  sm: "h-9 w-9 text-[11px]",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-2xl",
} as const;

export function Portrait({
  photo, prenom, nom, cle, taille = "sm", carre = false, className,
}: {
  photo?: string | null;
  prenom?: string;
  nom?: string;
  /** Matricule ou identifiant : c'est lui qui fixe la teinte. */
  cle: string;
  taille?: keyof typeof TAILLES;
  /** Les cartes professionnelles veulent un cadre droit, pas un rond. */
  carre?: boolean;
  className?: string;
}) {
  const t = teinteDe(cle);
  const forme = carre ? "rounded-lg" : "rounded-full";

  if (photo) {
    return (
      <img
        src={photo}
        alt={`${prenom ?? ""} ${nom ?? ""}`.trim() || "Portrait"}
        className={cn(TAILLES[taille], forme, "shrink-0 border object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(TAILLES[taille], forme, "grid shrink-0 place-items-center font-bold tracking-tight", className)}
      style={{ background: t.fond, color: t.texte }}
    >
      {initiales(prenom ?? "", nom ?? "")}
    </span>
  );
}
