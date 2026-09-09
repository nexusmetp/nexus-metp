"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, FileText, FolderOpen, Search, ShieldCheck } from "lucide-react";
import { useActes, useAgents } from "@/lib/queries";
import { entiteById, typeActeById } from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAR_PAGE = 25;

export default function DocumentsPage() {
  const { data: actes = [], isLoading } = useActes();
  const { data: agents = [] } = useAgents();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  // Toute pièce est rattachée à un acte : pas de dépôt en vrac (§14).
  const pieces = useMemo(
    () => actes.flatMap((a) => a.pieces.map((p) => ({ ...p, acte: a }))),
    [actes]
  );

  const filtres = useMemo(() => {
    const t = q.trim().toLowerCase();
    return pieces
      .filter((p) => !t || p.nom.toLowerCase().includes(t) || p.acte.reference.toLowerCase().includes(t))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [pieces, q]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const courante = Math.min(page, pages);
  const visibles = filtres.slice((courante - 1) * PAR_PAGE, courante * PAR_PAGE);
  const categories = useMemo(() => Array.from(new Set(pieces.map((p) => p.categorie))), [pieces]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Archives et GED"
        description="Deux fonds distincts au §14 : les pièces des dossiers d'agents, rattachées à un acte, et la documentation administrative. Aucune pièce n'est déposée en vrac."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard titre="Pièces au dossier" valeur={fmtNum(pieces.length)} sousTitre={`réparties sur ${fmtNum(actes.length)} actes`} icon={FolderOpen} />
        <KpiCard titre="Catégories" valeur={fmtNum(categories.length)} sousTitre={categories.join(" · ")} icon={FileText} />
        <KpiCard titre="Rattachement" valeur="100 %" sousTitre="toute pièce relève d'un acte" icon={ShieldCheck} />
      </div>

      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="flex flex-row items-start gap-3 pb-3">
          <Archive className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <CardTitle className="text-base">Fonds documentaire non constitué</CardTitle>
            <CardDescription>
              Le second fonds du §14 — textes réglementaires numérisés, notes de service, circulaires — reste à
              alimenter. C'est lui qui permet de rattacher un acte au texte qui le fonde.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Nom de pièce ou référence d'acte…" className="h-10 pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Pièce</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="hidden lg:table-cell">Agent</TableHead>
                <TableHead className="hidden md:table-cell">Acte de rattachement</TableHead>
                <TableHead className="hidden xl:table-cell">Date</TableHead>
                <TableHead className="text-right">Taille</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {visibles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.nom}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{p.categorie}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{nomAgent(p.acte.agentId)}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-[11px]">
                      <Link href={`/dgarh/actes/${p.acte.id}`} className="hover:text-primary hover:underline">
                        {p.acte.reference}
                      </Link>
                      <span className="ml-1.5 text-muted-foreground">{typeActeById(p.acte.type)?.libelle}</span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{fmtDate(p.date)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{p.taille}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Page {courante} sur {pages} — {fmtNum(filtres.length)} pièces</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={courante <= 1} onClick={() => setPage(courante - 1)}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={courante >= pages} onClick={() => setPage(courante + 1)}>Suivant</Button>
          </div>
        </div>
      )}
    </>
  );
}
