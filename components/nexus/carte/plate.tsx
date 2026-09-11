"use client";

/**
 * La carte à plat : contours et implantations en SVG, sans moteur.
 *
 * Elle sert deux cas réels et non hypothétiques : le poste dont le pilote
 * graphique est bloqué — il en reste dans les services — et la maquette
 * publiée, où ni les tuiles ni les travailleurs `blob:` ne passent. Ce n'est
 * pas un message d'erreur déguisé : les positions, les tailles et les
 * couleurs sont exactement celles de la carte pleine, et un clic ouvre la
 * même fiche.
 */

import { useMemo } from "react";
import { CONTOURS_CONGO, EMPRISE_CONGO } from "@/lib/geo-congo";
import { ETATS, FAMILLES } from "@/lib/carte/symboles";
import { cn } from "@/lib/utils";
import type { PointCarte } from "./types";

const L = 900;
const H = 1000;

/** Mercator sphérique : les mêmes proportions que sur la carte pleine. */
function projecteur() {
  const y = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const x0 = EMPRISE_CONGO.ouest, x1 = EMPRISE_CONGO.est;
  const y0 = y(EMPRISE_CONGO.nord), y1 = y(EMPRISE_CONGO.sud);
  return (lon: number, lat: number): [number, number] => [
    ((lon - x0) / (x1 - x0)) * L,
    ((y(lat) - y0) / (y1 - y0)) * H,
  ];
}

export function CartePlate({
  points, surSelection, hauteur = 560, className,
}: {
  points: PointCarte[];
  surSelection?: (id: string) => void;
  hauteur?: number | string;
  className?: string;
}) {
  const { chemins, marques } = useMemo(() => {
    const proj = projecteur();
    const chemins = CONTOURS_CONGO.map((d) => ({
      nom: d.nom,
      d: d.anneaux
        .map((a) => "M" + a.map(([lo, la]) => proj(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z")
        .join(" "),
    }));
    const max = Math.max(1, ...points.map((p) => p.effectif));
    const marques = points.map((p) => {
      const [x, y] = proj(p.lon, p.lat);
      return {
        p, x, y,
        r: 5 + Math.sqrt(p.effectif / max) * 22,
      };
    }).sort((a, b) => b.r - a.r);
    return { chemins, marques };
  }, [points]);

  return (
    <div className={cn("w-full overflow-hidden bg-slate-50 dark:bg-slate-900/40", className)} style={{ height: hauteur }}>
      <svg viewBox={`0 0 ${L} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="Carte des implantations du ministère">
        <g>
          {chemins.map((c) => (
            <path key={c.nom} d={c.d} fill="#00B4D8" fillOpacity={0.1} stroke="#0077B6" strokeWidth={1.2}>
              <title>{c.nom}</title>
            </path>
          ))}
        </g>
        <g>
          {marques.map((m) => (
            <g key={m.p.id} onClick={() => surSelection?.(m.p.id)}
               className={surSelection ? "cursor-pointer" : undefined}>
              <circle cx={m.x} cy={m.y} r={m.r}
                      fill={FAMILLES[m.p.famille].couleur} fillOpacity={0.2}
                      stroke={ETATS[m.p.etat].couleur} strokeWidth={2} strokeOpacity={0.92} />
              <circle cx={m.x} cy={m.y} r={5} fill={FAMILLES[m.p.famille].couleur} stroke="#fff" strokeWidth={1.4} />
              <title>{`${m.p.nom} — ${m.p.effectif} agents · ${ETATS[m.p.etat].libelle}`}</title>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
