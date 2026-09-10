"use client";

import { useEffect, useRef, useState } from "react";
import { CONTOURS_CONGO, EMPRISE_CONGO } from "@/lib/geo-congo";
import { LEAFLET_CSS } from "@/lib/leaflet-css";

/**
 * Choix d'un point sur la carte.
 *
 * Volontairement sur le fond vectoriel seul : le formulaire doit fonctionner
 * partout, y compris là où les tuiles ne se chargent pas. Le repère cliqué
 * reste juste — ce sont les coordonnées qui comptent, pas le décor.
 */
export function SelecteurPoint({
  lat, lon, surChoix, hauteur = 240,
}: {
  lat?: number;
  lon?: number;
  surChoix: (lat: number, lon: number) => void;
  hauteur?: number;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<any>(null);
  const marqueur = useRef<any>(null);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    let vivant = true;
    if (!document.getElementById("styles-leaflet")) {
      const el = document.createElement("style");
      el.id = "styles-leaflet";
      el.textContent = LEAFLET_CSS;
      document.head.appendChild(el);
    }
    import("leaflet").then((m) => { if (vivant) setL(m.default ?? m); });
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    if (!L || !conteneur.current || carte.current) return;
    const c = L.map(conteneur.current, { zoomControl: true, attributionControl: false });
    c.fitBounds([[EMPRISE_CONGO.sud, EMPRISE_CONGO.ouest], [EMPRISE_CONGO.nord, EMPRISE_CONGO.est]]);
    L.geoJSON(
      {
        type: "FeatureCollection",
        features: CONTOURS_CONGO.map((d) => ({
          type: "Feature",
          properties: { nom: d.nom },
          geometry: { type: "Polygon", coordinates: d.anneaux },
        })),
      },
      {
        style: { color: "#0077B6", weight: 1, fillColor: "#00B4D8", fillOpacity: 0.1 },
        onEachFeature: (f: any, couche: any) => couche.bindTooltip(f.properties.nom, { sticky: true }),
      }
    ).addTo(c);
    c.on("click", (e: any) => surChoix(e.latlng.lat, e.latlng.lng));
    carte.current = c;
    return () => { c.remove(); carte.current = null; };
  }, [L, surChoix]);

  useEffect(() => {
    if (!L || !carte.current) return;
    if (marqueur.current) { carte.current.removeLayer(marqueur.current); marqueur.current = null; }
    if (typeof lat === "number" && typeof lon === "number") {
      marqueur.current = L.circleMarker([lat, lon], {
        radius: 8, color: "#0077B6", weight: 2, fillColor: "#00B4D8", fillOpacity: 0.7,
      }).addTo(carte.current);
    }
  }, [L, lat, lon]);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div ref={conteneur} style={{ height: hauteur }} className="z-0 bg-muted/40" />
    </div>
  );
}
