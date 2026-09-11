"use client";

import { cn } from "@/lib/utils";

/** Barre de progression sobre, réutilisée par les états de diffusion. */
export function Jauge({ valeur, teinte = "bg-primary" }: { valeur: number; teinte?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", teinte)} style={{ width: `${Math.min(100, Math.max(0, valeur))}%` }} />
    </div>
  );
}
