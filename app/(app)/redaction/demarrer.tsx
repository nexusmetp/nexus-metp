"use client";

import { useMemo, useState } from "react";
import { FilePlus2, FileText, Library, Search, Users } from "lucide-react";
import { MODELES, type CleModele } from "@/lib/documents";
import { peut } from "@/lib/referentiels";
import { useAuth } from "@/lib/store";
import { useContexteExemple } from "@/components/nexus/contexte-exemple";
import { depuisModele, fusionner, pageVierge } from "@/lib/redaction";
import { useModelesMaison } from "@/lib/queries";
import type { ModeleMaison } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * D'où part une nouvelle pièce.
 *
 * La feuille blanche d'abord, parce qu'elle est le cas le plus fréquent ;
 * puis les modèles, déjà remplis avec les données du dossier — timbre,
 * référence et formule exécutoire conformes avant la première phrase.
 */
export function Demarrer({ ouvert, surFermeture, surChoix }: {
  ouvert: boolean;
  surFermeture: () => void;
  surChoix: (contenu: string, titre: string, modele?: CleModele, modeleMaisonId?: string) => void;
}) {
  const user = useAuth((s) => s.user)!;
  const contexte = useContexteExemple();
  const { data: maison = [] } = useModelesMaison();
  const [recherche, setRecherche] = useState("");

  const visibles = useMemo(() => {
    const t = recherche.trim().toLowerCase();
    return MODELES
      .filter((m) => peut(user.role, m.module, "R"))
      .filter((m) => !t || m.libelle.toLowerCase().includes(t) || m.usage.toLowerCase().includes(t));
  }, [recherche, user.role]);

  const visiblesMaison = useMemo(() => {
    const t = recherche.trim().toLowerCase();
    return maison
      .filter((m) => m.partage || m.auteurId === user.id)
      .filter((m) => !t || m.libelle.toLowerCase().includes(t) || m.usage.toLowerCase().includes(t));
  }, [maison, recherche, user.id]);

  const ouvrirVierge = () => {
    surChoix(pageVierge(user), "Document sans titre");
    surFermeture();
  };

  const ouvrirModele = (cle: CleModele, libelle: string) => {
    surChoix(depuisModele(cle, contexte), libelle, cle);
    surFermeture();
  };

  /* Un modèle de la maison arrive avec ses champs de fusion : on les remplit
     au dossier ouvert, et on annonce ceux qui sont restés en pointillés. */
  const ouvrirMaison = (m: ModeleMaison) => {
    const { contenu, manquants } = fusionner(m.contenu, contexte);
    surChoix(contenu, m.libelle, undefined, m.id);
    if (manquants.length) {
      toast.info(`${manquants.length} champ${manquants.length > 1 ? "s" : ""} à compléter à la main`, {
        description: manquants.join(", "),
      });
    }
    surFermeture();
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && surFermeture()}>
      <DialogContent className="max-h-[88vh] w-[min(46rem,94vw)] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle>Nouveau document</DialogTitle>
          <DialogDescription>
            Une feuille blanche, ou un modèle déjà rempli avec les données du dossier.
          </DialogDescription>
        </DialogHeader>

        <Button variant="outline" className="h-auto justify-start gap-3 py-3" onClick={ouvrirVierge}>
          <FilePlus2 className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold">Feuille blanche</span>
            <span className="block text-[11px] font-normal text-muted-foreground">
              Timbre, lieu et date déjà posés. Vous écrivez le reste.
            </span>
          </span>
        </Button>

        {!!visiblesMaison.length && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Library className="h-3.5 w-3.5" /> Modèles de la maison
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {visiblesMaison.map((m) => (
                <button
                  key={m.id}
                  onClick={() => ouvrirMaison(m)}
                  className="rounded-lg border border-primary/25 bg-primary/[0.03] p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Library className="h-4 w-4 shrink-0 text-primary" />
                    <Badge variant="outline" className="text-[10px]">{m.famille}</Badge>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold leading-tight">{m.libelle}</div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{m.usage}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/80">
                    {m.partage && <Users className="h-3 w-3" />}
                    {m.auteur}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un modèle…"
            className="pl-8"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {visibles.map((m) => (
            <button
              key={m.cle}
              onClick={() => ouvrirModele(m.cle, m.libelle)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <Badge variant="outline" className="text-[10px]">{m.famille}</Badge>
              </div>
              <div className="mt-1.5 text-sm font-semibold leading-tight">{m.libelle}</div>
              <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{m.usage}</p>
            </button>
          ))}
          {!visibles.length && (
            <p className="sm:col-span-2 py-8 text-center text-sm text-muted-foreground">
              Aucun modèle ne correspond à cette recherche.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
