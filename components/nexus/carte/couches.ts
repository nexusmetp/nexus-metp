"use client";

/**
 * Les couches de données posées sur le fond.
 *
 * Tout ce qui se compte par centaines part sur le processeur graphique :
 * deux cents implantations dessinées une à une en DOM feraient ramer un
 * poste de bureau, et le ministère en aura des milliers le jour où chaque
 * établissement sera saisi. Seuls les amas — quelques dizaines au plus —
 * sont des éléments HTML, parce qu'ils portent deux chiffres et qu'aucune
 * police n'est chargée : un style MapLibre irait chercher ses glyphes chez
 * un hébergeur, ce que la plateforme s'interdit.
 */

import type { FeatureCollection, Point } from "geojson";
import type { Map as CarteML, Marker } from "maplibre-gl";
import { ETATS, FAMILLES, CLE_ICONE, ORDRE_FAMILLES, dataUri, svgFamille } from "@/lib/carte/symboles";
import type { MoteurCarte } from "./moteur";
import type { PointCarte } from "./types";

export const SOURCE_POINTS = "implantations";
export const COUCHE_HALO = "implantations-halo";
export const COUCHE_SYMBOLE = "implantations-symbole";

interface Proprietes {
  id: string; nom: string; famille: string; icone: string;
  effectif: number; rayon: number;
  couleurFamille: string; couleurEtat: string;
  activite: number; conge: number; vacants: number; mouvements: number;
}

/** Le rayon dit l'effectif ; la racine carrée, pour que l'aire soit juste. */
const rayonDe = (effectif: number, max: number) =>
  6 + Math.sqrt(Math.max(0, effectif) / Math.max(1, max)) * 20;

export function collection(points: PointCarte[]): FeatureCollection<Point, Proprietes> {
  const max = Math.max(1, ...points.map((p) => p.effectif));
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: {
        id: p.id, nom: p.nom, famille: p.famille, icone: CLE_ICONE(p.famille),
        effectif: p.effectif, rayon: rayonDe(p.effectif, max),
        couleurFamille: FAMILLES[p.famille].couleur,
        couleurEtat: ETATS[p.etat].couleur,
        activite: p.activite, conge: p.conge,
        vacants: p.vacants, mouvements: p.mouvements,
      },
    })),
  };
}

/* ------------------------------------------------------------- symboles */

const image = (uri: string) =>
  new Promise<HTMLImageElement>((ok, ko) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error("symbole illisible"));
    img.src = uri;
  });

export async function poserSymboles(carte: CarteML) {
  await Promise.all(
    ORDRE_FAMILLES.map(async (f) => {
      const cle = CLE_ICONE(f);
      if (carte.hasImage(cle)) return;
      const img = await image(dataUri(svgFamille(f)));
      // Le style a pu changer pendant le décodage : on revérifie plutôt que
      // de laisser l'ajout échouer sur un style déjà remplacé.
      if (!carte.hasImage(cle)) carte.addImage(cle, img, { pixelRatio: 2 });
    })
  );
}

/* --------------------------------------------------------------- couches */

export function poserCouches(carte: CarteML, points: PointCarte[]) {
  if (!carte.getSource(SOURCE_POINTS)) {
    carte.addSource(SOURCE_POINTS, {
      type: "geojson",
      data: collection(points),
      cluster: true,
      clusterRadius: 46,
      // Au-delà, on regarde une ville : les implantations doivent se séparer.
      clusterMaxZoom: 10,
      // Un amas porte la somme de ce qu'il cache, sinon il ne dit qu'« ici,
      // plusieurs » — ce que l'œil voyait déjà.
      clusterProperties: {
        effectif: ["+", ["get", "effectif"]],
        activite: ["+", ["get", "activite"]],
        conge: ["+", ["get", "conge"]],
        vacants: ["+", ["get", "vacants"]],
        mouvements: ["+", ["get", "mouvements"]],
      },
    });
  }

  const seul = ["!", ["has", "point_count"]] as any;

  if (!carte.getLayer(COUCHE_HALO)) {
    carte.addLayer({
      id: COUCHE_HALO, type: "circle", source: SOURCE_POINTS, filter: seul,
      paint: {
        // Le halo ne descend jamais sous le symbole qu'il entoure : sans ce
        // plancher, une petite implantation cachait son propre anneau d'état
        // derrière son icône, et la couleur — la seule chose qui dise où
        // regarder — disparaissait précisément là où elle est utile.
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          4, ["max", 7, ["*", ["get", "rayon"], 0.7]],
          9, ["max", 11, ["get", "rayon"]],
          14, ["max", 22, ["*", ["get", "rayon"], 1.7]],
        ],
        "circle-color": ["get", "couleurFamille"],
        "circle-opacity": 0.18,
        "circle-stroke-color": ["get", "couleurEtat"],
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 0.92,
      },
    });
  }

  if (!carte.getLayer(COUCHE_SYMBOLE)) {
    carte.addLayer({
      id: COUCHE_SYMBOLE, type: "symbol", source: SOURCE_POINTS, filter: seul,
      layout: {
        "icon-image": ["get", "icone"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 10, 0.7, 14, 0.95],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  }
}

export function majPoints(carte: CarteML, points: PointCarte[]) {
  const src = carte.getSource(SOURCE_POINTS) as any;
  src?.setData?.(collection(points));
}

/* ----------------------------------------------------------------- amas */

/** Un amas grossit avec ce qu'il cache, sans jamais écraser la carte. */
const tailleAmas = (n: number) => Math.round(30 + Math.min(22, Math.sqrt(n) * 5));

function elementAmas(nombreSites: number, effectif: number, teinte: string) {
  const d = document.createElement("div");
  const px = tailleAmas(nombreSites);
  d.className = "grid cursor-pointer place-items-center rounded-full text-white shadow-lg ring-2 ring-white/80";
  d.style.cssText = `width:${px}px;height:${px}px;background:${teinte};line-height:1`;
  d.innerHTML =
    `<span class="text-[11px] font-bold tabular-nums">${effectif}</span>` +
    `<span class="text-[8px] font-medium opacity-80">${nombreSites} sites</span>`;
  d.title = `${nombreSites} implantations, ${effectif} agents — cliquer pour ouvrir`;
  return d;
}

/**
 * Les amas se redessinent à chaque rendu du moteur : c'est le seul moment où
 * MapLibre garantit que les tuiles de la source sont à jour. On réutilise les
 * repères déjà posés, sinon la carte clignoterait à chaque image.
 */
export function rafraichirAmas(
  moteur: MoteurCarte,
  carte: CarteML,
  poses: Map<number, Marker>
) {
  // Sans couche, il n'y a plus de source à interroger : les repères posés
  // deviendraient des chiffres figés sur une carte qui a changé.
  if (!carte.getLayer(COUCHE_HALO)) {
    poses.forEach((m) => m.remove());
    poses.clear();
    return;
  }
  const vus = new Set<number>();

  carte.querySourceFeatures(SOURCE_POINTS).forEach((f: any) => {
    if (!f.properties?.cluster) return;
    const id = f.properties.cluster_id as number;
    if (vus.has(id)) return;
    vus.add(id);
    if (poses.has(id)) return;

    const p = f.properties;
    const teinte =
      p.vacants / Math.max(1, p.effectif) >= 0.05 ? ETATS.VACANCE.couleur
        : (p.conge / Math.max(1, p.effectif) >= 0.1 ? ETATS.CONGE.couleur : "#0B4F6C");
    const el = elementAmas(p.point_count, p.effectif, teinte);
    el.addEventListener("click", async () => {
      const src = carte.getSource(SOURCE_POINTS) as any;
      const z = await src.getClusterExpansionZoom(id);
      carte.easeTo({ center: f.geometry.coordinates, zoom: z + 0.2, duration: 500 });
    });
    poses.set(id, new moteur.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(carte));
  });

  poses.forEach((m, id) => {
    if (!vus.has(id)) { m.remove(); poses.delete(id); }
  });
}
