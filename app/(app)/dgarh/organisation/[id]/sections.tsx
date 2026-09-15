"use client";

import Link from "next/link";
import {
  AlertTriangle, ChevronRight, Eye, ScrollText, Scale, TriangleAlert, Users,
} from "lucide-react";
import {
  LIBELLES_DOMAINE, NIVEAU_LABELS, POSITION_LABELS, REGLES_CATEGORIE,
  attributionsDe, domainesDe, motifSansAttributions,
} from "@/lib/referentiels";
import { fmtNum, fmtPct } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Entite } from "@/lib/types";
import type { FicheStructure } from "./donnees";

/* ------------------------------------------------------------------ */
/* Les blocs de la fiche                                               */
/* ------------------------------------------------------------------ */

/**
 * Ce dont la structure est chargée — cité, jamais résumé.
 *
 * C'est le bloc qui fait de cette page autre chose qu'un tableau de chiffres :
 * il répond à « à quoi sert ce service ? » avec le texte qui le fonde, article
 * compris. Un agent qui ouvre la fiche de son bureau y lit l'arrêté du
 * 17 octobre 2022 sans avoir à le chercher au Journal officiel.
 */
export function BlocAttributions({ entite }: { entite: Entite }) {
  const fiche = attributionsDe(entite);
  const motif = motifSansAttributions(entite);
  const domaines = domainesDe(entite.id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-muted-foreground" /> Attributions
            </CardTitle>
            <CardDescription>
              {fiche && !fiche.renvoiTexteSpecifique
                ? `${fiche.reference}, article ${fiche.article} — reproduit mot pour mot.`
                : "Ce que le texte d'organisation assigne à cette structure."}
            </CardDescription>
          </div>
          {fiche && !fiche.renvoiTexteSpecifique && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              art. {fiche.article}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {fiche && fiche.missions.length > 0 && (
          <ol className="space-y-1.5">
            {fiche.missions.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                <span>{m.charAt(0).toUpperCase() + m.slice(1)}</span>
              </li>
            ))}
          </ol>
        )}

        {fiche?.renvoiTexteSpecifique && (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            L&apos;article {fiche.article} de l&apos;{fiche.reference.toLowerCase()} nomme cette
            structure et renvoie à des textes spécifiques, qui ne sont pas au dossier.
            Ses attributions ne sont donc pas établies ici.
          </p>
        )}

        {!fiche && motif && (
          <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {motif}
          </p>
        )}

        {/* La compétence au sens des droits : ce que la structure peut écrire
            dans la plateforme. C'est une autre question que celle du texte, et
            il faut qu'on voie les deux côte à côte. */}
        {domaines && domaines.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="mr-1 text-[11px] text-muted-foreground">Compétente pour écrire dans :</span>
            {domaines.map((d) => (
              <Badge key={d} variant="secondary" className="text-[10px]">{LIBELLES_DOMAINE[d]}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Ce qui appelle une décision — et où agir. */
export function BlocAttention({ points }: { points: FicheStructure["attention"] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="h-4 w-4 text-muted-foreground" /> Ce qui appelle une décision
        </CardTitle>
        <CardDescription>
          {points.length
            ? "Rien de ce qui est à zéro n'est listé : ce tableau ne montre que ce qui bouge."
            : "Rien en attente dans cette structure."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {points.length === 0 && (
          <p className="rounded-md border border-dashed bg-emerald-500/[0.04] px-3 py-2.5 text-xs text-muted-foreground">
            Aucun dossier hors délai, aucun poste vacant, aucune réclamation ouverte.
          </p>
        )}
        {points.map((p) => {
          const contenu = (
            <div className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
              p.gravite === "alerte"
                ? "border-rose-500/25 bg-rose-500/[0.04] hover:bg-rose-500/[0.08]"
                : "border-amber-500/25 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
            }`}>
              <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                p.gravite === "alerte" ? "text-rose-600" : "text-amber-600"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{p.titre}</div>
                <div className="text-[11px] leading-snug text-muted-foreground">{p.detail}</div>
              </div>
              {p.lien && <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </div>
          );
          return p.lien
            ? <Link key={p.cle} href={p.lien} className="block">{contenu}</Link>
            : <div key={p.cle}>{contenu}</div>;
        })}
      </CardContent>
    </Card>
  );
}

/** Les entités immédiatement en dessous, avec ce qui s'y passe. */
export function BlocSousEntites({ enfants }: { enfants: FicheStructure["enfants"] }) {
  if (!enfants.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ce qui en relève — {enfants.length}</CardTitle>
        <CardDescription>
          Chaque ligne ouvre la fiche de la structure, avec ses propres chiffres.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {enfants.map((e) => (
          <Link
            key={e.entite.id}
            href={`/dgarh/organisation/${e.entite.id}`}
            className="group rounded-lg border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold">{e.entite.sigle}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                {NIVEAU_LABELS[e.entite.niveau] ?? e.entite.niveau}
              </span>
            </div>
            <div className="truncate text-[11px] text-muted-foreground">{e.entite.nom}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Users className="h-3 w-3 text-muted-foreground" />{fmtNum(e.effectif)}
              </span>
              {e.vacants > 0 && <span className="text-rose-600">{e.vacants} vacant{e.vacants > 1 ? "s" : ""}</span>}
              {e.ouverts > 0 && <span className="text-muted-foreground">{e.ouverts} dossier{e.ouverts > 1 ? "s" : ""}</span>}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {e.chef ?? <span className="italic opacity-70">responsable à désigner</span>}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

/** La composition du personnel — régime, position, et ce qui s'en déduit. */
export function BlocEffectifs({ fiche }: { fiche: FicheStructure }) {
  const part = (n: number) => (fiche.effectif ? (n / fiche.effectif) * 100 : 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Composition du personnel</CardTitle>
        <CardDescription>
          Sur la branche entière — {fmtNum(fiche.effectif)} agents, dont {fmtNum(fiche.enPropre)} rattachés
          à la structure elle-même.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            Par régime
          </div>
          <div className="space-y-1">
            {fiche.parCategorie.map(([cle, n]) => (
              <div key={cle} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate">
                  {REGLES_CATEGORIE[cle as keyof typeof REGLES_CATEGORIE]?.libelle ?? cle}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmtNum(n)} · {fmtPct(part(n))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            Par position statutaire
          </div>
          <div className="space-y-1">
            {fiche.parPosition.map(([cle, n]) => (
              <div key={cle} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate">
                  {POSITION_LABELS[cle as keyof typeof POSITION_LABELS] ?? cle}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmtNum(n)} · {fmtPct(part(n))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Le lien vers le fichier nominatif, quand on a le droit de l'ouvrir. */
export function LienFichier({ entiteId, effectif }: { entiteId: string; effectif: number }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/dgarh/agents?entite=${entiteId}`}>
        <Eye className="mr-1.5 h-3.5 w-3.5" /> Ouvrir le fichier — {fmtNum(effectif)}
      </Link>
    </Button>
  );
}
