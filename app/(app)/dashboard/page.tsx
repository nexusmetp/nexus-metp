"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Area, AreaChart,
} from "recharts";
import {
  Users, Briefcase, FileCheck2, CalendarClock, TrendingUp, AlertTriangle, ArrowRight, Building2, Percent,
} from "lucide-react";
import { useActes, useAgents, useConges, usePostes } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { ENTITES, ROLE_LABELS, entiteById, gradeById } from "@/lib/referentiels";
import { CHART_COLORS, fmtNum, fmtDate, age } from "@/lib/format";
import { KpiCard, PageHeader, StatutBadge } from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 },
};

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const { data: agents = [], isLoading } = useAgents();
  const { data: postes = [] } = usePostes();
  const { data: actes = [] } = useActes();
  const { data: conges = [] } = useConges();

  const stats = useMemo(() => {
    const actifs = agents.filter((a) => a.etat === "Actif");
    const occupes = postes.filter((p) => p.statut === "Occupé").length;
    const vacants = postes.filter((p) => p.statut === "Vacant").length;
    const enCours = actes.filter((a) => ["Soumis", "Validation SG", "Validation Ministre"].includes(a.statut));
    const completude = agents.length ? Math.round(agents.reduce((s, a) => s + a.tauxCompletude, 0) / agents.length) : 0;
    const absents = conges.filter((c) => c.statut === "En cours" || c.statut === "Approuvé").reduce((s, c) => s + c.jours, 0);

    const parDG = ENTITES.filter((e) => ["DIRECTION_GENERALE", "SECRETARIAT", "INSPECTION", "CABINET"].includes(e.type)).map((e) => {
      const ids = new Set<string>([e.id]);
      ENTITES.forEach((c) => c.parentId === e.id && ids.add(c.id));
      return { nom: e.sigle, effectif: agents.filter((a) => ids.has(a.entiteId)).length };
    });

    const parDept = ENTITES.filter((e) => e.type === "DIRECTION_DEPARTEMENTALE")
      .map((e) => ({ nom: e.nom.replace("Direction Départementale du METP – ", ""), effectif: agents.filter((a) => a.entiteId === e.id).length }))
      .sort((a, b) => b.effectif - a.effectif);

    const parCategorie = ["A", "B", "C", "D"].map((c) => ({ name: `Catégorie ${c}`, value: agents.filter((a) => a.categorie === c).length }));
    const parStatut = ["Titulaire", "Contractuel", "Vacataire"].map((s) => ({ name: s, value: agents.filter((a) => a.statut === s).length }));

    const recrutements = Array.from({ length: 12 }, (_, i) => {
      const an = 2015 + i;
      return { annee: String(an), nombre: agents.filter((a) => new Date(a.dateRecrutement).getFullYear() === an).length };
    });

    const tranches = [
      { name: "< 30 ans", min: 0, max: 29 },
      { name: "30-39", min: 30, max: 39 },
      { name: "40-49", min: 40, max: 49 },
      { name: "50-54", min: 50, max: 54 },
      { name: "55-59", min: 55, max: 59 },
      { name: "60 +", min: 60, max: 120 },
    ].map((t) => {
      const inRange = agents.filter((a) => {
        const v = Number(age(a.dateNaissance));
        return v >= t.min && v <= t.max;
      });
      return { name: t.name, Hommes: inRange.filter((a) => a.sexe === "M").length, Femmes: inRange.filter((a) => a.sexe === "F").length };
    });

    const femmes = agents.filter((a) => a.sexe === "F").length;

    return {
      total: agents.length,
      actifs: actifs.length,
      occupes, vacants,
      couverture: postes.length ? Math.round((occupes / postes.length) * 100) : 0,
      enCours: enCours.length,
      completude,
      absenteisme: agents.length ? Math.min(9.9, Number(((absents / (agents.length * 240)) * 100).toFixed(1))) : 0,
      parDG, parDept, parCategorie, parStatut, recrutements, tranches,
      femmes,
      parite: agents.length ? Math.round((femmes / agents.length) * 100) : 0,
      urgents: actes.filter((a) => a.statut === "Validation Ministre").length,
    };
  }, [agents, postes, actes, conges]);

  const attente = useMemo(
    () => actes.filter((a) => ["Soumis", "Validation SG", "Validation Ministre"].includes(a.statut)).slice(0, 7),
    [actes]
  );

  const topCompletude = useMemo(
    () => stats.parDept.slice(0, 6),
    [stats.parDept]
  );

  if (isLoading) {
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

  return (
    <>
      <PageHeader
        titre={`Bonjour, ${user?.nomComplet.split(" ")[0]}`}
        description={`${ROLE_LABELS[user!.role]} — ${entiteById(user!.entiteId)?.nom}. Vision consolidée des ressources humaines du METP au 06 juillet 2026.`}
      >
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
          <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Données temps réel
        </Badge>
        <Button asChild>
          <Link href="/agents">Consulter les agents <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </PageHeader>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard titre="Effectif total" valeur={fmtNum(stats.total)} sousTitre={`${fmtNum(stats.actifs)} agents en activité`} icon={Users} variation={4.2} />
        <KpiCard titre="Couverture des postes" valeur={`${stats.couverture} %`} sousTitre={`${fmtNum(stats.occupes)} occupés • ${fmtNum(stats.vacants)} vacants`} icon={Briefcase} variation={2.8} />
        <KpiCard titre="Actes en circulation" valeur={fmtNum(stats.enCours)} sousTitre={`${stats.urgents} en attente de signature ministre`} icon={FileCheck2} variation={-6.1} />
        <KpiCard titre="Taux d'absentéisme" valeur={`${stats.absenteisme} %`} sousTitre="Cible nationale : < 5 %" icon={CalendarClock} variation={-1.4} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard titre="Complétude des dossiers" valeur={`${stats.completude} %`} sousTitre="Cible : 98 %" icon={Percent} />
        <KpiCard titre="Directions gérées" valeur={ENTITES.length} sousTitre="dont 15 directions départementales" icon={Building2} />
        <KpiCard titre="Parité femmes" valeur={`${stats.parite} %`} sousTitre={`${fmtNum(stats.femmes)} agentes`} icon={TrendingUp} />
        <KpiCard titre="Alertes RH" valeur={fmtNum(agents.filter((a) => a.tauxCompletude < 75).length)} sousTitre="dossiers incomplets < 75 %" icon={AlertTriangle} />
      </div>

      {/* Graphiques principaux */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Effectifs par structure centrale</CardTitle>
            <CardDescription>Direction générale, secrétariat, inspection et cabinet (services rattachés inclus)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.parDG}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="nom" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="effectif" radius={[6, 6, 0, 0]} fill="#00B4D8" name="Effectif" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par catégorie</CardTitle>
            <CardDescription>Ordonnance n° 81-013</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.parCategorie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {stats.parCategorie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statut administratif</CardTitle>
            <CardDescription>Titulaires, contractuels et vacataires</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.parStatut} dataKey="value" nameKey="name" outerRadius={95}>
                  {stats.parStatut.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 1]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pyramide des âges</CardTitle>
            <CardDescription>Anticipation des départs à la retraite par tranche d'âge et par sexe</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tranches} layout="vertical" stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Hommes" stackId="a" fill="#0077B6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Femmes" stackId="a" fill="#48CAE4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution des recrutements</CardTitle>
            <CardDescription>Intégrations et contrats par année</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.recrutements}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="annee" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="nombre" stroke="#00B4D8" strokeWidth={2.5} fill="url(#grad)" name="Recrutements" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Effectifs des 15 directions départementales</CardTitle>
            <CardDescription>Classement par effectif déclaré</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.parDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="effectif" fill="#0096C7" radius={[0, 4, 4, 0]} name="Effectif" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Actes en attente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Actes administratifs en circulation</CardTitle>
            <CardDescription>Circuits de validation électroniques — délai cible : 15 jours</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/carrieres">Tout voir</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Objet</TableHead>
                <TableHead className="hidden lg:table-cell">Échéance</TableHead>
                <TableHead>Étape</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attente.map((a) => {
                const idx = a.etapes.findIndex((e) => e.statut === "En cours");
                const pct = Math.round(((idx < 0 ? a.etapes.length : idx) / a.etapes.length) * 100);
                return (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">{a.reference}</TableCell>
                    <TableCell><Badge variant="secondary">{a.type}</Badge></TableCell>
                    <TableCell className="hidden max-w-[260px] truncate md:table-cell">{a.objet}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(a.dateEcheance)}</TableCell>
                    <TableCell className="w-40">
                      <Progress value={pct} className="h-1.5" />
                      <div className="mt-1 truncate text-[10px] text-muted-foreground">{idx >= 0 ? a.etapes[idx].libelle : "Clôturé"}</div>
                    </TableCell>
                    <TableCell className="text-right"><StatutBadge value={a.statut} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
