"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useActes, useAgents } from "@/lib/queries";
import { STATUTS_EN_COURS, STATUT_ACTE_LABELS, entiteById, typeActeById } from "@/lib/referentiels";
import { fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, PageHeader } from "@/components/nexus/ui-kit";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TypeActe } from "@/lib/types";

const PAR_PAGE = 20;

/**
 * Vue d'actes filtrée par type. Les modules Carrières, Congés, Formation et
 * Contentieux sont la même lecture sur des types différents : un seul écran,
 * paramétré, plutôt que quatre copies qui divergeront.
 */
export function ListeActes({
  titre, description, types, actions,
}: {
  titre: string; description: string; types: TypeActe[]; actions?: React.ReactNode;
}) {
  const { data: actes = [], isLoading } = useActes();
  const { data: agents = [] } = useAgents();
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("all");
  const [page, setPage] = useState(1);

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  const filtres = useMemo(() => {
    const t = q.trim().toLowerCase();
    return actes
      .filter((a) => types.includes(a.type))
      .filter((a) => {
        if (statut === "en_cours" && !STATUTS_EN_COURS.includes(a.statut)) return false;
        if (statut !== "en_cours" && statut !== "all" && a.statut !== statut) return false;
        if (!t) return true;
        return a.reference.toLowerCase().includes(t) || a.objet.toLowerCase().includes(t);
      })
      .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation));
  }, [actes, types, q, statut]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const courante = Math.min(page, pages);
  const visibles = filtres.slice((courante - 1) * PAR_PAGE, courante * PAR_PAGE);
  const enCirculation = filtres.filter((a) => STATUTS_EN_COURS.includes(a.statut)).length;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader titre={titre} description={description}>
        <Badge variant="outline">{fmtNum(filtres.length)} dossiers</Badge>
        <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
          {fmtNum(enCirculation)} en circulation
        </Badge>
        {actions}
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Référence ou objet…" className="h-10 pl-9" />
          </div>
          <Select value={statut} onValueChange={(v) => { setStatut(v); setPage(1); }}>
            <SelectTrigger className="h-10 lg:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_cours">En circulation</SelectItem>
              {Object.entries(STATUT_ACTE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(q || statut !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStatut("all"); setPage(1); }}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Agent</TableHead>
                  <TableHead className="hidden xl:table-cell">Bureau</TableHead>
                  <TableHead className="hidden md:table-cell">Créé le</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((a) => {
                  const age = joursDepuis(a.dateCreation);
                  const ouvert = STATUTS_EN_COURS.includes(a.statut);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/dgarh/actes/${a.id}`} className="hover:text-primary hover:underline">{a.reference}</Link>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{typeActeById(a.type)?.libelle}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{nomAgent(a.agentId)}</TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {entiteById(a.entiteInstructriceId)?.sigle}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{fmtDate(a.dateCreation)}</TableCell>
                      <TableCell className={cn("text-sm tabular-nums", ouvert && age > 15 && "font-semibold text-amber-600")}>
                        {ouvert ? `${age} j` : "—"}
                      </TableCell>
                      <TableCell className="text-right"><BadgeStatutActe v={a.statut} /></TableCell>
                    </TableRow>
                  );
                })}
                {visibles.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    Aucun dossier de ce type.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Page {courante} sur {pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={courante <= 1} onClick={() => setPage(courante - 1)}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={courante >= pages} onClick={() => setPage(courante + 1)}>Suivant</Button>
          </div>
        </div>
      )}
    </>
  );
}
