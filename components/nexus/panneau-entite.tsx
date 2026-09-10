"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { useActes, useAgentsProjetes, usePostes, useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  NIVEAU_LABELS, STATUTS_EN_COURS, cheminDe, descendantsDe, enfantsDe, entiteById, typeActeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { BadgeProvenance, BadgeStatutActe } from "@/components/nexus/ui-kit";
import { Jauge, LigneInfo, PanneauDetail, Section } from "@/components/nexus/module";
import { DocumentsLies } from "@/components/nexus/documents-lies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Entite } from "@/lib/types";

/**
 * Fiche d'une structure.
 *
 * L'arbre dit où se trouve une entité ; la fiche dit ce qu'elle est —
 * ce qui la fonde en droit, qui la dirige, combien d'agents elle porte
 * en propre et dans sa branche, et ce qui s'y instruit en ce moment.
 */
export function PanneauEntite({
  entite, surFermeture, surNavigation,
}: {
  entite: Entite | null;
  surFermeture: () => void;
  /** Permet de sauter d'une entité à une autre sans fermer le panneau. */
  surNavigation?: (e: Entite) => void;
}) {
  const user = useAuth((s) => s.user)!;
  const { data: agents = [] } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: postes = [] } = usePostes();
  const { data: utilisateurs = [] } = useUtilisateurs();

  const donnees = useMemo(() => {
    if (!entite) return null;
    const branche = descendantsDe(entite.id);
    const ids = new Set(branche.map((e) => e.id));
    const dansLaBranche = agents.filter((a) => a.entiteId && ids.has(a.entiteId));
    const direct = agents.filter((a) => a.entiteId === entite.id);

    const parCategorie = new Map<string, number>();
    dansLaBranche.forEach((a) => parCategorie.set(a.categorie, (parCategorie.get(a.categorie) ?? 0) + 1));

    const postesBranche = postes.filter((p) => ids.has(p.entiteId));
    const enfants = enfantsDe(entite.id).map((e) => {
      const sousIds = new Set(descendantsDe(e.id).map((d) => d.id));
      return { entite: e, total: agents.filter((a) => a.entiteId && sousIds.has(a.entiteId)).length };
    });

    return {
      branche, direct, dansLaBranche, parCategorie, enfants,
      postes: postesBranche,
      vacants: postesBranche.filter((p) => p.statut === "VACANT").length,
      actesEnCours: actes
        .filter((a) => ids.has(a.entiteInstructriceId) && STATUTS_EN_COURS.includes(a.statut))
        .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))
        .slice(0, 6),
      responsable: utilisateurs.find((u) => u.entiteId === entite.id)
        ?? (entite.responsableId ? utilisateurs.find((u) => u.id === entite.responsableId) : undefined),
      effectifsPourEtat: enfants.map((e) => ({
        entite: e.entite,
        direct: agents.filter((a) => a.entiteId === e.entite.id).length,
        total: e.total,
      })),
    };
  }, [entite, agents, actes, postes, utilisateurs]);

  if (!entite || !donnees) return null;

  const maxEnfant = Math.max(1, ...donnees.enfants.map((e) => e.total));

  return (
    <PanneauDetail
      ouvert={!!entite}
      surFermeture={surFermeture}
      titre={entite.nom}
      sousTitre={cheminDe(entite.id).map((e) => e.sigle).join(" › ")}
      large
      etiquette={
        <>
          <Badge variant="secondary" className="text-[10px]">{entite.sigle}</Badge>
          <Badge variant="outline" className="text-[10px]">{NIVEAU_LABELS[entite.niveau]}</Badge>
          <BadgeProvenance v={entite.provenance} reference={entite.reference} />
          {entite.actif === false && (
            <Badge variant="outline" className="border-rose-500/40 text-[10px] text-rose-600">Désactivée</Badge>
          )}
        </>
      }
      actions={
        <>
          <DocumentsLies
            source="entite"
            libelle="État des effectifs"
            contexte={{
              entite,
              effectifs: donnees.effectifsPourEtat,
              signataire: { nom: user.nomComplet },
            }}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dgarh/agents?entite=${entite.id}`}>
              <Users className="mr-1.5 h-3.5 w-3.5" /> Ses agents
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dgarh/pilotage">Piloter</Link>
          </Button>
        </>
      }
    >
      <Section titre="La structure">
        <LigneInfo k="Sigle" v={entite.sigle} />
        <LigneInfo k="Dénomination" v={<span className="text-xs">{entite.nom}</span>} />
        <LigneInfo k="Niveau" v={NIVEAU_LABELS[entite.niveau]} />
        <LigneInfo k="Rattachée à" v={entite.parentId ? entiteById(entite.parentId)?.nom : "—"} />
        <LigneInfo k="Ville" v={entite.ville ?? "—"} />
        <LigneInfo k="Code" v={<span className="font-mono text-[11px]">{entite.code}</span>} />
        <LigneInfo k="Provenance" v={<BadgeProvenance v={entite.provenance} reference={entite.reference} />} />
        <LigneInfo k="Texte de référence" v={entite.reference
          ? <span className="text-[11px]">{entite.reference}</span>
          : <span className="italic text-muted-foreground">non établi</span>} />
        {entite.dateCreation && <LigneInfo k="Créée dans l'outil le" v={fmtDate(entite.dateCreation)} />}
      </Section>

      <Section titre="Direction">
        {donnees.responsable ? (
          <>
            <LigneInfo k="Responsable" v={donnees.responsable.nomComplet} />
            <LigneInfo k="Fonction" v={donnees.responsable.fonction} />
            <LigneInfo k="Courriel" v={<span className="text-xs">{donnees.responsable.email}</span>} />
          </>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-[11px] text-muted-foreground">
            Aucun compte n'est rattaché à cette structure. Tant qu'elle n'a pas de responsable,
            personne ne peut instruire en son nom : la nomination se fait depuis le pilotage.
          </p>
        )}
      </Section>

      <Section titre="Effectifs">
        <LigneInfo k="Agents en propre" v={fmtNum(donnees.direct.length)} />
        <LigneInfo k="Agents de la branche" v={fmtNum(donnees.dansLaBranche.length)} />
        <LigneInfo k="Structures rattachées" v={fmtNum(donnees.branche.length - 1)} />
        <LigneInfo k="Emplois recensés" v={fmtNum(donnees.postes.length)} />
        <LigneInfo k="Emplois vacants" v={
          <span className={donnees.vacants ? "font-semibold text-amber-600" : ""}>{fmtNum(donnees.vacants)}</span>
        } />
        {donnees.parCategorie.size > 0 && (
          <div className="mt-3 space-y-2">
            {[...donnees.parCategorie.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
              <div key={cat}>
                <div className="mb-1 flex items-baseline justify-between text-[11px]">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-semibold tabular-nums">{fmtNum(n)}</span>
                </div>
                <Jauge valeur={(n / Math.max(1, donnees.dansLaBranche.length)) * 100} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {donnees.enfants.length > 0 && (
        <Section titre={`Structures rattachées (${donnees.enfants.length})`}>
          <div className="space-y-1.5">
            {donnees.enfants.map(({ entite: e, total }) => (
              <button
                key={e.id}
                type="button"
                onClick={() => surNavigation?.(e)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/50"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{e.sigle}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {NIVEAU_LABELS[e.niveau]}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{e.nom}</div>
                  <div className="mt-1"><Jauge valeur={(total / maxEnfant) * 100} /></div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtNum(total)}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section
        titre="Dossiers en instruction"
        action={<span className="text-[11px] text-muted-foreground">{donnees.actesEnCours.length} en cours</span>}
      >
        {donnees.actesEnCours.length ? (
          <div className="space-y-1.5">
            {donnees.actesEnCours.map((a) => (
              <Link
                key={a.id}
                href={`/dgarh/actes/${a.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px]">{a.reference}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {typeActeById(a.type)?.libelle} — {a.objet}
                  </div>
                </div>
                <BadgeStatutActe v={a.statut} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aucun dossier n'est actuellement instruit par cette structure ni par sa branche.
          </p>
        )}
      </Section>
    </PanneauDetail>
  );
}
