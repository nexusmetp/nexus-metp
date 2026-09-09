"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  COULEUR_CATEGORIE, COULEUR_POSITION, COULEUR_PROVENANCE, COULEUR_STATUT_ACTE, COULEUR_STATUTAIRE,
} from "@/lib/format";
import {
  POSITION_LABELS, PROVENANCE_LABELS, REGLES_CATEGORIE, ROLE_LABELS, STATUT_ACTE_LABELS,
  peut, type ModuleKey,
} from "@/lib/referentiels";
import type { CategoriePersonnel, NaturePosition, Provenance, Role, StatutActe } from "@/lib/types";
import { ArrowDownRight, ArrowUpRight, ShieldOff } from "lucide-react";

export function KpiCard({
  titre, valeur, sousTitre, icon: Icon, variation,
}: {
  titre: string; valeur: string | number; sousTitre?: string; icon: any; variation?: number;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titre}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{valeur}</div>
          {sousTitre && <div className="mt-1 text-xs text-muted-foreground">{sousTitre}</div>}
          {typeof variation === "number" && (
            <div className={cn(
              "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              variation >= 0 ? "bg-emerald-500/12 text-emerald-600" : "bg-rose-500/12 text-rose-600"
            )}>
              {variation >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(variation)} %
            </div>
          )}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

const puce = (className: string, texte: string, extra?: string) => (
  <Badge variant="outline" className={cn("font-medium", className, extra)}>{texte}</Badge>
);

export const BadgeStatutActe = ({ v }: { v: StatutActe }) =>
  puce(COULEUR_STATUT_ACTE[v], STATUT_ACTE_LABELS[v]);

export const BadgeCategorie = ({ v }: { v: CategoriePersonnel }) =>
  puce(COULEUR_CATEGORIE[v], REGLES_CATEGORIE[v].libelle);

export const BadgePosition = ({ v }: { v: NaturePosition }) =>
  puce(COULEUR_POSITION[v], POSITION_LABELS[v]);

export const BadgeStatutaire = ({ v }: { v?: string }) =>
  v ? puce(COULEUR_STATUTAIRE[v] ?? "", `Catégorie ${v}`) : null;

/** Marqueur de provenance — cahier §01. Ne jamais afficher une donnée sans lui. */
export const BadgeProvenance = ({ v, reference }: { v: Provenance; reference?: string }) => (
  <Badge
    variant="outline"
    title={reference}
    className={cn("gap-1.5 text-[10px] font-semibold uppercase tracking-wider", COULEUR_PROVENANCE[v])}
  >
    <span className="h-1.5 w-1.5 rounded-sm bg-current" />
    {PROVENANCE_LABELS[v]}
  </Badge>
);

export function PageHeader({
  titre, description, children,
}: { titre: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{titre}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * Garde de module — cahier §11. Un rôle qui n'a pas le module ne doit pas
 * voir la page, même en tapant l'URL.
 */
export function GardeModule({
  module, role, children,
}: { module: ModuleKey; role: Role; children: React.ReactNode }) {
  if (peut(role, module)) return <>{children}</>;
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="max-w-sm text-center">
        <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <h2 className="mt-4 text-lg font-semibold">Accès non autorisé</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre rôle — {ROLE_LABELS[role]} — ne donne pas accès à ce module.
          Le périmètre découle de votre rattachement dans l'organigramme.
        </p>
      </div>
    </div>
  );
}
