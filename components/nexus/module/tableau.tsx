"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export interface Filtre {
  cle: string;
  libelle: string;
  options: { valeur: string; libelle: string }[];
}

/**
 * La sélection multiple, quand l'écran l'ouvre.
 *
 * Elle porte sur les lignes **filtrées**, pas sur la page affichée : cocher
 * l'en-tête d'un fichier de deux mille agents réduit à quarante par un filtre
 * doit prendre les quarante, et non les vingt qu'on voit. Le compte est
 * toujours dit à l'écran, sans quoi personne ne sait sur quoi il agit.
 */
export interface SelectionMultiple {
  selection: Set<string>;
  surChangement: (s: Set<string>) => void;
  /** Ce qu'on peut faire de la sélection — rendu dans la barre d'actions. */
  actions?: (ids: string[]) => React.ReactNode;
  /** Au-delà, cocher l'en-tête demande confirmation : un geste qui prend deux
   *  mille lignes ne doit pas être aussi facile qu'un geste qui en prend dix. */
  seuilConfirmation?: number;
}

export interface Colonne<T> {
  cle: string;
  entete: string;
  /** Masquage progressif : la colonne disparaît sous ce point de rupture. */
  visible?: "toujours" | "md" | "lg" | "xl";
  aligne?: "gauche" | "droite";
  rendu: (ligne: T) => React.ReactNode;
}

const CLASSE_VISIBILITE: Record<string, string> = {
  toujours: "",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

/**
 * Tableau de module : recherche, filtres, pagination, ligne cliquable.
 * `surSelection` ouvre le panneau de détail — c'est la prévisualisation
 * attendue sur chaque écran.
 */
export function TableauModule<T extends { id: string }>({
  titre, description, lignes, colonnes, recherche, filtres, controles, valeursFiltres,
  surChangementFiltre, surSelection, ligneActive, vide, actions, parPage = 12,
  rechercheTexte, surRecherche, placeholderRecherche = "Rechercher…", multiple,
}: {
  titre: string;
  description?: string;
  lignes: T[];
  colonnes: Colonne<T>[];
  recherche?: (ligne: T, terme: string) => boolean;
  filtres?: Filtre[];
  /**
   * Un contrôle de filtre que le menu déroulant ne sait pas rendre — un
   * sélecteur d'entité cherchable, par exemple. Il se pose à côté des
   * filtres ordinaires plutôt que de les remplacer : un écran n'a pas à
   * choisir entre les deux.
   */
  controles?: React.ReactNode;
  valeursFiltres?: Record<string, string>;
  surChangementFiltre?: (cle: string, valeur: string) => void;
  surSelection?: (ligne: T) => void;
  ligneActive?: string | null;
  vide?: string;
  actions?: React.ReactNode;
  parPage?: number;
  rechercheTexte?: string;
  surRecherche?: (v: string) => void;
  placeholderRecherche?: string;
  multiple?: SelectionMultiple;
}) {
  const [interne, setInterne] = useState("");
  const [page, setPage] = useState(1);
  const terme = rechercheTexte ?? interne;
  const majTerme = (v: string) => {
    setPage(1);
    surRecherche ? surRecherche(v) : setInterne(v);
  };

  const filtrees = useMemo(() => {
    const t = terme.trim().toLowerCase();
    if (!t || !recherche) return lignes;
    return lignes.filter((l) => recherche(l, t));
  }, [lignes, terme, recherche]);

  const pages = Math.max(1, Math.ceil(filtrees.length / parPage));
  const courante = Math.min(page, pages);
  const visibles = filtrees.slice((courante - 1) * parPage, courante * parPage);
  const filtreActif = Object.values(valeursFiltres ?? {}).some((v) => v && v !== "all");

  /* La sélection ne suit pas la pagination : on coche à la page 3, on agit à
     la page 1. Ce qui sort du filtre reste coché tant qu'on ne vide pas —
     sans quoi un filtre effleuré ferait perdre un quart d'heure de pointage. */
  const cochees = multiple?.selection ?? new Set<string>();
  const surLaPage = visibles.filter((l) => cochees.has(l.id)).length;
  const toutesCochees = filtrees.length > 0 && filtrees.every((l) => cochees.has(l.id));
  const basculerToutes = () => {
    if (!multiple) return;
    if (toutesCochees) {
      const reste = new Set(cochees);
      filtrees.forEach((l) => reste.delete(l.id));
      multiple.surChangement(reste);
      return;
    }
    const seuil = multiple.seuilConfirmation ?? 200;
    if (filtrees.length > seuil
      && !window.confirm(
        `Cocher ${filtrees.length} lignes d'un coup. Les actions groupées porteront sur toutes. Continuer ?`)) return;
    multiple.surChangement(new Set([...cochees, ...filtrees.map((l) => l.id)]));
  };
  const basculerUne = (id: string) => {
    if (!multiple) return;
    const suite = new Set(cochees);
    suite.has(id) ? suite.delete(id) : suite.add(id);
    multiple.surChangement(suite);
  };

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{titre}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {(recherche || filtres?.length || controles) && (
          <div className="flex flex-wrap items-center gap-2">
            {recherche && (
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={terme}
                  onChange={(e) => majTerme(e.target.value)}
                  placeholder={placeholderRecherche}
                  className="h-10 pl-9"
                />
              </div>
            )}
            {controles}
            {filtres?.map((f) => (
              <Select
                key={f.cle}
                value={valeursFiltres?.[f.cle] ?? "all"}
                onValueChange={(v) => { setPage(1); surChangementFiltre?.(f.cle, v); }}
              >
                <SelectTrigger className="h-10 w-[190px]">
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                  <SelectValue placeholder={f.libelle} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{f.libelle}</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o.valeur} value={o.valeur}>{o.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            {(terme || filtreActif) && (
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  majTerme("");
                  filtres?.forEach((f) => surChangementFiltre?.(f.cle, "all"));
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Réinitialiser
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {multiple && cochees.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-y bg-primary/[0.04] px-4 py-2.5">
            <span className="text-sm font-medium">
              {cochees.size} ligne{cochees.size > 1 ? "s" : ""} cochée{cochees.size > 1 ? "s" : ""}
            </span>
            <Button
              variant="ghost" size="sm" className="h-7 px-2 text-xs"
              onClick={() => multiple.surChangement(new Set())}
            >
              <X className="mr-1 h-3 w-3" /> Vider
            </Button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {multiple.actions?.([...cochees])}
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {multiple && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={toutesCochees ? true : surLaPage > 0 ? "indeterminate" : false}
                      onCheckedChange={basculerToutes}
                      aria-label="Tout cocher"
                    />
                  </TableHead>
                )}
                {colonnes.map((c) => (
                  <TableHead
                    key={c.cle}
                    className={cn(CLASSE_VISIBILITE[c.visible ?? "toujours"], c.aligne === "droite" && "text-right")}
                  >
                    {c.entete}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((l, i) => (
                <motion.tr
                  key={l.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.012 }}
                  onClick={() => surSelection?.(l)}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    surSelection && "cursor-pointer",
                    ligneActive === l.id && "bg-primary/5"
                  )}
                >
                  {multiple && (
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={cochees.has(l.id)}
                        onCheckedChange={() => basculerUne(l.id)}
                        aria-label="Cocher la ligne"
                      />
                    </TableCell>
                  )}
                  {colonnes.map((c) => (
                    <TableCell
                      key={c.cle}
                      className={cn(CLASSE_VISIBILITE[c.visible ?? "toujours"], c.aligne === "droite" && "text-right")}
                    >
                      {c.rendu(l)}
                    </TableCell>
                  ))}
                </motion.tr>
              ))}
              {visibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colonnes.length + (multiple ? 1 : 0)} className="py-12 text-center text-sm text-muted-foreground">
                    {vide ?? "Aucun élément ne correspond."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span>
              {(courante - 1) * parPage + 1}–{Math.min(courante * parPage, filtrees.length)} sur {filtrees.length}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={courante === 1} onClick={() => setPage(courante - 1)}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" disabled={courante === pages} onClick={() => setPage(courante + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
