/**
 * Référentiels du SIRH du METP.
 *
 * Écrit d'après le cahier fonctionnel de la DGARH. Chaque entité porte sa
 * provenance : « TEXTE » = corroboré par une source publique, « A_VERIFIER »
 * = hypothèse à confirmer sur le Journal officiel, « RECOMMANDATION » = choix
 * de conception. Cf. cahier §01 — ne jamais présenter du A_VERIFIER comme du droit.
 */

import type { Provenance } from "@/lib/types";

export const APP_NAME = "NEXUS-METP";
export const APP_TAGLINE = "Système Intégré de Gestion des Ressources Humaines";
export const MINISTERE_NOM = "Ministère de l'Enseignement Technique et Professionnel";
/**
 * Marque de l'État. Les deux fichiers vivent dans /public : pour poser les
 * originaux du ministère, on les écrase, et toute l'application suit — écran
 * d'ouverture, connexion, barre latérale, en-têtes de documents.
 *
 * Ils sont servis par l'application elle-même, et non depuis un hébergeur
 * tiers : les armoiries d'un ministère ne doivent pas dépendre d'un domaine
 * que la DGARH ne contrôle pas, et la plateforme doit s'afficher entièrement
 * hors ligne.
 */
export const ARMOIRIES_URL = "/armoiries-congo.svg";
export const DRAPEAU_URL = "/drapeau-congo.svg";

/** @deprecated Utilisez ARMOIRIES_URL, ou le composant <Armoiries />. */
export const LOGO_URL = ARMOIRIES_URL;

/* ------------------------------------------------------------------ */
/* Textes de référence — cahier §18                                    */
/* ------------------------------------------------------------------ */

export const TEXTES = {
  /** Statut en vigueur. Remplace la loi n° 021-89 du 14 novembre 1989. */
  STATUT: "Loi n° 68-2022 du 16 août 2022 portant statut général de la fonction publique",
  ARR_25565: "Arrêté n° 25565 du 17 octobre 2022 (JO 2022-44)",
  ARR_25566: "Arrêté n° 25566 du 17 octobre 2022 (JO 2022-44)",
  ARR_25567: "Arrêté n° 25567 du 17 octobre 2022 (JO 2022-44)",
  ARR_25569: "Arrêté n° 25569 du 17 octobre 2022 (JO 2022-45)",
  ARR_25570: "Arrêté n° 25570 du 17 octobre 2022 (JO 2022-45)",
  ARR_25571: "Arrêté n° 25571 du 17 octobre 2022 (JO 2022-45)",
} as const;

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  TEXTE: "Texte",
  A_VERIFIER: "À vérifier",
  RECOMMANDATION: "Recommandation",
};

/** Ce qui manque encore pour figer le référentiel. Affiché dans l'espace DGARH. */
export const LACUNES = [
  {
    sujet: "Composition du cabinet du ministre",
    manque: "Texte de nomination et d'organisation du cabinet du METP",
    ou: "Aucune référence retrouvée",
    consequence:
      "Le cabinet est représenté d'après le schéma constant des ministères congolais. "
      + "Son personnel est géré par la DGARH comme celui des directions, mais le détail "
      + "de ses unités reste à confirmer.",
  },
  {
    sujet: "Détail des services et bureaux de la DGARH",
    manque: "Texte intégral de l'arrêté n° 25567 du 17 octobre 2022",
    ou: "Journal officiel n° 44-2022 — intitulé établi, contenu non consulté",
    consequence:
      "L'arrêté est identifié avec certitude ; c'est son dispositif qui manque. "
      + "Les services et bureaux retenus par l'outil sont donc plausibles, non attestés.",
  },
  {
    sujet: "Dénomination des relais départementaux de contrôle",
    manque: "Texte intégral de l'arrêté n° 25570 du 17 octobre 2022",
    ou: "Journal officiel n° 45-2022",
    consequence:
      "L'intitulé officiel de l'arrêté dit « bureaux départementaux de la supervision et "
      + "du contrôle ». L'outil les nomme encore « antennes départementales d'appui et de "
      + "contrôle » : dénomination à reprendre sur l'original.",
  },
  {
    sujet: "Décret d'attributions et d'organisation du ministère",
    manque: "Numéro et date du décret dont procèdent les arrêtés d'octobre 2022",
    ou: "Référence non retrouvée à ce jour",
    consequence:
      "C'est le chaînon qui relierait le ministère à ses directions générales. "
      + "Sans lui, l'échelon supérieur de l'arborescence reste une reconstitution.",
  },
  {
    sujet: "Liste réelle des établissements",
    manque: "Carte scolaire de l'enseignement technique et professionnel",
    ou: "Document non consulté — les établissements sont un gabarit",
    consequence:
      "Les effectifs déployés sur la vue nationale suivent donc une répartition "
      + "vraisemblable, et non la carte réelle des lycées et collèges techniques.",
  },
  {
    sujet: "Grille indiciaire et statuts particuliers",
    manque: "Textes d'application de la loi n° 68-2022",
    ou: "Loi identifiée et publiée ; grille et statuts particuliers non consultés",
    consequence:
      "Les catégories I à III et leurs trois échelles sont établies par la loi. "
      + "Les indices chiffrés portés par l'outil restent, eux, une reconstitution.",
  },
];
/* ------------------------------------------------------------------ */
