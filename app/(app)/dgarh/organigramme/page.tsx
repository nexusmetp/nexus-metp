"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Landmark, Network, ShieldCheck, Users } from "lucide-react";
import {
  DGARH_ID, ENTITES, NIVEAU_LABELS, PROVENANCE_LABELS, cheminDe, descendantsDe, enfantsDe, entiteById,
} from "@/lib/referentiels";
import { useAgentsProjetes } from "@/lib/queries";
import { fmtNum } from "@/lib/format";
import { BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi } from "@/components/nexus/module";
import { PanneauEntite } from "@/components/nexus/panneau-entite";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Entite, Provenance } from "@/lib/types";

/** Effectif d'une entité, branche comprise. */
function useEffectifs() {
  const { data: agents, pret } = useAgentsProjetes();
  const parEntite = useMemo(() => {
    const direct = new Map<string, number>();
    agents.forEach((a) => a.entiteId && direct.set(a.entiteId, (direct.get(a.entiteId) ?? 0) + 1));
    const total = new Map<string, number>();
    ENTITES.forEach((e) => {
      total.set(e.id, descendantsDe(e.id).reduce((s, d) => s + (direct.get(d.id) ?? 0), 0));
    });
    return { direct, total };
  }, [agents]);
  return { ...parEntite, pret };
}

function Noeud({
  entite, direct, total, profondeur, ouvertParDefaut, surFiche,
}: {
  entite: Entite; direct: Map<string, number>; total: Map<string, number>;
  profondeur: number; ouvertParDefaut: boolean;
  surFiche: (e: Entite) => void;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const enfants = enfantsDe(entite.id);
  const aDesEnfants = enfants.length > 0;

  return (
    <li className="relative">
      <div
        className={cn(
          "group flex items-start gap-2 rounded-lg py-1.5 pr-2 transition",
          aDesEnfants && "cursor-pointer hover:bg-accent/60"
        )}
        onClick={() => aDesEnfants && setOuvert((v) => !v)}
      >
        <ChevronRight
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            !aDesEnfants && "invisible",
            ouvert && "rotate-90"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn(
              "text-sm",
              profondeur === 0 ? "font-bold" : profondeur === 1 ? "font-semibold text-primary" : "font-medium"
            )}>
              {entite.sigle}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {NIVEAU_LABELS[entite.niveau]}
            </span>
            <BadgeProvenance v={entite.provenance} reference={entite.reference} />
            {(total.get(entite.id) ?? 0) > 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px] tabular-nums">
                <Users className="h-2.5 w-2.5" />
                {fmtNum(total.get(entite.id) ?? 0)}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{entite.nom}</div>
          {entite.reference && (
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{entite.reference}</div>
          )}
        </div>
        {/* Déplier la branche et consulter la fiche sont deux gestes différents :
            le second ne doit pas replier ce qu'on vient d'ouvrir. */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-[11px] opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
          onClick={(e: any) => { e.stopPropagation(); surFiche(entite); }}
        >
          <Info className="mr-1 h-3 w-3" /> Fiche
        </Button>
      </div>

      {aDesEnfants && ouvert && (
        <ul className="ml-2 border-l pl-4">
          {enfants.map((e) => (
            <Noeud
              key={e.id}
              entite={e}
              direct={direct}
              total={total}
              profondeur={profondeur + 1}
              ouvertParDefaut={profondeur < 1}
              surFiche={surFiche}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrganigrammePage() {
  const { direct, total, pret } = useEffectifs();
  const [fiche, setFiche] = useState<Entite | null>(null);

  const compteProvenance = useMemo(() => {
    const c: Record<Provenance, number> = { TEXTE: 0, A_VERIFIER: 0, RECOMMANDATION: 0 };
    descendantsDe(DGARH_ID).forEach((e) => c[e.provenance]++);
    return c;
  }, []);

  const dgarh = entiteById(DGARH_ID)!;
  const hors = ENTITES.filter((e) => e.parentId === "ENT-METP" && e.id !== DGARH_ID);

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Organigramme"
        description={`${cheminDe(DGARH_ID).map((e) => e.sigle).join(" › ")} — ${descendantsDe(DGARH_ID).length} entités. Chaque niveau porte sa provenance : ce qui est établi par un texte, et ce qui reste à confirmer.`}
      />

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Entités", valeur: fmtNum(descendantsDe(DGARH_ID).length), sousTitre: "sous la direction générale", icon: Network },
        { ton: "cyan", titre: "Effectif rattaché", valeur: fmtNum(total[DGARH_ID] ?? 0), sousTitre: "agents du périmètre", icon: Users },
        { ton: "emeraude", titre: "Établies par un texte", valeur: fmtNum(compteProvenance.TEXTE), sousTitre: "fondement juridique connu", icon: ShieldCheck },
        { ton: "ambre", titre: "À confirmer", valeur: fmtNum(compteProvenance.A_VERIFIER + compteProvenance.RECOMMANDATION), sousTitre: "provenance non établie", icon: Landmark },
      ]} />

      <div className="grid gap-3 sm:grid-cols-3">
        {(["TEXTE", "A_VERIFIER", "RECOMMANDATION"] as Provenance[]).map((p) => (
          <Card key={p} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <BadgeProvenance v={p} />
              <span className="text-2xl font-bold tabular-nums">{compteProvenance[p]}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {p === "TEXTE" && "entités corroborées par une source publique"}
              {p === "A_VERIFIER" && "entités à confirmer sur l'arrêté n° 25567"}
              {p === "RECOMMANDATION" && "entités issues d'un choix de conception"}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-primary" /> {dgarh.nom}
          </CardTitle>
          <CardDescription>
            Cliquez une entité pour déplier sa branche, « Fiche » pour l'ouvrir en détail. L'effectif indiqué inclut les entités rattachées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-0.5">
            <Noeud entite={dgarh} direct={direct} total={total} profondeur={0} ouvertParDefaut surFiche={setFiche} />
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autres structures du ministère</CardTitle>
          <CardDescription>
            Hors périmètre de la DGARH, mais parties prenantes du circuit d'instruction (cahier §10).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-0.5">
            {hors.map((e) => (
              <Noeud key={e.id} entite={e} direct={direct} total={total} profondeur={1} ouvertParDefaut={false} surFiche={setFiche} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <PanneauEntite
        entite={fiche}
        surFermeture={() => setFiche(null)}
        surNavigation={setFiche}
      />
    </>
  );
}
