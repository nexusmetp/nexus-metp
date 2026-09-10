"use client";

import { useMemo, useState } from "react";
import { ArrowUp, Building2, ClipboardList, School } from "lucide-react";
import { useBesoins } from "@/lib/queries";
import { REGLES_CATEGORIE, ETABLISSEMENTS, cheminDe, entiteById } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { BadgeCategorie, KpiCard, PageHeader } from "@/components/nexus/ui-kit";
import { Jauge, LigneInfo, PanneauDetail, Section } from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { BesoinPersonnel } from "@/lib/types";

const STATUT_LABELS: Record<BesoinPersonnel["statut"], string> = {
  EXPRIME: "Exprimé par l'établissement",
  TRANSMIS: "Transmis par le département",
  INSTRUIT: "Instruit au bureau",
  ARBITRE: "Arbitré",
};

const COULEUR: Record<BesoinPersonnel["statut"], string> = {
  EXPRIME: "bg-slate-500/12 text-slate-500 border-slate-500/25",
  TRANSMIS: "bg-sky-500/12 text-sky-600 border-sky-500/25",
  INSTRUIT: "bg-indigo-500/12 text-indigo-600 border-indigo-500/25",
  ARBITRE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
};

export default function BesoinsPage() {
  const { data: besoins = [], isLoading } = useBesoins();
  const [departement, setDepartement] = useState("all");
  const [statut, setStatut] = useState("all");
  const [selection, setSelection] = useState<BesoinPersonnel | null>(null);

  const departements = useMemo(
    () => Array.from(new Set(besoins.map((b) => b.departementId))).map((id) => entiteById(id)!).filter(Boolean),
    [besoins]
  );

  const filtres = useMemo(
    () => besoins.filter((b) =>
      (departement === "all" || b.departementId === departement) &&
      (statut === "all" || b.statut === statut)
    ),
    [besoins, departement, statut]
  );

  const stats = useMemo(() => {
    const demande = filtres.reduce((s, b) => s + b.effectifDemande, 0);
    const retenu = filtres.reduce((s, b) => s + (b.effectifRetenu ?? 0), 0);
    const arbitres = filtres.filter((b) => b.statut === "ARBITRE").length;
    const parDiscipline = Object.entries(
      filtres.reduce<Record<string, number>>((acc, b) => {
        acc[b.discipline] = (acc[b.discipline] ?? 0) + b.effectifDemande;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);
    return { demande, retenu, arbitres, parDiscipline };
  }, [filtres]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="États de besoins"
        description="Le flux ascendant du §10 : les établissements expriment leurs besoins en prestataires, volontaires et vacataires, les directions départementales transmettent, le bureau du suivi des prestataires instruit."
      />

      {/* La chaîne, montrée telle qu'elle circule. */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <School className="h-4 w-4 text-primary" /> Établissement
          </span>
          <ArrowUp className="h-4 w-4 rotate-90 text-muted-foreground" />
          <span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <Building2 className="h-4 w-4 text-primary" /> Direction départementale
          </span>
          <ArrowUp className="h-4 w-4 rotate-90 text-muted-foreground" />
          <span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Bureau des prestataires, volontaires et vacataires
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard titre="Postes demandés" valeur={fmtNum(stats.demande)} sousTitre={`${filtres.length} états de besoins`} icon={ClipboardList} />
        <KpiCard titre="Postes retenus" valeur={fmtNum(stats.retenu)} sousTitre={stats.demande ? `${Math.round((stats.retenu / stats.demande) * 100)} % du demandé` : "—"} icon={ArrowUp} />
        <KpiCard titre="Établissements" valeur={fmtNum(ETABLISSEMENTS.length)} sousTitre="rattachés aux 15 départements" icon={School} />
        <KpiCard titre="Arbitrés" valeur={fmtNum(stats.arbitres)} sousTitre="dossiers clos" icon={Building2} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Besoins par discipline</CardTitle>
            <CardDescription>Postes demandés, toutes catégories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stats.parDiscipline.map(([d, n]) => (
              <div key={d}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{d}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{n}</span>
                </div>
                <Progress value={stats.parDiscipline[0] ? (n / stats.parDiscipline[0][1]) * 100 : 0} className="mt-1 h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">États de besoins 2026-2027</CardTitle>
              <CardDescription>Remontés par les établissements</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={departement} onValueChange={setDepartement}>
                <SelectTrigger className="h-9 w-[190px] text-xs"><SelectValue placeholder="Département" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {departements.map((d) => <SelectItem key={d.id} value={d.id}>{d.sigle}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[520px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Établissement</TableHead>
                    <TableHead className="hidden lg:table-cell">Discipline</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Demandé / retenu</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtres.map((b) => {
                    const etb = entiteById(b.etablissementId);
                    return (
                      <TableRow
                        key={b.id}
                        onClick={() => setSelection(b)}
                        className={`cursor-pointer ${selection?.id === b.id ? "bg-primary/5" : ""}`}
                      >
                        <TableCell className="font-mono text-xs">{b.reference}</TableCell>
                        <TableCell>
                          <div className="max-w-[190px] truncate text-sm" title={etb?.nom}>{etb?.nom ?? "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{entiteById(b.departementId)?.sigle}</div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{b.discipline}</TableCell>
                        <TableCell><BadgeCategorie v={b.categorie} /></TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {b.effectifDemande}{" / "}
                          <span className={b.effectifRetenu === undefined ? "text-muted-foreground" : "font-semibold"}>
                            {b.effectifRetenu ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-[10px] ${COULEUR[b.statut]}`}>{STATUT_LABELS[b.statut]}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection ? `${selection.discipline} — ${entiteById(selection.etablissementId)?.nom ?? "établissement"}` : ""}
        sousTitre={selection ? `${selection.reference} — année scolaire ${selection.anneeScolaire}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="outline" className={`text-[10px] ${COULEUR[selection.statut]}`}>
              {STATUT_LABELS[selection.statut]}
            </Badge>
            <BadgeCategorie v={selection.categorie} />
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Expression du besoin">
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.reference}</span>} />
              <LigneInfo k="Établissement" v={entiteById(selection.etablissementId)?.nom ?? "—"} />
              <LigneInfo k="Département" v={entiteById(selection.departementId)?.nom ?? "—"} />
              <LigneInfo k="Chaîne" v={
                <span className="text-[11px]">
                  {cheminDe(selection.etablissementId).map((e) => e.sigle).join(" › ")}
                </span>
              } />
              <LigneInfo k="Discipline" v={selection.discipline} />
              <LigneInfo k="Catégorie demandée" v={REGLES_CATEGORIE[selection.categorie].libelle} />
            </Section>

            <Section titre="Arbitrage">
              <LigneInfo k="Effectif demandé" v={fmtNum(selection.effectifDemande)} />
              <LigneInfo k="Effectif retenu" v={
                selection.effectifRetenu === undefined
                  ? <span className="italic text-muted-foreground">pas encore arbitré</span>
                  : fmtNum(selection.effectifRetenu)
              } />
              {selection.effectifRetenu !== undefined && (
                <>
                  <div className="pt-3">
                    <Jauge
                      valeur={Math.round((selection.effectifRetenu / Math.max(1, selection.effectifDemande)) * 100)}
                      teinte={selection.effectifRetenu >= selection.effectifDemande ? "bg-emerald-500" : "bg-amber-500"}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {selection.effectifRetenu >= selection.effectifDemande
                      ? "Le besoin est couvert intégralement."
                      : `Écart de ${fmtNum(selection.effectifDemande - selection.effectifRetenu)} poste(s) entre la demande et l'arbitrage.`}
                  </p>
                </>
              )}
            </Section>

            <Section titre="Remontée">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Le besoin part de l'établissement, remonte à la direction départementale, puis au bureau
                gestionnaire qui l'arbitre. Un besoin arbitré ne crée pas de poste par lui-même : il faut
                un acte de recrutement pour qu'un agent y soit affecté (§05).
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>
    </>
  );
}
