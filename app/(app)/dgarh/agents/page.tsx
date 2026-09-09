"use client";

import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { useAgentsProjetes } from "@/lib/queries";
import {
  CATEGORIES, ENTITES, POSITION_LABELS, REGLES_CATEGORIE, cheminDe, descendantsDe, entiteById, gradeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import {
  BadgeCategorie, BadgePosition, BadgeStatutaire, PageHeader,
} from "@/components/nexus/ui-kit";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const PAR_PAGE = 25;

/** Entités susceptibles de porter des agents, pour le filtre. */
const ENTITES_FILTRABLES = ENTITES.filter((e) =>
  ["DIRECTION_GENERALE", "DIRECTION", "SERVICE", "BUREAU", "SECRETARIAT", "DIRECTION_DEPARTEMENTALE", "INSPECTION_GENERALE", "INSPECTION_INTERDEPARTEMENTALE"].includes(e.niveau)
);

export default function AgentsPage() {
  const { data: agents, pret } = useAgentsProjetes();
  const [q, setQ] = useState("");
  const [entiteId, setEntiteId] = useState("all");
  const [categorie, setCategorie] = useState("all");
  const [position, setPosition] = useState("all");
  const [page, setPage] = useState(1);

  const perimetre = useMemo(
    () => (entiteId === "all" ? null : new Set(descendantsDe(entiteId).map((e) => e.id))),
    [entiteId]
  );

  const filtres = useMemo(() => {
    const terme = q.trim().toLowerCase();
    return agents.filter((a) => {
      if (perimetre && !(a.entiteId && perimetre.has(a.entiteId))) return false;
      if (categorie !== "all" && a.categorie !== categorie) return false;
      if (position !== "all" && a.nature !== position) return false;
      if (!terme) return true;
      return (
        a.nom.toLowerCase().includes(terme) ||
        a.prenom.toLowerCase().includes(terme) ||
        a.matricule.toLowerCase().includes(terme)
      );
    });
  }, [agents, perimetre, categorie, position, q]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const courante = Math.min(page, pages);
  const visibles = filtres.slice((courante - 1) * PAR_PAGE, courante * PAR_PAGE);

  const reinit = () => { setQ(""); setEntiteId("all"); setCategorie("all"); setPosition("all"); setPage(1); };
  const filtreActif = q || entiteId !== "all" || categorie !== "all" || position !== "all";

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Agents"
        description="Dossiers consultés en lecture. Grade, échelon et affectation résultent des actes et ne se saisissent pas ici (cahier §06)."
      >
        <Badge variant="outline" className="gap-1.5">
          <Users className="h-3 w-3" /> {fmtNum(filtres.length)} sur {fmtNum(agents.length)}
        </Badge>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Nom, prénom ou matricule…"
              className="h-10 pl-9"
            />
          </div>

          <Select value={entiteId} onValueChange={(v) => { setEntiteId(v); setPage(1); }}>
            <SelectTrigger className="h-10 lg:w-[240px]"><SelectValue placeholder="Entité" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Toutes les entités</SelectItem>
              {ENTITES_FILTRABLES.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.sigle} — {e.nom.slice(0, 46)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categorie} onValueChange={(v) => { setCategorie(v); setPage(1); }}>
            <SelectTrigger className="h-10 lg:w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{REGLES_CATEGORIE[c].libelle}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={position} onValueChange={(v) => { setPosition(v); setPage(1); }}>
            <SelectTrigger className="h-10 lg:w-[170px]"><SelectValue placeholder="Position" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes positions</SelectItem>
              {Object.entries(POSITION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtreActif && (
            <Button variant="ghost" size="sm" onClick={reinit} className="shrink-0">
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
                  <TableHead>Agent</TableHead>
                  <TableHead className="hidden md:table-cell">Affectation</TableHead>
                  <TableHead className="hidden xl:table-cell">Grade</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="hidden lg:table-cell">Position</TableHead>
                  <TableHead className="hidden xl:table-cell">Recruté le</TableHead>
                  <TableHead className="text-right">Complétude</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((a) => {
                  const ent = entiteById(a.entiteId);
                  const grade = gradeById(a.gradeId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.prenom} {a.nom}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{a.matricule}</div>
                      </TableCell>
                      <TableCell className="hidden max-w-[220px] md:table-cell">
                        <div className="truncate text-sm" title={ent?.nom}>{ent?.sigle ?? "—"}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{a.fonction ?? "—"}</div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {grade ? (
                          <>
                            <div className="max-w-[180px] truncate text-sm" title={grade.libelle}>{grade.libelle}</div>
                            <div className="text-[11px] tabular-nums text-muted-foreground">
                              échelon {a.echelon} · indice {a.indice}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">sans carrière statutaire</span>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <BadgeCategorie v={a.categorie} />
                        {a.categorieStatutaire && <div><BadgeStatutaire v={a.categorieStatutaire} /></div>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell"><BadgePosition v={a.nature} /></TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {fmtDate(a.dateRecrutement)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="ml-auto w-24">
                          <div className="text-xs tabular-nums">{a.tauxCompletude} %</div>
                          <Progress value={a.tauxCompletude} className="mt-1 h-1.5" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visibles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      Aucun agent ne correspond à ces critères.
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
          <span className="text-xs text-muted-foreground">
            Page {courante} sur {pages} — {fmtNum(filtres.length)} agents
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={courante <= 1} onClick={() => setPage(courante - 1)}>
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={courante >= pages} onClick={() => setPage(courante + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
