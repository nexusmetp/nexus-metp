"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Inbox, Clock, UserCheck } from "lucide-react";
import { useActes, useAgents } from "@/lib/queries";
import type { Acte } from "@/lib/types";
import { useAuth } from "@/lib/store";
import { etapeCourante, transitionsPour } from "@/lib/actes";
import {
  STATUTS_EN_COURS, cheminDe, entiteById, typeActeById,
 perimetreVisible, visible,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, KpiCard, PageHeader } from "@/components/nexus/ui-kit";
import { LigneInfo, PanneauDetail, Section } from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * La bannette — l'écran quotidien de l'instructeur.
 *
 * Un dossier tombe dans une bannette pour deux raisons : il a été confié
 * nommément, ou son étape en cours relève d'une entité du périmètre.
 */
export default function BannettePage() {
  const user = useAuth((s) => s.user)!;
  const { data: actes = [], isLoading } = useActes();
  const { data: agents = [] } = useAgents();
  const [selection, setSelection] = useState<Acte | null>(null);

  /* Le droit, pas l'arbre : voir le commentaire de l'écran des réclamations. */
  const perimetre = useMemo(() => perimetreVisible(user), [user]);

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  const { mien, perimetreOuvert, actionnable } = useMemo(() => {
    const ouverts = actes.filter((a) => STATUTS_EN_COURS.includes(a.statut));
    const mien = ouverts.filter((a) => a.assigneA === user.id);
    const perimetreOuvert = ouverts.filter((a) => {
      const etape = a.etapes[etapeCourante(a.statut)];
      return etape && visible(perimetre, etape.entiteId) && a.assigneA !== user.id;
    });
    // Ce sur quoi je peux agir maintenant, séparation instruction/validation comprise.
    const actionnable = ouverts.filter((a) =>
      transitionsPour(a, user).some((t) => !t.blocage)
    );
    return { mien, perimetreOuvert, actionnable };
  }, [actes, user, perimetre]);

  const enRetard = [...mien, ...perimetreOuvert].filter((a) => joursDepuis(a.dateCreation) > 15);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const Bloc = ({ titre, description, lignes, vide }: {
    titre: string; description: string; lignes: typeof actes; vide: string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{titre}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden lg:table-cell">Agent</TableHead>
                <TableHead className="hidden md:table-cell">Étape en cours</TableHead>
                <TableHead>Âge</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes
                .sort((a, b) => a.dateCreation.localeCompare(b.dateCreation))
                .map((a) => {
                  const age = joursDepuis(a.dateCreation);
                  const etape = a.etapes[etapeCourante(a.statut)];
                  return (
                    <TableRow
                      key={a.id}
                      onClick={() => setSelection(a)}
                      className={cn("cursor-pointer", selection?.id === a.id && "bg-primary/5")}
                    >
                      <TableCell className="font-mono text-xs">
                        <Link href={`/dgarh/actes/${a.id}`} className="hover:text-primary hover:underline">{a.reference}</Link>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{typeActeById(a.type)?.libelle}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{nomAgent(a.agentId)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {etape?.libelle ?? "—"}
                        {etape && <span className="ml-1.5 opacity-70">{entiteById(etape.entiteId)?.sigle}</span>}
                      </TableCell>
                      <TableCell className={cn("text-sm tabular-nums", age > 15 && "font-semibold text-amber-600")}>{age} j</TableCell>
                      <TableCell className="text-right"><BadgeStatutActe v={a.statut} /></TableCell>
                    </TableRow>
                  );
                })}
              {lignes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">{vide}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        titre="Ma bannette"
        description={`${user.nomComplet} — ${cheminDe(user.entiteId).map((e) => e.sigle).join(" › ")}. Les dossiers qui vous sont confiés et ceux qui attendent une action de votre périmètre.`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh/actes">Tous les actes</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard ton="bleu" titre="Confiés nommément" valeur={fmtNum(mien.length)} sousTitre="dossiers dont vous êtes l'instructeur" icon={UserCheck} />
        <KpiCard ton="cyan" titre="Dans mon périmètre" valeur={fmtNum(perimetreOuvert.length)} sousTitre="étape en cours dans votre branche" icon={Inbox} />
        <KpiCard ton="emeraude" titre="Actionnables" valeur={fmtNum(actionnable.length)} sousTitre="une transition vous est ouverte" icon={Clock} />
        <KpiCard ton="rose" titre="Au-delà du délai" valeur={fmtNum(enRetard.length)} sousTitre="plus de 15 jours d'ouverture" icon={AlertTriangle} />
      </div>

      <Bloc
        titre="Dossiers qui vous sont confiés"
        description="Vous en êtes l'instructeur : leur avancement vous incombe."
        lignes={mien}
        vide="Aucun dossier ne vous est confié nommément."
      />

      <Bloc
        titre="En attente dans votre périmètre"
        description="L'étape en cours relève d'une entité que vous couvrez."
        lignes={perimetreOuvert}
        vide="Rien n'attend dans votre périmètre."
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.objet ?? ""}
        sousTitre={selection ? `${selection.reference} — ouvert le ${fmtDate(selection.dateCreation)}` : undefined}
        etiquette={selection && (
          <>
            <BadgeStatutActe v={selection.statut} />
            <Badge variant="secondary" className="text-[10px]">{typeActeById(selection.type)?.libelle}</Badge>
            {joursDepuis(selection.dateCreation) > 15 && (
              <Badge variant="destructive" className="text-[10px]">hors délai</Badge>
            )}
          </>
        )}
        actions={selection && (
          <Button size="sm" asChild>
            <Link href={`/dgarh/actes/${selection.id}`}>Instruire ce dossier</Link>
          </Button>
        )}
      >
        {selection && (
          <>
            <Section titre="Dossier">
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.reference}</span>} />
              <LigneInfo k="Agent concerné" v={nomAgent(selection.agentId)} />
              <LigneInfo k="Instruit par" v={entiteById(selection.entiteInstructriceId)?.nom ?? "—"} />
              <LigneInfo k="Ouvert le" v={fmtDate(selection.dateCreation)} />
              <LigneInfo k="Âge" v={`${joursDepuis(selection.dateCreation)} jours`} />
            </Section>

            <Section titre="Ce que vous pouvez faire">
              <div className="space-y-1.5">
                {transitionsPour(selection, user).map((t) => (
                  <div
                    key={t.code}
                    className={cn(
                      "rounded-lg border px-3 py-2",
                      t.blocage ? "border-dashed bg-muted/30" : "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="text-xs font-medium">{t.libelle}</div>
                    {t.blocage && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t.blocage}</p>}
                  </div>
                ))}
                {transitionsPour(selection, user).length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucune action ne vous est ouverte sur ce dossier.</p>
                )}
              </div>
            </Section>

            {selection.etapes?.length > 0 && (
              <Section titre="Circuit">
                <ol className="space-y-1.5">
                  {selection.etapes.map((e) => (
                    <li
                      key={e.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                        e.statut === "TERMINEE" && "bg-muted/40",
                        e.statut === "EN_COURS" && "border-primary/40 bg-primary/5",
                        e.statut === "A_VENIR" && "border-dashed"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{e.libelle}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {entiteById(e.entiteId)?.sigle ?? "—"}{e.utilisateur ? ` — ${e.utilisateur}` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {e.dateSortie ? fmtDate(e.dateSortie) : e.statut === "EN_COURS" ? "en cours" : "à venir"}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>
    </>
  );
}
