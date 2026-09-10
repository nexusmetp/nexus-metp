"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONTOURS_CONGO, EMPRISE_CONGO } from "@/lib/geo-congo";
import { FONDS, fondParCle, type CleFond } from "@/lib/carte-fonds";
import { LEAFLET_CSS } from "@/lib/leaflet-css";
import { cn } from "@/lib/utils";

/**
 * Carte OpenStreetMap.
 *
 * Leaflet est chargé à la demande, jamais au rendu du serveur : il touche
 * `window` dès son import. Les marqueurs sont vectoriels et non des images,
 * pour deux raisons — ils se colorent selon l'effectif, et un artefact publié
 * ne charge aucune image externe.
 */

export interface PointCarte {
  id: string;
  nom: string;
  sousTitre?: string;
  lat: number;
  lon: number;
  /** Détermine le rayon du marqueur. */
  valeur: number;
  /** Regroupement de légende : direction, établissement, inspection… */
  categorie: string;
  couleur: string;
  /** Ce que le marqueur dit quand on le survole, au-delà de l'effectif. */
  detail?: { libelle: string; valeur: string; ton?: string }[];
  /** Qui dirige : la première question qu'on pose devant une implantation. */
  responsable?: string;
}

const CLE_STYLE = "styles-leaflet";

/** L'infobulle est du HTML : un nom d'établissement ne doit pas s'y injecter. */
const echapper = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function useLeaflet() {
  const [L, setL] = useState<any>(null);
  useEffect(() => {
    let vivant = true;
    if (!document.getElementById(CLE_STYLE)) {
      const el = document.createElement("style");
      el.id = CLE_STYLE;
      el.textContent = LEAFLET_CSS;
      document.head.appendChild(el);
    }
    import("leaflet").then((mod) => { if (vivant) setL(mod.default ?? mod); });
    return () => { vivant = false; };
  }, []);
  return L;
}

export function CarteCongo({
  points, fond, surChangementFond, surSelection, hauteur = 520, className,
}: {
  points: PointCarte[];
  fond: CleFond;
  surChangementFond: (c: CleFond) => void;
  surSelection?: (id: string) => void;
  hauteur?: number;
  className?: string;
}) {
  const L = useLeaflet();
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<any>(null);
  const coucheFond = useRef<any>(null);
  const coucheSurcouche = useRef<any>(null);
  const coucheContours = useRef<any>(null);
  const couchePoints = useRef<any>(null);
  const [tuilesMuettes, setTuilesMuettes] = useState(false);

  /* Création de la carte, une seule fois. */
  useEffect(() => {
    if (!L || !conteneur.current || carte.current) return;
    const c = L.map(conteneur.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    c.fitBounds([[EMPRISE_CONGO.sud, EMPRISE_CONGO.ouest], [EMPRISE_CONGO.nord, EMPRISE_CONGO.est]]);
    // La molette zoome seulement après un clic : sinon la page ne défile plus
    // dès que le curseur passe sur la carte.
    c.on("click", () => c.scrollWheelZoom.enable());
    c.on("mouseout", () => c.scrollWheelZoom.disable());
    carte.current = c;
    return () => { c.remove(); carte.current = null; };
  }, [L]);

  /* Fond de carte. */
  useEffect(() => {
    if (!L || !carte.current) return;
    const c = carte.current;
    [coucheFond, coucheSurcouche, coucheContours].forEach((r) => {
      if (r.current) { c.removeLayer(r.current); r.current = null; }
    });
    setTuilesMuettes(false);
    const f = fondParCle(fond);

    if (!f.url) {
      // Fond vectoriel : les contours sont dans la page, aucune requête.
      coucheContours.current = L.geoJSON(
        {
          type: "FeatureCollection",
          features: CONTOURS_CONGO.map((d) => ({
            type: "Feature",
            properties: { nom: d.nom },
            geometry: { type: "Polygon", coordinates: d.anneaux },
          })),
        },
        {
          style: { color: "#0077B6", weight: 1, fillColor: "#00B4D8", fillOpacity: 0.09 },
          onEachFeature: (feat: any, couche: any) =>
            couche.bindTooltip(feat.properties.nom, { sticky: true }),
        }
      ).addTo(c);
      return;
    }

    const tuiles = L.tileLayer(f.url, {
      maxZoom: f.zoomMax, attribution: f.attribution,
      subdomains: f.url.includes("{s}") ? "abc" : [],
    });
    // Une tuile qui n'arrive pas laisse un damier gris muet : mieux vaut
    // le dire et proposer le fond qui, lui, s'affichera.
    let erreurs = 0;
    tuiles.on("tileerror", () => { if (++erreurs >= 3) setTuilesMuettes(true); });
    tuiles.addTo(c);
    coucheFond.current = tuiles;

    if (f.surcouche) {
      coucheSurcouche.current = L.tileLayer(f.surcouche, { maxZoom: f.zoomMax }).addTo(c);
    }
  }, [L, fond]);

  /* Marqueurs. */
  useEffect(() => {
    if (!L || !carte.current) return;
    const c = carte.current;
    if (couchePoints.current) c.removeLayer(couchePoints.current);
    const groupe = L.layerGroup();
    const max = Math.max(1, ...points.map((p) => p.valeur));

    points.forEach((p) => {
      const rayon = 5 + Math.sqrt(p.valeur / max) * 15;
      const m = L.circleMarker([p.lat, p.lon], {
        radius: rayon,
        color: p.couleur, weight: 1.5, opacity: 0.9,
        fillColor: p.couleur, fillOpacity: 0.35,
      });
      // L'effectif seul ne dit rien : cent trente-cinq agents dont vingt en
      // congé et huit postes vacants n'est pas la même direction que cent
      // trente-cinq agents tous présents.
      const lignes = (p.detail ?? [])
        .map((d) => `<div style="display:flex;gap:8px;justify-content:space-between">
          <span style="color:#475569">${echapper(d.libelle)}</span>
          <strong style="color:${d.ton ?? "#0f172a"}">${echapper(d.valeur)}</strong></div>`)
        .join("");
      m.bindTooltip(
        `<div style="min-width:190px">
          <strong>${echapper(p.nom)}</strong>
          <div style="color:#64748b;margin:2px 0 5px">${echapper(p.sousTitre ?? "")}</div>
          <div style="display:flex;gap:8px;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px">
            <span style="color:#475569">Effectif</span><strong>${p.valeur}</strong></div>
          ${lignes}
          ${p.responsable
            ? `<div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:4px;color:#475569">${echapper(p.responsable)}</div>`
            : ""}
        </div>`,
        { direction: "top", opacity: 1 }
      );
      if (surSelection) m.on("click", () => surSelection(p.id));
      groupe.addLayer(m);
    });

    groupe.addTo(c);
    couchePoints.current = groupe;
  }, [L, points, surSelection]);

  const f = fondParCle(fond);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {FONDS.map((x) => (
          <button
            key={x.cle}
            type="button"
            onClick={() => surChangementFond(x.cle)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
              fond === x.cle
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {x.libelle}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-xl border">
        <div ref={conteneur} style={{ height: hauteur }} className="z-0 bg-muted/40" />
        {!L && (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            Chargement de la carte…
          </div>
        )}
        {tuilesMuettes && (
          <div className="absolute inset-x-3 top-3 z-[400] rounded-lg border border-amber-500/40 bg-background/95 p-3 text-[11px] leading-relaxed shadow-lg backdrop-blur">
            <strong className="text-amber-600">Les tuiles ne se chargent pas.</strong>{" "}
            Cet environnement bloque les images externes. Le fond{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => surChangementFond("contours")}
            >
              Contours (hors ligne)
            </button>{" "}
            est dessiné dans la page et s'affiche sans réseau — les marqueurs et leurs positions
            sont les mêmes.
          </div>
        )}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        <span className="font-medium">{f.libelle}</span> — {f.usage}{" "}
        <span className="opacity-70">· {f.attribution}</span>
      </p>
    </div>
  );
}
