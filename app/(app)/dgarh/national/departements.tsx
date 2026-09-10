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
    return DEPARTEMENTS.map((d, i) => {
      const id = `ENT-DD-${String(i + 1).padStart(2, "0")}`;
      const surPlace = implantations.filter((p) => p.ville === d.chefLieu);
      // La direction départementale et sa branche, plus les antennes de
      // contrôle installées au chef-lieu : elles relèvent de l'inspection
      // interdépartementale, mais leur personnel est bien déployé là.
      const effectif = situationDe(id).effectif
        + surPlace.filter((p) => p.niveau === "ANTENNE_DEPARTEMENTALE")
            .reduce((s, p) => s + p.situation.effectif, 0);
      return {
        id, nom: d.nom, chefLieu: d.chefLieu, effectif,
        implantations: surPlace.length,
        etablissements: surPlace.filter((p) => p.niveau === "ETABLISSEMENT").length,
        besoins: besoinsParDepartement.get(id) ?? 0,
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
