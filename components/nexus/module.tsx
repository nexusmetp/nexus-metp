"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/nexus/ui-kit";
import { tonDuRang, type Ton } from "@/components/nexus/tons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* ------------------------------------------------------------------ */
/* Le gabarit d'un module                                              */
/*                                                                     */
/* Chaque écran de l'application est bâti sur les mêmes pièces :        */
/* une rangée de tuiles de même taille, une barre de filtres, un        */
/* tableau, un panneau de détail. L'utilisateur retrouve les mêmes      */
/* gestes d'une page à l'autre, et le code ne se recopie pas.           */
/* ------------------------------------------------------------------ */

export interface Tuile {
  titre: string;
  valeur: string | number;
  sousTitre?: string;
  icon: any;
  variation?: number;
  /** Où mène le chiffre : une tuile qui ne s'ouvre sur rien est un cul-de-sac. */
  href?: string;
  /** Ce que dit la couleur. À défaut, la position dans la rangée en donne un. */
  ton?: Ton;
}

/**
 * Toujours quatre colonnes en grand écran, toujours la même hauteur : les
 * tuiles s'alignent d'une page à l'autre. Elles apparaissent en cascade —
 * assez pour que l'œil suive, assez court pour ne pas faire attendre.
 */
export function RangeeKpi({ tuiles }: { tuiles: Tuile[] }) {
  if (!tuiles.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {tuiles.slice(0, 4).map((t, i) => {
        const carte = (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <KpiCard {...t} ton={t.ton ?? tonDuRang(i)} />
          </motion.div>
        );
        return t.href ? (
          <Link
            key={t.titre} href={t.href}
            className="group h-full rounded-xl outline-none ring-offset-background transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-0.5"
          >
            {carte}
          </Link>
        ) : (
          <Fragment key={t.titre}>{carte}</Fragment>
        );
      })}
    </div>
  );
}

export interface Filtre {
  cle: string;
  libelle: string;
  options: { valeur: string; libelle: string }[];
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
  titre, description, lignes, colonnes, recherche, filtres, valeursFiltres,
  surChangementFiltre, surSelection, ligneActive, vide, actions, parPage = 12,
  rechercheTexte, surRecherche, placeholderRecherche = "Rechercher…",
}: {
  titre: string;
  description?: string;
  lignes: T[];
  colonnes: Colonne<T>[];
  recherche?: (ligne: T, terme: string) => boolean;
  filtres?: Filtre[];
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

        {(recherche || filtres?.length) && (
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={colonnes.length} className="py-12 text-center text-sm text-muted-foreground">
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

/**
 * Fiche de détail — la prévisualisation d'une ligne.
 *
 * Une fenêtre centrée, pas un tiroir pleine hauteur : la fiche se lit d'un
 * regard, l'en-tête et les actions restent en place, seul le corps défile.
 */
export function PanneauDetail({
  ouvert, surFermeture, titre, sousTitre, etiquette, children, actions, large = false,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  titre: string;
  sousTitre?: string;
  etiquette?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && surFermeture()}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
          large ? "sm:max-w-3xl" : "sm:max-w-2xl"
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-5 text-left">
          {etiquette && <div className="flex flex-wrap items-center gap-2">{etiquette}</div>}
          <DialogTitle className="pr-8 text-lg leading-tight">{titre}</DialogTitle>
          {sousTitre && <DialogDescription>{sousTitre}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Bloc titré dans un panneau de détail. */
export function Section({ titre, children, action }: {
  titre: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titre}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Ligne clé / valeur, l'unité d'affichage des panneaux de détail. */
export function LigneInfo({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{k}</span>
      <span className="text-right text-sm font-medium">{v ?? "—"}</span>
    </div>
  );
}

/** Boîte de dialogue de saisie — création et modification. */
export function DialogueFormulaire({
  ouvert, surFermeture, titre, description, children, surValidation,
  libelleValidation = "Enregistrer", validationPossible = true, large = false,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  titre: string;
  description?: string;
  children: React.ReactNode;
  surValidation: () => void;
  libelleValidation?: string;
  validationPossible?: boolean;
  large?: boolean;
}) {
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && surFermeture()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", large ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader className="space-y-1.5">
          <DialogTitle>{titre}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-2">{children}</div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={surFermeture}>Annuler</Button>
          <Button onClick={surValidation} disabled={!validationPossible}>{libelleValidation}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* — Champs de formulaire — */

export function Champ({ label, aide, children, obligatoire }: {
  label: string; aide?: string; children: React.ReactNode; obligatoire?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium">
        {label}
        {obligatoire && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {aide && <p className="text-[11px] leading-relaxed text-muted-foreground">{aide}</p>}
    </div>
  );
}

export function ChampTexte({ label, valeur, surChangement, aide, obligatoire, placeholder, type = "text" }: {
  label: string; valeur: string; surChangement: (v: string) => void;
  aide?: string; obligatoire?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <Champ label={label} aide={aide} obligatoire={obligatoire}>
      <Input type={type} value={valeur} placeholder={placeholder} onChange={(e) => surChangement(e.target.value)} />
    </Champ>
  );
}

export function ChampZone({ label, valeur, surChangement, aide, obligatoire, placeholder, lignes = 4 }: {
  label: string; valeur: string; surChangement: (v: string) => void;
  aide?: string; obligatoire?: boolean; placeholder?: string; lignes?: number;
}) {
  return (
    <Champ label={label} aide={aide} obligatoire={obligatoire}>
      <Textarea value={valeur} rows={lignes} placeholder={placeholder} onChange={(e) => surChangement(e.target.value)} />
    </Champ>
  );
}

export function ChampSelect({ label, valeur, surChangement, options, aide, obligatoire, placeholder }: {
  label: string; valeur: string; surChangement: (v: string) => void;
  options: { valeur: string; libelle: string }[];
  aide?: string; obligatoire?: boolean; placeholder?: string;
}) {
  return (
    <Champ label={label} aide={aide} obligatoire={obligatoire}>
      <Select value={valeur} onValueChange={surChangement}>
        <SelectTrigger><SelectValue placeholder={placeholder ?? "Choisir…"} /></SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => <SelectItem key={o.valeur} value={o.valeur}>{o.libelle}</SelectItem>)}
        </SelectContent>
      </Select>
    </Champ>
  );
}

/**
 * Dépôt d'une photographie d'identité.
 *
 * Le cliché est lu dans le navigateur et conservé en données incorporées :
 * il n'y a pas de serveur de fichiers, et une photographie qui pointerait
 * ailleurs se briserait au premier changement d'hébergement.
 */
export function ChampPhoto({
  label, valeur, surChangement, aide, apercu,
}: {
  label: string;
  valeur?: string | null;
  surChangement: (v: string | null) => void;
  aide?: string;
  apercu: React.ReactNode;
}) {
  const lire = (fichier?: File) => {
    if (!fichier) return;
    if (fichier.size > 1_500_000) {
      alert("Photographie trop lourde : 1,5 Mo au maximum.");
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => surChangement(String(lecteur.result));
    lecteur.readAsDataURL(fichier);
  };

  return (
    <Champ label={label} aide={aide}>
      <div className="flex items-center gap-4 rounded-lg border p-3">
        {apercu}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file" accept="image/*" className="sr-only"
              onChange={(e) => lire(e.target.files?.[0])}
            />
            <span className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-medium transition hover:bg-muted">
              Choisir une photographie
            </span>
          </label>
          {valeur && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => surChangement(null)}>
              Retirer
            </Button>
          )}
        </div>
      </div>
    </Champ>
  );
}

/** Barre de progression sobre, réutilisée par les états de diffusion. */
export function Jauge({ valeur, teinte = "bg-primary" }: { valeur: number; teinte?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", teinte)} style={{ width: `${Math.min(100, Math.max(0, valeur))}%` }} />
    </div>
  );
}

export { Fragment, Badge };
