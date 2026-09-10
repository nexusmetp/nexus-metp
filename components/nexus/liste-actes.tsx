"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileCheck2, Timer, TrendingUp } from "lucide-react";
import { useActes, useAgents } from "@/lib/queries";
import {
  STATUTS_EN_COURS, STATUT_ACTE_LABELS, TYPES_ACTE, cheminDe, entiteById, typeActeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, PageHeader } from "@/components/nexus/ui-kit";
import {
  LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Acte, TypeActe } from "@/lib/types";

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

  const [selection, setSelection] = useState<Acte | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "all", type: "all" });

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  const duPerimetre = useMemo(() => actes.filter((a) => types.includes(a.type)), [actes, types]);

  const lignes = useMemo(() => duPerimetre
    .filter((a) => {
      if (filtres.statut === "en_cours") return STATUTS_EN_COURS.includes(a.statut);
      return filtres.statut === "all" || a.statut === filtres.statut;
    })
    .filter((a) => filtres.type === "all" || a.type === filtres.type)
    .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)),
    [duPerimetre, filtres]);

  const stats = useMemo(() => {
    const ouverts = duPerimetre.filter((a) => STATUTS_EN_COURS.includes(a.statut));
    const clos = duPerimetre.filter((a) => a.dateSignature);
    return {
      total: duPerimetre.length,
      ouverts: ouverts.length,
      retard: ouverts.filter((a) => joursDepuis(a.dateCreation) > 15).length,
      delai: clos.length
        ? Math.round(clos.reduce((s, a) =>
            s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5, 0) / clos.length)
        : 0,
    };
  }, [duPerimetre]);

  const colonnes: Colonne<Acte>[] = [
    {
      cle: "reference", entete: "Référence",
      rendu: (a) => (
        <div className="min-w-0">
          <div className="font-mono text-xs font-semibold">{a.reference}</div>
          <div className="max-w-[320px] truncate text-[11px] text-muted-foreground" title={a.objet}>{a.objet}</div>
        </div>
      ),
    },
    {
      cle: "type", entete: "Type", visible: "md",
      rendu: (a) => <Badge variant="secondary" className="text-[10px]">{typeActeById(a.type)?.libelle ?? a.type}</Badge>,
    },
    { cle: "agent", entete: "Agent", visible: "lg", rendu: (a) => <span className="text-xs">{nomAgent(a.agentId)}</span> },
    {
      cle: "entite", entete: "Instruit par", visible: "xl",
      rendu: (a) => (
        <span className="text-xs text-muted-foreground" title={entiteById(a.entiteInstructriceId)?.nom}>
          {entiteById(a.entiteInstructriceId)?.sigle ?? "—"}
        </span>
      ),
    },
    {
      cle: "age", entete: "Âge", aligne: "droite", visible: "md",
      rendu: (a) => {
        const j = joursDepuis(a.dateCreation);
        const ouvert = STATUTS_EN_COURS.includes(a.statut);
        return <span className={cn("tabular-nums text-sm", ouvert && j > 15 && "font-semibold text-amber-600")}>{j} j</span>;
      },
    },
    { cle: "statut", entete: "Statut", aligne: "droite", rendu: (a) => <BadgeStatutActe v={a.statut} /> },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const typesPresents = types.filter((t) => duPerimetre.some((a) => a.type === t));

  return (
    <>
      <PageHeader titre={titre} description={description}>{actions}</PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Dossiers", valeur: fmtNum(stats.total), sousTitre: "toutes années confondues", icon: FileCheck2 },
        { titre: "En circulation", valeur: fmtNum(stats.ouverts), sousTitre: "pas encore notifiés", icon: TrendingUp },
        { titre: "Au-delà du délai", valeur: fmtNum(stats.retard), sousTitre: "plus de 15 jours d'ouverture", icon: Timer },
        { titre: "Délai moyen", valeur: `${stats.delai} j`, sousTitre: "de l'ouverture à la signature", icon: CheckCircle2 },
      ]} />

      <TableauModule<Acte>
        titre="Dossiers"
        description="Cliquez une ligne pour la prévisualiser sans quitter la liste."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) =>
          a.reference.toLowerCase().includes(t) ||
          a.objet.toLowerCase().includes(t) ||
          nomAgent(a.agentId).toLowerCase().includes(t)}
        placeholderRecherche="Référence, objet ou agent…"
        filtres={[
          {
            cle: "statut", libelle: "Tous les statuts",
            options: [
              { valeur: "en_cours", libelle: "En circulation" },
              ...Object.entries(STATUT_ACTE_LABELS).map(([v, l]) => ({ valeur: v, libelle: l as string })),
            ],
          },
          {
            cle: "type", libelle: "Tous les types",
            options: typesPresents.map((t) => ({ valeur: t, libelle: typeActeById(t)?.libelle ?? t })),
          },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        vide="Aucun dossier de ce type."
        parPage={16}
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
            {STATUTS_EN_COURS.includes(selection.statut) && joursDepuis(selection.dateCreation) > 15 && (
              <Badge variant="destructive" className="text-[10px]">hors délai</Badge>
            )}
          </>
        )}
        actions={selection && (
          <Button size="sm" asChild>
            <Link href={`/dgarh/actes/${selection.id}`}>
              Ouvrir le dossier <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      >
        {selection && (
          <>
            <Section titre="Dossier">
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.reference}</span>} />
              <LigneInfo k="Type" v={typeActeById(selection.type)?.libelle} />
              <LigneInfo k="Agent concerné" v={nomAgent(selection.agentId)} />
              <LigneInfo k="Initiateur" v={selection.initiateur} />
              <LigneInfo k="Instruit par" v={entiteById(selection.entiteInstructriceId)?.nom ?? "—"} />
              <LigneInfo k="Chaîne" v={
                <span className="text-[11px]">
                  {cheminDe(selection.entiteInstructriceId).map((e) => e.sigle).join(" › ")}
                </span>
              } />
            </Section>

            <Section titre="Calendrier">
              <LigneInfo k="Ouvert le" v={fmtDate(selection.dateCreation)} />
              <LigneInfo k="Échéance" v={fmtDate(selection.dateEcheance)} />
              <LigneInfo k="Signé le" v={selection.dateSignature ? fmtDate(selection.dateSignature) : "pas encore"} />
              <LigneInfo k="Âge" v={`${joursDepuis(selection.dateCreation)} jours`} />
              <LigneInfo k="Effets reportés" v={selection.effetsAppliques ? "oui" : "non"} />
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
                          {entiteById(e.entiteId)?.sigle ?? "—"}
                          {e.utilisateur ? ` — ${e.utilisateur}` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {e.dateSortie ? fmtDate(e.dateSortie)
                          : e.statut === "EN_COURS" ? "en cours" : "à venir"}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {selection.pieces?.length > 0 && (
              <Section titre={`Pièces — ${selection.pieces.length}`}>
                <div className="space-y-1">
                  {selection.pieces.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{p.nom}</div>
                        <div className="text-[10px] text-muted-foreground">{p.categorie} — {p.taille}</div>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{fmtDate(p.date)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>
    </>
  );
}
