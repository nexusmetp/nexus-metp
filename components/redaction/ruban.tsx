"use client";

import { useState } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Braces, CaseSensitive,
  Eraser, Heading2, Heading3, Highlighter, Indent, Italic, Library, List, ListOrdered,
  Minus, Outdent, Pilcrow, Redo2, Strikethrough, Subscript, Superscript, Table,
  Underline, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MenuJetons } from "./menu-jetons";
import { cn } from "@/lib/utils";

/**
 * Le ruban du traitement de texte.
 *
 * Les commandes sont rangées comme dans les suites bureautiques que les
 * agents connaissent — Accueil, Insertion, Mise en page, Révision — parce
 * qu'un outil de l'administration ne doit rien faire réapprendre : le geste
 * appris ailleurs doit marcher ici.
 *
 * `document.execCommand` est marqué obsolète par la spécification, mais il
 * reste la seule commande d'édition riche que tous les navigateurs
 * implémentent sans bibliothèque. Un moteur d'édition complet ajouterait
 * plusieurs centaines de kilo-octets pour mettre un mot en gras.
 */

export interface RubanProps {
  /** Rend la main à la feuille avant d'exécuter : sinon rien ne s'applique. */
  surFocus: () => void;
  surChangement: () => void;
  /** Écrit du texte brut au curseur — les champs de fusion. */
  surInsertion: (texte: string) => void;
  /** Déposer le texte courant comme modèle de la bibliothèque. */
  surDepot: () => void;
  libelleDepot: string;
  desactive?: boolean;
  className?: string;
}

type Outil = { cle: string; titre: string; icone: any; commande: string; valeur?: string };

const ACCUEIL: Outil[][] = [
  [
    { cle: "gras", titre: "Gras", icone: Bold, commande: "bold" },
    { cle: "italique", titre: "Italique", icone: Italic, commande: "italic" },
    { cle: "souligne", titre: "Souligné", icone: Underline, commande: "underline" },
    { cle: "barre", titre: "Barré", icone: Strikethrough, commande: "strikeThrough" },
  ],
  [
    { cle: "puces", titre: "Liste à puces", icone: List, commande: "insertUnorderedList" },
    { cle: "numeros", titre: "Liste numérotée", icone: ListOrdered, commande: "insertOrderedList" },
    { cle: "retrait", titre: "Augmenter le retrait", icone: Indent, commande: "indent" },
    { cle: "sortie", titre: "Diminuer le retrait", icone: Outdent, commande: "outdent" },
  ],
  [
    { cle: "gauche", titre: "Aligner à gauche", icone: AlignLeft, commande: "justifyLeft" },
    { cle: "centre", titre: "Centrer", icone: AlignCenter, commande: "justifyCenter" },
    { cle: "droite", titre: "Aligner à droite", icone: AlignRight, commande: "justifyRight" },
    { cle: "justifie", titre: "Justifier", icone: AlignJustify, commande: "justifyFull" },
  ],
];

const INSERTION: Outil[][] = [
  [
    { cle: "filet", titre: "Filet horizontal", icone: Minus, commande: "insertHorizontalRule" },
    { cle: "exposant", titre: "Exposant", icone: Superscript, commande: "superscript" },
    { cle: "indice", titre: "Indice", icone: Subscript, commande: "subscript" },
  ],
];

const REVISION: Outil[][] = [
  [
    { cle: "annuler", titre: "Annuler", icone: Undo2, commande: "undo" },
    { cle: "refaire", titre: "Rétablir", icone: Redo2, commande: "redo" },
    { cle: "netto", titre: "Retirer la mise en forme", icone: Eraser, commande: "removeFormat" },
  ],
  [
    { cle: "surligner", titre: "Surligner", icone: Highlighter, commande: "hiliteColor", valeur: "#fff3a3" },
  ],
];

/** Les styles du document administratif, nommés comme ils se disent. */
const STYLES: { valeur: string; libelle: string }[] = [
  { valeur: "<p>", libelle: "Corps de texte" },
  { valeur: "<h2>", libelle: "Titre" },
  { valeur: "<h3>", libelle: "Sous-titre" },
  { valeur: "<blockquote>", libelle: "Citation en retrait" },
];

/** Le document est en Times : les autres corps sont là pour les tableaux. */
const POLICES = ["Times New Roman", "Arial", "Georgia", "Courier New"];
const TAILLES = ["10", "11", "12", "14", "16"];

const ONGLETS = ["accueil", "insertion", "mise-en-page", "revision"] as const;
type Onglet = (typeof ONGLETS)[number];

const LIBELLE_ONGLET: Record<Onglet, string> = {
  accueil: "Accueil",
  insertion: "Insertion",
  "mise-en-page": "Mise en page",
  revision: "Révision",
};

export function Ruban({
  surFocus, surChangement, surInsertion, surDepot, libelleDepot, desactive, className,
}: RubanProps) {
  const [onglet, setOnglet] = useState<Onglet>("accueil");

  const executer = (commande: string, valeur?: string) => {
    if (desactive) return;
    surFocus();
    try {
      document.execCommand(commande, false, valeur);
    } catch {
      // Une commande refusée ne doit pas emporter la frappe en cours.
    }
    surChangement();
  };

  const bouton = (o: Outil) => (
    <Button
      key={o.cle}
      type="button"
      variant="ghost"
      size="icon"
      title={o.titre}
      aria-label={o.titre}
      disabled={desactive}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      // `onMouseDown` : au `click`, la sélection dans la feuille est déjà
      // perdue et la commande porterait dans le vide.
      onMouseDown={(e) => { e.preventDefault(); executer(o.commande, o.valeur); }}
    >
      <o.icone className="h-4 w-4" />
    </Button>
  );

  const groupes = (blocs: Outil[][]) => blocs.map((bloc, i) => (
    <div key={i} className="flex items-center">
      {i > 0 && <span aria-hidden className="mx-1 h-5 w-px bg-border" />}
      {bloc.map(bouton)}
    </div>
  ));

  return (
    <div className={cn("rounded-lg border bg-muted/40", className)}>
      <Tabs value={onglet} onValueChange={(v: string) => setOnglet(v as Onglet)}>
        <TabsList className="h-9 w-full justify-start rounded-b-none rounded-t-lg bg-transparent p-0">
          {ONGLETS.map((o) => (
            <TabsTrigger
              key={o}
              value={o}
              className="h-9 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {LIBELLE_ONGLET[o]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-1 border-t p-1.5">
        {onglet === "accueil" && (
          <>
            <Select onValueChange={(v: string) => executer("formatBlock", v)}>
              <SelectTrigger className="h-8 w-[9.5rem] text-xs" aria-label="Style de paragraphe">
                <SelectValue placeholder="Corps de texte" />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.valeur} value={s.valeur} className="text-xs">{s.libelle}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v: string) => executer("fontName", v)}>
              <SelectTrigger className="h-8 w-[8.5rem] text-xs" aria-label="Police">
                <SelectValue placeholder="Times New Roman" />
              </SelectTrigger>
              <SelectContent>
                {POLICES.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span aria-hidden className="mx-1 h-5 w-px bg-border" />
            {groupes(ACCUEIL)}
          </>
        )}

        {onglet === "insertion" && (
          <>
            {groupes(INSERTION)}
            <span aria-hidden className="mx-1 h-5 w-px bg-border" />
            <Button
              type="button" variant="ghost" size="sm" disabled={desactive}
              className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
              title="Insérer un tableau de trois colonnes"
              onMouseDown={(e) => { e.preventDefault(); executer("insertHTML", TABLEAU); }}
            >
              <Table className="mr-1.5 h-4 w-4" /> Tableau
            </Button>
            <MenuJetons desactive={desactive} surChoix={surInsertion} />
          </>
        )}

        {onglet === "mise-en-page" && (
          <>
            <Select onValueChange={(v: string) => executer("fontSize", v)}>
              <SelectTrigger className="h-8 w-[7.5rem] text-xs" aria-label="Corps du texte">
                <SelectValue placeholder="Taille" />
              </SelectTrigger>
              <SelectContent>
                {TAILLES.map((t, i) => (
                  <SelectItem key={t} value={String(i + 2)} className="text-xs">{t} points</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span aria-hidden className="mx-1 h-5 w-px bg-border" />
            {groupes([[
              { cle: "para2", titre: "Paragraphe", icone: Pilcrow, commande: "formatBlock", valeur: "<p>" },
              { cle: "h2b", titre: "Titre", icone: Heading2, commande: "formatBlock", valeur: "<h2>" },
              { cle: "h3b", titre: "Sous-titre", icone: Heading3, commande: "formatBlock", valeur: "<h3>" },
            ]])}
            <span className="ml-2 text-[10px] text-muted-foreground">
              Feuille A4 · marges de l'imprimé administratif
            </span>
          </>
        )}

        {onglet === "revision" && (
          <>
            {groupes(REVISION)}
            <span aria-hidden className="mx-1 h-5 w-px bg-border" />
            <Button
              type="button" variant="ghost" size="sm" disabled={desactive}
              className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
              title="Vérifier l'orthographe (correcteur du navigateur)"
              onMouseDown={(e) => { e.preventDefault(); surFocus(); }}
            >
              <CaseSensitive className="mr-1.5 h-4 w-4" /> Correcteur actif
            </Button>
            <Button
              type="button" variant="outline" size="sm" disabled={desactive}
              className="h-8 text-[11px]"
              onClick={surDepot}
            >
              <Library className="mr-1.5 h-3.5 w-3.5" /> {libelleDepot}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Trois colonnes, bordures visibles : la forme d'un tableau d'état. */
const TABLEAU = `<table class="doc-tableau"><thead><tr><th>Colonne</th><th>Colonne</th><th>Colonne</th></tr></thead>`
  + `<tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`
  + `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p class="doc-paragraphe">&nbsp;</p>`;
