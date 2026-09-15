"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, SlidersHorizontal, X } from "lucide-react";
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
}

export interface Colonne<T> {
  cle: string;
  entete: string;
  /**
   * Ce sur quoi la colonne se trie, quand elle se trie.
   *
   * `rendu` produit du JSX : on ne peut pas comparer deux cartouches. La
   * colonne dit donc séparément la **valeur** qu'elle montre — un nom, un
   * nombre, une date en ISO. Sans cette fonction, l'en-tête ne se clique pas :
   * une colonne qui n'a pas d'ordre naturel n'en invente pas un.
   */
  valeurTri?: (ligne: T) => string | number | undefined;
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
  /* L'ordre demandé par le lecteur. `null` veut dire « celui de la source » —
     les écrans trient déjà leurs lignes à dessein, et repartir de zéro à
     l'ouverture effacerait ce choix. */
  const [tri, setTri] = useState<{ cle: string; sens: "asc" | "desc" } | null>(null);
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

  const triees = useMemo(() => {
    if (!tri) return filtrees;
    const colonne = colonnes.find((c) => c.cle === tri.cle);
    if (!colonne?.valeurTri) return filtrees;
    const signe = tri.sens === "asc" ? 1 : -1;
    /* Une valeur absente va toujours à la fin, dans les deux sens : ce qu'on
       cherche en triant, c'est ce qui est renseigné. */
    return [...filtrees].sort((a, b) => {
      const x = colonne.valeurTri!(a);
      const y = colonne.valeurTri!(b);
      if (x === undefined || x === "") return 1;
      if (y === undefined || y === "") return -1;
      return typeof x === "number" && typeof y === "number"
        ? (x - y) * signe
        : String(x).localeCompare(String(y), "fr", { numeric: true }) * signe;
    });
  }, [filtrees, tri, colonnes]);

  const basculerTri = (cle: string) => {
    setPage(1);
    setTri((t) => (t?.cle !== cle
      ? { cle, sens: "asc" }
      : t.sens === "asc" ? { cle, sens: "desc" } : null));
  };

  const pages = Math.max(1, Math.ceil(triees.length / parPage));
  const courante = Math.min(page, pages);
  const visibles = triees.slice((courante - 1) * parPage, courante * parPage);
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
    /* Pas de confirmation ici, et c'est délibéré : cocher ne fait rien. Ce
       qui pouvait mal tourner — nommer trois mille agents dans une note,
       ouvrir un fil avec deux cents personnes — est arrêté par les plafonds
       des actions elles-mêmes, où la question se pose vraiment. Une boîte
       native de plus n'aurait protégé de rien, et elle parle la langue du
       navigateur, pas celle du ministère. */
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
                  /* Toutes les clés de l'état, et pas seulement les menus
                     déroulants : le sélecteur d'entité est un contrôle à part,
                     et « Réinitialiser » le laissait en place — on croyait
                     avoir tout remis à zéro avec un filtre encore posé. */
                  Object.keys(valeursFiltres ?? {}).forEach((cle) => surChangementFiltre?.(cle, "all"));
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
                    {c.valeurTri ? (
                      <button
                        type="button"
                        onClick={() => basculerTri(c.cle)}
                        className={cn(
                          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
                          tri?.cle === c.cle ? "text-foreground" : "text-muted-foreground",
                          c.aligne === "droite" && "flex-row-reverse"
                        )}
                      >
                        {c.entete}
                        {tri?.cle !== c.cle
                          ? <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          : tri.sens === "asc"
                            ? <ArrowUp className="h-3 w-3" />
                            : <ArrowDown className="h-3 w-3" />}
                      </button>
                    ) : c.entete}
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
              {(courante - 1) * parPage + 1}–{Math.min(courante * parPage, triees.length)} sur {triees.length}
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
