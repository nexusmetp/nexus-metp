"use client";

/**
 * Choix d'un point sur la carte.
 *
 * Poser un établissement au bon endroit demande de voir le bâtiment : le
 * sélecteur offre donc le plan et l'image aérienne, pas seulement le tracé
 * des départements. Mais il s'ouvre sur le fond hors ligne, qui s'affiche
 * partout — le formulaire doit fonctionner dans un bureau sans connexion, et
 * les coordonnées saisies à la main restent la voie de secours.
 */

import { useEffect, useRef, useState } from "react";
import type { Map as CarteML, Marker } from "maplibre-gl";
import { EMPRISE_CONGO } from "@/lib/geo-congo";
import { construireStyle } from "@/lib/carte/style";
import { fondParCle, type CleFond } from "@/lib/carte/fonds";
import { LOCALE_FR, MOTEUR_EMBARQUE, charger, webglDisponible, type MoteurCarte } from "@/components/nexus/carte/moteur";
import { cn } from "@/lib/utils";

const FONDS_CHOIX: CleFond[] = ["contours", "plan", "satellite", "hybride"];

export function SelecteurPoint({
  lat, lon, surChoix, hauteur = 240,
}: {
  lat?: number;
  lon?: number;
  surChoix: (lat: number, lon: number) => void;
  hauteur?: number;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteML | null>(null);
  const moteur = useRef<MoteurCarte | null>(null);
  const marqueur = useRef<Marker | null>(null);
  const rappel = useRef(surChoix);
  rappel.current = surChoix;

  const [pret, setPret] = useState(false);
  const [sansWebgl, setSansWebgl] = useState(false);
  const [fond, setFond] = useState<CleFond>("contours");

  useEffect(() => {
    let vivant = true;
    if (!MOTEUR_EMBARQUE || !webglDisponible()) { setSansWebgl(true); return; }
    charger().then(
      (m) => { if (vivant) { moteur.current = m; setPret(true); } },
      () => { if (vivant) setSansWebgl(true); }
    );
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    const m = moteur.current;
    if (!pret || !m || !conteneur.current || carte.current) return;
    const c = new m.Map({
      container: conteneur.current,
      style: construireStyle(fondParCle("contours"), true),
      bounds: [[EMPRISE_CONGO.ouest, EMPRISE_CONGO.sud], [EMPRISE_CONGO.est, EMPRISE_CONGO.nord]],
      fitBoundsOptions: { padding: 16 },
      minZoom: 4, maxZoom: 19,
      attributionControl: { compact: true },
      locale: LOCALE_FR,
      cooperativeGestures: true,
    });
    c.addControl(new m.NavigationControl({ showCompass: false }), "top-right");
    c.on("click", (e) => rappel.current(e.lngLat.lat, e.lngLat.lng));
    c.getCanvas().style.cursor = "crosshair";
    carte.current = c;
    return () => { c.remove(); carte.current = null; marqueur.current = null; };
  }, [pret]);

  useEffect(() => {
    carte.current?.setStyle(construireStyle(fondParCle(fond), true));
  }, [fond]);

  /* Le repère se pose et se déplace ; le recréer à chaque frappe ferait
     clignoter le formulaire pendant la saisie des coordonnées. */
  useEffect(() => {
    const m = moteur.current, c = carte.current;
    if (!m || !c) return;
    const place = typeof lat === "number" && typeof lon === "number";
    if (!place) { marqueur.current?.remove(); marqueur.current = null; return; }
    if (!marqueur.current) marqueur.current = new m.Marker({ color: "#0077B6" }).setLngLat([lon!, lat!]).addTo(c);
    else marqueur.current.setLngLat([lon!, lat!]);
  }, [pret, lat, lon]);

  if (sansWebgl) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
        La carte n'est pas disponible ici{MOTEUR_EMBARQUE ? " (WebGL 2 indisponible sur ce poste)" : ""}.
        Saisissez la latitude et la longitude dans les deux champs ci-dessous : elles sont la
        donnée qui compte, la carte n'en était que la saisie.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {FONDS_CHOIX.map((f) => (
          <button key={f} type="button" onClick={() => setFond(f)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-medium transition",
              fond === f ? "border-primary/50 bg-primary/10 text-primary"
                         : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
            )}>
            {fondParCle(f).libelle}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div ref={conteneur} style={{ height: hauteur }} className="z-0 w-full bg-muted/40" />
      </div>
    </div>
  );
}
