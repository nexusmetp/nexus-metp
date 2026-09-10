"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileCheck2, Plus, Timer } from "lucide-react";
import { useActes, useAgents } from "@/lib/queries";
import {
  STATUTS_EN_COURS, STATUT_ACTE_LABELS, TYPES_ACTE, entiteById, typeActeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi, TableauModule, type Colonne } from "@/components/nexus/module";
import { PanneauActe } from "@/components/nexus/panneau-acte";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Acte } from "@/lib/types";

export default function ActesPage() {
  const { data: actes = [], isLoading } = useActes();
  const { data: agents = [] } = useAgents();
  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "en_cours" });
  const [selection, setSelection] = useState<Acte | null>(null);

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  const lignes = useMemo(() => {
    const { type, statut } = filtres;
    return actes
      .filter((a) => {
        if (type && type !== "all" && a.type !== type) return false;
        if (statut === "en_cours") return STATUTS_EN_COURS.includes(a.statut);
        if (statut && statut !== "all" && a.statut !== statut) return false;
        return true;
      })
      .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation));
  }, [actes, filtres]);

  /* Les indicateurs portent sur tout le registre, pas sur le filtre courant :
     un chiffre qui bouge quand on filtre n'est plus un indicateur. */
  const { enCirculation, horsDelai, delaiMoyen } = useMemo(() => {
    const ouverts = actes.filter((a) => STATUTS_EN_COURS.includes(a.statut));
    const clos = actes.filter((a) => a.dateSignature);
    return {
      enCirculation: ouverts.length,
      horsDelai: ouverts.filter((a) => joursDepuis(a.dateCreation) > 15).length,
      delaiMoyen: clos.length
        ? Math.round(clos.reduce((s, a) =>
            s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5, 0) / clos.length)
        : 0,
    };
  }, [actes]);

  const colonnes: Colonne<Acte>[] = [
    {
      cle: "ref", entete: "Référence",
      rendu: (a) => (
        <div className="min-w-0">
          <div className="font-mono text-[11px]">{a.reference}</div>
          <div className="truncate text-[10px] text-muted-foreground">{a.objet}</div>
        </div>
      ),
    },
    {
      cle: "type", entete: "Type", visible: "md",
      rendu: (a) => <Badge variant="secondary" className="text-[10px]">{typeActeById(a.type)?.libelle ?? a.type}</Badge>,
    },
    { cle: "agent", entete: "Agent", visible: "lg", rendu: (a) => <span className="text-sm">{nomAgent(a.agentId)}</span> },
    {
      cle: "bureau", entete: "Bureau instructeur", visible: "xl",
      rendu: (a) => <span className="text-xs text-muted-foreground">{entiteById(a.entiteInstructriceId)?.sigle ?? "—"}</span>,
    },
    { cle: "cree", entete: "Créé le", visible: "xl", rendu: (a) => <span className="text-xs tabular-nums text-muted-foreground">{fmtDate(a.dateCreation)}</span> },
    {
      cle: "age", entete: "Âge",
      rendu: (a) => {
        const age = joursDepuis(a.dateCreation);
        const ouvert = STATUTS_EN_COURS.includes(a.statut);
        return (
          <span className={cn("text-sm tabular-nums", ouvert && age > 15 && "font-semibold text-amber-600")}>
            {ouvert ? `${age} j` : "—"}
          </span>
        );
      },
    },
    { cle: "statut", entete: "Statut", aligne: "droite", rendu: (a) => <BadgeStatutActe v={a.statut} /> },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Actes administratifs"
        description="Le pivot du système : rien ne change dans un dossier sans acte signé (cahier §08). Cliquez un acte pour suivre son circuit et agir dessus."
      >
        <Badge variant="outline" className="gap-1.5">
          <FileCheck2 className="h-3 w-3" /> {fmtNum(lignes.length)} acte{lignes.length > 1 ? "s" : ""}
        </Badge>
        <Button size="sm" asChild>
          <Link href="/dgarh/actes/nouveau"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nouvelle mutation</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Actes", valeur: fmtNum(actes.length), sousTitre: "toutes années confondues", icon: FileCheck2 },
        { titre: "En circulation", valeur: fmtNum(enCirculation), sousTitre: "pas encore notifiés", icon: Timer },
        { titre: "Au-delà du délai", valeur: fmtNum(horsDelai), sousTitre: "plus de 15 jours d'ouverture", icon: AlertTriangle },
        { titre: "Délai moyen", valeur: `${delaiMoyen} j`, sousTitre: "de l'ouverture à la signature", icon: CheckCircle2 },
      ]} />

      <TableauModule<Acte>
        titre="Registre des actes"
        description="Un acte s'ouvre en fiche : circuit, effets attendus, pièces, et les gestes que votre rôle autorise."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) =>
          a.reference.toLowerCase().includes(t) || a.objet.toLowerCase().includes(t)
          || nomAgent(a.agentId).toLowerCase().includes(t)}
        placeholderRecherche="Référence, objet ou agent…"
        filtres={[
          {
            cle: "type", libelle: "Tous les types",
            options: TYPES_ACTE.map((t) => ({ valeur: t.type, libelle: t.libelle })),
          },
          {
            cle: "statut", libelle: "Tous les statuts",
            options: [
              { valeur: "en_cours", libelle: "En circulation" },
              ...Object.entries(STATUT_ACTE_LABELS).map(([k, v]) => ({ valeur: k, libelle: v })),
            ],
          },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={18}
        vide="Aucun acte ne correspond à ces critères."
      />

      <PanneauActe
        acte={selection ? actes.find((a) => a.id === selection.id) ?? null : null}
        surFermeture={() => setSelection(null)}
      />
    </>
  );
}
