"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BadgeCheck, FileSignature, HandHeart, Hourglass, Wrench } from "lucide-react";
import { CATEGORIES, REGLES_CATEGORIE } from "@/lib/referentiels";
import { fmtNum, fmtPct } from "@/lib/format";
import { Jauge } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import type { AgentProjete, CategoriePersonnel } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* L'effectif par catégorie de personnel                               */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi ce chiffre manquait, et pourquoi il n'est pas décoratif.
 *
 * Le tableau de bord donnait l'effectif du ministère, celui de la DGARH,
 * celui du cabinet et la part enseignante. Il ne disait pas **sous quel
 * régime** ces gens servent — et c'est le premier fait qu'une direction des
 * ressources humaines doit connaître, avant le sexe, l'âge ou le grade.
 *
 * Ce n'est pas une nuance de vocabulaire. Les cinq catégories n'ouvrent pas
 * les mêmes droits et n'appellent pas les mêmes gestes :
 *
 *  - un **fonctionnaire** a une carrière statutaire — titularisation,
 *    avancement, promotion — et sa rémunération suit la grille indiciaire ;
 *  - un **contractuel** a une carrière suivie mais pas d'avancement
 *    automatique : sa rémunération tient au contrat, pas au point d'indice ;
 *  - **prestataires**, **volontaires** et **vacataires** n'ont pas de carrière
 *    statutaire du tout. Ils remontent par les états de besoins, leur
 *    engagement a un terme, et c'est précisément là que se logent les
 *    situations qu'on découvre trop tard — un vacataire reconduit depuis
 *    quatre ans, un volontaire qu'aucun texte ne couvre plus.
 *
 * Afficher la composition, c'est donc afficher la part de l'effectif qui
 * échappe à la gestion statutaire. Un ministère qui ignore ce ratio ne peut
 * ni bâtir sa masse salariale, ni préparer un concours, ni répondre à la
 * question la plus simple qu'on lui posera : combien d'agents de l'État
 * comptez-vous réellement ?
 */

const ICONES: Record<CategoriePersonnel, typeof BadgeCheck> = {
  FONCTIONNAIRE: BadgeCheck,
  CONTRACTUEL: FileSignature,
  PRESTATAIRE: Wrench,
  VOLONTAIRE: HandHeart,
  VACATAIRE: Hourglass,
};

/* Le ton suit la nature du lien, non le goût : ce qui est statutaire d'un
   côté, ce qui ne l'est pas de l'autre. La couleur doit se lire sans légende. */
const TONS: Record<CategoriePersonnel, string> = {
  FONCTIONNAIRE: "text-emerald-600 dark:text-emerald-500",
  CONTRACTUEL: "text-cyan-600 dark:text-cyan-500",
  PRESTATAIRE: "text-amber-600 dark:text-amber-500",
  VOLONTAIRE: "text-violet-600 dark:text-violet-500",
  VACATAIRE: "text-rose-600 dark:text-rose-500",
};

export interface LigneCategorie {
  cle: CategoriePersonnel;
  libelle: string;
  lien: string;
  statutaire: boolean;
  effectif: number;
  part: number;
}

/** Les cinq catégories, y compris celles à zéro : une absence est un fait. */
export function repartirParCategorie(agents: AgentProjete[]): LigneCategorie[] {
  const total = agents.length;
  return CATEGORIES.map((c) => {
    const n = agents.filter((a) => a.categorie === c).length;
    return {
      cle: c,
      libelle: REGLES_CATEGORIE[c].libelle,
      lien: REGLES_CATEGORIE[c].lien,
      statutaire: REGLES_CATEGORIE[c].carriereStatutaire,
      effectif: n,
      part: total ? (n / total) * 100 : 0,
    };
  });
}

export function EffectifsParCategorie({ agents, perimetreBorne }: {
  agents: AgentProjete[];
  /** Vrai quand l'effectif affiché n'est pas celui du ministère entier. */
  perimetreBorne?: boolean;
}) {
  const lignes = useMemo(() => repartirParCategorie(agents), [agents]);
  const total = agents.length;
  const statutaires = lignes.filter((l) => l.statutaire).reduce((s, l) => s + l.effectif, 0);
  const horsStatut = total - statutaires;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">Effectif par catégorie de personnel</CardTitle>
          <CardDescription className="leading-relaxed">
            Sous quel régime sert chacun — la question qui commande toutes les autres.
            {perimetreBorne
              ? " Les chiffres portent sur votre périmètre."
              : " Les chiffres portent sur le ministère entier."}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/dgarh/agents">Ouvrir le fichier</Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Le total d'abord : une répartition sans son total ne se vérifie pas. */}
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {perimetreBorne ? "Effectif de votre périmètre" : "Effectif global"}
            </div>
            <div className="text-2xl font-bold tabular-nums">{fmtNum(total)}</div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-[11px] text-muted-foreground">Carrière statutaire</div>
              <div className="text-sm font-semibold tabular-nums">
                {fmtNum(statutaires)}
                <span className="ml-1 font-normal text-muted-foreground">
                  {fmtPct(total ? (statutaires / total) * 100 : 0)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Hors statut</div>
              <div className="text-sm font-semibold tabular-nums">
                {fmtNum(horsStatut)}
                <span className="ml-1 font-normal text-muted-foreground">
                  {fmtPct(total ? (horsStatut / total) * 100 : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {lignes.map((l) => {
            const Icone = ICONES[l.cle];
            return (
              <div key={l.cle} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icone className={`h-3.5 w-3.5 shrink-0 ${TONS[l.cle]}`} />
                    <span className="truncate text-sm font-medium">{l.libelle}</span>
                    {!l.statutaire && (
                      <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                        hors statut
                      </Badge>
                    )}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {fmtNum(l.effectif)}
                    <span className="ml-1.5 text-xs text-muted-foreground">{fmtPct(l.part)}</span>
                  </span>
                </div>
                <Jauge valeur={l.part} />
                <p className="text-[11px] leading-relaxed text-muted-foreground">{l.lien}</p>
              </div>
            );
          })}
        </div>

        {horsStatut > 0 && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
            {fmtNum(horsStatut)} agents servent hors carrière statutaire. Leur engagement a un
            terme et ne produit ni avancement ni titularisation : c&apos;est la part de
            l&apos;effectif qu&apos;il faut reconduire, régulariser ou laisser finir — et celle
            qu&apos;aucune grille indiciaire ne chiffre.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
