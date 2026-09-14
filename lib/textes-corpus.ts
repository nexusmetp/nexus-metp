/**
 * Fonds réglementaire — cahier §14, §18.
 *
 * Chaque entrée porte sa provenance. Les références ci-dessous ont été
 * corroborées auprès de sources publiques (base NATLEX de l'OIT, site du
 * ministère de la fonction publique, base de droit congolais du Secrétariat
 * général du Gouvernement).
 *
 * **Les neuf arrêtés d'organisation du METP ont depuis été lus.** Les Journaux
 * officiels n° 44-2022 et 45-2022 portent une couche de texte : les arrêtés
 * n° 25564 à 25572 du 17 octobre 2022 ont été dépouillés article par article,
 * et c'est sur eux que `lib/referentiels/entites/` est bâti. Ce qui reste en
 * « à vérifier » dans ce fonds l'est donc pour une autre raison : le texte
 * n'a pas été trouvé, et non qu'on ne l'a pas ouvert.
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
      "Texte qui fonde l'organisation interne de la DGARH, et qui a été dépouillé article par "
      + "article : direction du personnel, de la condition enseignante et de la formation ; "
      + "direction de l'orientation, des bourses et des aides scolaires ; direction de "
      + "l'administration, des finances et du matériel ; secrétariat de direction. L'arborescence "
      + "de l'outil en est la transcription.",
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
    entiteId: "ENT-IID-CENTRE", provenance: "TEXTE",
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
    reference: "Décret n° 2022-118 du 22 mars 2022",
    titre: "Portant attributions et organisation du ministère de l'enseignement technique et professionnel",
    nature: "DECRET", dateSignature: "2022-03-22",
    resume:
      "Décret d'attributions dont procèdent les neuf arrêtés d'organisation du 17 octobre 2022 : "
      + "chacun d'eux le vise en tête, ce qui établit sa référence. Son dispositif, lui, n'a pas "
      + "été consulté — c'est ce qui donnerait les attributions de l'échelon ministériel lui-même.",
    motsCles: ["organisation", "ministère", "attributions"],
    entiteId: "ENT-METP", provenance: "A_VERIFIER",
  },
  {
    id: "TXT-0012",
    reference: "Arrêté n° 25564 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des services et des bureaux du cabinet du "
      + "ministre de l'enseignement technique et professionnel",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 44-2022",
    resume:
      "Organise le cabinet : direction des études et de la planification, direction des "
      + "examens, concours et tests professionnels, direction des systèmes d'information et de "
      + "la communication, direction de la coopération et des partenariats, direction des "
      + "équipements pédagogiques et de l'entretien technico-professionnel, direction de la "
      + "législation et des affaires juridiques, cellule de gestion des marchés publics et "
      + "unité de coordination des projets.",
    motsCles: ["cabinet", "organisation", "ministre"],
    entiteId: "ENT-CAB", provenance: "TEXTE",
  },
  {
    id: "TXT-0013",
    reference: "Arrêté n° 25568 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des services et des bureaux de la direction "
      + "générale de l'équipement et du patrimoine",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 44-2022",
    resume:
      "Organise la quatrième direction générale du ministère. Le texte se contredit : son "
      + "article 2 énumère une « direction des finances et du matériel » là où son chapitre 3 "
      + "décrit une « direction de l'administration, des finances et du matériel ». L'outil "
      + "retient la seconde, qui est celle que les articles 21 et 22 développent.",
    motsCles: ["équipement", "patrimoine", "organisation"],
    entiteId: "ENT-DGEQP", provenance: "TEXTE",
  },
  {
    id: "TXT-0014",
    reference: "Arrêté n° 25572 du 17 octobre 2022",
    titre:
      "Fixant les attributions et l'organisation des directions départementales de "
      + "l'enseignement professionnel",
    nature: "ARRETE", dateSignature: "2022-10-17",
    journalOfficiel: "Journal officiel n° 45-2022",
    resume:
      "Le pendant de l'arrêté n° 25571 pour l'enseignement professionnel. Il établit qu'il "
      + "existe **deux** séries de directions départementales, l'une par direction générale — "
      + "ce que l'outil ignorait : il n'en portait qu'une, rattachée au ministère.",
    motsCles: ["direction départementale", "enseignement professionnel", "déconcentration"],
    provenance: "TEXTE",
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
