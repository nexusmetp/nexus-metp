/**
 * Fonds réglementaire — cahier §14, §18.
 *
 * Chaque entrée porte sa provenance. Les références ci-dessous ont été
 * corroborées auprès de sources publiques (base NATLEX de l'OIT, site du
 * ministère de la fonction publique, base de droit congolais du Secrétariat
 * général du Gouvernement). Le texte intégral des arrêtés du METP n'a pas pu
 * être ouvert depuis cet environnement : leur intitulé et leur publication
 * sont donc établis, mais pas leur contenu article par article — d'où la
 * provenance « à vérifier » sur les entités qu'ils sont censés fonder.
 */

import type { TexteReglementaire } from "@/lib/types";

/** Résumé prudent : dire ce que le titre établit, jamais ce qu'on suppose dedans. */
export const TEXTES_CORPUS: TexteReglementaire[] = [
  {
    id: "TXT-0001",
    reference: "Loi n° 021-89 du 14 novembre 1989",
    titre: "Portant refonte du statut général de la fonction publique",
    nature: "LOI", dateSignature: "1989-11-14",
    resume:
      "Code de la fonction publique congolaise pendant trente-trois ans : droits et obligations, "
      + "recrutement, positions, avancement, discipline, cessation de fonctions. Modifiée en 2007 "
      + "et en 2010, puis remplacée par la loi n° 68-2022. Reste le fondement des situations "
      + "constituées sous son empire.",
    motsCles: ["statut", "fonction publique", "carrière"],
    abrogePar: "Loi n° 68-2022 du 16 août 2022",
    provenance: "TEXTE",
  },
  {
    id: "TXT-0002",
    reference: "Loi n° 68-2022 du 16 août 2022",
    titre: "Portant statut général de la fonction publique",
    nature: "LOI", dateSignature: "2022-08-16", datePublication: "2022-10-06",
    journalOfficiel: "Journal officiel de la République du Congo du 6 octobre 2022",
    resume:
      "Statut en vigueur. Les corps de la fonction publique y sont répartis en trois catégories "
      + "désignées, dans l'ordre hiérarchique décroissant, par les chiffres I, II et III ; chaque "
      + "catégorie se divise en trois échelles. C'est le texte de référence de toute décision de "
      + "carrière prise aujourd'hui.",
    motsCles: ["statut", "fonction publique", "catégorie", "échelle", "position"],
    provenance: "TEXTE",
  },
  {
    id: "TXT-0003",
    reference: "Arrêté n° 25567 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des services et des bureaux de la direction "
      + "générale de l'administration et des ressources humaines",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 44-2022",
    resume:
      "Texte qui fonde l'organisation interne de la DGARH. Son intitulé et sa publication sont "
      + "établis ; son texte intégral n'a pas pu être consulté, si bien que le détail des services "
      + "et bureaux retenu par l'outil reste à confronter à l'original.",
    motsCles: ["DGARH", "organisation", "services", "bureaux"],
    entiteId: "ENT-DGARH", provenance: "TEXTE",
  },
  {
    id: "TXT-0010",
    reference: "Arrêté n° 25565 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des services et des bureaux de la direction "
      + "générale de l'enseignement technique",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 44-2022",
    resume:
      "Organise la direction générale de l'enseignement technique. Son personnel est géré par la "
      + "DGARH au même titre que celui des autres directions générales.",
    motsCles: ["enseignement technique", "organisation"], provenance: "TEXTE",
  },
  {
    id: "TXT-0011",
    reference: "Arrêté n° 25566 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des services et des bureaux de la direction "
      + "générale de l'enseignement professionnel",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 44-2022",
    resume:
      "Organise la direction générale de l'enseignement professionnel, second pilier métier du "
      + "ministère à côté de l'enseignement technique.",
    motsCles: ["enseignement professionnel", "organisation"], provenance: "TEXTE",
  },
  {
    id: "TXT-0004",
    reference: "Arrêté n° 25569 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des services, des divisions, des bureaux et des "
      + "sections de l'inspection générale de l'enseignement technique et professionnel",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 45-2022",
    resume:
      "Institue l'inspection générale et descend jusqu'au niveau de la section — un degré de "
      + "détail que les autres arrêtés d'organisation n'atteignent pas.",
    motsCles: ["inspection", "contrôle", "sections"],
    entiteId: "ENT-IG", provenance: "TEXTE",
  },
  {
    id: "TXT-0005",
    reference: "Arrêté n° 25570 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des inspections interdépartementales et des "
      + "bureaux départementaux de la supervision et du contrôle",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 45-2022",
    resume:
      "Crée l'échelon interdépartemental de contrôle et ses relais départementaux. L'intitulé "
      + "officiel dit « bureaux départementaux de la supervision et du contrôle » : l'outil les "
      + "nomme encore « antennes départementales d'appui et de contrôle », dénomination à corriger "
      + "sur le texte original.",
    motsCles: ["inspection", "déconcentration", "supervision", "contrôle"],
    entiteId: "ENT-INTERDEP", provenance: "TEXTE",
  },
  {
    id: "TXT-0006",
    reference: "Arrêté n° 25571 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des directions départementales de l'enseignement "
      + "technique",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 45-2022",
    resume:
      "Fixe l'organisation des directions départementales, échelon de gestion de proximité du "
      + "personnel et point d'entrée des besoins remontés par les établissements.",
    motsCles: ["direction départementale", "déconcentration"], provenance: "TEXTE",
  },
  {
    id: "TXT-0009",
    reference: "Décret d'organisation du ministère",
    titre: "Portant attributions et organisation du ministère de l'enseignement technique et professionnel",
    nature: "DECRET", dateSignature: "2022-10-17",
    resume:
      "Décret d'attributions dont procèdent les arrêtés d'organisation d'octobre 2022. Ni son "
      + "numéro ni sa date n'ont pu être vérifiés : il est cité ici comme chaînon manquant, non "
      + "comme référence établie.",
    motsCles: ["organisation", "ministère", "attributions"],
    entiteId: "ENT-METP", provenance: "A_VERIFIER",
  },
  {
    id: "TXT-0007",
    reference: "Circulaire n° 004/METP/DGARH-2026",
    titre: "Régularisation des dossiers physiques incomplets",
    nature: "CIRCULAIRE", dateSignature: "2026-08-11",
    resume:
      "Impartit soixante jours aux bureaux gestionnaires pour réclamer les pièces manquantes et "
      + "consigner la demande dans l'outil.",
    motsCles: ["dossier", "pièces", "régularisation"],
    entiteId: "ENT-DPCEF", provenance: "RECOMMANDATION",
  },
  {
    id: "TXT-0008",
    reference: "Note de service n° 012/METP/DGARH-2026",
    titre: "Ouverture de la campagne d'avancement 2026",
    nature: "NOTE_SERVICE", dateSignature: "2026-09-02",
    resume:
      "Invite les chefs de service à transmettre la liste des agents remplissant les conditions "
      + "d'avancement d'échelon avant le 30 septembre.",
    motsCles: ["avancement", "campagne"],
    entiteId: "ENT-DGARH", provenance: "RECOMMANDATION",
  },
];
