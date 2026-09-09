"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, FileText, GitBranch, GraduationCap, Landmark, User } from "lucide-react";
import { useActesDeLAgent, useAgents, useHistorique } from "@/lib/queries";
import { decisionsAVenir, ligneDeVie, projeter } from "@/lib/carriere";
import {
  REGLES_CATEGORIE, cheminDe, entiteById, gradeById, typeActeById,
} from "@/lib/referentiels";
import { fmtDate } from "@/lib/format";
import {
  BadgeCategorie, BadgePosition, BadgeStatutActe, BadgeStatutaire, PageHeader,
} from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function Ligne({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium">{v ?? "—"}</span>
    </div>
  );
}

export default function DossierAgentPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const { data: agents = [], isLoading } = useAgents();
  const { data: historique, pret } = useHistorique();
  const { data: actes } = useActesDeLAgent(id);

  const agent = useMemo(() => agents.find((a) => a.id === id), [agents, id]);
  const a = useMemo(() => (agent ? projeter(agent, historique) : undefined), [agent, historique]);
  const evenements = useMemo(() => (agent ? ligneDeVie(agent.id, historique) : []), [agent, historique]);
  const aVenir = useMemo(() => (agent ? decisionsAVenir(agent.id, historique) : []), [agent, historique]);

  if (isLoading || !pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  if (!a) {
    return (
      <>
        <PageHeader titre="Dossier introuvable" />
        <Button variant="outline" asChild><Link href="/dgarh/agents"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link></Button>
      </>
    );
  }

  const entite = entiteById(a.entiteId);

  return (
    <>
      <PageHeader
        titre={`${a.prenom} ${a.nom}`}
        description={`Matricule ${a.matricule} — ${a.entiteId ? cheminDe(a.entiteId).map((e) => e.sigle).join(" › ") : "sans affectation"}`}
      >
        <BadgeCategorie v={a.categorie} />
        <BadgePosition v={a.nature} />
        <Button size="sm" asChild>
          <Link href="/dgarh/actes/nouveau"><GitBranch className="mr-2 h-3.5 w-3.5" /> Nouvelle mutation</Link>
        </Button>
      </PageHeader>

      {aVenir.length > 0 && (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardHeader className="flex flex-row items-start gap-3 pb-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <CardTitle className="text-base">Décision prise, effet à venir</CardTitle>
              <CardDescription>
                L'acte est notifié mais sa date d'effet n'est pas atteinte : la situation ci-dessous
                reste celle qui s'applique aujourd'hui.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {aVenir.map((d, i) => (
              <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{d.libelle}</span>
                <span className="text-xs text-muted-foreground">à effet du {fmtDate(d.dateEffet)}</span>
                <Link href={`/dgarh/actes/${d.acteId}`} className="ml-auto font-mono text-[11px] hover:text-primary hover:underline">
                  {d.acteId}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Complétude du dossier</CardTitle>
          <CardDescription>
            Blocs attendus pour un {REGLES_CATEGORIE[a.categorie].libelle.toLowerCase()} — {REGLES_CATEGORIE[a.categorie].lien}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Progress value={a.tauxCompletude} className="h-2 flex-1" />
          <span className="text-lg font-bold tabular-nums">{a.tauxCompletude} %</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" /> Identité</CardTitle>
          </CardHeader>
          <CardContent>
            <Ligne k="Né(e) le" v={`${fmtDate(a.dateNaissance)} à ${a.lieuNaissance}`} />
            <Ligne k="Âge" v={`${a.age} ans`} />
            <Ligne k="Sexe" v={a.sexe === "F" ? "Féminin" : "Masculin"} />
            <Ligne k="Nationalité" v={a.nationalite} />
            <Ligne k="Situation familiale" v={a.situationFamiliale} />
            <Ligne k="Enfants" v={a.enfants} />
            <Ligne k="Téléphone" v={a.telephone} />
            <Ligne k="Courriel" v={a.email} />
            <Ligne k="Adresse" v={a.adresse} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4 text-primary" /> Carrière et affectation</CardTitle>
            <CardDescription>Projetée depuis les actes — non modifiable ici (§06)</CardDescription>
          </CardHeader>
          <CardContent>
            <Ligne k="Entité" v={entite?.nom} />
            <Ligne k="Fonction" v={a.fonction} />
            <Ligne k="Grade" v={gradeById(a.gradeId)?.libelle} />
            <Ligne k="Classe / échelon" v={a.situation ? `${a.situation.classe} / ${a.echelon}` : undefined} />
            <Ligne k="Indice" v={a.indice} />
            <Ligne k="Catégorie statutaire" v={a.categorieStatutaire ? <BadgeStatutaire v={a.categorieStatutaire} /> : undefined} />
            <Ligne k="Recruté(e) le" v={fmtDate(a.dateRecrutement)} />
            <Ligne k="Prise de service" v={fmtDate(a.datePriseService)} />
            <Ligne k="Titularisation" v={fmtDate(a.dateTitularisation)} />
            <Ligne k="Ancienneté" v={`${a.anciennete} ans`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4 text-primary" /> Formation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.diplomes.map((d, i) => (
              <div key={i} className="border-l-2 border-primary/25 pl-3">
                <div className="text-sm font-medium">{d.intitule}</div>
                <div className="text-xs text-muted-foreground">{d.etablissement} · {d.annee}</div>
              </div>
            ))}
            <div className="pt-1">
              <div className="text-xs text-muted-foreground">Compétences</div>
              <div className="mt-1 text-sm">{a.competences.join(" · ")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Langues</div>
              <div className="mt-1 text-sm">{a.langues.join(" · ")}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ligne de vie</CardTitle>
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
                    <Link href={`/dgarh/actes/${e.acteId}`} className="inline-flex items-center gap-1 font-mono hover:text-primary hover:underline">
                      <FileText className="h-2.5 w-2.5" />{e.acteId}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dossiers de l'agent</CardTitle>
          <CardDescription>Tous les actes le concernant, du plus récent au plus ancien</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Créé le</TableHead>
                  <TableHead className="hidden lg:table-cell">Signé le</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actes.map((ac) => (
                  <TableRow key={ac.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">
                      <Link href={`/dgarh/actes/${ac.id}`} className="hover:text-primary hover:underline">
                        {ac.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{typeActeById(ac.type)?.libelle}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{fmtDate(ac.dateCreation)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(ac.dateSignature)}</TableCell>
                    <TableCell className="text-right"><BadgeStatutActe v={ac.statut} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
