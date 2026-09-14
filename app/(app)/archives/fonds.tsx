"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Boxes, FileWarning } from "lucide-react";
import {
  useAgents, useArticlesArchives, useCommuniquerArticle, useVersements,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  COMMUNICABILITE_LABELS, SORT_FINAL_LABELS, STATUT_ARTICLE_LABELS, communicable,
  duaEchue, entiteById, peut, peutDans, serieParCode,
} from "@/lib/referentiels";
import { fmtDate } from "@/lib/format";
import { LigneInfo, PanneauDetail, Section, TableauModule, type Colonne } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ArticleArchive } from "@/lib/types";

const COULEUR_STATUT: Record<string, string> = {
  EN_RAYON: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  COMMUNIQUE: "bg-amber-500/12 text-amber-600 border-amber-500/25",
  ELIMINE: "bg-slate-500/12 text-slate-500 border-slate-500/25",
  TRANSFERE: "bg-primary/10 text-primary border-primary/25",
};

/** Le rayonnage : ce qu'on cherche quand on cherche une pièce. */
export function FondsArchives() {
  const user = useAuth((s) => s.user)!;
  const { data: articles = [] } = useArticlesArchives();
  const { data: versements = [] } = useVersements();
  const { data: agents = [] } = useAgents();
  const communiquer = useCommuniquerArticle();
  const [selection, setSelection] = useState<ArticleArchive | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({});
  const archiviste = peutDans(user, "archives", "W");

  const versementDe = useMemo(
    () => new Map(versements.map((v) => [v.id, v])), [versements]
  );
  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id?: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [agents]);

  const lignes = useMemo(() => {
    const { serie, statut, sort } = filtres;
    return articles
      .filter((a) => !serie || serie === "all" || a.serieCode === serie)
      .filter((a) => !statut || statut === "all" || a.statut === statut)
      .filter((a) => !sort || sort === "all" || a.sortFinal === sort)
      .sort((a, b) => a.cote.localeCompare(b.cote));
  }, [articles, filtres]);

  const colonnes: Colonne<ArticleArchive>[] = [
    {
      cle: "cote", entete: "Cote",
      rendu: (a) => (
        <div className="min-w-0">
          <div className="font-mono text-[11px]">{a.cote}</div>
          <div className="truncate text-[10px] text-muted-foreground">{a.intitule}</div>
        </div>
      ),
    },
    {
      cle: "serie", entete: "Série", visible: "lg",
      rendu: (a) => <Badge variant="secondary" className="text-[10px]">{a.serieCode}</Badge>,
    },
    {
      cle: "dates", entete: "Dates extrêmes", visible: "md",
      rendu: (a) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {a.dateDebut.slice(0, 4)} — {a.dateFin.slice(0, 4)}
        </span>
      ),
    },
    {
      cle: "dua", entete: "DUA", visible: "xl",
      rendu: (a) => {
        const echue = duaEchue(a.echeanceDua);
        return (
          <span className={cn("text-xs tabular-nums", echue && "font-semibold text-amber-600")}>
            {echue ? "échue" : a.echeanceDua.slice(0, 4)}
          </span>
        );
      },
    },
    {
      cle: "sort", entete: "Sort final", visible: "lg",
      rendu: (a) => (
        <span className="text-[11px] text-muted-foreground">{SORT_FINAL_LABELS[a.sortFinal]}</span>
      ),
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (a) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR_STATUT[a.statut])}>
          {STATUT_ARTICLE_LABELS[a.statut]}
        </Badge>
      ),
    },
  ];

  const demander = (a: ArticleArchive) => {
    communiquer.mutate({
      article: a,
      communication: {
        articleId: a.id, demandeurId: user.id,
        dateDemande: new Date().toISOString().slice(0, 10),
        dateRetour: null, motif: "Consultation demandée depuis le fonds",
        statut: "ACCORDEE",
      },
      utilisateur: user,
    }, {
      onSuccess: () => toast.success("Article communiqué", {
        description: `${a.cote} — sortie enregistrée à votre nom.`,
      }),
    });
  };

  const restituer = (a: ArticleArchive) => {
    communiquer.mutate({
      article: a,
      communication: {
        articleId: a.id, demandeurId: user.id,
        dateDemande: new Date().toISOString().slice(0, 10),
        dateRetour: new Date().toISOString().slice(0, 10),
        motif: "Restitution au rayon", statut: "RESTITUEE",
      },
      utilisateur: user,
    }, { onSuccess: () => toast.success("Article restitué", { description: a.cote }) });
  };

  const serie = selection ? serieParCode(selection.serieCode) : undefined;
  const libre = selection ? communicable(selection.dateFin, selection.communicabilite) : false;

  return (
    <>
      <TableauModule<ArticleArchive>
        titre="Fonds d'archives"
        description="Chaque article porte sa cote, sa durée d'utilité et son sort final. Cliquez pour voir où il se trouve et ce qu'on peut en faire."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) =>
          a.cote.toLowerCase().includes(t) || a.intitule.toLowerCase().includes(t)
          || nomAgent(a.agentId).toLowerCase().includes(t)}
        placeholderRecherche="Cote, intitulé ou nom d'agent…"
        filtres={[
          {
            cle: "serie", libelle: "Toutes les séries",
            options: Array.from(new Set(articles.map((a) => a.serieCode)))
              .sort()
              .map((c) => ({ valeur: c, libelle: `${c} — ${serieParCode(c)?.intitule ?? ""}` })),
          },
          {
            cle: "statut", libelle: "Tous les statuts",
            options: Object.entries(STATUT_ARTICLE_LABELS).map(([v, l]) => ({ valeur: v, libelle: l })),
          },
          {
            cle: "sort", libelle: "Tous les sorts finaux",
            options: Object.entries(SORT_FINAL_LABELS).map(([v, l]) => ({ valeur: v, libelle: l })),
          },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={18}
        vide="Aucun article ne correspond à ces critères."
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.intitule ?? ""}
        sousTitre={selection?.cote}
        large
        etiquette={selection && (
          <>
            <Badge variant="secondary" className="text-[10px]">{selection.serieCode}</Badge>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR_STATUT[selection.statut])}>
              {STATUT_ARTICLE_LABELS[selection.statut]}
            </Badge>
            {duaEchue(selection.echeanceDua) && (
              <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">
                DUA échue
              </Badge>
            )}
          </>
        )}
        actions={selection && archiviste && (
          <>
            {selection.acteId && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dgarh/actes/${selection.acteId}`}>Dossier d'origine</Link>
              </Button>
            )}
            {selection.statut === "EN_RAYON" && (
              <Button size="sm" disabled={!libre} onClick={() => demander(selection)}>
                <Boxes className="mr-1.5 h-3.5 w-3.5" /> Communiquer
              </Button>
            )}
            {selection.statut === "COMMUNIQUE" && (
              <Button size="sm" onClick={() => restituer(selection)}>Restituer au rayon</Button>
            )}
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="L'article">
              <LigneInfo k="Cote" v={<span className="font-mono text-xs">{selection.cote}</span>} />
              <LigneInfo k="Intitulé" v={<span className="text-xs">{selection.intitule}</span>} />
              <LigneInfo k="Dates extrêmes" v={`${fmtDate(selection.dateDebut)} — ${fmtDate(selection.dateFin)}`} />
              <LigneInfo k="Support" v={selection.support} />
              <LigneInfo k="Emplacement" v={selection.emplacement ?? <span className="italic text-muted-foreground">non rangé</span>} />
              <LigneInfo k="Versement" v={versementDe.get(selection.versementId)?.reference ?? "—"} />
              <LigneInfo k="Service versant" v={
                entiteById(versementDe.get(selection.versementId)?.entiteId ?? "")?.nom ?? "—"
              } />
            </Section>

            <Section titre="Ce que le plan de classement impose">
              <LigneInfo k="Série" v={`${selection.serieCode} — ${serie?.intitule ?? ""}`} />
              <LigneInfo k="Durée d'utilité" v={`${selection.dua} ans`} />
              <LigneInfo k="Échéance" v={
                <span className={duaEchue(selection.echeanceDua) ? "font-semibold text-amber-600" : ""}>
                  {fmtDate(selection.echeanceDua)}
                </span>
              } />
              <LigneInfo k="Sort final" v={SORT_FINAL_LABELS[selection.sortFinal]} />
              <LigneInfo k="Communicabilité" v={
                <span className={libre ? "text-emerald-600" : "text-amber-600"}>
                  {COMMUNICABILITE_LABELS[selection.communicabilite]} — {libre ? "ouvert" : "sous délai"}
                </span>
              } />
              {serie && (
                <p className="mt-2 rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {serie.justification}
                </p>
              )}
            </Section>

            {selection.agentId && (
              <Section titre="Rattachement">
                <LigneInfo k="Agent concerné" v={
                  <Link href={`/dgarh/agents/${selection.agentId}`} className="hover:text-primary hover:underline">
                    {nomAgent(selection.agentId)}
                  </Link>
                } />
                <LigneInfo k="Acte d'origine" v={
                  selection.acteId
                    ? <span className="font-mono text-[11px]">{selection.acteId}</span>
                    : "—"
                } />
              </Section>
            )}

            {!libre && (
              <Section titre="Pourquoi cet article n'est pas communicable">
                <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-3">
                  <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Le délai de {COMMUNICABILITE_LABELS[selection.communicabilite].toLowerCase()} court
                    depuis la clôture du dossier, en {selection.dateFin.slice(0, 4)}. Il protège des
                    mentions qui touchent à la vie privée d'une personne encore vivante. La consultation
                    reste possible sur dérogation motivée, qui ne se donne pas depuis cet écran.
                  </p>
                </div>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>
    </>
  );
}
