"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ARMOIRIES_SOURCES, LOGO_SOURCES, DRAPEAU_URL } from "@/lib/referentiels";
import { useTextes } from "@/lib/langues";

/* ------------------------------------------------------------------ */
/* La marque de l'État                                                 */
/*                                                                     */
/* Où déposer les fichiers officiels — dans /public, sous l'un de ces   */
/* noms, et rien d'autre n'est à toucher :                             */
/*                                                                     */
/*   armoiries : amoirie.png · armoiries-congo.png · armoiries-congo.svg */
/*   bloc-marque : metplogo.webp · metplogo.png · logo-metp.svg        */
/*                                                                     */
/* Le premier fichier réellement présent gagne. Le tracé vectoriel que  */
/* nous fournissons est le DERNIER de la liste : c'est un dépannage, il */
/* s'efface dès que l'original est déposé.                             */
/* ------------------------------------------------------------------ */

/**
 * Rattrape une image déjà tombée avant l'hydratation.
 *
 * Le serveur rend la balise, le navigateur lance le chargement aussitôt, et
 * l'échec survient le plus souvent AVANT que React n'ait posé son
 * gestionnaire `onError`. La cascade restait alors bloquée sur un fichier
 * absent, et la page affichait le texte de remplacement à la place du
 * blason. On interroge donc l'élément au moment où il nous arrive : une
 * image « complète » de largeur nulle est une image qui a échoué.
 */
function useEchecPrecoce(surEchec: () => void) {
  return useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) surEchec();
  }, [surEchec]);
}

/**
 * Une image qui essaie plusieurs fichiers dans l'ordre.
 *
 * Sans cela, déposer le fichier officiel supposerait de le renommer avec la
 * bonne extension — donc de savoir laquelle. Ici, on dépose le fichier tel
 * qu'il est.
 */
function ImageEnCascade({
  sources, alt, className, style, secours = null,
}: {
  sources: readonly string[];
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Ce qu'on montre quand aucun fichier n'a répondu. */
  secours?: React.ReactNode;
}) {
  const [rang, setRang] = useState(0);
  const avancer = useCallback(() => setRang((r) => Math.min(r + 1, sources.length)), [sources.length]);
  const verifier = useEchecPrecoce(avancer);

  // Plutôt qu'une icône de fichier cassé, qui n'apprend rien à personne.
  if (rang >= sources.length) return <>{secours}</>;

  const src = sources[rang];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    // `key` : chaque source obtient son propre nœud, sans quoi la vérification
    // au montage ne se rejouerait pas d'un fichier au suivant.
    <img
      key={src}
      ref={verifier}
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={avancer}
    />
  );
}

/**
 * Le blason. Il porte son propre cercle — c'est lui qui fait le sceau — et n'a
 * donc besoin d'aucun cadre autour.
 */
export function Armoiries({
  taille = 48, className,
}: { taille?: number; className?: string }) {
  return (
    <ImageEnCascade
      sources={ARMOIRIES_SOURCES}
      alt="Armoiries de la République du Congo"
      className={cn("shrink-0 object-contain", className)}
      style={{ width: taille, height: taille }}
    />
  );
}

/** Le drapeau national, au format 3:2. */
export function DrapeauCongo({ largeur = 30, className }: { largeur?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={DRAPEAU_URL}
      alt="Drapeau de la République du Congo"
      width={largeur}
      height={Math.round((largeur * 2) / 3)}
      className={cn("rounded-[2px] ring-1 ring-black/10", className)}
    />
  );
}

/**
 * Le bloc-marque : blason, filet tricolore, timbre de l'État.
 *
 * Si un bloc-marque officiel est déposé (metplogo.webp), il est servi tel
 * quel. Sinon le bloc est composé ici — le blason reste une image, le libellé
 * reste du texte : il se lit à l'écran comme au lecteur d'écran, se
 * sélectionne, et ne pixellise pas.
 */
export function LogoMETP({
  taille = 52, compact = false, className,
}: { taille?: number; compact?: boolean; className?: string }) {
  const t = useTextes();

  const compose = (
    <span className={cn("flex items-center gap-3", className)}>
      <Armoiries taille={taille} />
      {/* Filet tricolore : sépare le blason du timbre, comme sur le papier
          à en-tête. */}
      <span aria-hidden className="flex flex-col overflow-hidden rounded-[2px]"
            style={{ height: taille * 0.78, width: 5 }}>
        <span className="flex-1 bg-[#009543]" />
        <span className="flex-1 bg-[#FBDE4A]" />
        <span className="flex-1 bg-[#DC241F]" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t.etat.republique}
        </span>
        <span
          className={cn(
            "block font-extrabold uppercase tracking-tight text-foreground",
            compact ? "truncate text-[13px]" : "text-[15px] sm:text-[17px]"
          )}
        >
          {t.etat.ministere}
        </span>
      </span>
    </span>
  );

  if (!LOGO_SOURCES.length) return compose;

  return (
    <ImageEnCascade
      sources={LOGO_SOURCES}
      alt={`${t.etat.republique} — ${t.etat.ministere}`}
      className={cn("w-auto object-contain", className)}
      style={{ height: taille }}
      secours={compose}
    />
  );
}
