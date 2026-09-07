"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUT_COLORS } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({
  titre, valeur, sousTitre, icon: Icon, variation, accent = "primary",
}: {
  titre: string; valeur: string | number; sousTitre?: string; icon: any; variation?: number; accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titre}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{valeur}</div>
          {sousTitre && <div className="mt-1 truncate text-xs text-muted-foreground">{sousTitre}</div>}
          {typeof variation === "number" && (
            <div className={cn("mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", variation >= 0 ? "bg-emerald-500/12 text-emerald-600" : "bg-rose-500/12 text-rose-600")}>
              {variation >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(variation)} % vs 2025
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

export function StatutBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUT_COLORS[value] ?? "")}>
      {value}
    </Badge>
  );
}

export function PageHeader({
  titre, description, children,
}: { titre: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{titre}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
