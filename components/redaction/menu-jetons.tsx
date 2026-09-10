"use client";

import { Braces } from "lucide-react";
import { JETONS, ecrireJeton, type Jeton } from "@/lib/redaction";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const GROUPES: Jeton["groupe"][] = ["Agent", "Structure", "Acte", "Signature", "Date"];

/**
 * Poser un champ de fusion dans le texte.
 *
 * Le rédacteur n'a pas à connaître la syntaxe : il choisit « Matricule »
 * et c'est le jeton qui s'écrit. Ce qui compte, c'est qu'il voie dans sa
 * feuille la différence entre un nom écrit une fois pour toutes et un nom
 * qui se remplira au dossier suivant.
 */
export function MenuJetons({ surChoix, desactive }: {
  surChoix: (texte: string) => void;
  desactive?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={desactive} className="h-8 text-[11px]">
          <Braces className="mr-1.5 h-3.5 w-3.5" /> Champ de fusion
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
        {GROUPES.map((g, i) => (
          <div key={g}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {g}
            </DropdownMenuLabel>
            {JETONS.filter((j) => j.groupe === g).map((j) => (
              <DropdownMenuItem
                key={j.cle}
                className="text-xs"
                onSelect={() => surChoix(ecrireJeton(j.cle))}
              >
                {j.libelle}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
