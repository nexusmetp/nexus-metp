"use client";

import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CalendarClock, Clock, UserCheck, UserX } from "lucide-react";
import { useAgentsProjetes, useEntites, useParametres, usePointages } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, HEURE_OUVERTURE_NON_RENSEIGNEE, SEUIL_ABSENCE_PROLONGEE,
  descendantsDe, peut,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtNum, fmtPct } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi } from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AUJOURDHUI, journeeDe, resumerJournee, serie, tauxDePointage } from "./calculs";
import { Journee } from "./journee";
import { AVerifier, Historique } from "./suivi";

/* ------------------------------------------------------------------ */
/* Présences et pointages — le fait constaté, jour par jour            */
/*                                                                     */
/* Ce module ne dit pas le droit : il dit ce qui a été constaté. La     */
/* position statutaire d'un agent vit dans /conges et se projette       */
/* depuis les actes ; ici on tient un cahier, et un cahier porte le     */
/* nom de celui qui l'a rempli.                                        */
/* ------------------------------------------------------------------ */

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

export default function PresencesPage() {
  const user = useAuth((s) => s.user)!;
  const redacteur = peut(user.role, "presences", "W");
  const { data: agents, pret } = useAgentsProjetes();
  const { data: pointages = [], isLoading } = usePointages();
  const { data: entitesDb = [] } = useEntites();
  const { data: parametres } = useParametres();

  const [date, setDate] = useState(AUJOURDHUI);
  const [entite, setEntite] = useState("all");

  const seuil = parametres?.seuilAbsenceProlongee ?? SEUIL_ABSENCE_PROLONGEE.jours;
  const heureOuverture = parametres?.heureOuverture;

  /* Le périmètre : une direction et tout ce qu'elle contient. C'est la même
     dérivation que partout ailleurs — un périmètre ne se saisit pas, il se
     déduit de l'arborescence. */
  const perimetre = useMemo(
    () => (entite === "all" ? null : new Set(descendantsDe(entite).map((e) => e.id))),
    [entite, entitesDb]
  );

  const agentsVus = useMemo(
    () => (perimetre ? agents.filter((a) => a.entiteId && perimetre.has(a.entiteId)) : agents),
    [agents, perimetre]
  );

  const resume = useMemo(
    () => resumerJournee(journeeDe(agentsVus, pointages, date)),
    [agentsVus, pointages, date]
  );

  const courbe = useMemo(() => serie(pointages, agentsVus), [pointages, agentsVus]);

  if (!pret || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Présences et pointages"
        description={
          "Qui a servi aujourd'hui, qui était absent, qui est arrivé en retard, et dans quel service. "
          + "Le pointage est un fait constaté : il ne remplace pas la position statutaire, qui, elle, "
          + "naît d'un acte."
        }
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Journée</Label>
            <Input
              id="presences-date" type="date" value={date}
              onChange={(e) => setDate(e.target.value || AUJOURDHUI)}
              className="h-9 w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Périmètre</Label>
            <Select value={entite} onValueChange={setEntite}>
              <SelectTrigger className="h-9 w-[230px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Tout le ministère</SelectItem>
                {ENTITES
                  .filter((e) => ["DIRECTION_GENERALE", "DIRECTION", "CABINET", "INSPECTION_GENERALE", "DIRECTION_DEPARTEMENTALE", "SERVICE"].includes(e.niveau))
                  .slice(0, 70)
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.sigle} — {e.nom.slice(0, 38)}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PageHeader>

      <RangeeKpi tuiles={[
        {
          ton: "emeraude", titre: "Ont servi", valeur: fmtNum(resume.servis), icon: UserCheck,
          sousTitre: `${fmtPct(tauxDePointage(resume))} de l'effectif pointé ce jour`,
        },
        {
          ton: "rose", titre: "Absences non couvertes", valeur: fmtNum(resume.nus), icon: UserX,
          sousTitre: "aucune pièce au dossier pour ce jour",
        },
        {
          ton: "ambre", titre: "Retards", valeur: fmtNum(resume.retards), icon: Clock,
          sousTitre: heureOuverture ? `ouverture à ${heureOuverture}` : HEURE_OUVERTURE_NON_RENSEIGNEE,
        },
        {
          ton: "cyan", titre: "Absences couvertes", valeur: fmtNum(resume.couverts), icon: CalendarClock,
          sousTitre: "congé, mission, sortie ou pièce justificative",
        },
      ]} />

      {resume.nonPointes > 0 && (
        <Card className="border-slate-500/30 bg-muted/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {fmtNum(resume.nonPointes)} agents ne sont pas pointés le {date}
            </CardTitle>
            <CardDescription className="text-xs">
              Ils ne sont pas comptés comme absents, et ils ne le seront pas : un cahier non rempli ne
              prouve rien sur les agents, il dit seulement que le service ne l'a pas tenu ce jour-là.
              Le déploiement du pointage est partiel — {fmtPct(tauxDePointage(resume))} de l'effectif
              de ce périmètre.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="journee" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journee">La journée</TabsTrigger>
          <TabsTrigger value="tendance">Vingt jours</TabsTrigger>
          <TabsTrigger value="verifier">À contrôler</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="journee">
          <Journee
            agents={agentsVus}
            pointages={pointages}
            date={date}
            utilisateur={user}
            redacteur={redacteur}
            heureOuverture={heureOuverture}
          />
        </TabsContent>

        <TabsContent value="tendance">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Les vingt derniers jours ouvrés</CardTitle>
              <CardDescription>
                Ce qui se dégrade se voit ici avant de se voir ailleurs. Les jours non pointés
                n'apparaissent pas : la barre d'un jour où le cahier n'a pas été tenu est basse
                parce que rien n'a été constaté, non parce que le service était vide.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[340px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courbe} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip {...infobulle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="servis" stackId="j" name="Ont servi" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="couverts" stackId="j" name="Absences couvertes" fill={CHART_COLORS[3]} />
                  <Bar dataKey="nus" stackId="j" name="Non couvertes" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifier">
          <AVerifier agents={agentsVus} pointages={pointages} seuil={seuil} />
        </TabsContent>

        <TabsContent value="historique">
          <Historique agents={agentsVus} pointages={pointages} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
