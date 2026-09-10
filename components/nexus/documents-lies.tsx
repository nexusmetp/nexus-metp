"use client";

import { useState } from "react";
import { FileOutput } from "lucide-react";
import { modelesPourSource, type CleModele, type ContexteDocument, type SourceModele } from "@/lib/documents";
import { VisionneuseDocument } from "@/components/nexus/document";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * « Éditer un document » — le même geste partout.
 *
 * La liste proposée vient du modèle, pas de la page : un acte offre l'arrêté,
 * la notification et le bordereau ; un agent offre les attestations. Ajouter
 * un modèle au catalogue suffit à le faire apparaître ici.
 */
export function DocumentsLies({
  source, contexte, libelle = "Éditer un document", variante = "outline", taille = "sm", surTransfert,
}: {
  source: SourceModele;
  contexte: ContexteDocument;
  libelle?: string;
  variante?: "default" | "outline" | "ghost" | "secondary";
  taille?: "sm" | "default";
  surTransfert?: (texte: string, titre: string) => void;
}) {
  const [choisi, setChoisi] = useState<CleModele | null>(null);
  const modeles = modelesPourSource(source);
  if (!modeles.length) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variante} size={taille}>
            <FileOutput className="mr-1.5 h-3.5 w-3.5" /> {libelle}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
            Imprimable, téléchargeable et transférable
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {modeles.map((m) => (
            <DropdownMenuItem
              key={m.cle}
              className="flex-col items-start gap-0.5 py-2"
              onSelect={() => setChoisi(m.cle)}
            >
              <span className="text-sm font-medium">{m.libelle}</span>
              <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{m.usage}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <VisionneuseDocument
        ouvert={!!choisi}
        surFermeture={() => setChoisi(null)}
        cle={choisi}
        contexte={contexte}
        surTransfert={surTransfert}
      />
    </>
  );
}
