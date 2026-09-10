/**
 * Fonds de carte disponibles.
 *
 * Quatre fonds tuilés — plan, satellite, hybride, relief — et un fond
 * vectoriel qui ne demande aucun réseau. Ce dernier n'est pas un lot de
 * consolation : dans un artefact publié, comme dans un bureau sans
 * connexion, c'est le seul qui s'affiche, et il porte les vraies limites
 * départementales.
 */

export type CleFond = "plan" | "satellite" | "hybride" | "relief" | "contours";

export interface FondCarte {
  cle: CleFond;
  libelle: string;
  /** Absent pour le fond vectoriel. */
  url?: string;
  /** Calque de libellés posé par-dessus, pour l'hybride. */
  surcouche?: string;
  attribution: string;
  zoomMax: number;
  /** Décrit ce que le fond montre, pour que le choix ne soit pas décoratif. */
  usage: string;
}

export const FONDS: FondCarte[] = [
  {
    cle: "plan", libelle: "Plan",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© contributeurs OpenStreetMap",
    zoomMax: 19,
    usage: "Routes, localités et limites administratives. Le fond de référence pour situer un établissement.",
  },
  {
    cle: "satellite", libelle: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagerie Esri, Maxar, Earthstar Geographics",
    zoomMax: 18,
    usage: "Vue aérienne. Utile pour vérifier l'emprise réelle d'un établissement ou l'état d'un site.",
  },
  {
    cle: "hybride", libelle: "Hybride",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    surcouche: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagerie Esri — libellés Esri",
    zoomMax: 18,
    usage: "L'image aérienne avec les noms de lieux par-dessus : reconnaître le terrain sans perdre les repères.",
  },
  {
    cle: "relief", libelle: "Relief",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap, contributeurs OpenStreetMap",
    zoomMax: 17,
    usage: "Topographie et hydrographie. Éclaire les temps de trajet réels dans les départements enclavés.",
  },
  {
    cle: "contours", libelle: "Contours (hors ligne)",
    attribution: "geoBoundaries — limites ADM1 antérieures à 2024",
    zoomMax: 12,
    usage: "Limites départementales dessinées dans la page, sans aucune tuile. Le seul fond qui s'affiche sans réseau.",
  },
];

export const fondParCle = (c: CleFond) => FONDS.find((f) => f.cle === c) ?? FONDS[0];
