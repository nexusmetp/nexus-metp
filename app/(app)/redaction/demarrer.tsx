"use client";

import { useMemo, useRef, useState } from "react";
import { FileUp, FilePlus2, FileText, Library, Loader2, Search, Users } from "lucide-react";
import { MODELES, type CleModele, type ContexteDocument } from "@/lib/documents";
import { peut } from "@/lib/referentiels";
import { useAuth } from "@/lib/store";
import { depuisModele, fusionner, importerDocx, pageVierge, IMPORT_DISPONIBLE } from "@/lib/redaction";
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
export function Demarrer({ ouvert, surFermeture, surChoix, contexte }: {
  ouvert: boolean;
  surFermeture: () => void;
  surChoix: (contenu: string, titre: string, modele?: CleModele, modeleMaisonId?: string) => void;
  /** Le dossier sur lequel les modèles se composeront. */
  contexte: ContexteDocument;
}) {
  const user = useAuth((s) => s.user)!;
  const { data: maison = [] } = useModelesMaison();
  const [recherche, setRecherche] = useState("");
  const [importation, setImportation] = useState(false);
  const fichier = useRef<HTMLInputElement | null>(null);

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

  /* Un .docx reçu d'ailleurs entre dans la feuille de l'administration :
     on en garde la structure, jamais la maquette de l'expéditeur. */
  const ouvrirFichier = async (f: File | undefined) => {
    if (!f) return;
    setImportation(true);
    try {
      const { contenu, titre, avertissements } = await importerDocx(f);
      surChoix(`<article class="doc-feuille">${contenu}</article>`, titre);
      if (avertissements.length) {
        toast.info("Le document a été simplifié", {
          description: `${avertissements.length} élément(s) non repris : ${avertissements.slice(0, 2).join(" ; ")}`,
        });
      } else {
        toast.success("Document importé", { description: titre });
      }
      surFermeture();
    } catch (e: any) {
      toast.error("Import impossible", {
        description: e?.message ?? "Le fichier n'a pas pu être lu.",
      });
    } finally {
      setImportation(false);
    }
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

        {IMPORT_DISPONIBLE && (
          <>
            <input
              ref={fichier}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => { void ouvrirFichier(e.target.files?.[0]); e.target.value = ""; }}
            />
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 py-3"
              disabled={importation}
              onClick={() => fichier.current?.click()}
            >
              {importation
                ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                : <FileUp className="h-5 w-5 shrink-0 text-primary" />}
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold">Ouvrir un fichier Word reçu</span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  Le texte entre dans la feuille du ministère ; la mise en page de l'expéditeur reste dehors.
                </span>
              </span>
            </Button>
          </>
        )}

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
