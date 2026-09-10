"use client";

import { ChevronDown, Lock } from "lucide-react";
import { useTextes } from "@/lib/langues";
import { ROLE_LABELS } from "@/lib/referentiels";
import type { Utilisateur } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Les comptes de démonstration, dans un panneau flottant.
 *
 * Volontairement un Popover et non un bloc dépliant : la liste s'ouvre
 * PAR-DESSUS la page au lieu de la rallonger. C'est ce qui permet à l'écran de
 * connexion de tenir dans la fenêtre sans jamais défiler.
 */
export function ComptesDemo({
  utilisateurs, onChoisir,
}: {
  utilisateurs: Utilisateur[];
  onChoisir: (email: string) => void;
}) {
  const t = useTextes();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bouton-demo h-10 w-full justify-between rounded-[3px] border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
        >
          <span className="flex items-center gap-2 text-[13px]">
            <Lock className="h-3.5 w-3.5 text-white/70" />
            {t.connexion.comptesDemo} ({utilisateurs.length})
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={6}
        // La hauteur suit celle de la fenêtre : sur un écran court, c'est la
        // liste qui défile, jamais la page.
        className="w-[min(26rem,calc(100vw-2rem))] max-h-[min(22rem,55vh)] overflow-y-auto scrollbar-thin p-2"
      >
        {utilisateurs.map((u) => (
          <button
            key={u.id}
            onClick={() => onChoisir(u.email)}
            className="flex w-full items-center justify-between gap-3 rounded-[3px] border border-transparent p-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-800">{u.nomComplet}</span>
              <span className="block truncate text-xs text-slate-500">{u.email}</span>
            </span>
            <Badge variant="outline" className="shrink-0 border-slate-200 text-[10px] text-slate-600">
              {ROLE_LABELS[u.role]}
            </Badge>
          </button>
        ))}
        <p className="pt-2 text-center text-xs text-slate-500">
          {t.connexion.motDePasseCommun}{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">Nexus2026</code>
        </p>
      </PopoverContent>
    </Popover>
  );
}
