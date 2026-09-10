"use client";

/**
 * Retrouver une implantation sur la carte.
 *
 * La recherche porte sur les implantations du ministère, pas sur les lieux du
 * monde, et elle est locale : elle répond à la frappe, hors ligne, et sans
 * dépendre d'un service extérieur. C'est aussi la seule qui réponde à la vraie
 * question — « où est le lycée technique de Dolisie », pas « où est Dolisie ».
 *
 * Le géocodage d'adresses (Nominatim) reste à faire côté serveur : l'instance
 * publique interdit l'usage massif, et un ministère la saturerait.
 */

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { FAMILLES, dataUri, svgFamille } from "@/lib/carte/symboles";
import { cn } from "@/lib/utils";
import type { PointCarte } from "./types";

const sansAccent = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function RechercheImplantation({
  points, surChoix, className,
}: {
  points: PointCarte[];
  surChoix: (p: PointCarte) => void;
  className?: string;
}) {
  const [terme, setTerme] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  const index = useMemo(
    () => points.map((p) => ({ p, cle: sansAccent(`${p.nom} ${p.sousTitre ?? ""} ${p.recherche ?? ""}`) })),
    [points]
  );

  const trouves = useMemo(() => {
    const t = sansAccent(terme.trim());
    if (t.length < 2) return [];
    return index.filter((x) => x.cle.includes(t)).slice(0, 8).map((x) => x.p);
  }, [index, terme]);

  const choisir = (p: PointCarte) => {
    surChoix(p);
    setTerme("");
    setOuvert(false);
    champ.current?.blur();
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={champ}
        value={terme}
        onChange={(e) => { setTerme(e.target.value); setOuvert(true); }}
        onFocus={() => setOuvert(true)}
        onBlur={() => window.setTimeout(() => setOuvert(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && trouves[0]) choisir(trouves[0]);
          if (e.key === "Escape") { setTerme(""); setOuvert(false); }
        }}
        placeholder="Chercher une implantation, une ville…"
        aria-label="Chercher une implantation sur la carte"
        className="h-8 w-full rounded-md border bg-background pl-8 pr-7 text-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      {terme && (
        <button type="button" onClick={() => { setTerme(""); champ.current?.focus(); }}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {ouvert && terme.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-9 z-[500] max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {trouves.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">
              Aucune implantation ne porte ce nom. La recherche ne couvre que les sites du ministère.
            </p>
          ) : trouves.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choisir(p)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUri(svgFamille(p.famille))} alt="" width={15} height={15} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-medium">{p.nom}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {p.sousTitre ?? FAMILLES[p.famille].libelle}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-[11px] font-semibold">{p.effectif}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
