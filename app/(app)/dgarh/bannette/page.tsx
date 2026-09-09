"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Inbox, Clock, UserCheck } from "lucide-react";
import { useActes, useAgents } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { etapeCourante, transitionsPour } from "@/lib/actes";
import {
  STATUTS_EN_COURS, cheminDe, descendantsDe, entiteById, typeActeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, KpiCard, PageHeader } from "@/components/nexus/ui-kit";
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

  const perimetre = useMemo(() => new Set(descendantsDe(user.entiteId).map((e) => e.id)), [user.entiteId]);

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  const { mien, perimetreOuvert, actionnable } = useMemo(() => {
    const ouverts = actes.filter((a) => STATUTS_EN_COURS.includes(a.statut));
    const mien = ouverts.filter((a) => a.assigneA === user.id);
    const perimetreOuvert = ouverts.filter((a) => {
      const etape = a.etapes[etapeCourante(a.statut)];
      return etape && perimetre.has(etape.entiteId) && a.assigneA !== user.id;
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
                    <TableRow key={a.id}>
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
        <KpiCard titre="Confiés nommément" valeur={fmtNum(mien.length)} sousTitre="dossiers dont vous êtes l'instructeur" icon={UserCheck} />
        <KpiCard titre="Dans mon périmètre" valeur={fmtNum(perimetreOuvert.length)} sousTitre="étape en cours dans votre branche" icon={Inbox} />
        <KpiCard titre="Actionnables" valeur={fmtNum(actionnable.length)} sousTitre="une transition vous est ouverte" icon={Clock} />
        <KpiCard titre="Au-delà du délai" valeur={fmtNum(enRetard.length)} sousTitre="plus de 15 jours d'ouverture" icon={AlertTriangle} />
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
    </>
  );
}
