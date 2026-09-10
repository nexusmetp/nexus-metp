"use client";

/**
 * La fiche d'une implantation, ouverte depuis la carte.
 *
 * C'est ce qu'un directeur général regarde avant d'arbitrer un mouvement :
 * qui dirige, combien ils sont, qui est présent, ce qui manque. L'effectif
 * seul ne dit rien — cent trente-cinq agents dont vingt en congé et huit
 * postes vacants n'est pas la même direction que cent trente-cinq agents
 * tous présents.
 */

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { NIVEAU_LABELS } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { ETATS, FAMILLES, dataUri, svgFamille } from "@/lib/carte/symboles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIBELLE_CATEGORIE, lignesSituation } from "./situation";
import type { Implantation } from "./implantations";

export function FicheImplantation({
  implantation, surFermeture,
}: {
  implantation: Implantation;
  surFermeture: () => void;
}) {
  const i = implantation;
  const s = i.situation;
  const etat = ETATS[i.etat];

  return (
    <div className="mx-4 mb-4 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri(svgFamille(i.famille))} alt={FAMILLES[i.famille].libelle} width={16} height={16} />
        <span className="font-mono text-[11px] font-bold">{i.sigle}</span>
        <Badge variant="outline" className="text-[9px]">{NIVEAU_LABELS[i.niveau]}</Badge>
        <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: etat.couleur }}>
          <span className="h-2 w-2 rounded-full" style={{ background: etat.couleur }} />
          {etat.libelle}
        </span>
        <button className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                onClick={surFermeture} aria-label="Fermer la fiche">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1 text-xs font-medium leading-snug">{i.nom}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {i.ville && <span>{i.ville}</span>}
        {i.departement && <span>{i.departement}</span>}
        <span className="font-semibold text-foreground">{fmtNum(s.effectif)} agents</span>
        {i.besoins > 0 && <span>{i.besoins} état(s) de besoins</span>}
        <span className="font-mono">{i.lat.toFixed(4)}, {i.lon.toFixed(4)}</span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {lignesSituation(s).map((l) => (
          <div key={l.libelle} className="rounded-lg border bg-muted/30 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{l.libelle}</div>
            <div className="text-sm font-bold tabular-nums" style={{ color: l.ton }}>{l.valeur}</div>
          </div>
        ))}
      </div>

      {s.responsable && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{s.responsable.nom}</span>
          {" — "}{s.responsable.fonction}
        </div>
      )}

      {!!s.parCategorie.length && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {s.parCategorie.map((c) => (
            <Badge key={c.categorie} variant="outline" className="text-[9px]">
              {LIBELLE_CATEGORIE[c.categorie]} : {fmtNum(c.nombre)}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
          <Link href={`/dgarh/agents?entite=${i.id}`}>
            Voir les agents <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
        {i.besoins > 0 && (
          <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
            <Link href="/besoins">États de besoins</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
