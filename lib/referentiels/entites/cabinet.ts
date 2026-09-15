import { TEXTES } from "../textes";
import { type E, type Noeud, deplier, e } from "./socle";

/* ------------------------------------------------------------------ */
/* Le cabinet — arrêté n° 25564 du 17 octobre 2022                     */
/* ------------------------------------------------------------------ */

/**
 * Ce que cette branche remplace, et pourquoi il fallait la reprendre.
 *
 * Le cabinet était **entièrement inventé**. Il portait un secrétariat
 * particulier, une direction de cabinet, un service des affaires
 * administratives et juridiques, un protocole, une sécurité et un collège de
 * conseillers — la composition habituelle d'un cabinet ministériel congolais,
 * déclarée comme telle et marquée « à vérifier », au motif que le texte du
 * METP n'avait pas pu être consulté.
 *
 * Il pouvait l'être. L'arrêté n° 25564 du 17 octobre 2022 s'intitule
 * « fixant les attributions et l'organisation des services et des bureaux des
 * **directions et des structures rattachées au cabinet** », il est publié au
 * Journal officiel n° 44-2022, et son article 2 énumère huit structures.
 * Aucune de celles que nous montrions n'y figure.
 *
 * La leçon vaut au-delà de cette branche : une hypothèse raisonnable, signalée
 * comme hypothèse, reste une hypothèse fausse. Elle se remplace dès que le
 * texte se lit, et ici le texte se lisait.
 *
 * **La cellule et l'unité.** L'article 2 place, au même rang que les six
 * directions, « la cellule de gestion des marchés publics » et « l'unité de
 * coordination des projets ». Le niveau `SERVICE` leur est donné faute d'un
 * niveau propre : ce sont des structures rattachées, sans les services et
 * bureaux d'une direction. La direction des études et de la planification,
 * elle, est « régie par des textes spécifiques » (article 3) — l'arrêté ne la
 * détaille donc pas, et nous n'en inventons pas le contenu.
 */

export const CABINET_ID = "ENT-CAB";

const structures: Noeud[] = [
  ["DIRECTION", "DEP", "Direction des études et de la planification"],

  ["DIRECTION", "DECTP", "Direction des examens et concours techniques et professionnels", [
    ["SERVICE", "SBTP", "Service des baccalauréats technique et professionnel", [
      ["BUREAU", "BBSIC", "Bureau baccalauréat des séries industrielles et commerciales"],
      ["BUREAU", "BBSAP", "Bureau baccalauréat des séries agricoles et professionnelles"],
    ]],
    ["SERVICE", "SBRTP", "Service des brevets technique et professionnel", [
      ["BUREAU", "BBET", "Bureau des brevets des études techniques"],
      ["BUREAU", "BBEPF", "Bureau des brevets des études professionnels et des brevets des études forestiers"],
      ["BUREAU", "BCEAP", "Bureau des certificats des études d'aptitude professionnelle"],
    ]],
    ["SERVICE", "SEPC", "Service des examens professionnels et des concours", [
      ["BUREAU", "BEP", "Bureau des examens professionnels"],
      ["BUREAU", "BCONC", "Bureau des concours"],
    ]],
    ["SERVICE", "SDIP", "Service des diplômes", [
      ["BUREAU", "BCVD", "Bureau contrôle, vérification et délivrance"],
      ["BUREAU", "BCTX-DIP", "Bureau du contentieux"],
    ]],
    ["SERVICE", "SINFO", "Service de l'informatique", [
      ["BUREAU", "BIM", "Bureau de l'informatique et de la maintenance"],
      ["BUREAU", "BSR-INFO", "Bureau de la saisie et de la reprographie"],
    ]],
    ["SERVICE", "SFM-DECTP", "Service des finances et du matériel", [
      ["BUREAU", "BF-DECTP", "Bureau des finances"],
      ["BUREAU", "BM-DECTP", "Bureau du matériel"],
      ["BUREAU", "BCV", "Bureau de contrôle et vérification"],
    ]],
  ]],

  ["DIRECTION", "DSIC", "Direction des systèmes d'information et de la communication", [
    ["SERVICE", "SAPP", "Service des applications", [
      ["BUREAU", "BRIA", "Bureau de la réalisation, de l'intégration et de l'assistance aux utilisateurs"],
      ["BUREAU", "BESIE", "Bureau de l'exploitation du système d'information des examens et concours techniques et professionnels"],
      ["BUREAU", "BESIG", "Bureau de l'exploitation du système d'information de gestion de l'éducation"],
    ]],
    ["SERVICE", "SISU", "Service des infrastructures et de soutien aux utilisateurs", [
      ["BUREAU", "BMI", "Bureau de la maintenance des infrastructures"],
      ["BUREAU", "BFSU", "Bureau de la formation et du soutien aux utilisateurs"],
    ]],
    ["SERVICE", "SPDDI", "Service de la production, de la documentation et de la diffusion de l'information", [
      ["BUREAU", "BAPOR", "Bureau des acquisitions et de la production des outils de recherche"],
      ["BUREAU", "BAEDI", "Bureau de l'archivage électronique et de la diffusion de l'information"],
    ]],
    ["SERVICE", "SCOM-DSIC", "Service de la communication", [
      ["BUREAU", "BCRN", "Bureau de collecte des ressources numériques"],
      ["BUREAU", "BCL", "Bureau de la communication en ligne"],
    ]],
    ["SERVICE", "SFM-DSIC", "Service des finances et du matériel", [
      ["BUREAU", "BF-DSIC", "Bureau des finances"],
      ["BUREAU", "BM-DSIC", "Bureau du matériel"],
    ]],
  ]],

  ["DIRECTION", "DCP", "Direction de la coopération et du partenariat", [
    ["SERVICE", "SCB", "Service de la coopération bilatérale", [
      ["BUREAU", "BCAF", "Bureau de la coopération Afrique"],
      ["BUREAU", "BCEAAO", "Bureau de la coopération Europe-Asie-Amérique-Océanie"],
    ]],
    ["SERVICE", "SCM", "Service de la coopération multilatérale", [
      ["BUREAU", "BONU", "Bureau de l'Organisation des Nations unies et des institutions spécialisées"],
      ["BUREAU", "BOIF", "Bureau de l'Organisation internationale de la francophonie"],
    ]],
    ["SERVICE", "SPART", "Service du partenariat", [
      ["BUREAU", "BPPP", "Bureau du partenariat public-privé"],
      ["BUREAU", "BPOSONG", "Bureau du partenariat avec les organismes spécialisés et les organisations non gouvernementales"],
    ]],
  ]],

  ["DIRECTION", "DEPETP", "Direction des établissements privés de l'enseignement technique et professionnel", [
    ["SERVICE", "SCEP", "Service du contrôle des établissements privés de l'enseignement technique et professionnel", [
      ["BUREAU", "BCONT-EP", "Bureau du contrôle et de l'orientation"],
      ["BUREAU", "BREF", "Bureau des réformes des établissements privés de l'enseignement technique et professionnel"],
      ["BUREAU", "BCTX-EP", "Bureau du contentieux"],
    ]],
    ["SERVICE", "SAGR", "Service des agréments", [
      ["BUREAU", "BAGR", "Bureau de l'analyse et de l'agrément"],
      ["BUREAU", "BDOC-EP", "Bureau de la documentation et de la diffusion de l'information"],
    ]],
  ]],

  ["DIRECTION", "DLFC", "Direction de la lutte contre la fraude, la corruption, la violence et autres pratiques répréhensibles en milieu scolaire", [
    ["SERVICE", "SSTRAT", "Service des stratégies, du suivi et du contrôle", [
      ["BUREAU", "BSTRAT", "Bureau des stratégies"],
      ["BUREAU", "BSUIVI", "Bureau du suivi et du contrôle"],
    ]],
    ["SERVICE", "SLFC", "Service de la lutte contre la fraude et la corruption en milieu scolaire", [
      ["BUREAU", "BLFRA", "Bureau de la lutte contre la fraude"],
      ["BUREAU", "BLCOR", "Bureau de la lutte contre la corruption"],
    ]],
    ["SERVICE", "SLVIOL", "Service de la lutte contre la violence et autres pratiques répréhensibles en milieu scolaire", [
      ["BUREAU", "BLVIOL", "Bureau de la lutte contre les violences en milieu scolaire"],
      ["BUREAU", "BLPRAT", "Bureau de la lutte contre les pratiques répréhensibles en milieu scolaire"],
    ]],
  ]],

  /* Rattachées au cabinet sans être des directions : l'arrêté les cite au
     même article, elles n'ont ni services ni bureaux. */
  ["SERVICE", "CGMP", "Cellule de gestion des marchés publics"],
  ["SERVICE", "UCP", "Unité de coordination des projets"],
];

export const cabinet: E[] = [
  e(CABINET_ID, "CAB", "Cabinet du ministre", "CABINET", "ENT-METP",
    "TEXTE", TEXTES.ARR_25564, "Brazzaville"),
  ...deplier(structures, CABINET_ID, "TEXTE", TEXTES.ARR_25564, "Brazzaville"),
];
