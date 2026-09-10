"use client";

import { useMemo, useState } from "react";
import { Download, Copy as CopyIcon, Printer, Send } from "lucide-react";
import { useDocumentsEmis, useUtilisateurs } from "@/lib/queries";
import { modeleParCle } from "@/lib/documents";
import { fmtDate } from "@/lib/format";
import { LigneInfo, PanneauDetail, Section, TableauModule, type Colonne } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import type { DocumentEmis } from "@/lib/types";

const CANAL = {
  IMPRESSION: { libelle: "Imprimé", icon: Printer },
  TELECHARGEMENT: { libelle: "Téléchargé", icon: Download },
  TRANSFERT: { libelle: "Transféré", icon: Send },
  COPIE: { libelle: "Copié", icon: CopyIcon },
} as const;

/**
 * Registre des documents établis.
 *
 * Il ne conserve pas les fichiers : c'est l'acte qui fait foi, et garder une
 * copie du papier créerait un second original. Il conserve le geste — qui a
 * édité quoi, quand, par quel canal — ce qui est la question qui se pose
 * quand un document circule sans qu'on sache d'où il vient.
 */
export function RegistreDocuments() {
  const { data: emis = [] } = useDocumentsEmis();
  const { data: utilisateurs = [] } = useUtilisateurs();
  const [selection, setSelection] = useState<DocumentEmis | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({});

  const nomDe = useMemo(() => {
    const m = new Map(utilisateurs.map((u) => [u.id, u.nomComplet]));
    return (id: string) => m.get(id) ?? id;
  }, [utilisateurs]);

  const lignes = useMemo(() => {
    const canal = filtres.canal;
    return [...emis]
      .filter((d) => !canal || canal === "all" || d.canal === canal)
      .sort((a, b) => b.dateEmission.localeCompare(a.dateEmission));
  }, [emis, filtres.canal]);

  const colonnes: Colonne<DocumentEmis>[] = [
    {
      cle: "doc", entete: "Document",
      rendu: (d) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{d.intitule}</div>
          <div className="truncate text-[10px] text-muted-foreground">{d.objet}</div>
        </div>
      ),
    },
    { cle: "ref", entete: "Référence", visible: "md", rendu: (d) => <span className="font-mono text-[11px]">{d.reference}</span> },
    { cle: "par", entete: "Établi par", visible: "lg", rendu: (d) => <span className="text-xs">{nomDe(d.emisPar)}</span> },
    {
      cle: "canal", entete: "Canal", visible: "md",
      rendu: (d) => {
        const c = CANAL[d.canal] ?? CANAL.IMPRESSION;
        const I = c.icon;
        return <Badge variant="secondary" className="gap-1 text-[10px]"><I className="h-2.5 w-2.5" />{c.libelle}</Badge>;
      },
    },
    {
      cle: "date", entete: "Le", aligne: "droite",
      rendu: (d) => <span className="text-xs tabular-nums text-muted-foreground">{fmtDate(d.dateEmission.slice(0, 10))}</span>,
    },
  ];

  return (
    <>
      <TableauModule<DocumentEmis>
        titre="Documents établis"
        description="Chaque édition — impression, téléchargement, transfert — laisse une trace nominative. La prévisualisation, non."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(d, t) =>
          d.intitule.toLowerCase().includes(t) || d.objet.toLowerCase().includes(t)
          || d.reference.toLowerCase().includes(t) || nomDe(d.emisPar).toLowerCase().includes(t)}
        placeholderRecherche="Intitulé, objet, référence ou rédacteur…"
        filtres={[{
          cle: "canal", libelle: "Tous les canaux",
          options: Object.entries(CANAL).map(([v, c]) => ({ valeur: v, libelle: c.libelle })),
        }]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={15}
        vide="Aucun document n'a encore été établi. Ouvrez un modèle depuis la bibliothèque, un acte ou un dossier d'agent."
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.intitule ?? ""}
        sousTitre={selection?.objet}
        etiquette={selection && (
          <>
            <Badge variant="outline" className="font-mono text-[10px]">{selection.reference}</Badge>
            <Badge variant="secondary" className="text-[10px]">
              {(CANAL[selection.canal] ?? CANAL.IMPRESSION).libelle}
            </Badge>
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Édition">
              <LigneInfo k="Modèle" v={modeleParCle(selection.modele as any)?.libelle ?? selection.modele} />
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.reference}</span>} />
              <LigneInfo k="Objet" v={<span className="text-xs">{selection.objet}</span>} />
              <LigneInfo k="Établi par" v={nomDe(selection.emisPar)} />
              <LigneInfo k="Le" v={new Date(selection.dateEmission).toLocaleString("fr-FR")} />
              <LigneInfo k="Canal" v={(CANAL[selection.canal] ?? CANAL.IMPRESSION).libelle} />
            </Section>

            <Section titre="Sujet">
              <LigneInfo k="Nature" v={selection.sujetType} />
              <LigneInfo k="Identifiant" v={<span className="font-mono text-[11px]">{selection.sujetId ?? "—"}</span>} />
            </Section>

            <Section titre="Ce que le registre conserve">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Le fichier n'est pas archivé : le document se recompose à l'identique depuis
                l'acte ou le dossier qui le fonde, et garder une copie reviendrait à faire vivre
                un second original à côté de l'acte. Ce qui est conservé, c'est le geste — pour
                répondre plus tard à la seule question qui compte : qui a sorti cette pièce, et quand.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>
    </>
  );
}
