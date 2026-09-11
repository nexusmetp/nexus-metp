"use client";

import { Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUES_OFFERTES, useLangue, useTextes } from "@/lib/langues";
import { DrapeauCongo } from "@/components/nexus/logo";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Le sélecteur de langue du bandeau.
 *
 * Il change réellement la langue : le choix est écrit dans le magasin, qui le
 * conserve d'une visite à l'autre et met à jour l'attribut `lang` du document
 * — sans quoi un lecteur d'écran continuerait de prononcer l'anglais avec les
 * règles du français.
 */
export function SelecteurLangue({ className }: { className?: string }) {
  const code = useLangue((s) => s.code);
  const choisir = useLangue((s) => s.choisir);
  const t = useTextes();
  const courante = LANGUES_OFFERTES.find((l) => l.code === code);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t.connexion.langue}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-[3px] px-2 py-1.5 text-sm text-slate-600",
            "transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          <Languages aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">{courante?.nom}</span>
          <span className="sm:hidden">{code.toUpperCase()}</span>
          <DrapeauCongo largeur={24} className="ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t.connexion.langue}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUES_OFFERTES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => choisir(l.code)}
            className="flex items-center justify-between gap-2"
          >
            <span>{l.nom}</span>
            {l.code === code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
