"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowRight, Building2, ClipboardList, Gauge, LifeBuoy, Pencil,
  Plus, ShieldCheck, Timer, UserPlus, Users,
} from "lucide-react";
import {
  useActes, useAgentsProjetes, useBesoins, useEntites, useTickets, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  DROITS, ENTITES, MODULE_LABELS, NIVEAU_LABELS, ROLE_LABELS, STATUTS_EN_COURS,
  cheminDe, descendantsDe, entiteById, type ModuleKey,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtNum, fmtPct, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, PageHeader } from "@/components/nexus/ui-kit";
import {
  Jauge, LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { useGestionEntite } from "@/components/nexus/gestion-entite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Les niveaux que le directeur général pilote directement. */
const NIVEAUX_PILOTES = new Set([
  "DIRECTION_GENERALE", "DIRECTION", "SECRETARIAT", "INSPECTION_GENERALE",
  "DIRECTION_DEPARTEMENTALE", "INSPECTION_INTERDEPARTEMENTALE",
]);

interface LigneDirection {
  id: string;
  sigle: string;
  nom: string;
  niveau: string;
  effectif: number;
  entites: number;
  actesOuverts: number;
  actesRetard: number;
  delaiMoyen: number;
  ticketsOuverts: number;
  besoins: number;
  completude: number;
  responsable?: string;
}

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

export default function PilotagePage() {
  const user = useAuth((s) => s.user)!;
  const { data: agents, pret } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: tickets = [] } = useTickets();
  const { data: besoins = [] } = useBesoins();
  const { data: comptes = [] } = useUtilisateurs();
  const { data: entitesDb = [] } = useEntites();

  const [selection, setSelection] = useState<LigneDirection | null>(null);
  const gestion = useGestionEntite(() => setSelection(null));
  const [filtres, setFiltres] = useState<Record<string, string>>({ niveau: "all", sante: "all" });

  const directions = useMemo<LigneDirection[]>(() => {
    const responsableDe = new Map<string, string>();
    comptes.forEach((c) => { if (!responsableDe.has(c.entiteId)) responsableDe.set(c.entiteId, c.nomComplet); });


    return ENTITES
      .filter((e) => NIVEAUX_PILOTES.has(e.niveau) && e.actif !== false)
      .map((e) => {
        const perimetre = new Set(descendantsDe(e.id).map((x) => x.id));
        const pop = agents.filter((a) => a.entiteId && perimetre.has(a.entiteId));
        const dossiers = actes.filter((a) => perimetre.has(a.entiteInstructriceId));
        const ouverts = dossiers.filter((a) => STATUTS_EN_COURS.includes(a.statut));
        const clos = dossiers.filter((a) => a.dateSignature);
        return {
          id: e.id,
          sigle: e.sigle,
          nom: e.nom,
          niveau: e.niveau,
          effectif: pop.length,
          entites: perimetre.size,
          actesOuverts: ouverts.length,
          actesRetard: ouverts.filter((a) => joursDepuis(a.dateCreation) > 15).length,
          delaiMoyen: clos.length
            ? Math.round(clos.reduce((s, a) =>
                s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5, 0) / clos.length)
            : 0,
          ticketsOuverts: tickets.filter((t) =>
            perimetre.has(t.entiteId) && !["RESOLU", "CLOS"].includes(t.statut)).length,
          besoins: besoins.filter((b) => perimetre.has(b.etablissementId)).length,
          completude: pop.length
            ? Math.round(pop.reduce((s, a) => s + a.tauxCompletude, 0) / pop.length)
            : 0,
          responsable: responsableDe.get(e.id),
        };
      })
      .filter((d) => d.effectif > 0 || d.actesOuverts > 0)
      .sort((a, b) => b.effectif - a.effectif);
  }, [agents, actes, tickets, besoins, comptes, entitesDb]);

  /* Une direction est « sous tension » dès qu'un dossier y dort plus de
     quinze jours ou qu'une réclamation y traîne. */
  const sousTension = (d: LigneDirection) => d.actesRetard > 0 || d.ticketsOuverts > 3;

  const lignes = useMemo(() => directions
    .filter((d) => filtres.niveau === "all" || d.niveau === filtres.niveau)
    .filter((d) => filtres.sante === "all" || (filtres.sante === "tension" ? sousTension(d) : !sousTension(d))),
    [directions, filtres]);

  const total = useMemo(() => ({
    effectif: directions.reduce((s, d) => s + d.effectif, 0),
    retard: directions.reduce((s, d) => s + d.actesRetard, 0),
    tickets: directions.reduce((s, d) => s + d.ticketsOuverts, 0),
    tension: directions.filter(sousTension).length,
  }), [directions]);

  const graphe = useMemo(() => directions.slice(0, 9).map((d) => ({
    nom: d.sigle,
    effectif: d.effectif,
    retard: d.actesRetard,
  })), [directions]);

  const colonnes: Colonne<LigneDirection>[] = [
    {
      cle: "direction", entete: "Direction",
      rendu: (d) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">{d.sigle}</span>
            {sousTension(d) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
          </div>
          <div className="max-w-[320px] truncate text-[11px] text-muted-foreground" title={d.nom}>{d.nom}</div>
        </div>
      ),
    },
    {
      cle: "responsable", entete: "Responsable", visible: "xl",
      rendu: (d) => d.responsable
        ? <span className="text-xs">{d.responsable}</span>
        : <span className="text-xs italic text-muted-foreground">à nommer</span>,
    },
    { cle: "effectif", entete: "Effectif", aligne: "droite", rendu: (d) => <span className="tabular-nums text-sm font-medium">{fmtNum(d.effectif)}</span> },
    {
      cle: "actes", entete: "Dossiers ouverts", aligne: "droite", visible: "md",
      rendu: (d) => (
        <span className="tabular-nums text-sm">
          {fmtNum(d.actesOuverts)}
          {d.actesRetard > 0 && <span className="ml-1.5 font-semibold text-amber-600">({d.actesRetard} en retard)</span>}
        </span>
      ),
    },
    {
      cle: "delai", entete: "Délai moyen", aligne: "droite", visible: "lg",
      rendu: (d) => (
        <span className={cn("tabular-nums text-sm", d.delaiMoyen > 15 && "font-semibold text-amber-600")}>
          {d.delaiMoyen} j
        </span>
      ),
    },
    {
      cle: "tickets", entete: "Réclamations", aligne: "droite", visible: "lg",
      rendu: (d) => <span className="tabular-nums text-sm">{fmtNum(d.ticketsOuverts)}</span>,
    },
    {
      cle: "completude", entete: "Dossiers complets", aligne: "droite", visible: "md",
      rendu: (d) => (
        <div className="ml-auto w-24">
          <div className="mb-1 text-right text-xs tabular-nums">{fmtPct(d.completude)}</div>
          <Jauge valeur={d.completude} teinte={d.completude >= 75 ? "bg-emerald-500" : d.completude >= 50 ? "bg-amber-500" : "bg-rose-500"} />
        </div>
      ),
    },
  ];

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const detailActes = selection
    ? actes
        .filter((a) => descendantsDe(selection.id).some((e) => e.id === a.entiteInstructriceId))
        .filter((a) => STATUTS_EN_COURS.includes(a.statut))
        .sort((a, b) => joursDepuis(b.dateCreation) - joursDepuis(a.dateCreation))
        .slice(0, 8)
    : [];

  return (
    <>
      <PageHeader
        titre="Pilotage des directions"
        description="Ce qui se passe dans chaque direction remonte ici. Une pastille rouge signale une direction sous tension : un dossier y dort, ou des réclamations s'y accumulent."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh/organisation">Toute l'arborescence</Link>
        </Button>
        <Button size="sm" onClick={() => gestion.ouvrirCreation("ENT-METP")}>
          <Plus className="mr-1.5 h-4 w-4" /> Créer une direction
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Effectif piloté", valeur: fmtNum(total.effectif), sousTitre: `${fmtNum(directions.length)} directions suivies`, icon: Users },
        { titre: "Sous tension", valeur: fmtNum(total.tension), sousTitre: "directions à regarder aujourd'hui", icon: AlertTriangle },
        { titre: "Dossiers en retard", valeur: fmtNum(total.retard), sousTitre: "au-delà du délai cible de 15 jours", icon: Timer },
        { titre: "Réclamations ouvertes", valeur: fmtNum(total.tickets), sousTitre: "toutes directions confondues", icon: LifeBuoy },
      ]} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Effectif et dossiers en retard, par direction</CardTitle>
          <CardDescription>Les neuf directions les plus peuplées.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graphe} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...infobulle} />
              <Bar dataKey="effectif" name="Effectif" fill={CHART_COLORS[0]} radius={[5, 5, 0, 0]} />
              <Bar dataKey="retard" name="Dossiers en retard" fill={CHART_COLORS[4]} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <TableauModule<LigneDirection>
        titre="Tableau de bord des directions"
        description="Cliquez une direction pour voir ce qui s'y joue."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(d, t) => d.sigle.toLowerCase().includes(t) || d.nom.toLowerCase().includes(t)}
        placeholderRecherche="Sigle ou intitulé…"
        filtres={[
          { cle: "niveau", libelle: "Tous les niveaux", options: [...NIVEAUX_PILOTES].map((n) => ({ valeur: n, libelle: NIVEAU_LABELS[n as keyof typeof NIVEAU_LABELS] })) },
          { cle: "sante", libelle: "Toutes situations", options: [{ valeur: "tension", libelle: "Sous tension" }, { valeur: "calme", libelle: "Sans alerte" }] },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={14}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.nom ?? ""}
        sousTitre={selection ? cheminDe(selection.id).map((e) => e.sigle).join(" › ") : undefined}
        etiquette={selection && (
          <>
            <Badge variant="secondary" className="text-[10px]">{NIVEAU_LABELS[selection.niveau as keyof typeof NIVEAU_LABELS]}</Badge>
            {sousTension(selection) && <Badge variant="destructive" className="text-[10px]">sous tension</Badge>}
          </>
        )}
        actions={selection && (
          <>
            <Button variant="outline" size="sm" onClick={() => {
              const e = entiteById(selection.id);
              if (e) { setSelection(null); gestion.ouvrirEdition(e); }
            }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
            </Button>
            {!selection.responsable && (
              <Button variant="outline" size="sm" onClick={() => {
                const e = entiteById(selection.id);
                if (e) { setSelection(null); gestion.ouvrirNomination(e); }
              }}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Nommer
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dgarh/agents?entite=${selection.id}`}>Voir les agents</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dgarh/actes">Registre des actes <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
            </Button>
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Encadrement">
              <LigneInfo k="Responsable" v={selection.responsable ?? <span className="italic text-muted-foreground">aucun compte rattaché</span>} />
              <LigneInfo k="Entités du périmètre" v={fmtNum(selection.entites)} />
              <LigneInfo k="Effectif" v={fmtNum(selection.effectif)} />
            </Section>

            <Section titre="Habilitations de la direction">
              {(() => {
                const chef = comptes.find((c) => c.entiteId === selection.id);
                if (!chef) {
                  return (
                    <p className="rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
                      Sans responsable nommé, aucun droit ne s'exerce sur cette direction : personne n'y
                      instruit de dossier ni n'y inscrit de personnel.
                    </p>
                  );
                }
                const ouverts = (Object.keys(MODULE_LABELS) as ModuleKey[])
                  .filter((m) => DROITS[chef.role]?.[m]);
                return (
                  <>
                    <LigneInfo k="Compte" v={<span className="text-xs">{chef.email}</span>} />
                    <LigneInfo k="Rôle" v={ROLE_LABELS[chef.role]} />
                    <LigneInfo k="État" v={chef.actif ? "actif" : "suspendu"} />
                    <div className="pt-3">
                      <div className="mb-2 text-[11px] text-muted-foreground">
                        Modules ouverts par ce rôle — le périmètre, lui, vient du rattachement.
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ouverts.map((m) => (
                          <Badge
                            key={m}
                            variant={DROITS[chef.role]?.[m] === "W" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {MODULE_LABELS[m]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </Section>

            <Section titre="Instruction">
              <LigneInfo k="Dossiers ouverts" v={fmtNum(selection.actesOuverts)} />
              <LigneInfo k="Au-delà du délai" v={
                <span className={cn(selection.actesRetard > 0 && "font-semibold text-amber-600")}>
                  {fmtNum(selection.actesRetard)}
                </span>
              } />
              <LigneInfo k="Délai moyen constaté" v={
                <span className={cn(selection.delaiMoyen > 15 && "font-semibold text-amber-600")}>
                  {selection.delaiMoyen} jours
                </span>
              } />
            </Section>

            <Section titre="Qualité des dossiers">
              <Jauge
                valeur={selection.completude}
                teinte={selection.completude >= 75 ? "bg-emerald-500" : selection.completude >= 50 ? "bg-amber-500" : "bg-rose-500"}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {fmtPct(selection.completude)} des pièces attendues sont présentes en moyenne.
              </p>
            </Section>

            <Section titre="Sollicitations">
              <LigneInfo k="Réclamations ouvertes" v={fmtNum(selection.ticketsOuverts)} />
              <LigneInfo k="États de besoins" v={fmtNum(selection.besoins)} />
            </Section>

            {detailActes.length > 0 && (
              <Section titre="Dossiers les plus anciens">
                <div className="space-y-1">
                  {detailActes.map((a) => (
                    <Link
                      key={a.id} href={`/dgarh/actes/${a.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-semibold">{a.reference}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{a.objet}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={cn("text-[11px] tabular-nums", joursDepuis(a.dateCreation) > 15 && "font-semibold text-amber-600")}>
                          {joursDepuis(a.dateCreation)} j
                        </span>
                        <BadgeStatutActe v={a.statut} />
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>

      {gestion.dialogues}
    </>
  );
}
