"use client";

/**
 * La surface de la carte.
 *
 * Un seul composant tient le moteur, et il le tient impérativement : MapLibre
 * possède son propre cycle de vie, et le faire piloter par le rendu React
 * reviendrait à recréer la carte à chaque frappe de clavier. React décide
 * *quoi* montrer, ce fichier décide *comment* le poser.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Map as CarteML, Marker, Popup } from "maplibre-gl";
import { EMPRISE_CONGO } from "@/lib/geo-congo";
import { construireStyle, SOURCE_FOND } from "@/lib/carte/style";
import { fondParCle, type CleFond } from "@/lib/carte/fonds";
import { LOCALE_FR, MOTEUR_EMBARQUE, charger, webglDisponible, type MoteurCarte } from "./moteur";
import {
  COUCHE_HALO, COUCHE_SYMBOLE, SOURCE_POINTS,
  majPoints, poserCouches, poserSymboles, rafraichirAmas,
} from "./couches";
import { htmlInfobulle } from "./infobulle";
import type { PointCarte } from "./types";

const EMPRISE: [[number, number], [number, number]] = [
  [EMPRISE_CONGO.ouest, EMPRISE_CONGO.sud],
  [EMPRISE_CONGO.est, EMPRISE_CONGO.nord],
];

export interface PoigneeCarte {
  cadrerPays: () => void;
  allerA: (lat: number, lon: number, zoom?: number) => void;
}

export type EtatMoteur = "chargement" | "prete" | "sans-webgl" | "non-embarque" | "absent";

export interface ProprietesToile {
  points: PointCarte[];
  fond: CleFond;
  limites: boolean;
  surSelection?: (id: string) => void;
  surEtatMoteur?: (e: EtatMoteur) => void;
  surTuilesMuettes?: (muettes: boolean) => void;
  hauteur?: number | string;
}

export const ToileCarte = forwardRef<PoigneeCarte, ProprietesToile>(function ToileCarte(
  { points, fond, limites, surSelection, surEtatMoteur, surTuilesMuettes, hauteur = 560 },
  ref
) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteML | null>(null);
  const moteur = useRef<MoteurCarte | null>(null);
  const bulle = useRef<Popup | null>(null);
  const amas = useRef<Map<number, Marker>>(new Map());
  const index = useRef<Map<string, PointCarte>>(new Map());
  const derniers = useRef<PointCarte[]>(points);
  const [pret, setPret] = useState(false);

  index.current = new Map(points.map((p) => [p.id, p]));
  derniers.current = points;

  useImperativeHandle(ref, () => ({
    cadrerPays: () => carte.current?.fitBounds(EMPRISE, { padding: 34, duration: 700 }),
    allerA: (lat, lon, zoom = 12) =>
      carte.current?.flyTo({ center: [lon, lat], zoom, duration: 900 }),
  }), []);

  /* --------------------------------------------------- naissance du moteur */
  useEffect(() => {
    let vivant = true;
    if (!MOTEUR_EMBARQUE) { surEtatMoteur?.("non-embarque"); return; }
    if (!webglDisponible()) { surEtatMoteur?.("sans-webgl"); return; }
    surEtatMoteur?.("chargement");
    charger().then(
      (m) => { if (vivant) { moteur.current = m; setPret(true); } },
      () => { if (vivant) surEtatMoteur?.("absent"); }
    );
    return () => { vivant = false; };
  }, [surEtatMoteur]);

  /* ------------------------------------------------------ création, une fois */
  useEffect(() => {
    const m = moteur.current;
    if (!pret || !m || !conteneur.current || carte.current) return;

    const c = new m.Map({
      container: conteneur.current,
      style: construireStyle(fondParCle(fond), limites),
      bounds: EMPRISE,
      fitBoundsOptions: { padding: 34 },
      // Le pays entier tient au zoom 4,6 : descendre plus bas ne montre que
      // l'océan, et donne l'impression d'avoir perdu la carte.
      minZoom: 4,
      maxZoom: 19,
      attributionControl: { compact: true },
      locale: LOCALE_FR,
      // La molette seule ferait défiler la page sous le curseur ; MapLibre
      // demande Ctrl et l'annonce lui-même, en français.
      cooperativeGestures: true,
      fadeDuration: 120,
    });
    carte.current = c;

    c.addControl(new m.NavigationControl({ visualizePitch: true }), "top-right");
    c.addControl(new m.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
    c.addControl(new m.FullscreenControl(), "top-right");
    c.addControl(new m.GeolocateControl({ trackUserLocation: false }), "top-right");

    bulle.current = new m.Popup({ closeButton: false, closeOnClick: false, offset: 15, maxWidth: "280px" });

    // `setStyle` emporte sources, couches et images : il faut les reposer à
    // chaque changement de fond. `style.load` est le seul événement qui le
    // garantisse — `styledata` se déclenche aussi pendant le chargement des
    // tuiles, et `isStyleLoaded()` ne repasse jamais à vrai quand une tuile
    // n'arrive pas. S'en remettre à lui laissait la carte muette derrière des
    // amas figés, ce que rien à l'écran ne trahissait.
    const reposer = async () => {
      await poserSymboles(c);
      poserCouches(c, derniers.current);
    };
    c.on("load", async () => { await reposer(); surEtatMoteur?.("prete"); });
    c.on("style.load" as any, reposer);
    c.on("render", () => {
      if (c.getSource(SOURCE_POINTS) && c.isSourceLoaded(SOURCE_POINTS)) {
        rafraichirAmas(m, c, amas.current);
      }
    });

    const survol = (ev: any) => {
      const p = index.current.get(ev.features?.[0]?.properties?.id);
      if (!p) return;
      c.getCanvas().style.cursor = "pointer";
      bulle.current?.setLngLat([p.lon, p.lat]).setHTML(htmlInfobulle(p)).addTo(c);
    };
    const sortie = () => { c.getCanvas().style.cursor = ""; bulle.current?.remove(); };
    const clic = (ev: any) => {
      const id = ev.features?.[0]?.properties?.id;
      if (id) surSelection?.(id);
    };
    [COUCHE_HALO, COUCHE_SYMBOLE].forEach((couche) => {
      c.on("mousemove", couche, survol);
      c.on("mouseleave", couche, sortie);
      c.on("click", couche, clic);
    });

    return () => {
      amas.current.forEach((x) => x.remove());
      amas.current.clear();
      c.remove();
      carte.current = null;
    };
    // Le fond et les limites d'origine ne servent qu'au premier style : les
    // changements passent par l'effet suivant, sans détruire la carte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);

  /* ------------------------------------------------------------ changements */
  useEffect(() => {
    if (!carte.current) return;
    surTuilesMuettes?.(false);
    carte.current.setStyle(construireStyle(fondParCle(fond), limites));
  }, [fond, limites, surTuilesMuettes]);

  useEffect(() => {
    if (carte.current?.getSource(SOURCE_POINTS)) majPoints(carte.current, points);
  }, [points]);

  /* Une tuile absente laisse un damier muet : mieux vaut le dire. */
  const echecs = useRef(0);
  useEffect(() => { echecs.current = 0; }, [fond]);
  useEffect(() => {
    const c = carte.current;
    if (!c) return;
    const surErreur = (ev: any) => {
      if (ev?.sourceId !== SOURCE_FOND) return;
      if (++echecs.current >= 4) surTuilesMuettes?.(true);
    };
    c.on("error", surErreur);
    return () => { c.off("error", surErreur); };
  }, [pret, surTuilesMuettes]);

  /* La barre latérale se replie sans que la fenêtre bouge : le moteur ne le
     voit pas seul, et la carte reste alors dessinée à l'ancienne largeur. */
  useEffect(() => {
    if (!conteneur.current) return;
    const o = new ResizeObserver(() => carte.current?.resize());
    o.observe(conteneur.current);
    return () => o.disconnect();
  }, [pret]);

  const redimensionner = useCallback(() => carte.current?.resize(), []);
  useEffect(() => {
    document.addEventListener("fullscreenchange", redimensionner);
    return () => document.removeEventListener("fullscreenchange", redimensionner);
  }, [redimensionner]);

  return <div ref={conteneur} style={{ height: hauteur }} className="z-0 w-full bg-muted/40" />;
});
