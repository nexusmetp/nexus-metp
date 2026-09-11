"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Trash2 } from "lucide-react";
import { useArticlesArchives, useEliminerArticles } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  PLAN_CLASSEMENT, SORT_FINAL_LABELS, duaEchue, peut, peutEliminer, serieParCode,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { ChampTexte, DialogueFormulaire, Section } from "@/components/nexus/module";
import { DocumentsLies } from "@/components/nexus/documents-lies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ArticleArchive } from "@/lib/types";

/**
 * Sort final : ce qui arrive aux dossiers dont la durée d'utilité est échue.
 *
 * Trois issues, et une seule irréversible. L'écran sépare donc nettement ce
 * qui se conserve, ce qui se trie et ce qui s'élimine — et n'autorise
 * l'élimination que contre un visa nommé, jamais d'un simple clic.
 */
export function SortFinalArchives() {
  const user = useAuth((s) => s.user)!;
  const { data: articles = [] } = useArticlesArchives();
  const eliminer = useEliminerArticles();
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [visa, setVisa] = useState<string | null>(null);
  // Deux droits distincts : verser se rattrape, éliminer non.
  const archiviste = peut(user.role, "archives", "W");
  const habiliteAEliminer = archiviste && peutEliminer(user.role);

  const echus = useMemo(
    () => articles.filter((a) => a.statut !== "ELIMINE" && duaEchue(a.echeanceDua)),
    [articles]
  );
  const parSort = useMemo(() => ({
    ELIMINATION: echus.filter((a) => a.sortFinal === "ELIMINATION"),
    TRI: echus.filter((a) => a.sortFinal === "TRI"),
    CONSERVATION: echus.filter((a) => a.sortFinal === "CONSERVATION"),
  }), [echus]);

  const eliminables = parSort.ELIMINATION;
  const selection = eliminables.filter((a) => coches.has(a.id));

  const basculer = (id: string) =>
    setCoches((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const proceder = async () => {
    if (!visa?.trim() || !selection.length) return;
    await eliminer.mutateAsync({ articles: selection, utilisateur: user, visa: visa.trim() });
    toast.success(`${selection.length} article(s) éliminés`, {
      description: "La fiche de chaque article est conservée avec la mention du visa.",
    });
    setCoches(new Set());
    setVisa(null);
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["CONSERVATION", "TRI", "ELIMINATION"] as const).map((s) => (
          <Card key={s} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{SORT_FINAL_LABELS[s]}</span>
              <span className="text-2xl font-bold tabular-nums">{fmtNum(parSort[s].length)}</span>
            </div>
            <div className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {s === "CONSERVATION" && "à verser aux archives historiques, jamais détruits"}
              {s === "TRI" && "à examiner pièce à pièce avant décision"}
              {s === "ELIMINATION" && "destructibles, sur bordereau visé uniquement"}
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="flex flex-row items-start gap-3 pb-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <CardTitle className="text-base">L'élimination ne se rattrape pas</CardTitle>
            <CardDescription>
              Aucune destruction d'archives publiques ne peut intervenir sans un bordereau visé par
              le responsable du contrôle scientifique et technique. Le visa est saisi ici et reporté
              au journal : c'est lui, et non le clic, qui engage la responsabilité.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Articles éliminables</CardTitle>
              <CardDescription>
                Durée d'utilité échue et sort final « élimination » d'après le plan de classement.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DocumentsLies
                source="archives"
                libelle="Bordereau d'élimination"
                contexte={{ articlesArchives: selection.length ? selection : eliminables, signataire: { nom: user.nomComplet } }}
              />
              {habiliteAEliminer && (
                <Button
                  size="sm" variant="destructive"
                  disabled={!selection.length}
                  onClick={() => setVisa("")}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Éliminer {selection.length ? `(${selection.length})` : ""}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Cote</TableHead>
                  <TableHead className="hidden md:table-cell">Intitulé</TableHead>
                  <TableHead className="hidden lg:table-cell">Série</TableHead>
                  <TableHead className="text-right">DUA échue le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eliminables.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => habiliteAEliminer && basculer(a.id)}>
                    <TableCell>
                      <Checkbox checked={coches.has(a.id)} disabled={!habiliteAEliminer} />
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{a.cote}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{a.intitule}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary" className="text-[10px]">{a.serieCode}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {fmtDate(a.echeanceDua)}
                    </TableCell>
                  </TableRow>
                ))}
                {!eliminables.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Aucun article n'a atteint son échéance avec un sort final « élimination ».
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {archiviste && !habiliteAEliminer && (
        <p className="rounded-lg border border-dashed p-3 text-[11px] leading-relaxed text-muted-foreground">
          Vous pouvez préparer un versement et consulter le fonds, mais pas éliminer :
          la destruction relève du service des archives lui-même. Le bordereau ci-dessus
          reste éditable pour la lui transmettre.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan de classement</CardTitle>
          <CardDescription>
            Il fixe la durée et le sort par nature de dossier, une fois pour toutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Série</TableHead>
                  <TableHead>Intitulé</TableHead>
                  <TableHead className="text-right">DUA</TableHead>
                  <TableHead className="hidden md:table-cell">Sort final</TableHead>
                  <TableHead className="hidden lg:table-cell">Communicabilité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLAN_CLASSEMENT.map((s) => (
                  <TableRow key={s.code}>
                    <TableCell className="font-mono text-[11px]">{s.code}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{s.intitule}</div>
                      <div className="text-[11px] leading-snug text-muted-foreground">{s.justification}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{s.dua} ans</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{SORT_FINAL_LABELS[s.sortFinal]}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {s.communicabilite === "IMMEDIATE" ? "Immédiate" : s.communicabilite.replace("_", " ").toLowerCase()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DialogueFormulaire
        ouvert={visa !== null}
        surFermeture={() => setVisa(null)}
        titre={`Éliminer ${selection.length} article(s)`}
        description="La destruction est définitive. Le visa saisi ici est reporté au journal d'audit, article par article."
        surValidation={proceder}
        validationPossible={!!visa?.trim() && visa.trim().length > 5}
        libelleValidation="Éliminer définitivement"
      >
        <ChampTexte
          label="Visa du responsable du contrôle scientifique et technique"
          obligatoire
          valeur={visa ?? ""}
          surChangement={setVisa}
          placeholder="Bordereau n° BE-2026-014 visé le 10 septembre 2026"
          aide="Portez la référence du bordereau visé, pas votre nom : c'est le bordereau qui autorise."
        />
        <Section titre="Ce qui sera détruit">
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {selection.map((a) => (
              <div key={a.id} className="font-mono text-[11px] text-muted-foreground">{a.cote}</div>
            ))}
          </div>
        </Section>
        <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
          La fiche de chaque article est conservée avec la mention « éliminé » : on doit pouvoir
          prouver plus tard ce qui a été détruit, quand et sur quel visa. Un fonds où la destruction
          efface aussi la trace de la destruction n'est plus auditable.
        </p>
      </DialogueFormulaire>
    </>
  );
}
