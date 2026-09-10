/**
 * Fonds de carte.
 *
 * Sept fonds tuilés et un fond vectoriel qui ne demande aucun réseau. Le
 * dernier n'est pas un lot de consolation : dans un bureau sans connexion,
 * comme dans une maquette publiée, c'est le seul qui s'affiche, et il porte
 * les vraies limites départementales.
 *
 * Chaque fond déclare sa POLITIQUE d'usage. Ce n'est pas un ornement
 * juridique : les serveurs de tuiles cités ici sont offerts par des
 * associations, et tous interdisent l'usage massif. Un ministère de plusieurs
 * milliers d'agents dépasse ce cadre dès la première semaine. La règle est
 * écrite à côté du fond pour qu'on ne l'apprenne pas le jour du blocage.
 */

export type CleFond =
  | "plan" | "clair" | "sombre" | "humanitaire"
  | "satellite" | "hybride" | "relief" | "contours";

export interface FondCarte {
  cle: CleFond;
  libelle: string;
  /** Gabarits de tuiles. Absent pour le fond vectoriel. */
  tuiles?: string[];
  /** Calque de libellés posé par-dessus l'imagerie. */
  surcouche?: string[];
  attribution: string;
  zoomMax: number;
  /** Ce que le fond montre : le choix doit être utile, pas décoratif. */
  usage: string;
  /** Ce que le fournisseur autorise, et ce qu'il faut prévoir en production. */
  politique: string;
  /** Fond foncé : les marqueurs et les contours s'éclaircissent. */
  sombre?: boolean;
  /** Imagerie aérienne : ni relevé OpenStreetMap, ni donnée libre. */
  imagerie?: boolean;
}

export const FONDS: FondCarte[] = [
  {
    cle: "plan", libelle: "Plan",
    tuiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© contributeurs OpenStreetMap",
    zoomMax: 19,
    usage: "Routes, localités et limites administratives. Le fond de référence pour situer un établissement.",
    politique: "Tuiles de la Fondation OpenStreetMap : usage modéré seulement. En production, héberger son propre rendu ou passer par un fournisseur.",
  },
  {
    cle: "clair", libelle: "Épuré",
    tuiles: ["https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{ratio}.png"],
    attribution: "© CARTO — données © contributeurs OpenStreetMap",
    zoomMax: 19,
    usage: "Le même relevé, en gris pâle : les marqueurs et les effectifs passent au premier plan.",
    politique: "Fonds CARTO, gratuits pour un usage non commercial avec attribution. Au-delà, un compte est requis.",
  },
  {
    cle: "sombre", libelle: "Sombre",
    tuiles: ["https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{ratio}.png"],
    attribution: "© CARTO — données © contributeurs OpenStreetMap",
    zoomMax: 19, sombre: true,
    usage: "Pour la projection en salle et les écrans de veille : le fond s'efface, les implantations restent.",
    politique: "Fonds CARTO, mêmes conditions que le fond épuré.",
  },
  {
    cle: "humanitaire", libelle: "Humanitaire",
    tuiles: ["https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png",
             "https://tile-b.openstreetmap.fr/hot/{z}/{x}/{y}.png"],
    attribution: "Style humanitaire — OSM France, données © contributeurs OpenStreetMap",
    zoomMax: 19,
    usage: "Le rendu du Humanitarian OSM Team : pistes, écoles et centres de santé y ressortent. Le plus lisible en zone rurale.",
    politique: "Serveurs d'OpenStreetMap France, offerts à la communauté. Usage modéré ; un rendu propre s'impose en production.",
  },
  {
    cle: "satellite", libelle: "Satellite",
    tuiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Imagerie Esri, Maxar, Earthstar Geographics",
    zoomMax: 18, imagerie: true,
    usage: "Vue aérienne. Utile pour vérifier l'emprise réelle d'un établissement ou l'état d'un site.",
    politique: "Imagerie Esri — ce n'est pas OpenStreetMap et ce n'est pas une donnée libre. Les conditions d'Esri s'appliquent ; un marché ou une convention est à prévoir.",
  },
  {
    cle: "hybride", libelle: "Hybride",
    tuiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    surcouche: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Imagerie Esri — libellés Esri",
    zoomMax: 18, imagerie: true,
    usage: "L'image aérienne avec les noms de lieux par-dessus : reconnaître le terrain sans perdre les repères.",
    politique: "Mêmes conditions Esri que le fond satellite.",
  },
  {
    cle: "relief", libelle: "Relief",
    tuiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
             "https://b.tile.opentopomap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenTopoMap (CC-BY-SA), données © contributeurs OpenStreetMap",
    zoomMax: 17,
    usage: "Topographie et hydrographie. Éclaire les temps de trajet réels dans les départements enclavés.",
    politique: "OpenTopoMap, projet bénévole : usage explicitement limité. Le rendu est reproductible sur un serveur du ministère.",
  },
  {
    cle: "contours", libelle: "Contours",
    attribution: "geoBoundaries — limites ADM1 antérieures à 2024",
    zoomMax: 12,
    usage: "Limites départementales dessinées dans la page, sans aucune tuile. Le seul fond qui s'affiche sans réseau.",
    politique: "Aucune requête sortante : rien à négocier, rien à surveiller.",
  },
];

export const fondParCle = (c: CleFond) => FONDS.find((f) => f.cle === c) ?? FONDS[0];

/** Les fonds tuilés se rangent par famille, pour un sélecteur lisible. */
export const GROUPES_FONDS: { titre: string; cles: CleFond[] }[] = [
  { titre: "Plans", cles: ["plan", "clair", "sombre", "humanitaire"] },
  { titre: "Terrain", cles: ["satellite", "hybride", "relief"] },
  { titre: "Hors ligne", cles: ["contours"] },
];
