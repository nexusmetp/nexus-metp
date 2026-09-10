"use client";

/**
 * La légende, qui est aussi le filtre.
 *
 * Trois signes, trois informations, et jamais deux fois la même : la forme
 * dit la nature du site, la taille dit l'effectif, la couleur du halo dit
 * l'état. Les cliquer masque une famille — une légende qu'on ne peut pas
 * actionner oblige à chercher ailleurs le bouton correspondant.
 */

import { ETATS, FAMILLES, ORDRE_ETATS, ORDRE_FAMILLES, dataUri, svgFamille, type Etat, type Famille } from "@/lib/carte/symboles";
import { cn } from "@/lib/utils";

export function FiltreFamilles({
  vues, surBascule, comptes, className,
}: {
  vues: Famille[];
  surBascule: (f: Famille) => void;
  comptes: Record<Famille, number>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {ORDRE_FAMILLES.map((f) => {
        const actif = vues.includes(f);
        return (
          <button
            key={f}
            type="button"
            onClick={() => surBascule(f)}
            title={`${FAMILLES[f].libelle} — ${comptes[f] ?? 0} implantation(s)`}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              actif ? "bg-background" : "opacity-40"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUri(svgFamille(f))} alt="" width={13} height={13} className="shrink-0" />
            <span className="truncate">{FAMILLES[f].libelle}</span>
            <span className="tabular-nums opacity-60">{comptes[f] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

export function LegendeEtats({ comptes }: { comptes?: Record<Etat, number> }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Couleur du halo — ce qui appelle une décision
      </div>
      <div className="grid gap-1">
        {ORDRE_ETATS.map((e) => (
          <div key={e} className="flex items-start gap-2 text-[11px] leading-snug">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2"
                  style={{ background: "transparent", borderColor: ETATS[e].couleur, boxShadow: `inset 0 0 0 2px ${ETATS[e].couleur}` }} />
            <span className="min-w-0">
              <span className="font-medium" style={{ color: ETATS[e].couleur }}>{ETATS[e].libelle}</span>
              {comptes && <span className="ml-1 tabular-nums text-muted-foreground">({comptes[e] ?? 0})</span>}
              <span className="block text-muted-foreground">{ETATS[e].regle}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="pt-1 text-[10px] leading-snug text-muted-foreground">
        La taille du cercle dit l'effectif, le symbole dit la nature du site. La couleur
        ne remplace aucun chiffre : la fiche les donne tous.
      </p>
    </div>
  );
}
