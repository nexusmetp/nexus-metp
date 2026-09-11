"use client";

import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/**
 * Fiche de détail — la prévisualisation d'une ligne.
 *
 * Une fenêtre centrée, pas un tiroir pleine hauteur : la fiche se lit d'un
 * regard, l'en-tête et les actions restent en place, seul le corps défile.
 */
export function PanneauDetail({
  ouvert, surFermeture, titre, sousTitre, etiquette, children, actions, large = false,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  titre: string;
  sousTitre?: string;
  etiquette?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && surFermeture()}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
          large ? "sm:max-w-3xl" : "sm:max-w-2xl"
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-5 text-left">
          {etiquette && <div className="flex flex-wrap items-center gap-2">{etiquette}</div>}
          <DialogTitle className="pr-8 text-lg leading-tight">{titre}</DialogTitle>
          {sousTitre && <DialogDescription>{sousTitre}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Bloc titré dans un panneau de détail. */
export function Section({ titre, children, action }: {
  titre: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titre}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Ligne clé / valeur, l'unité d'affichage des panneaux de détail. */
export function LigneInfo({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium">{v ?? "—"}</span>
    </div>
  );
}
