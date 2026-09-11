"use client";

/**
 * Le moteur de rendu, isolé dans son propre module.
 *
 * MapLibre GL pèse un mégaoctet et touche `window` dès l'import : il ne peut
 * ni partir avec le rendu serveur, ni s'attacher au premier octet servi. Ce
 * fichier est donc le seul point d'entrée, toujours chargé au geste — et
 * c'est aussi le seul à remplacer par un talon dans la maquette autonome, où
 * ni les tuiles ni les travailleurs `blob:` ne passent.
 */

import "maplibre-gl/dist/maplibre-gl.css";
import type * as MapLibre from "maplibre-gl";

export type MoteurCarte = typeof MapLibre;

export const MOTEUR_EMBARQUE = true;

/**
 * MapLibre 5 exige WebGL 2. Un poste dont le pilote graphique est bloqué en
 * est privé, et il en existe encore dans les services : on le vérifie avant
 * de charger le mégaoctet, pour servir la carte à plat plutôt qu'un cadre
 * noir.
 */
export function webglDisponible(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    // Le contexte se libère aussitôt : on ne testait que la capacité.
    (gl as any)?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * Le travailleur, servi depuis /public.
 *
 * MapLibre calcule l'adresse de son travailleur depuis `import.meta.url`.
 * Après assemblage, cette adresse pointe sur le morceau produit par le
 * constructeur, où le fichier n'existe pas — et la carte reste noire sans rien
 * dire. `scripts/vendorer-carte.mjs` dépose le travailleur dans /public avant
 * chaque dev et chaque build ; on le lui annonce ici. Même origine : pas de
 * `blob:`, donc rien qui heurte une politique de sécurité de contenu stricte.
 */
const TRAVAILLEUR = "/maplibre/maplibre-gl-worker.mjs";

let promesse: Promise<MoteurCarte> | null = null;

export function charger(): Promise<MoteurCarte> {
  promesse ??= import("maplibre-gl").then((m) => {
    const moteur = ((m as any).default ?? m) as MoteurCarte;
    moteur.setWorkerUrl(TRAVAILLEUR);
    return moteur;
  });
  return promesse;
}

/** L'interface du moteur est en anglais par défaut ; celle du ministère non. */
export const LOCALE_FR: Record<string, string> = {
  "AttributionControl.ToggleAttribution": "Afficher les sources",
  "AttributionControl.MapFeedback": "Signaler une erreur sur la carte",
  "FullscreenControl.Enter": "Plein écran",
  "FullscreenControl.Exit": "Quitter le plein écran",
  "GeolocateControl.FindMyLocation": "Me localiser",
  "GeolocateControl.LocationNotAvailable": "Position indisponible",
  "LogoControl.Title": "MapLibre",
  "Map.Title": "Carte",
  "Marker.Title": "Implantation",
  "NavigationControl.ResetBearing": "Remettre le nord en haut",
  "NavigationControl.ZoomIn": "Agrandir",
  "NavigationControl.ZoomOut": "Réduire",
  "Popup.Close": "Fermer",
  "ScaleControl.Meters": " m",
  "ScaleControl.Kilometers": " km",
  "ScaleControl.Feet": " pi",
  "ScaleControl.Miles": " mi",
  "ScaleControl.NauticalMiles": " nmi",
  "CooperativeGesturesHandler.WindowsHelpText": "Ctrl + molette pour zoomer",
  "CooperativeGesturesHandler.MacHelpText": "⌘ + molette pour zoomer",
  "CooperativeGesturesHandler.MobileHelpText": "Deux doigts pour déplacer la carte",
};
