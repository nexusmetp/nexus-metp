"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Users, FileCheck2, Timer, Percent, Building2, AlertTriangle, ArrowRight, Network,
} from "lucide-react";
import { useActes, useAgentsProjetes } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  DGARH_ID, LACUNES, ROLE_LABELS, REGLES_CATEGORIE, STATUTS_EN_COURS, TEXTES,
  cheminDe, descendantsDe, entiteById, enfantsDe,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import {
  BadgeProvenance, BadgeStatutActe, KpiCard, PageHeader,
} from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

export default function EspaceDgarhPage() {
  const user = useAuth((s) => s.user);
  const { data: agents, pret } = useAgentsProjetes();
  const { data: actes = [] } = useActes();

  const perimetreDgarh = useMemo(() => new Set(descendantsDe(DGARH_ID).map((e) => e.id)), []);

  const stats = useMemo(() => {
    const dansDgarh = agents.filter((a) => a.entiteId && perimetreDgarh.has(a.entiteId));
    const enCours = actes.filter((a) => STATUTS_EN_COURS.includes(a.statut));

    // L'indicateur du §13 : délai moyen d'instruction des actes clos.
    const clos = actes.filter((a) => a.dateSignature);
    const delaiMoyen = clos.length
      ? Math.round(
          clos.reduce(
            (s, a) => s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5,
            0
          ) / clos.length
        )
      : 0;

    const horsDelai = enCours.filter((a) => joursDepuis(a.dateCreation) > 15).length;

    const completude = agents.length
      ? Math.round(agents.reduce((s, a) => s + a.tauxCompletude, 0) / agents.length)
      : 0;

    // Effectifs par direction centrale de la DGARH.
    const parDirection = enfantsDe(DGARH_ID).map((d) => {
      const ids = new Set(descendantsDe(d.id).map((x) => x.id));
      return { nom: d.sigle, effectif: agents.filter((a) => a.entiteId && ids.has(a.entiteId)).length };
    });

    const parCategorie = (Object.keys(REGLES_CATEGORIE) as (keyof typeof REGLES_CATEGORIE)[]).map((c) => ({
      name: REGLES_CATEGORIE[c].libelle,
      value: agents.filter((a) => a.categorie === c).length,
    })).filter((x) => x.value > 0);

    // Charge par bureau instructeur — ce que la direction générale veut voir.
    const parBureau = Object.values(
      enCours.reduce<Record<string, { id: string; nom: string; total: number; retard: number; plusVieux: number }>>(
        (acc, a) => {
          const ent = entiteById(a.entiteInstructriceId);
          const cle = a.entiteInstructriceId;
          acc[cle] ??= { id: cle, nom: ent?.sigle ?? cle, total: 0, retard: 0, plusVieux: 0 };
          acc[cle].total++;
          const age = joursDepuis(a.dateCreation);
          if (age > 15) acc[cle].retard++;
          acc[cle].plusVieux = Math.max(acc[cle].plusVieux, age);
          return acc;
        },
        {}
      )
    ).sort((a, b) => b.total - a.total);

    const tranches = [
      { name: "< 30", min: 0, max: 29 }, { name: "30-39", min: 30, max: 39 },
      { name: "40-49", min: 40, max: 49 }, { name: "50-54", min: 50, max: 54 },
      { name: "55-59", min: 55, max: 59 }, { name: "60 +", min: 60, max: 120 },
    ].map((t) => {
      const dans = agents.filter((a) => a.age >= t.min && a.age <= t.max);
      return {
        name: t.name,
        Hommes: dans.filter((a) => a.sexe === "M").length,
        Femmes: dans.filter((a) => a.sexe === "F").length,
      };
    });

    return {
      totalMinistere: agents.length,
      totalDgarh: dansDgarh.length,
      enCours: enCours.length,
      horsDelai,
      delaiMoyen,
      completude,
      parDirection, parCategorie, parBureau, tranches,
      entitesDgarh: perimetreDgarh.size,
    };
  }, [agents, actes, perimetreDgarh]);

  const aTraiter = useMemo(
    () =>
      actes
        .filter((a) => STATUTS_EN_COURS.includes(a.statut))
        .sort((a, b) => a.dateCreation.localeCompare(b.dateCreation))
        .slice(0, 8),
    [actes]
  );

  if (!pret) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const entite = entiteById(user!.entiteId);

  return (
    <>
      <PageHeader
        titre="Espace DGARH"
        description={`${user!.nomComplet} — ${ROLE_LABELS[user!.role]}, ${entite?.nom ?? ""}. Périmètre : ${cheminDe(user!.entiteId).map((e) => e.sigle).join(" › ")}.`}
      >
        <BadgeProvenance v="TEXTE" reference={TEXTES.ARR_25567} />
        <Button asChild>
          <Link href="/dgarh/actes">Dossiers en circulation <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard titre="Effectif DGARH" valeur={fmtNum(stats.totalDgarh)} sousTitre={`${stats.entitesDgarh} entités rattachées`} icon={Building2} />
        <KpiCard titre="Effectif ministère" valeur={fmtNum(stats.totalMinistere)} sousTitre="toutes catégories confondues" icon={Users} />
        <KpiCard titre="Actes en circulation" valeur={fmtNum(stats.enCours)} sousTitre={`${stats.horsDelai} au-delà du délai cible`} icon={FileCheck2} />
        <KpiCard titre="Délai moyen d'instruction" valeur={`${stats.delaiMoyen} j`} sousTitre="cible : 15 jours" icon={Timer} />
      </div>

      {/* L'indicateur que l'administration ne sait pas produire aujourd'hui — cahier §13 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Charge par bureau instructeur</CardTitle>
            <CardDescription>
              Dossiers ouverts, retards au-delà de 15 jours et ancienneté du plus vieux dossier
            </CardDescription>
          </div>
          <Percent className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.parBureau.map((b) => {
            const ent = entiteById(b.id);
            const part = stats.enCours ? Math.round((b.total / stats.enCours) * 100) : 0;
            return (
              <div key={b.id} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium" title={ent?.nom}>{ent?.nom ?? b.nom}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {b.total} dossier{b.total > 1 ? "s" : ""}
                    </span>
                  </div>
                  <Progress value={part} className="mt-1.5 h-1.5" />
                </div>
                <div className="w-28 shrink-0 text-right">
                  {b.retard > 0 ? (
                    <Badge variant="outline" className="border-amber-500/25 bg-amber-500/12 text-[10px] text-amber-600">
                      {b.retard} en retard
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">dans les délais</span>
                  )}
                  <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">max {b.plusVieux} j</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Effectifs par direction centrale</CardTitle>
            <CardDescription>Répartition à l'intérieur du périmètre de la DGARH</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.parDirection}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="nom" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <Tooltip {...infobulle} />
                <Bar dataKey="effectif" radius={[6, 6, 0, 0]} fill="#00B4D8" name="Effectif" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catégories de personnel</CardTitle>
            <CardDescription>Cahier §05 — cinq catégories distinctes</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.parCategorie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={84} paddingAngle={3}>
                  {stats.parCategorie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip {...infobulle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pyramide des âges</CardTitle>
          <CardDescription>Anticipation des départs à la retraite par tranche et par sexe</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.tranches} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
              <Tooltip {...infobulle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hommes" stackId="a" fill="#0077B6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Femmes" stackId="a" fill="#48CAE4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Dossiers les plus anciens</CardTitle>
            <CardDescription>Circuit d'instruction — délai cible : 15 jours</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dgarh/actes">Tout voir</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead className="hidden md:table-cell">Objet</TableHead>
                  <TableHead className="hidden lg:table-cell">Bureau</TableHead>
                  <TableHead>Ancienneté</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aTraiter.map((a) => {
                  const age = joursDepuis(a.dateCreation);
                  const idx = a.etapes.findIndex((e) => e.statut === "EN_COURS");
                  const etape = idx >= 0 ? a.etapes[idx] : undefined;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.reference}</TableCell>
                      <TableCell className="hidden max-w-[260px] truncate md:table-cell">{a.objet}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {entiteById(a.entiteInstructriceId)?.sigle}
                      </TableCell>
                      <TableCell className={age > 15 ? "text-sm font-semibold text-amber-600" : "text-sm"}>
                        {age} j
                      </TableCell>
                      <TableCell className="w-44">
                        <Progress value={idx >= 0 ? (idx / a.etapes.length) * 100 : 100} className="h-1.5" />
                        <div className="mt-1 truncate text-[10px] text-muted-foreground">
                          {etape?.libelle ?? "Clôturé"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right"><BadgeStatutActe v={a.statut} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cahier §01 : ne jamais laisser croire que le référentiel est complet. */}
      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="flex flex-row items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <CardTitle className="text-base">Référentiel incomplet</CardTitle>
            <CardDescription>
              Les données ci-dessous s'appuient sur une organisation partiellement vérifiée.
              À obtenir avant toute mise en service.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {LACUNES.map((l) => (
            <div key={l.sujet} className="flex flex-col gap-0.5 border-l-2 border-amber-500/30 pl-3 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="text-sm font-medium">{l.sujet}</span>
              <span className="text-xs text-muted-foreground">{l.manque} — {l.ou}</span>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/dgarh/organigramme"><Network className="mr-2 h-3.5 w-3.5" /> Voir l'organigramme et ses provenances</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
