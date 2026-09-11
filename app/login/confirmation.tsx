"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTextes } from "@/lib/langues";
import { ROLE_LABELS } from "@/lib/referentiels";
import type { Utilisateur } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** Le temps laissé pour lire, avant que l'espace ne s'ouvre de lui-même. */
const DELAI = 6000;

/**
 * L'écran qui s'intercale entre l'authentification et l'espace de l'agent.
 *
 * Il dit qui a été reconnu, et porte les conditions d'usage : elles ne sont
 * pas une case à cocher avant d'essayer d'entrer, mais ce que l'agent accepte
 * en entrant. Elles sont donc lues ici, une fois l'identité vérifiée et avant
 * que la moindre donnée personnelle ne s'affiche.
 *
 * L'ouverture est automatique après quelques secondes : personne ne doit
 * rester bloqué devant un écran d'information.
 */
export function Confirmation({
  utilisateur, onContinuer,
}: {
  utilisateur: Utilisateur;
  onContinuer: () => void;
}) {
  const t = useTextes();
  const [reste, setReste] = useState(DELAI);

  useEffect(() => {
    const debut = Date.now();
    const tic = setInterval(() => {
      const ecoule = Date.now() - debut;
      if (ecoule >= DELAI) {
        clearInterval(tic);
        onContinuer();
      } else setReste(DELAI - ecoule);
    }, 100);
    return () => clearInterval(tic);
  }, [onContinuer]);

  return (
    <div className="carte-connexion rounded-md border border-slate-200 bg-white text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/12">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>

      <h1 className="titre-connexion mt-4 font-serif text-[26px] font-normal text-slate-800">
        {t.confirmation.titre}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t.confirmation.sousTitre}</p>

      <div className="mt-5 rounded-[3px] border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-base font-semibold text-slate-900">{utilisateur.nomComplet}</div>
        <div className="mt-0.5 text-xs uppercase tracking-wider text-slate-500">
          {ROLE_LABELS[utilisateur.role]}
        </div>
      </div>

      {/* Les conditions d'usage, à leur vraie place : après la vérification
          d'identité, avant l'ouverture du dossier. */}
      <p className="conditions-usage mt-5 text-left text-[13px] leading-relaxed text-slate-600">
        {t.confirmation.conditions}
      </p>

      <Button onClick={onContinuer} className="mt-6 h-11 w-full rounded-[3px] text-sm font-semibold">
        {t.confirmation.continuer} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <div className="mt-4">
        <Progress value={100 - (reste / DELAI) * 100} className="h-1 bg-slate-200" />
        <p className="mt-2 text-[11px] text-slate-400">
          {t.confirmation.ouverture} {Math.ceil(reste / 1000)} s
        </p>
      </div>
    </div>
  );
}
