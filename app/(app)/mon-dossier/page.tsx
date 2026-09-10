"use client";

import { useMemo } from "react";
import { CalendarDays, FileText, GraduationCap, Landmark, ShieldCheck, TrendingUp, User } from "lucide-react";
import { useAgents, useHistorique } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { projeter, ligneDeVie } from "@/lib/carriere";
import {
  POSITION_LABELS, REGLES_CATEGORIE, cheminDe, entiteById, gradeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import {
  BadgeCategorie, BadgePosition, BadgeStatutaire, GardeModule, PageHeader,
} from "@/components/nexus/ui-kit";
import { RangeeKpi } from "@/components/nexus/module";
import { Portrait } from "@/components/nexus/portrait";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

function Ligne({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium">{v ?? "—"}</span>
    </div>
  );
}

export default function MonDossierPage() {
  const user = useAuth((s) => s.user)!;
  const { data: agents = [], isLoading } = useAgents();
  const { data: historique, pret } = useHistorique();

  const agent = useMemo(
    () => agents.find((a) => a.id === user.agentId),
    [agents, user.agentId]
  );

  const projete = useMemo(
    () => (agent ? projeter(agent, historique) : undefined),
    [agent, historique]
  );

  const evenements = useMemo(
    () => (agent ? ligneDeVie(agent.id, historique) : []),
    [agent, historique]
  );

  if (isLoading || !pret) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <GardeModule module="mon-dossier" role={user.role}>
      {!agent || !projete ? (
        <>
          <PageHeader titre="Mon dossier" />
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Aucun dossier d'agent n'est rattaché à votre compte.
              <br />Contactez le bureau du personnel de la direction générale.
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <PageHeader
            titre={`${projete.prenom} ${projete.nom}`}
            description={`Matricule ${projete.matricule} — ${cheminDe(projete.entiteId ?? "").map((e) => e.sigle).join(" › ")}`}
          >
            <BadgeCategorie v={projete.categorie} />
            <BadgePosition v={projete.nature} />
          </PageHeader>

          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
            <Portrait photo={projete.photo} prenom={projete.prenom} nom={projete.nom}
                      cle={projete.matricule} taille="xl" carre />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">{projete.prenom} {projete.nom}</div>
              <div className="font-mono text-xs text-muted-foreground">{projete.matricule}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{projete.fonction ?? "—"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {entiteById(projete.entiteId)?.nom ?? "sans affectation"}
              </div>
            </div>
          </div>

          <RangeeKpi tuiles={[
            { titre: "Ancienneté", valeur: `${projete.anciennete} ans`, sousTitre: `recruté le ${fmtDate(projete.dateRecrutement)}`, icon: TrendingUp },
            { titre: "Échelon", valeur: projete.echelon ?? "—", sousTitre: projete.indice ? `indice ${projete.indice}` : "hors carrière statutaire", icon: Landmark },
            { titre: "Dossier complet", valeur: fmtPct(projete.tauxCompletude), sousTitre: "pièces attendues présentes", icon: ShieldCheck },
            { titre: "Événements de carrière", valeur: fmtNum(evenements.length), sousTitre: "chacun porté par un acte", icon: CalendarDays },
          ]} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Complétude du dossier</CardTitle>
              <CardDescription>
                Blocs attendus pour un {REGLES_CATEGORIE[projete.categorie].libelle.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={projete.tauxCompletude} className="h-2 flex-1" />
                <span className="text-lg font-bold tabular-nums">{projete.tauxCompletude} %</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" /> Identité</CardTitle>
              </CardHeader>
              <CardContent>
                <Ligne k="Né(e) le" v={`${fmtDate(projete.dateNaissance)} à ${projete.lieuNaissance}`} />
                <Ligne k="Âge" v={`${projete.age} ans`} />
                <Ligne k="Nationalité" v={projete.nationalite} />
                <Ligne k="Situation familiale" v={projete.situationFamiliale} />
                <Ligne k="Enfants" v={projete.enfants} />
                <Ligne k="Téléphone" v={projete.telephone} />
                <Ligne k="Adresse" v={projete.adresse} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4 text-primary" /> Carrière</CardTitle>
                <CardDescription>Résulte des actes — non modifiable ici (cahier §06)</CardDescription>
              </CardHeader>
              <CardContent>
                <Ligne k="Grade" v={gradeById(projete.gradeId)?.libelle} />
                <Ligne k="Classe / échelon" v={projete.situation ? `${projete.situation.classe} / ${projete.echelon}` : undefined} />
                <Ligne k="Indice" v={projete.indice} />
                <Ligne k="Catégorie statutaire" v={projete.categorieStatutaire ? <BadgeStatutaire v={projete.categorieStatutaire} /> : undefined} />
                <Ligne k="Recruté(e) le" v={fmtDate(projete.dateRecrutement)} />
                <Ligne k="Prise de service" v={fmtDate(projete.datePriseService)} />
                <Ligne k="Titularisation" v={fmtDate(projete.dateTitularisation)} />
                <Ligne k="Ancienneté" v={`${projete.anciennete} ans`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4 text-primary" /> Formation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projete.diplomes.map((d, i) => (
                  <div key={i} className="border-l-2 border-primary/25 pl-3">
                    <div className="text-sm font-medium">{d.intitule}</div>
                    <div className="text-xs text-muted-foreground">{d.etablissement} · {d.annee}</div>
                  </div>
                ))}
                <div className="pt-1">
                  <div className="text-xs text-muted-foreground">Compétences</div>
                  <div className="mt-1 text-sm">{projete.competences.join(" · ")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Langues</div>
                  <div className="mt-1 text-sm">{projete.langues.join(" · ")}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" /> Ligne de vie</CardTitle>
                <CardDescription>Chaque événement porte l'acte qui l'a produit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 border-l-2 border-primary/20 pl-4">
                  {evenements.map((e, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div className="text-sm font-medium">{e.libelle}</div>
                      {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80">
                        {fmtDate(e.date)}
                        <span className="inline-flex items-center gap-1 font-mono">
                          <FileText className="h-2.5 w-2.5" />{e.acteId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </GardeModule>
  );
}
