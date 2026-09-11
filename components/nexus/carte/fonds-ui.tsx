"use client";

/**
 * Le choix du fond, et ce qu'il engage.
 *
 * Chaque fond porte deux phrases : ce qu'il montre, et ce que son
 * fournisseur autorise. La seconde n'est pas de la prudence d'écriture — les
 * serveurs cités sont tenus par des associations, et un ministère de
 * plusieurs milliers d'agents sort de leur cadre d'usage en une semaine.
 * Écrire la règle à côté du bouton évite de l'apprendre le jour du blocage.
 */

import { Layers, ShieldAlert } from "lucide-react";
import { FONDS, GROUPES_FONDS, fondParCle, type CleFond } from "@/lib/carte/fonds";
import { cn } from "@/lib/utils";

export function ChoixFond({
  fond, surChangement, limites, surLimites, className,
}: {
  fond: CleFond;
  surChangement: (c: CleFond) => void;
  limites: boolean;
  surLimites: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      {GROUPES_FONDS.map((g) => (
        <div key={g.titre} className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.titre}
          </span>
          {g.cles.map((cle) => {
            const f = FONDS.find((x) => x.cle === cle)!;
            return (
              <button
                key={cle}
                type="button"
                onClick={() => surChangement(cle)}
                title={f.usage}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium transition",
                  fond === cle
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {f.libelle}
              </button>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={() => surLimites(!limites)}
        title="Poser les limites départementales par-dessus le fond"
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition",
          limites
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
        )}
      >
        <Layers className="h-3 w-3" />
        Limites
      </button>
    </div>
  );
}

export function NoteFond({ fond }: { fond: CleFond }) {
  const f = fondParCle(fond);
  return (
    <div className="space-y-1 text-[11px] leading-snug text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">{f.libelle}</span> — {f.usage}
      </p>
      <p className="flex items-start gap-1.5">
        <ShieldAlert className="mt-px h-3 w-3 shrink-0 opacity-70" />
        <span>
          <span className="font-medium">Conditions d'usage :</span> {f.politique}{" "}
          <span className="opacity-70">· {f.attribution}</span>
        </span>
      </p>
    </div>
  );
}
