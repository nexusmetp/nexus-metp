"use client";

import { AlertTriangle, Info } from "lucide-react";
import { attributionsDe } from "@/lib/referentiels";
import type { Entite } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Renommer une structure — ce que le geste touche, et ce qu'il ne     */
/* touche pas                                                          */
/* ------------------------------------------------------------------ */

/**
 * Deux noms, deux régimes, et c'est toute la difficulté.
 *
 * Le **sigle** est l'abréviation de la maison. « DGEQP » n'est écrit dans
 * aucun arrêté : c'est nous qui avons abrégé « direction générale de
 * l'équipement et du patrimoine ». Le changer pour l'usage parlé du ministère
 * ne contredit aucun texte, et personne ne devrait hésiter à le faire.
 *
 * L'**intitulé complet**, lui, est la formule du Journal officiel — et c'est
 * par elle que la plateforme retrouve l'article qui fixe les attributions de
 * la structure (`lib/referentiels/attributions-textes`). Le modifier d'un mot
 * détache la fiche de son article, en silence : l'écran cesse d'afficher ce
 * dont le service est chargé, sans rien annoncer. Ce composant l'annonce.
 *
 * Il n'interdit rien. Un intitulé se corrige parfois pour de bonnes raisons —
 * une faute de frappe, une structure créée depuis la plateforme. Mais on ne
 * doit pas l'apprendre après coup.
 */
export function AvertissementIntitule({
  entite, sigle, nom,
}: {
  entite: Entite;
  sigle: string;
  nom: string;
}) {
  const avant = attributionsDe(entite);
  const apres = attributionsDe({ ...entite, nom: nom.trim() });
  const perdues = !!avant && !apres;
  const sigleChange = sigle.trim().toUpperCase() !== entite.sigle;

  if (!perdues && !sigleChange) return null;

  return (
    <div className="space-y-2">
      {sigleChange && (
        <p className="flex gap-2 rounded-md border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Le sigle est l&apos;abréviation d&apos;usage de la maison, non une formule du
            texte : le changer en <strong>{sigle.trim().toUpperCase()}</strong> ne contredit
            aucun arrêté. L&apos;intitulé complet et le fondement, eux, ne bougent pas.
          </span>
        </p>
      )}
      {perdues && (
        <p className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Cet intitulé ne correspond plus à aucun article de{" "}
            {entite.reference
              ? `l'${entite.reference.charAt(0).toLowerCase()}${entite.reference.slice(1)}`
              : "son texte fondateur"}.
            La fiche de la structure affichera « aucun article ne décrit cette entité » au lieu
            de l&apos;article {avant.article}, qui lui donne {avant.missions.length} attribution
            {avant.missions.length > 1 ? "s" : ""}. Pour une simple question d&apos;appellation,
            changez le sigle plutôt que l&apos;intitulé.
          </span>
        </p>
      )}
    </div>
  );
}
