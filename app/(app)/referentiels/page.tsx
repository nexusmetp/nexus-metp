"use client";

import {
  CATEGORIES, CIRCUIT_ACTE, CORPS, GRADES, LACUNES, REGLES_CATEGORIE,
  ROLE_LABELS, TEXTES, TYPES_ACTE, corpsById, entiteById,
} from "@/lib/referentiels";
import { BadgeProvenance, BadgeStatutaire, PageHeader } from "@/components/nexus/ui-kit";
import { Jauge, LigneInfo, PanneauDetail, RangeeKpi, Section } from "@/components/nexus/module";
import { fmtNum } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Check, Library, Layers, Minus, ShieldCheck } from "lucide-react";

import { useState } from "react";

const Oui = () => <Check className="h-3.5 w-3.5 text-emerald-500" />;
const Non = () => <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />;

export default function ReferentielsPage() {
  const [grade, setGrade] = useState<(typeof GRADES)[number] | null>(null);
  const corpsDuGrade = grade ? CORPS.find((c) => c.id === grade.corpsId) : undefined;
  const voisins = grade ? GRADES.filter((g) => g.corpsId === grade.corpsId) : [];

  return (
    <>
      <PageHeader
        titre="Référentiels"
        description="Les nomenclatures sur lesquelles tout le reste s'appuie. Ce qui n'est pas établi par un texte est marqué comme tel."
      >
        <BadgeProvenance v="A_VERIFIER" reference={TEXTES.ARR_25567} />
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "indigo", titre: "Corps", valeur: fmtNum(CORPS.length), sousTitre: "familles de métiers", icon: Library },
        { ton: "bleu", titre: "Grades", valeur: fmtNum(GRADES.length), sousTitre: "avec échelons et indices", icon: Layers },
        { ton: "violet", titre: "Types d'acte", valeur: fmtNum(TYPES_ACTE.length), sousTitre: "instruits par le circuit", icon: ShieldCheck },
        { ton: "rose", titre: "Lacunes", valeur: fmtNum(LACUNES.length), sousTitre: "points à confirmer avant mise en service", icon: AlertTriangle },
      ]} />

      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ce qui manque pour figer le référentiel</CardTitle>
          <CardDescription>À obtenir avant toute mise en service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {LACUNES.map((l) => (
            <div key={l.sujet} className="border-l-2 border-amber-500/30 pl-3">
              <div className="text-sm font-medium">{l.sujet}</div>
              <div className="text-xs text-muted-foreground">{l.manque} — {l.ou}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catégories de personnel</CardTitle>
          <CardDescription>
            Chaque catégorie décide quels blocs du dossier existent et quels actes sont possibles (§05)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Nature du lien</TableHead>
                  <TableHead className="text-center">Carrière statutaire</TableHead>
                  <TableHead className="text-center">Titularisation</TableHead>
                  <TableHead className="text-center">Avancement</TableHead>
                  <TableHead className="text-center">Promotion</TableHead>
                  <TableHead className="text-center">Besoin ascendant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORIES.map((c) => {
                  const r = REGLES_CATEGORIE[c];
                  return (
                    <TableRow key={c}>
                      <TableCell className="font-medium">{r.libelle}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.lien}</TableCell>
                      {[r.carriereStatutaire, r.titularisation, r.avancement, r.promotion, r.besoinAscendant].map((v, i) => (
                        <TableCell key={i}><div className="flex justify-center">{v ? <Oui /> : <Non />}</div></TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Corps</CardTitle>
            <CardDescription>{CORPS.length} corps — à confirmer sur les statuts particuliers</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Corps</TableHead><TableHead>Catégorie</TableHead><TableHead className="text-right">Enseignant</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {CORPS.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{c.libelle}</TableCell>
                      <TableCell><BadgeStatutaire v={c.categorie} /></TableCell>
                      <TableCell className="text-right"><div className="flex justify-end">{c.enseignant ? <Oui /> : <Non />}</div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Circuit d'instruction</CardTitle>
            <CardDescription>Six étapes, délai cible 15 jours (§09)</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {CIRCUIT_ACTE.map((s) => (
                <li key={s.ordre} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums">{s.ordre}</span>
                  <div>
                    <div className="text-sm font-medium">{s.libelle}</div>
                    <div className="text-xs text-muted-foreground">{entiteById(s.entiteId)?.nom}</div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grades et grille indiciaire</CardTitle>
          <CardDescription>{GRADES.length} grades</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Grade</TableHead><TableHead className="hidden md:table-cell">Corps</TableHead>
                <TableHead className="text-center">Classes</TableHead><TableHead className="text-center">Échelons</TableHead>
                <TableHead className="text-right">Indices</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {GRADES.map((g) => (
                  <TableRow key={g.id} onClick={() => setGrade(g)} className="cursor-pointer">
                    <TableCell className="text-sm font-medium">{g.libelle}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{corpsById(g.corpsId)?.libelle}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{g.classes}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{g.echelons}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{g.indiceDebut} – {g.indiceFin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Types d'actes</CardTitle>
          <CardDescription>Effet sur le dossier et bureau instructeur (§08)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Type</TableHead><TableHead>Effet sur le dossier</TableHead><TableHead className="text-right">Bureau instructeur</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {TYPES_ACTE.map((t) => (
                  <TableRow key={t.type}>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{t.libelle}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.effet}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{entiteById(t.bureauId)?.sigle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <PanneauDetail
        ouvert={!!grade}
        surFermeture={() => setGrade(null)}
        titre={grade?.libelle ?? ""}
        sousTitre={corpsDuGrade ? `${corpsDuGrade.libelle} — catégorie ${corpsDuGrade.categorie}` : undefined}
        etiquette={grade && corpsDuGrade && (
          <>
            <BadgeStatutaire v={corpsDuGrade.categorie} />
            <Badge variant="secondary" className="text-[10px]">
              {corpsDuGrade.enseignant ? "corps enseignant" : "corps administratif"}
            </Badge>
          </>
        )}
      >
        {grade && (
          <>
            <Section titre="Grille">
              <LigneInfo k="Corps" v={corpsDuGrade?.libelle ?? "—"} />
              <LigneInfo k="Catégorie statutaire" v={corpsDuGrade?.categorie ?? "—"} />
              <LigneInfo k="Échelons" v={grade.echelons} />
              <LigneInfo k="Indice de début" v={grade.indiceDebut} />
              <LigneInfo k="Indice terminal" v={grade.indiceFin} />
              <LigneInfo k="Amplitude" v={`${grade.indiceFin - grade.indiceDebut} points`} />
            </Section>

            <Section titre="Progression indiciaire">
              <div className="space-y-1.5">
                {Array.from({ length: Math.min(grade.echelons, 12) }, (_, i) => {
                  const ech = i + 1;
                  const indice = Math.round(
                    grade.indiceDebut + ((grade.indiceFin - grade.indiceDebut) * i) / Math.max(1, grade.echelons - 1)
                  );
                  const part = ((indice - grade.indiceDebut) / Math.max(1, grade.indiceFin - grade.indiceDebut)) * 100;
                  return (
                    <div key={ech}>
                      <div className="mb-1 flex items-baseline justify-between text-[11px]">
                        <span className="text-muted-foreground">Échelon {ech}</span>
                        <span className="font-semibold tabular-nums">indice {indice}</span>
                      </div>
                      <Jauge valeur={part} />
                    </div>
                  );
                })}
                {grade.echelons > 12 && (
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    … et {grade.echelons - 12} échelons au-delà.
                  </p>
                )}
              </div>
            </Section>

            {voisins.length > 1 && (
              <Section titre={`Autres grades du corps — ${voisins.length - 1}`}>
                <div className="space-y-1">
                  {voisins.filter((g) => g.id !== grade.id).map((g) => (
                    <button
                      key={g.id} onClick={() => setGrade(g)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="truncate text-xs font-medium">{g.libelle}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {g.indiceDebut} → {g.indiceFin}
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section titre="Portée">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Le grade ne se saisit pas dans un dossier : il résulte d'un acte de recrutement, de
                titularisation, d'avancement ou de promotion. La grille dit ce qu'il vaut ; l'acte dit
                qui le détient et depuis quand.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>
    </>
  );
}