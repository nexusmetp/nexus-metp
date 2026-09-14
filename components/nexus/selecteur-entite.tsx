"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, X } from "lucide-react";
import { NIVEAU_LABELS, cheminDe } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import type { Entite } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Choisir une entité parmi six cents                                  */
/* ------------------------------------------------------------------ */

/**
 * Le filtre d'entité était un menu déroulant plat.
 *
 * Tant que le ministère comptait cent cinquante entités, cela passait. Il en
 * compte six cent trente-neuf depuis que l'organigramme est bâti sur les
 * arrêtés, et un menu déroulant de six cents lignes sans recherche ni
 * hiérarchie n'est pas un filtre — c'est un mur. L'annuaire s'en tirait en
 * n'en affichant que les quatre-vingt-dix premières, ce qui revenait à cacher
 * les cinq cent quarante-neuf autres sans le dire.
 *
 * Or c'est précisément le geste que la DGARH fait le plus : elle tient le
 * fichier de tout le ministère et ne l'exploite qu'en le découpant par
 * structure. Il lui faut donc trois choses, et ce sont celles-ci :
 *
 *  - **chercher** — au sigle comme à l'intitulé, parce qu'on connaît « DAFM »
 *    ou « archives », rarement les deux ;
 *  - **situer** — chaque entité est rangée sous la grande structure dont elle
 *    relève, et porte sa chaîne : « SAD » seul ne dit pas de quelle direction
 *    générale il s'agit, et il existe plusieurs services des archives ;
 *  - **peser** — l'effectif en regard, parce qu'un filtre qu'on choisit pour
 *    le vider n'apprend rien.
 */
export function SelecteurEntite({
  entites, valeur, surChangement, effectifDe, libelleVide = "Toutes les entités",
}: {
  entites: Entite[];
  /** `"all"` pour « aucune borne ». */
  valeur: string;
  surChangement: (valeur: string) => void;
  /** Effectif de la branche, affiché en regard. Facultatif. */
  effectifDe?: (entiteId: string) => number;
  libelleVide?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");

  /* La chaîne et la structure de tête, calculées une fois. */
  const enrichies = useMemo(() => entites.map((e) => {
    const chaine = cheminDe(e.id);
    return {
      entite: e,
      /* La grande structure : ce qui pend au ministère. C'est le seul
         regroupement qui parle à tout le monde. */
      tete: chaine[1]?.sigle ?? "Ministère",
      chemin: chaine.slice(1, -1).map((c) => c.sigle).join(" › "),
      profondeur: Math.max(0, chaine.length - 2),
      /* La clé de l'ordre : le chemin complet. Trier par sigle rangeait les
         bureaux avant les directions dont ils relèvent, et l'indentation ne
         disait plus rien. Trier par chemin donne l'ordre de l'arbre. */
      ordre: chaine.map((c) => c.sigle).join("/"),
    };
  }), [entites]);

  const groupes = useMemo(() => {
    const t = requete.trim().toLowerCase();
    const retenues = t
      ? enrichies.filter((x) =>
          x.entite.sigle.toLowerCase().includes(t)
          || x.entite.nom.toLowerCase().includes(t)
          || x.chemin.toLowerCase().includes(t))
      : enrichies;

    const m = new Map<string, typeof enrichies>();
    for (const x of retenues) {
      const liste = m.get(x.tete);
      if (liste) liste.push(x);
      else m.set(x.tete, [x]);
    }
    /* Les plus grosses structures en tête : c'est là qu'on cherche le plus.
       Dans chacune, l'ordre de l'arbre. */
    m.forEach((liste) => liste.sort((a, b) => a.ordre.localeCompare(b.ordre)));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [enrichies, requete]);

  const choisie = entites.find((e) => e.id === valeur);
  const total = groupes.reduce((s, [, l]) => s + l.length, 0);

  return (
    <div className="flex items-center gap-1">
      <Popover open={ouvert} onOpenChange={(o) => { setOuvert(o); if (!o) setRequete(""); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={ouvert}
            className="h-10 w-[230px] justify-start gap-1.5 px-3 font-normal"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="min-w-0 flex-1 truncate text-left">
              {choisie ? choisie.sigle : libelleVide}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[340px] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Sigle, intitulé, direction…"
              value={requete}
              onValueChange={setRequete}
            />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>Aucune entité ne correspond.</CommandEmpty>

              <CommandItem
                value="__toutes"
                onSelect={() => { surChangement("all"); setOuvert(false); }}
                className="gap-2"
              >
                <Check className={cn("h-3.5 w-3.5", valeur === "all" ? "opacity-100" : "opacity-0")} />
                <span className="font-medium">{libelleVide}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{fmtNum(total)}</span>
              </CommandItem>

              {groupes.map(([tete, liste]) => (
                <CommandGroup key={tete} heading={tete}>
                  {liste.map(({ entite, chemin, profondeur }) => (
                    <CommandItem
                      key={entite.id}
                      value={entite.id}
                      onSelect={() => { surChangement(entite.id); setOuvert(false); }}
                      className="gap-2"
                    >
                      <Check className={cn("h-3.5 w-3.5 shrink-0",
                        valeur === entite.id ? "opacity-100" : "opacity-0")} />
                      {/* L'indentation dit la profondeur sans écrire un chiffre. */}
                      <div className="min-w-0 flex-1" style={{ paddingLeft: Math.min(profondeur, 4) * 8 }}>
                        <div className="truncate text-xs">
                          <span className="font-semibold">{entite.sigle}</span>
                          <span className="ml-1.5 text-muted-foreground">{entite.nom}</span>
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground/70">
                          {NIVEAU_LABELS[entite.niveau] ?? entite.niveau}
                          {chemin && ` · ${chemin}`}
                        </div>
                      </div>
                      {effectifDe && (
                        <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                          {fmtNum(effectifDe(entite.id))}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {valeur !== "all" && (
        <Button
          variant="ghost" size="icon" className="h-8 w-8 shrink-0"
          aria-label="Retirer le filtre d'entité"
          onClick={() => surChangement("all")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
