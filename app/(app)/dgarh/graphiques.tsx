"use client";

import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CHART_COLORS, fmtNum, fmtPct } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Jauge } from "@/components/nexus/module";
import { Bloc, infobulle } from "./bloc";
import type { useTableauDeBord } from "./donnees";

type Bord = ReturnType<typeof useTableauDeBord>;

/* ------------------------------------------------------------------ */
/* Les deux répartitions : par structure, et par département           */
/* ------------------------------------------------------------------ */

/**
 * Sorties de la page pour la garder sous les cinq cents lignes.
 *
 * Elles vont ensemble : l'une répond à « où sont les agents dans
 * l'organigramme », l'autre à « où sont-ils sur le territoire ». Ce sont deux
 * façons de couper le même effectif, et elles doivent tomber sur le même
 * total — c'est écrit sous le premier titre, où le lecteur peut le vérifier.
 */
export function RepartitionEffectifs({
  ministeriel, parDirection, parDepartement, effectifTotal,
}: {
  ministeriel: boolean;
  parDirection: Bord["parDirection"];
  parDepartement: Bord["parDepartement"];
  /** L'effectif du périmètre lu, dont chaque département est une part. */
  effectifTotal: number;
}) {
  return (
  <div className="grid gap-4 xl:grid-cols-2">
    <Bloc i={1}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {ministeriel ? "Effectifs par structure" : "Effectifs par entité"}
          </CardTitle>
          <CardDescription>
            {/* Le total est écrit, et c'est le point : il se vérifie d'un
                coup d'œil. Le graphique mélangeait auparavant les
                directions générales et les directions qu'elles contiennent,
                et ses barres totalisaient plus d'agents que le ministère
                n'en compte. */}
            {ministeriel
              ? `Les ${parDirection.length} structures rattachées au ministre — cabinet, inspection `
                + `générale et directions générales. Les barres totalisent `
                + `${fmtNum(parDirection.reduce((s, d) => s + d.effectif, 0))} agents, `
                + "soit l'effectif entier du ministère."
              : "Les entités immédiatement sous la vôtre, chacune avec ce qui en dépend."}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parDirection} layout="vertical" margin={{ top: 4, right: 16, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="nom" width={72} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...infobulle} formatter={(v: any) => [fmtNum(v as number), "agents"]} />
              <Bar dataKey="effectif" radius={[0, 5, 5, 0]} animationDuration={800}>
                {parDirection.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Bloc>

    <Bloc i={2}>
      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div>
            <CardTitle className="text-base">Effectifs par département</CardTitle>
            <CardDescription>
              {ministeriel
                ? "Les directions départementales et leurs établissements."
                : "Les directions départementales de votre périmètre."}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dgarh/pilotage">Détail</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 overflow-y-auto pt-2" style={{ maxHeight: 320 }}>
          {parDepartement.map((d) => {
            const part = effectifTotal ? (d.effectif / effectifTotal) * 100 : 0;
            return (
              <Link
                key={d.id}
                href={`/dgarh/organisation/${d.id}`}
                className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-xs font-medium">{d.nom}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmtNum(d.effectif)} — {fmtPct(part)}
                  </span>
                </div>
                <Jauge valeur={part * 4} />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </Bloc>
  </div>
  );
}
