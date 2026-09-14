"use client";

/**
 * Les quinze départements, et ce qu'ils pèsent.
 *
 * Le tableau lit la carte autrement : un marqueur montre où sont les agents,
 * une ligne montre combien ils sont par rapport aux autres. Les deux se
 * répondent — cliquer une ligne ouvre ce qui est implanté au chef-lieu.
 */

import { useMemo } from "react";
import { DEPARTEMENTS } from "@/lib/referentiels";
import { fmtNum, fmtPct } from "@/lib/format";
import { Jauge, type Colonne } from "@/components/nexus/module";
import type { Implantation } from "./implantations";

export interface LigneDepartement {
  id: string;
  nom: string;
  chefLieu: string;
  effectif: number;
  implantations: number;
  etablissements: number;
  besoins: number;
  part: number;
}

export function useDepartements(
  implantations: Implantation[],
  besoinsParDepartement: Map<string, number>,
  effectifNational: number,
  situationDe: (id: string) => { effectif: number }
): LigneDepartement[] {
  return useMemo(() => {
    const total = effectifNational || 1;
    return DEPARTEMENTS.map((d) => {
      /* Les directions départementales se **cherchent**, elles ne se
         reconstruisent pas.

         Cette ligne fabriquait l'identifiant : `ENT-DD-01`, `ENT-DD-02`… La
         lecture des arrêtés n° 25571 et 25572 a montré qu'il en existe deux
         séries — une par direction générale — et les a renommées `ENT-DDET-01`
         et `ENT-DDEP-01`. L'identifiant fabriqué ne désignait alors plus rien :
         `situationDe` rendait zéro pour les quinze départements, la vue
         nationale annonçait 355 agents déployés au lieu de près de deux mille,
         et rien n'échouait — une chaîne de caractères ne se type pas. */
      const directions = implantations.filter(
        (p) => p.niveau === "DIRECTION_DEPARTEMENTALE" && p.ville === d.chefLieu);
      const surPlace = implantations.filter((p) => p.ville === d.chefLieu);
      // Les deux directions départementales et leurs branches, plus les
      // antennes d'encadrement installées au chef-lieu : elles relèvent de
      // l'inspection interdépartementale, mais leur personnel est déployé là.
      const effectif = directions.reduce((s, p) => s + situationDe(p.id).effectif, 0)
        + surPlace.filter((p) => p.niveau === "ANTENNE_DEPARTEMENTALE")
            .reduce((s, p) => s + p.situation.effectif, 0);
      /* La ligne porte l'identifiant de la direction de l'enseignement
         technique : c'est elle qui tient les établissements, donc les états de
         besoins remontés du département. */
      const id = directions.find((p) => p.sigle.startsWith("DDET"))?.id
        ?? directions[0]?.id ?? "";
      return {
        id, nom: d.nom, chefLieu: d.chefLieu, effectif,
        implantations: surPlace.length,
        etablissements: surPlace.filter((p) => p.niveau === "ETABLISSEMENT").length,
        besoins: directions.reduce((s, p) => s + (besoinsParDepartement.get(p.id) ?? 0), 0),
        part: (effectif / total) * 100,
      };
    }).sort((a, b) => b.effectif - a.effectif);
  }, [implantations, besoinsParDepartement, effectifNational, situationDe]);
}

export const COLONNES_DEPARTEMENT: Colonne<LigneDepartement>[] = [
  {
    cle: "departement", entete: "Département",
    rendu: (d) => (
      <div className="min-w-0">
        <div className="text-sm font-medium">{d.nom}</div>
        <div className="text-[11px] text-muted-foreground">chef-lieu : {d.chefLieu}</div>
      </div>
    ),
  },
  {
    cle: "effectif", entete: "Effectif", aligne: "droite",
    rendu: (d) => <span className="tabular-nums text-sm font-medium">{fmtNum(d.effectif)}</span>,
  },
  {
    cle: "part", entete: "Part nationale", aligne: "droite", visible: "md",
    rendu: (d) => (
      <div className="ml-auto w-24">
        <div className="mb-1 text-right text-[11px] tabular-nums">{fmtPct(d.part)}</div>
        <Jauge valeur={d.part * 5} />
      </div>
    ),
  },
  {
    cle: "etablissements", entete: "Établissements", aligne: "droite", visible: "lg",
    rendu: (d) => <span className="tabular-nums text-sm">{fmtNum(d.etablissements)}</span>,
  },
  {
    cle: "implantations", entete: "Implantations", aligne: "droite", visible: "xl",
    rendu: (d) => <span className="tabular-nums text-sm">{fmtNum(d.implantations)}</span>,
  },
  {
    cle: "besoins", entete: "États de besoins", aligne: "droite", visible: "lg",
    rendu: (d) => <span className="tabular-nums text-sm">{fmtNum(d.besoins)}</span>,
  },
];
