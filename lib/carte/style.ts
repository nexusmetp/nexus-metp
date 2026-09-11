/**
 * Construction du style MapLibre.
 *
 * Un style est décrit en données, pas en appels : on le fabrique ici et la
 * carte se contente de l'appliquer. Changer de fond, c'est remplacer ce
 * document — les couches de données, elles, sont reposées ensuite.
 *
 * Deux règles tiennent tout ce fichier :
 *  - aucune police ni aucun lutin distant. Un style MapLibre va normalement
 *    chercher ses glyphes chez un hébergeur ; on n'écrit donc aucun libellé
 *    dans les couches, et les symboles sont des images fabriquées dans la
 *    page. La carte du ministère ne dépend d'aucun domaine étranger.
 *  - les contours départementaux se posent sur TOUS les fonds. Sur une image
 *    satellite, une limite administrative ne se devine pas.
 */

import type { FeatureCollection, Polygon } from "geojson";
import type { StyleSpecification } from "maplibre-gl";
import { CONTOURS_CONGO } from "@/lib/geo-congo";
import type { FondCarte } from "./fonds";

export const SOURCE_FOND = "fond";
export const SOURCE_SURCOUCHE = "surcouche";
export const SOURCE_LIMITES = "limites";

/** Les douze départements tracés, en GeoJSON. */
export function collectionLimites(): FeatureCollection<Polygon, { nom: string }> {
  return {
    type: "FeatureCollection",
    features: CONTOURS_CONGO.map((d) => ({
      type: "Feature",
      properties: { nom: d.nom },
      geometry: { type: "Polygon", coordinates: d.anneaux },
    })),
  };
}

/** Teintes des limites : lisibles sur le papier comme sur l'image aérienne. */
function teintes(fond: FondCarte) {
  if (fond.imagerie) return { trait: "#ffffff", remplissage: "#ffffff", opacite: 0.06, epaisseur: 1.4 };
  if (fond.sombre) return { trait: "#38bdf8", remplissage: "#0ea5e9", opacite: 0.07, epaisseur: 1.1 };
  return { trait: "#0077B6", remplissage: "#00B4D8", opacite: 0.09, epaisseur: 1.1 };
}

export function construireStyle(fond: FondCarte, limites: boolean): StyleSpecification {
  const t = teintes(fond);
  const style: StyleSpecification = {
    version: 8,
    // Ni glyphs ni sprite : aucune requête vers un hébergeur tiers.
    sources: {},
    layers: [
      {
        id: "papier", type: "background",
        paint: { "background-color": fond.sombre ? "#0b1220" : fond.tuiles ? "#e8eef3" : "#eef4f8" },
      },
    ],
  };

  if (fond.tuiles) {
    style.sources[SOURCE_FOND] = {
      type: "raster", tiles: fond.tuiles, tileSize: 256,
      maxzoom: fond.zoomMax, attribution: fond.attribution,
    };
    style.layers.push({ id: "fond", type: "raster", source: SOURCE_FOND });

    if (fond.surcouche) {
      style.sources[SOURCE_SURCOUCHE] = {
        type: "raster", tiles: fond.surcouche, tileSize: 256, maxzoom: fond.zoomMax,
      };
      style.layers.push({ id: "surcouche", type: "raster", source: SOURCE_SURCOUCHE });
    }
  }

  // Sans tuiles, les contours ne sont plus une surcouche : ils SONT la carte.
  const seul = !fond.tuiles;
  if (limites || seul) {
    style.sources[SOURCE_LIMITES] = { type: "geojson", data: collectionLimites() };
    style.layers.push(
      {
        id: "limites-fond", type: "fill", source: SOURCE_LIMITES,
        paint: { "fill-color": t.remplissage, "fill-opacity": seul ? 0.12 : t.opacite },
      },
      {
        id: "limites-trait", type: "line", source: SOURCE_LIMITES,
        layout: { "line-join": "round" },
        paint: {
          "line-color": t.trait,
          "line-width": seul ? 1.4 : t.epaisseur,
          "line-opacity": fond.imagerie ? 0.75 : 0.95,
        },
      }
    );
  }

  return style;
}
