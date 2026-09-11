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
import { TONS, type Ton } from "@/components/nexus/tons";
import { ArrowDownRight, ArrowUpRight, ShieldOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Fait monter un nombre jusqu'à sa valeur. Le chiffre s'installe au lieu
 * d'apparaître : on voit qu'il a été calculé. Court — une demi-seconde — et
 * respecte le réglage système de réduction des animations.
 */
export function Compteur({ valeur, duree = 550 }: { valeur: number; duree?: number }) {
  const [affiche, setAffiche] = useState(valeur);
  const precedent = useRef(valeur);

  useEffect(() => {
    const reduit = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const depart = precedent.current;
    precedent.current = valeur;
    if (reduit || depart === valeur) { setAffiche(valeur); return; }

    let brut = 0;
    const debut = performance.now();
    const pas = (t: number) => {
      const avance = Math.min(1, (t - debut) / duree);
      // Décélération : le chiffre freine en arrivant, comme un compteur mécanique.
      const douceur = 1 - Math.pow(1 - avance, 3);
      setAffiche(Math.round(depart + (valeur - depart) * douceur));
      if (avance < 1) brut = requestAnimationFrame(pas);
    };
    brut = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(brut);
  }, [valeur, duree]);

  return <>{new Intl.NumberFormat("fr-FR").format(affiche)}</>;
}

/**
 * Une tuile de chiffre.
 *
 * Le `ton` porte le sens : ambre pour une attente, rose pour une échéance
 * dépassée, émeraude pour ce qui est acquis. À défaut, la rangée en attribue
 * un par position (voir `RangeeKpi`), pour qu'aucune tuile ne reste blanche.
 */
export function KpiCard({
  titre, valeur, sousTitre, icon: Icon, variation, ton = "cyan",
}: {
  titre: string; valeur: string | number; sousTitre?: string; icon: any;
  variation?: number; ton?: Ton;
}) {
  const t = TONS[ton];
  return (
    <Card className={cn(
      "relative flex h-full min-h-[122px] flex-col justify-center overflow-hidden p-5 pt-6",
      "bg-gradient-to-br to-transparent transition-shadow group-hover:shadow-md",
      t.fond
    )}>
      {/* Filet supérieur : la couleur se voit même quand la tuile est vide. */}
      <div className={cn("absolute inset-x-0 top-0 h-1", t.filet)} />
      <div className={cn(
        "absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full blur-2xl",
        "transition-transform group-hover:scale-125", t.halo
      )} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titre}</div>
          <div className={cn("mt-2 text-3xl font-bold tracking-tight tabular-nums", t.valeur)}>
            {typeof valeur === "number" ? <Compteur valeur={valeur} /> : valeur}
          </div>
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
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", t.puce)}>
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
