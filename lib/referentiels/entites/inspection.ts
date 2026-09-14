import { TEXTES } from "../textes";
import { type E, type Noeud, deplier, e } from "./socle";

/* ------------------------------------------------------------------ */
/* L'inspection générale — arrêté n° 25569 du 17 octobre 2022          */
/* ------------------------------------------------------------------ */

/**
 * Trois inspections inventées contre quatre réelles, et deux niveaux manquants.
 *
 * Nous montrions une « inspection de l'enseignement technique », une
 * « inspection de la formation professionnelle et de l'apprentissage » et une
 * « inspection administrative et financière ». Aucune de ces trois n'existe.
 * L'article 2 de l'arrêté n° 25569 donne, outre le secrétariat de direction et
 * **la direction des affaires administratives et financières** — que nous
 * n'avions pas du tout — quatre inspections : pédagogique ; des finances, de
 * l'équipement et du patrimoine ; des affaires administratives et des
 * ressources humaines ; du management et de l'assurance qualité.
 *
 * Et l'arrêté descend plus bas que nous ne savions le représenter. Son titre
 * le dit : « fixant les attributions des services, des **divisions**, des
 * bureaux et des **sections** ». Ces deux niveaux n'existaient pas dans le
 * type `NiveauEntite`, si bien qu'une division ne pouvait s'écrire que comme
 * un service — ce qui faussait du même coup le rang de son chef, le profil
 * proposé à sa tête et le périmètre qu'elle commande.
 *
 * **Pourquoi une inspection est un `SERVICE`.** Elle porte des divisions, qui
 * portent des sections : elle se situe donc un cran au-dessus de la division,
 * là où l'administration centrale place ses services. Le niveau ne se déduit
 * pas de l'intitulé — « inspection générale » et « inspection
 * interdépartementale » sont deux autres niveaux encore.
 */

export const IG_ID = "ENT-IG";

const structures: Noeud[] = [
  ["SECRETARIAT", "SEC-IG", "Secrétariat de direction", [
    ["BUREAU", "BCRPC-IG", "Bureau du courrier, des relations publiques et de la communication"],
    ["BUREAU", "BSR-IG", "Bureau de la saisie et de la reprographie"],
  ]],

  ["DIRECTION", "DAAF-IG", "Direction des affaires administratives et financières", [
    ["SERVICE", "SRH-IG", "Service des ressources humaines", [
      ["BUREAU", "BAA-IG", "Bureau des affaires administratives"],
      ["BUREAU", "BFOR-IG", "Bureau de la formation"],
    ]],
    ["SERVICE", "SFM-IG", "Service des finances et du matériel", [
      ["BUREAU", "BF-IG", "Bureau des finances"],
      ["BUREAU", "BM-IG", "Bureau du matériel"],
    ]],
    ["SERVICE", "SAD-IG", "Service des archives et de la documentation", [
      ["BUREAU", "BA-IG", "Bureau des archives"],
      ["BUREAU", "BD-IG", "Bureau de la documentation"],
    ]],
  ]],

  ["SERVICE", "IPED", "Inspection pédagogique", [
    ["DIVISION", "DRIP", "Division de la recherche, de l'innovation et de la pédagogie", [
      ["SECTION", "SIPT", "Section de l'innovation pédagogique et technologique"],
      ["SECTION", "SDMD", "Section du développement du matériel didactique"],
    ]],
    ["DIVISION", "DEPM", "Division de l'évaluation des programmes et des méthodes", [
      ["SECTION", "SECUR", "Section de l'élaboration des curricula"],
      ["SECTION", "SEPMP", "Section de l'évaluation des programmes d'études et des méthodes pédagogiques"],
    ]],
  ]],

  ["SERVICE", "IFEP", "Inspection des finances, de l'équipement et du patrimoine", [
    ["DIVISION", "DFIN-IG", "Division des finances", [
      ["SECTION", "SCFIN", "Section du contrôle financier"],
      ["SECTION", "SEDI", "Section des études, de la documentation et de l'informatique"],
    ]],
    ["DIVISION", "DEQP-IG", "Division de l'équipement et du patrimoine", [
      ["SECTION", "SCEQ", "Section du contrôle de l'équipement"],
      ["SECTION", "SCPAT", "Section du contrôle du patrimoine"],
    ]],
  ]],

  ["SERVICE", "IAARH", "Inspection des affaires administratives et des ressources humaines", [
    ["DIVISION", "DCADM", "Division du contrôle administratif", [
      ["SECTION", "SCAR", "Section du contrôle administratif et de la réglementation"],
      ["SECTION", "SPSTAT", "Section de la prévision et des statistiques"],
    ]],
    ["DIVISION", "DRH-IG", "Division des ressources humaines", [
      ["SECTION", "SCGRH", "Section du contrôle de la gestion des ressources humaines"],
      ["SECTION", "SCSEC", "Section du contrôle du suivi de l'évolution de la carrière administrative"],
    ]],
  ]],

  ["SERVICE", "IMAQ", "Inspection du management et de l'assurance qualité", [
    ["DIVISION", "DMAN", "Division du management", [
      ["SECTION", "SMOM", "Section des méthodes et outils du management"],
      ["SECTION", "SINGF", "Section de l'ingénierie de la formation"],
    ]],
    ["DIVISION", "DAQUA", "Division de l'assurance qualité", [
      ["SECTION", "SCQUA", "Section du contrôle qualité"],
      ["SECTION", "SCFOR", "Section du contrôle de la formation"],
    ]],
  ]],
];

export const inspectionGenerale: E[] = [
  e(IG_ID, "IG", "Inspection générale de l'enseignement technique et professionnel",
    "INSPECTION_GENERALE", "ENT-METP", "TEXTE", TEXTES.ARR_25569, "Brazzaville"),
  ...deplier(structures, IG_ID, "TEXTE", TEXTES.ARR_25569, "Brazzaville"),
];
