"use client";

import { Fragment, useMemo, useState } from "react";
import { FileCheck2, Search, X } from "lucide-react";
import { useActes, useAgents } from "@/lib/queries";
import {
  STATUTS_EN_COURS, STATUT_ACTE_LABELS, TYPES_ACTE, entiteById, typeActeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, PageHeader  } from "@/components/nexus/ui-kit";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Acte } from "@/lib/types";

const PAR_PAGE = 20;

function Circuit({ acte }: { acte: Acte }) {
  return (
    <div className="space-y-2 border-l-2 border-primary/20 py-1 pl-4">
      {acte.etapes.map((e) => (
        <div key={e.id} className="flex items-start gap-3 text-xs">
          <span
            className={cn(
              "mt-1 h-2 w-2 shrink-0 rounded-full",
              e.statut === "TERMINEE" ? "bg-emerald-500"
                : e.statut === "EN_COURS" ? "bg-primary ring-4 ring-primary/15"
                : "bg-muted-foreground/25"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className={cn("font-medium", e.statut === "A_VENIR" && "text-muted-foreground")}>
                {e.libelle}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {entiteById(e.entiteId)?.sigle}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {e.dateEntree ? fmtDate(e.dateEntree) : "—"}
              {e.utilisateur && ` · ${e.utilisateur}`}
            </div>
            {e.commentaire && (
              <div className="mt-0.5 text-[11px] font-medium text-amber-600">{e.commentaire}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ActesPage() {
  const { data: actes = [], isLoading } = useActes();
  const { data: agents = [] } = useAgents();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [statut, setStatut] = useState("en_cours");
  const [page, setPage] = useState(1);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  const filtres = useMemo(() => {
    const terme = q.trim().toLowerCase();
    return actes
      .filter((a) => {
        if (type !== "all" && a.type !== type) return false;
        if (statut === "en_cours" && !STATUTS_EN_COURS.includes(a.statut)) return false;
        if (statut !== "en_cours" && statut !== "all" && a.statut !== statut) return false;
        if (!terme) return true;
        return a.reference.toLowerCase().includes(terme) || a.objet.toLowerCase().includes(terme);
      })
      .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation));
  }, [actes, q, type, statut]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const courante = Math.min(page, pages);
  const visibles = filtres.slice((courante - 1) * PAR_PAGE, courante * PAR_PAGE);
  const filtreActif = q || type !== "all" || statut !== "en_cours";

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Actes administratifs"
        description="Le pivot du système : rien ne change dans un dossier sans acte signé (cahier §08). Dépliez une ligne pour suivre son circuit d'instruction."
      >
        <Badge variant="outline" className="gap-1.5">
          <FileCheck2 className="h-3 w-3" /> {fmtNum(filtres.length)} acte{filtres.length > 1 ? "s" : ""}
        </Badge>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Référence ou objet…"
              className="h-10 pl-9"
            />
          </div>

          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="h-10 lg:w-[220px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Tous les types</SelectItem>
              {TYPES_ACTE.map((t) => (
                <SelectItem key={t.type} value={t.type}>{t.libelle}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statut} onValueChange={(v) => { setStatut(v); setPage(1); }}>
            <SelectTrigger className="h-10 lg:w-[220px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="en_cours">En circulation</SelectItem>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUT_ACTE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtreActif && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setType("all"); setStatut("en_cours"); setPage(1); }}>
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
                  <TableHead className="hidden xl:table-cell">Bureau instructeur</TableHead>
                  <TableHead className="hidden md:table-cell">Créé le</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((a) => {
                  const age = joursDepuis(a.dateCreation);
                  const enCirculation = STATUTS_EN_COURS.includes(a.statut);
                  const estOuvert = ouvert === a.id;
                  return (
                    <Fragment key={a.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setOuvert(estOuvert ? null : a.id)}
                      >
                        <TableCell className="font-mono text-xs">{a.reference}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {typeActeById(a.type)?.libelle ?? a.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{nomAgent(a.agentId)}</TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {entiteById(a.entiteInstructriceId)?.sigle ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {fmtDate(a.dateCreation)}
                        </TableCell>
                        <TableCell className={cn("text-sm tabular-nums", enCirculation && age > 15 && "font-semibold text-amber-600")}>
                          {enCirculation ? `${age} j` : "—"}
                        </TableCell>
                        <TableCell className="text-right"><BadgeStatutActe v={a.statut} /></TableCell>
                      </TableRow>
                      {estOuvert && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="bg-muted/30 py-4">
                            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Circuit d'instruction
                            </div>
                            <Circuit acte={a} />
                            <div className="mt-4 flex flex-wrap gap-2">
                              {a.pieces.map((p) => (
                                <Badge key={p.id} variant="outline" className="text-[10px] font-normal">
                                  {p.nom} · {p.taille}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {visibles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      Aucun acte ne correspond à ces critères.
                    </TableCell>
                  </TableRow>
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
