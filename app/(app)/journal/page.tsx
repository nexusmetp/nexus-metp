"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ScrollText, ShieldCheck } from "lucide-react";
import { useJournal } from "@/lib/queries";
import { fmtNum } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { EntreeJournal } from "@/lib/types";

const ACTIONS: EntreeJournal["action"][] =
  ["CREATION", "MODIFICATION", "CONSULTATION", "VALIDATION", "SIGNATURE", "REJET"];

const COULEUR: Record<EntreeJournal["action"], string> = {
  CREATION: "bg-sky-500/12 text-sky-600 border-sky-500/25",
  MODIFICATION: "bg-slate-500/12 text-slate-500 border-slate-500/25",
  CONSULTATION: "bg-violet-500/12 text-violet-600 border-violet-500/25",
  VALIDATION: "bg-indigo-500/12 text-indigo-600 border-indigo-500/25",
  SIGNATURE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  REJET: "bg-rose-500/12 text-rose-600 border-rose-500/25",
};

const PAR_PAGE = 30;

export default function JournalPage() {
  const { data: journal = [], isLoading } = useJournal();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);

  const filtres = useMemo(() => {
    const t = q.trim().toLowerCase();
    return journal
      .filter((j) => (action === "all" || j.action === action))
      .filter((j) => !t || j.utilisateur.toLowerCase().includes(t) || j.cibleId.toLowerCase().includes(t))
      .sort((a, b) => b.horodatage.localeCompare(a.horodatage));
  }, [journal, q, action]);

  const sansActe = useMemo(() => journal.filter((j) => !j.acteId).length, [journal]);
  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const courante = Math.min(page, pages);
  const visibles = filtres.slice((courante - 1) * PAR_PAGE, courante * PAR_PAGE);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Journal d'audit"
        description="Écriture en ajout seul : aucune entrée ne peut être modifiée ni supprimée, y compris par l'administrateur. Une correction est une nouvelle entrée (§12)."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard titre="Écritures" valeur={fmtNum(journal.length)} sousTitre="depuis le semis de la base" icon={ScrollText} />
        <KpiCard titre="Rattachées à un acte" valeur={fmtNum(journal.length - sansActe)} sousTitre="traçabilité complète" icon={ShieldCheck} />
        <KpiCard
          titre="Sans acte de référence"
          valeur={fmtNum(sansActe)}
          sousTitre={sansActe ? "à signaler comme anomalie" : "aucune anomalie"}
          icon={ShieldCheck}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Utilisateur ou identifiant de cible…" className="h-10 pl-9" />
          </div>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="h-10 lg:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Écritures</CardTitle>
          <CardDescription>Horodatage, auteur, valeur avant et après, acte de rattachement</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horodatage</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead className="hidden lg:table-cell">Cible</TableHead>
                  <TableHead className="hidden xl:table-cell">Avant → après</TableHead>
                  <TableHead className="hidden md:table-cell">Origine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="whitespace-nowrap font-mono text-[11px] tabular-nums">
                      {j.horodatage.slice(0, 16).replace("T", " ")}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${COULEUR[j.action]}`}>{j.action}</Badge></TableCell>
                    <TableCell className="text-sm">{j.utilisateur}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-[11px]">
                      {j.acteId ? (
                        <Link href={`/dgarh/actes/${j.acteId}`} className="hover:text-primary hover:underline">{j.cibleId}</Link>
                      ) : j.cibleId}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                      {j.ancienneValeur ? `${j.ancienneValeur} → ${j.nouvelleValeur}` : j.justification ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-[11px] text-muted-foreground">{j.adresseIp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Page {courante} sur {pages} — {fmtNum(filtres.length)} écritures</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={courante <= 1} onClick={() => setPage(courante - 1)}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={courante >= pages} onClick={() => setPage(courante + 1)}>Suivant</Button>
          </div>
        </div>
      )}
    </>
  );
}
