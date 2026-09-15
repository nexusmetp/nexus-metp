"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowRight, Briefcase, Building2, ChevronRight, FileCheck2,
  GraduationCap, LifeBuoy, Network, Percent, ShieldCheck, Timer, Users,
} from "lucide-react";
import { useActes, useAgentsProjetes, useTickets, useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { useTableauDeBord } from "./donnees";
import { EffectifsParCategorie } from "./categories";
import { RepartitionEffectifs } from "./graphiques";
import { Bloc, infobulle } from "./bloc";
import {
  DGARH_ID, ENTITES, LACUNES, METP_ID, NIVEAU_LABELS, POSITION_LABELS,
  REGLES_CATEGORIE, ROLE_LABELS, STATUTS_EN_COURS, cheminDe, descendantsDe,
  entiteById, enfantsDe, typeActeById, visible,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtNum, fmtPct, joursDepuis } from "@/lib/format";
import { BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import { Jauge, RangeeKpi } from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function TableauDeBordPage() {
  const user = useAuth((s) => s.user);
  const {
    pret, agents, actes, tickets, comptes,
    effectif, stats, structure, parDirection, parDepartement,
    parCategorie, parPosition, pyramide, parTypeActe, departsProches,
    racine, ministeriel, perimetre,
  } = useTableauDeBord();

  if (!pret) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  /* Compté sur le périmètre, comme tout le reste de la page : annoncer
     cinquante et une entités douteuses à un directeur dont les dix sont
     toutes fondées sur un arrêté, c'est lui donner une alerte qui ne le
     regarde pas. */
  const aVerifier = ENTITES.filter((e) => e.provenance !== "TEXTE" && visible(perimetre, e.id)).length;

  return (
    <>
      <PageHeader
        titre="Tableau de bord"
        description={
          user
            ? ministeriel
              ? `${user.nomComplet} — ${ROLE_LABELS[user.role]}. La direction générale gère le personnel de tout le ministère, cabinet compris : c'est ce périmètre que projette cette page.`
              : `${user.nomComplet} — ${ROLE_LABELS[user.role]}, ${entiteById(racine)?.nom ?? "votre structure"}. Cette page ne projette que votre périmètre : le personnel des autres structures est tenu par elles.`
            : "Vue d'ensemble des ressources humaines du ministère."
        }
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh/national">Vue nationale</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh/pilotage">Pilotage des directions</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/dgarh/bannette">Ma bannette</Link>
        </Button>
      </PageHeader>

      {/* ── La population ──
          Les trois premiers cartons changent de sens selon qui lit : « le
          ministère, la DGARH, le cabinet » pour les six comptes qui portent la
          vue ministérielle, « ma structure » pour tous les autres. Laisser les
          libellés ministériels à un chef de service lui faisait lire un chiffre
          qui n'était pas le sien — ou, avant que la borne existe, un chiffre
          qu'il n'avait pas à connaître.

          Le troisième carton nommait le cabinet. C'était un choix arbitraire
          parmi les six structures du ministre, et il en cachait une plus
          grosse : l'inspection générale, six cent treize agents, qu'on ne
          trouvait qu'en bas de page. Plutôt que d'ajouter une septième tuile,
          la rangée ne porte plus que des chiffres qui valent pour le ministère
          entier — dont « en activité », qui manquait partout et qui est la
          question posée avant de répartir du travail. Le détail par structure
          est juste dessous, les six classées par effectif, chacune ouvrant sa
          fiche. */}
      <RangeeKpi tuiles={ministeriel ? [
        { ton: "bleu", titre: "Effectif du ministère", valeur: stats.ministere, sousTitre: "toutes catégories, tous départements", icon: Users, href: "/dgarh/agents" },
        {
          ton: "emeraude", titre: "En activité", valeur: stats.enActivite, icon: Building2,
          sousTitre: `${fmtNum(stats.horsService)} hors service — détachement, disponibilité, mise à disposition, suspension`,
          href: "/dgarh/agents?position=ACTIVITE",
        },
        { ton: "cyan", titre: "Effectif de la DGARH", valeur: stats.dgarh, sousTitre: "périmètre propre de la direction générale", icon: Briefcase, href: `/dgarh/organisation/${DGARH_ID}` },
        { ton: "violet", titre: "Personnel enseignant", valeur: stats.enseignants, sousTitre: `${fmtPct(stats.ministere ? (stats.enseignants / stats.ministere) * 100 : 0)} de l'effectif`, icon: GraduationCap, href: "/dgarh/agents?profil=enseignant" },
      ] : [
        { ton: "bleu", titre: `Effectif de ${entiteById(racine)?.sigle ?? "ma structure"}`, valeur: stats.ministere, sousTitre: "ma structure et tout ce qui en dépend", icon: Users, href: `/dgarh/organisation/${racine}` },
        { ton: "cyan", titre: "Rattachés en propre", valeur: stats.dgarh, sousTitre: "affectés à l'entité elle-même, hors sous-entités", icon: Building2, href: `/dgarh/agents?entite=${racine}&rattachement=propre` },
        { ton: "violet", titre: "Entités sous ma main", valeur: stats.cabinet, sousTitre: "services, bureaux et implantations", icon: Network, href: "/dgarh/organisation" },
        { ton: "emeraude", titre: "Personnel enseignant", valeur: stats.enseignants, sousTitre: `${fmtPct(stats.ministere ? (stats.enseignants / stats.ministere) * 100 : 0)} de l'effectif`, icon: GraduationCap, href: `/dgarh/agents?entite=${racine}&profil=enseignant` },
      ]} />

      {/* ── Sous quel régime ils servent ──
          Placé juste après les effectifs globaux, parce que c'est la question
          qui suit immédiatement « combien sommes-nous » : combien d'entre eux
          sont des agents de l'État, et combien servent hors statut. */}
      <EffectifsParCategorie agents={agents} perimetreBorne={!ministeriel} />

      {/* ── L'activité ── */}
      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Actes en circulation", valeur: stats.ouverts, sousTitre: "dossiers non encore notifiés", icon: FileCheck2, href: "/dgarh/actes" },
        { ton: "indigo", titre: "Délai moyen d'instruction", valeur: `${stats.delaiMoyen} j`, sousTitre: "cible : 15 jours", icon: Timer, href: "/rapports" },
        { ton: "rose", titre: "Dossiers hors délai", valeur: stats.horsDelai, sousTitre: "au-delà de la cible", icon: AlertTriangle, href: "/dgarh/bannette" },
        { ton: "ambre", titre: "Réclamations ouvertes", valeur: stats.reclamations, sousTitre: "en attente de traitement", icon: LifeBuoy, href: "/tickets" },
      ]} />

      {/* ── La structure ── */}
      <Bloc i={0}>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">
                {ministeriel ? "La structure du ministère" : `Ce qui relève de ${entiteById(racine)?.sigle ?? "ma structure"}`}
              </CardTitle>
              <CardDescription>
                {ministeriel
                  ? "Ce qui relève directement du ministre. Le personnel de chacune de ces entités est géré par la direction générale."
                  : "Les entités immédiatement sous la mienne. Leur personnel est le mien, et c'est le périmètre où je désigne et j'inscris."}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dgarh/organisation">Gérer <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {structure.map((s, i) => (
              <motion.div
                key={s.entite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: 0.18 + i * 0.05 }}
              >
                <Link
                  href={`/dgarh/organisation/${s.entite.id}`}
                  className="flex h-full flex-col justify-between gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">{s.entite.sigle}</span>
                        <Badge variant="outline" className="text-[9px]">{NIVEAU_LABELS[s.entite.niveau]}</Badge>
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{s.entite.nom}</div>
                    </div>
                    <BadgeProvenance v={s.entite.provenance} />
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold tabular-nums">{fmtNum(s.effectif)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        agents — {fmtNum(s.entites)} entité{s.entites > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">
                        {s.responsable ?? <span className="italic">responsable à nommer</span>}
                      </div>
                      {s.ouverts > 0 && (
                        <div className="mt-0.5 text-[10px] font-semibold text-amber-600">
                          {fmtNum(s.ouverts)} dossier{s.ouverts > 1 ? "s" : ""} en cours
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </Bloc>

      <RepartitionEffectifs
        ministeriel={ministeriel} parDirection={parDirection}
        parDepartement={parDepartement} effectifTotal={stats.ministere} />

      {/* ── Composition de la population ── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Bloc i={3}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Catégories de personnel</CardTitle>
              <CardDescription>Ce qui décide des règles applicables à chacun.</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={parCategorie} dataKey="valeur" nameKey="nom"
                    innerRadius={52} outerRadius={82} paddingAngle={2} animationDuration={800}
                  >
                    {parCategorie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...infobulle} formatter={(v: any, n: any) => [fmtNum(v as number), n]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            <CardContent className="space-y-1 pt-0">
              {parCategorie.map((c, i) => (
                <Link
                  key={c.cle} href={`/dgarh/agents?categorie=${c.cle}`}
                  className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-muted/60"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate">{c.nom}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{fmtNum(c.valeur)}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </Bloc>

        <Bloc i={4}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pyramide des âges</CardTitle>
              <CardDescription>Ce qui dit si la relève est préparée.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pyramide} layout="vertical" margin={{ top: 4, right: 12, left: 6, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="nom" width={70} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip {...infobulle} />
                  <Bar dataKey="hommes" name="Hommes" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} animationDuration={800} />
                  <Bar dataKey="femmes" name="Femmes" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
            <CardContent className="pt-0">
              <p className="rounded-lg border bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                {fmtNum(departsProches)} agents atteindront 60 ans dans les deux ans : autant de
                remplacements à préparer par les états de besoins.
              </p>
            </CardContent>
          </Card>
        </Bloc>

        <Bloc i={5}>
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Positions administratives</CardTitle>
              <CardDescription>Qui est en poste, et qui n'y est pas.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2.5 pt-2">
              {parPosition.map((p) => {
                const part = stats.ministere ? (p.valeur / stats.ministere) * 100 : 0;
                return (
                  <Link
                    key={p.cle} href="/conges"
                    className="block rounded-lg px-1 py-1 transition-colors hover:bg-muted/60"
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs font-medium">{p.nom}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {fmtNum(p.valeur)} — {fmtPct(part)}
                      </span>
                    </div>
                    <Jauge valeur={part} teinte={p.cle === "ACTIVITE" ? "bg-emerald-500" : "bg-primary"} />
                  </Link>
                );
              })}
            </CardContent>
            <CardContent className="pt-0">
              <div className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium">Complétude moyenne des dossiers</span>
                  <span className="text-sm font-bold tabular-nums">{fmtPct(stats.completude)}</span>
                </div>
                <div className="mt-2">
                  <Jauge
                    valeur={stats.completude}
                    teinte={stats.completude >= 75 ? "bg-emerald-500" : stats.completude >= 50 ? "bg-amber-500" : "bg-rose-500"}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {fmtNum(stats.incomplets)} dossiers sous 60 % de pièces attendues.
                </p>
              </div>
            </CardContent>
          </Card>
        </Bloc>
      </div>

      {/* ── Instruction et alertes ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Bloc i={6}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle className="text-base">Dossiers en circulation, par nature</CardTitle>
                <CardDescription>
                  {ministeriel
                    ? "Ce que la direction générale instruit en ce moment."
                    : "Ce que votre structure instruit en ce moment."}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dgarh/actes">Registre <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="h-[280px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parTypeActe} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nom" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-32} textAnchor="end" interval={0} height={64} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip {...infobulle} formatter={(v: any) => [fmtNum(v as number), "dossiers"]} />
                  <Bar dataKey="valeur" fill={CHART_COLORS[0]} radius={[5, 5, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Bloc>

        <Bloc i={7}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ce qui demande votre attention</CardTitle>
              <CardDescription>Trois signaux, et où agir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  titre: `${fmtNum(stats.horsDelai)} dossiers au-delà du délai cible`,
                  texte: "Chaque jour au-delà de quinze est un agent qui attend un acte. Le détail par direction est dans le pilotage.",
                  href: "/dgarh/pilotage",
                  icon: Timer,
                  grave: stats.horsDelai > 0,
                },
                {
                  titre: `${fmtNum(stats.incomplets)} dossiers incomplets`,
                  texte: "Un dossier sans pièce se bloque au premier contrôle. Les pièces se réclament par une demande tracée.",
                  href: "/tickets",
                  icon: ShieldCheck,
                  grave: stats.incomplets > 0,
                },
                {
                  titre: `${fmtNum(aVerifier)} entités de provenance non établie`,
                  texte: "Les arrêtés d'organisation sont dépouillés : ce qu'il reste est la carte scolaire — les lycées et collèges — et le découpage des inspections interdépartementales.",
                  href: "/referentiels",
                  icon: Network,
                  grave: false,
                },
                ...(LACUNES.length
                  ? [{
                      titre: `${fmtNum(LACUNES.length)} lacunes du référentiel`,
                      texte: LACUNES[0].sujet + " — et " + (LACUNES.length - 1) + " autre(s) point(s) à confirmer avant mise en service.",
                      href: "/referentiels",
                      icon: AlertTriangle,
                      grave: false,
                    }]
                  : []),
              ].map((a, i) => (
                <motion.div
                  key={a.titre}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.26, delay: 0.5 + i * 0.06 }}
                >
                  <Link
                    href={a.href}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                      a.grave ? "border-amber-500/35 bg-amber-500/[0.05]" : "hover:border-primary/40"
                    )}
                  >
                    <a.icon className={cn("mt-0.5 h-4 w-4 shrink-0", a.grave ? "text-amber-600" : "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{a.titre}</div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{a.texte}</p>
                    </div>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </Bloc>
      </div>
    </>
  );
}
