"use client";

/**
 * La carte nationale, montée.
 *
 * Ce fichier n'assemble que des morceaux déjà écrits : la surface, le choix
 * du fond, la légende-filtre, la recherche. Il porte une seule décision
 * propre — que faire quand le moteur ne peut pas tourner : servir la carte à
 * plat, avec les mêmes positions et les mêmes couleurs, plutôt qu'un cadre
 * vide et une excuse.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { Info, Maximize2, MonitorX } from "lucide-react";
import { ORDRE_ETATS, ORDRE_FAMILLES, type Famille } from "@/lib/carte/symboles";
import type { CleFond } from "@/lib/carte/fonds";
import { cn } from "@/lib/utils";
import { ChoixFond, NoteFond } from "./fonds-ui";
import { FiltreFamilles, LegendeEtats } from "./legende";
import { CartePlate } from "./plate";
import { RechercheImplantation } from "./recherche";
import { ToileCarte, type EtatMoteur, type PoigneeCarte } from "./toile";
import type { PointCarte } from "./types";

export type { PointCarte } from "./types";

const compter = <C extends string>(cles: readonly C[], de: (p: PointCarte) => C, points: PointCarte[]) =>
  points.reduce((acc, p) => { acc[de(p)] = (acc[de(p)] ?? 0) + 1; return acc; },
    Object.fromEntries(cles.map((c) => [c, 0])) as Record<C, number>);

export function CarteCongo({
  points, surSelection, hauteur = "clamp(340px, 62vh, 620px)", className,
}: {
  points: PointCarte[];
  surSelection?: (id: string) => void;
  hauteur?: number | string;
  className?: string;
}) {
  const [fond, setFond] = useState<CleFond>("plan");
  const [limites, setLimites] = useState(true);
  const [vues, setVues] = useState<Famille[]>(ORDRE_FAMILLES);
  const [etat, setEtat] = useState<EtatMoteur>("chargement");
  const [muettes, setMuettes] = useState(false);
  const [legende, setLegende] = useState(false);
  const poignee = useRef<PoigneeCarte>(null);

  const visibles = useMemo(() => points.filter((p) => vues.includes(p.famille)), [points, vues]);
  const parFamille = useMemo(() => compter(ORDRE_FAMILLES, (p) => p.famille, points), [points]);
  const parEtat = useMemo(() => compter(ORDRE_ETATS, (p) => p.etat, visibles), [visibles]);

  const basculer = useCallback((f: Famille) =>
    setVues((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f])), []);

  const surChoix = useCallback((p: PointCarte) => {
    poignee.current?.allerA(p.lat, p.lon, 13);
    surSelection?.(p.id);
  }, [surSelection]);

  const plate = etat === "sans-webgl" || etat === "non-embarque" || etat === "absent";

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <RechercheImplantation points={visibles} surChoix={surChoix} className="w-full sm:w-72" />
        <button
          type="button"
          onClick={() => poignee.current?.cadrerPays()}
          disabled={plate}
          className="flex items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-40"
        >
          <Maximize2 className="h-3 w-3" /> Cadrer le pays
        </button>
        <FiltreFamilles vues={vues} surBascule={basculer} comptes={parFamille} className="min-w-0" />
      </div>

      {!plate && (
        <ChoixFond fond={fond} surChangement={setFond} limites={limites} surLimites={setLimites} />
      )}

      <div className="relative min-w-0 overflow-hidden rounded-xl border">
        {plate ? (
          <CartePlate points={visibles} surSelection={surSelection} hauteur={hauteur} />
        ) : (
          <ToileCarte
            ref={poignee}
            points={visibles}
            fond={fond}
            limites={limites}
            hauteur={hauteur}
            surSelection={surSelection}
            surEtatMoteur={setEtat}
            surTuilesMuettes={setMuettes}
          />
        )}

        {etat === "chargement" && (
          <div className="absolute inset-0 grid place-items-center bg-muted/40 text-xs text-muted-foreground">
            Chargement de la carte…
          </div>
        )}

        {plate && (
          <div className="absolute inset-x-3 top-3 z-[400] flex items-start gap-2 rounded-lg border bg-background/95 p-3 text-[11px] leading-relaxed shadow-lg backdrop-blur">
            <MonitorX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p>
              <strong className="text-amber-600">
                {etat === "non-embarque" ? "Carte à plat." : "Ce poste ne peut pas afficher la carte pleine."}
              </strong>{" "}
              {etat === "sans-webgl"
                ? "Son navigateur n'expose pas WebGL 2 — souvent un pilote graphique bloqué par la politique du parc."
                : etat === "non-embarque"
                  ? "Le moteur de carte n'est pas embarqué dans cette maquette autonome : il pèse un mégaoctet, et aucune tuile ne sort d'ici."
                  : "Le moteur de rendu n'a pas pu être chargé."}{" "}
              Les implantations ci-dessous sont les mêmes, aux mêmes positions : seuls les fonds
              tuilés et le zoom continu manquent.
            </p>
          </div>
        )}

        {muettes && !plate && (
          <div className="absolute inset-x-3 top-3 z-[400] rounded-lg border border-amber-500/40 bg-background/95 p-3 text-[11px] leading-relaxed shadow-lg backdrop-blur">
            <strong className="text-amber-600">Les tuiles ne se chargent pas.</strong>{" "}
            Ce réseau bloque le serveur du fond choisi. Le fond{" "}
            <button type="button" className="font-semibold text-primary underline"
                    onClick={() => setFond("contours")}>
              Contours
            </button>{" "}
            est dessiné dans la page et s'affiche sans réseau — les implantations et leurs positions
            sont les mêmes.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2">
        {!plate ? <NoteFond fond={fond} /> : <span />}
        <button
          type="button"
          onClick={() => setLegende((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3 w-3" />
          {legende ? "Masquer la légende" : "Comment lire la carte"}
        </button>
      </div>

      {legende && (
        <div className="rounded-xl border bg-muted/20 p-3">
          <LegendeEtats comptes={parEtat} />
        </div>
      )}
    </div>
  );
}
