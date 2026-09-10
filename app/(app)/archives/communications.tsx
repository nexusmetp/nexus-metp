"use client";

import { useMemo, useState } from "react";
import { useArticlesArchives, useCommunications, useUtilisateurs } from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import { LigneInfo, PanneauDetail, Section, TableauModule, type Colonne } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CommunicationArchive } from "@/lib/types";

const LABELS = {
  DEMANDEE: "Demandée", ACCORDEE: "Accordée", REFUSEE: "Refusée", RESTITUEE: "Restituée",
} as const;

const COULEUR: Record<string, string> = {
  DEMANDEE: "bg-sky-500/12 text-sky-600 border-sky-500/25",
  ACCORDEE: "bg-amber-500/12 text-amber-600 border-amber-500/25",
  REFUSEE: "bg-rose-500/12 text-rose-600 border-rose-500/25",
  RESTITUEE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
};

/**
 * Registre des communications.
 *
 * Sortir un article du rayon est un mouvement, pas une consultation : c'est
 * ce registre qui permet de dire, six mois plus tard, qui détient une boîte
 * qu'on ne retrouve plus.
 */
export function Communications() {
  const { data: communications = [] } = useCommunications();
  const { data: articles = [] } = useArticlesArchives();
  const { data: utilisateurs = [] } = useUtilisateurs();
  const [selection, setSelection] = useState<CommunicationArchive | null>(null);

  const articleDe = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  const nomDe = useMemo(() => {
    const m = new Map(utilisateurs.map((u) => [u.id, u.nomComplet]));
    return (id: string) => m.get(id) ?? id;
  }, [utilisateurs]);

  const lignes = useMemo(
    () => [...communications].sort((a, b) => b.dateDemande.localeCompare(a.dateDemande)),
    [communications]
  );

  const colonnes: Colonne<CommunicationArchive>[] = [
    {
      cle: "article", entete: "Article",
      rendu: (c) => {
        const a = articleDe.get(c.articleId);
        return (
          <div className="min-w-0">
            <div className="font-mono text-[11px]">{a?.cote ?? c.articleId}</div>
            <div className="truncate text-[10px] text-muted-foreground">{a?.intitule ?? "—"}</div>
          </div>
        );
      },
    },
    { cle: "demandeur", entete: "Demandeur", visible: "md", rendu: (c) => <span className="text-xs">{nomDe(c.demandeurId)}</span> },
    { cle: "motif", entete: "Motif", visible: "lg", rendu: (c) => <span className="text-[11px] text-muted-foreground">{c.motif}</span> },
    { cle: "date", entete: "Sortie", visible: "xl", rendu: (c) => <span className="text-xs tabular-nums text-muted-foreground">{fmtDate(c.dateDemande)}</span> },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (c) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR[c.statut])}>{LABELS[c.statut]}</Badge>
      ),
    },
  ];

  const art = selection ? articleDe.get(selection.articleId) : undefined;

  return (
    <>
      <TableauModule<CommunicationArchive>
        titre="Communications"
        description="Chaque sortie d'article est nominative et datée. Une boîte qui ne revient pas se retrouve ici."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(c, t) =>
          (articleDe.get(c.articleId)?.cote ?? "").toLowerCase().includes(t)
          || nomDe(c.demandeurId).toLowerCase().includes(t)
          || c.motif.toLowerCase().includes(t)}
        placeholderRecherche="Cote, demandeur ou motif…"
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={15}
        vide="Aucune communication enregistrée."
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={art?.intitule ?? "Communication"}
        sousTitre={art?.cote}
        etiquette={selection && (
          <Badge variant="outline" className={cn("text-[10px]", COULEUR[selection.statut])}>
            {LABELS[selection.statut]}
          </Badge>
        )}
      >
        {selection && (
          <>
            <Section titre="La sortie">
              <LigneInfo k="Article" v={<span className="font-mono text-xs">{art?.cote ?? "—"}</span>} />
              <LigneInfo k="Demandeur" v={nomDe(selection.demandeurId)} />
              <LigneInfo k="Motif" v={<span className="text-xs">{selection.motif}</span>} />
              <LigneInfo k="Sortie le" v={fmtDate(selection.dateDemande)} />
              <LigneInfo k="Retour" v={selection.dateRetour
                ? fmtDate(selection.dateRetour)
                : <span className="font-medium text-amber-600">non restitué</span>} />
              {selection.reponse && <LigneInfo k="Réponse" v={<span className="text-xs">{selection.reponse}</span>} />}
            </Section>

            <Section titre="Pourquoi tracer les sorties">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Un fonds se perd rarement d'un coup : il se perd boîte par boîte, empruntée pour
                instruire un dossier puis jamais rendue. Le registre ne rend pas les boîtes, mais il
                dit chez qui aller les chercher.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>
    </>
  );
}
