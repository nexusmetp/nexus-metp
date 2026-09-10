/**
 * Référentiels du SIRH du METP.
 *
 * Écrit d'après le cahier fonctionnel de la DGARH. Chaque entité porte sa
 * provenance : « TEXTE » = corroboré par une source publique, « A_VERIFIER »
 * = hypothèse à confirmer sur le Journal officiel, « RECOMMANDATION » = choix
 * de conception. Cf. cahier §01 — ne jamais présenter du A_VERIFIER comme du droit.
 */

import type {
  Corps, Entite, Grade, CategoriePersonnel, RegleCategorie, Role, TypeActe, StatutActe,
  NaturePosition, Provenance,
} from "@/lib/types";

export const APP_NAME = "NEXUS-METP";
export const APP_TAGLINE = "Système Intégré de Gestion des Ressources Humaines";
export const MINISTERE_NOM = "Ministère de l'Enseignement Technique et Professionnel";
export const LOGO_URL =
  "https://customer-assets-4nw71qhi.emergentagent.net/job_609b8195-c10e-4b71-8d33-e31431d5ad2a/artifacts/knsy5ozk_metp-logo.jpeg";

/* ------------------------------------------------------------------ */
/* Textes de référence — cahier §18                                    */
/* ------------------------------------------------------------------ */

export const TEXTES = {
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
    consequence:
      "Le cabinet est représenté d'après le schéma constant des ministères congolais. "
      + "Son personnel est géré par la DGARH comme celui des directions, mais le détail "
      + "de ses unités reste à confirmer.",
  },
  {
    sujet: "Détail des services et bureaux de la DGARH",
    manque: "Texte intégral de l'arrêté n° 25567",
    ou: "Journal officiel 2022-44",
  },
  {
    sujet: "Instances des inspections interdépartementales et antennes départementales",
    manque: "Texte intégral de l'arrêté n° 25570",
    ou: "Journal officiel 2022-45",
  },
  {
    sujet: "Autres directions générales du ministère",
    manque: "Décret d'attributions et d'organisation du ministère",
    ou: "Référence non retrouvée à ce jour",
  },
  {
    sujet: "Liste réelle des établissements",
    manque: "Carte scolaire de l'enseignement technique et professionnel",
    ou: "Document non consulté — les établissements sont un gabarit",
  },
  {
    sujet: "Grille indiciaire et corps réels",
    manque: "Statut général de la fonction publique et statuts particuliers",
    ou: "Textes non consultés",
  },
];

/* ------------------------------------------------------------------ */
/* Les 15 départements de la République du Congo                       */
/* ------------------------------------------------------------------ */

/**
 * Les quinze départements et leurs chefs-lieux. Les coordonnées servent la vue
 * nationale : elles situent le chef-lieu, à quelques kilomètres près, et ne
 * prétendent pas délimiter le département.
 */
export const DEPARTEMENTS: { nom: string; chefLieu: string; lat: number; lon: number }[] = [
  { nom: "Bouenza", chefLieu: "Madingou", lat: -4.155, lon: 13.550 },
  { nom: "Brazzaville", chefLieu: "Brazzaville", lat: -4.267, lon: 15.283 },
  { nom: "Congo-Oubangui", chefLieu: "Mossaka", lat: -1.225, lon: 16.803 },
  { nom: "Cuvette", chefLieu: "Owando", lat: -0.482, lon: 15.900 },
  { nom: "Cuvette-Ouest", chefLieu: "Ewo", lat: -0.872, lon: 14.822 },
  { nom: "Djoué-Léfini", chefLieu: "Odziba", lat: -3.567, lon: 15.300 },
  { nom: "Kouilou", chefLieu: "Loango", lat: -4.650, lon: 11.800 },
  { nom: "Lékoumou", chefLieu: "Sibiti", lat: -3.683, lon: 13.350 },
  { nom: "Likouala", chefLieu: "Impfondo", lat: 1.617, lon: 18.067 },
  { nom: "Niari", chefLieu: "Dolisie", lat: -4.198, lon: 12.673 },
  { nom: "Nkéni-Alima", chefLieu: "Gamboma", lat: -1.876, lon: 15.864 },
  { nom: "Plateaux", chefLieu: "Djambala", lat: -2.545, lon: 14.753 },
  { nom: "Pointe-Noire", chefLieu: "Pointe-Noire", lat: -4.795, lon: 11.867 },
  { nom: "Pool", chefLieu: "Kinkala", lat: -4.362, lon: 14.765 },
  { nom: "Sangha", chefLieu: "Ouesso", lat: 1.614, lon: 16.052 },
];

/* ------------------------------------------------------------------ */
/* Arborescence — cahier §02, §03, §10                                 */
/* ------------------------------------------------------------------ */

type E = Omit<Entite, "ville"> & { ville?: string };

const e = (
  id: string, sigle: string, nom: string, niveau: Entite["niveau"],
  parentId: string | null, provenance: Provenance, reference?: string, ville?: string
): E => ({ id, code: id, sigle, nom, niveau, parentId, provenance, reference, ville });

/* — Sommet et corps vérifiés — */
const sommet: E[] = [
  e("ENT-METP", "METP", MINISTERE_NOM, "MINISTERE", null, "TEXTE", undefined, "Brazzaville"),
  e("ENT-IG", "IG", "Inspection générale de l'enseignement technique et professionnel",
    "INSPECTION_GENERALE", "ENT-METP", "TEXTE", TEXTES.ARR_25569, "Brazzaville"),
  e("ENT-DGARH", "DGARH", "Direction générale de l'administration et des ressources humaines",
    "DIRECTION_GENERALE", "ENT-METP", "TEXTE", TEXTES.ARR_25567, "Brazzaville"),
];

/* — Cabinet du ministre —
   Le cabinet n'apparaît dans aucun des arrêtés d'organisation consultés : ce
   sont eux qui fixent les directions, pas l'entourage du ministre, nommé par
   décret. Sa composition suit ici le schéma constant des ministères
   congolais — directeur de cabinet, chef de cabinet, conseillers sectoriels,
   protocole, communication — et reste à confirmer sur le texte de nomination.
   Son personnel est géré par la DGARH comme celui de toute autre entité. */
const REF_CABINET = "Schéma constant des cabinets ministériels congolais — texte du METP non consulté";

const cabinet: E[] = [
  e("ENT-CAB", "CAB", "Cabinet du ministre", "CABINET", "ENT-METP", "A_VERIFIER", REF_CABINET, "Brazzaville"),

  // Le secrétariat particulier relève du ministre, non du directeur de cabinet :
  // c'est ce qui le distingue du secrétariat de la direction de cabinet.
  e("ENT-CAB-SP", "SPM", "Secrétariat particulier du ministre", "SECRETARIAT", "ENT-CAB", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-SP-BCC", "BCC", "Bureau du courrier confidentiel", "BUREAU", "ENT-CAB-SP", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-SP-BAA", "BAA", "Bureau des audiences et de l'agenda", "BUREAU", "ENT-CAB-SP", "A_VERIFIER", REF_CABINET, "Brazzaville"),

  e("ENT-CAB-DIR", "DIRCAB", "Direction de cabinet", "DIRECTION", "ENT-CAB", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  // Règle générale de l'administration congolaise : toute direction centrale a
  // un secrétariat dirigé par un secrétaire ayant rang de chef de bureau.
  e("ENT-CAB-DIR-SEC", "SEC-DIRCAB", "Secrétariat de la direction de cabinet",
    "SECRETARIAT", "ENT-CAB-DIR", "A_VERIFIER", REF_CABINET, "Brazzaville"),

  e("ENT-CAB-SAAJ", "SAAJ", "Service des affaires administratives et juridiques",
    "SERVICE", "ENT-CAB-DIR", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-SAAJ-BAR", "BAR", "Bureau des actes et du suivi réglementaire",
    "BUREAU", "ENT-CAB-SAAJ", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-SAAJ-BCX", "BCX-CAB", "Bureau du contentieux du cabinet",
    "BUREAU", "ENT-CAB-SAAJ", "A_VERIFIER", REF_CABINET, "Brazzaville"),

  e("ENT-CAB-SCP", "SCP", "Service de la coopération et des partenariats",
    "SERVICE", "ENT-CAB-DIR", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-SCP-BCB", "BCB", "Bureau de la coopération bilatérale et multilatérale",
    "BUREAU", "ENT-CAB-SCP", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-SCP-BPP", "BPP", "Bureau des projets et programmes",
    "BUREAU", "ENT-CAB-SCP", "A_VERIFIER", REF_CABINET, "Brazzaville"),

  e("ENT-CAB-COM", "COMCAB", "Service de la communication et de la presse",
    "SERVICE", "ENT-CAB-DIR", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-COM-BPR", "BPR", "Bureau de la presse et des relations publiques",
    "BUREAU", "ENT-CAB-COM", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-COM-BDA", "BDA-CAB", "Bureau de la documentation et des archives du cabinet",
    "BUREAU", "ENT-CAB-COM", "A_VERIFIER", REF_CABINET, "Brazzaville"),

  e("ENT-CAB-PROTO", "PROTO", "Service du protocole", "SERVICE", "ENT-CAB-DIR", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-PROTO-BCD", "BCD", "Bureau des cérémonies et des déplacements",
    "BUREAU", "ENT-CAB-PROTO", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-SECU", "SECUCAB", "Service de la sécurité", "SERVICE", "ENT-CAB-DIR", "A_VERIFIER", REF_CABINET, "Brazzaville"),

  // Les conseillers sont nommés par décret et suivent chacun un secteur ;
  // ils forment un collège, pas une hiérarchie.
  e("ENT-CAB-CONS", "CONS", "Collège des conseillers", "SERVICE", "ENT-CAB", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-CONS-ETP", "CONS-ETP", "Conseiller à l'enseignement technique et à la pédagogie",
    "BUREAU", "ENT-CAB-CONS", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-CONS-FPA", "CONS-FPA", "Conseiller à la formation professionnelle et à l'apprentissage",
    "BUREAU", "ENT-CAB-CONS", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-CONS-ADM", "CONS-ADM", "Conseiller aux affaires administratives et juridiques",
    "BUREAU", "ENT-CAB-CONS", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-CONS-FIN", "CONS-FIN", "Conseiller aux finances et au budget",
    "BUREAU", "ENT-CAB-CONS", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-CONS-COOP", "CONS-COOP", "Conseiller à la coopération",
    "BUREAU", "ENT-CAB-CONS", "A_VERIFIER", REF_CABINET, "Brazzaville"),
  e("ENT-CAB-CONS-COM", "CONS-COM", "Conseiller à la communication",
    "BUREAU", "ENT-CAB-CONS", "A_VERIFIER", REF_CABINET, "Brazzaville"),
];

/* — Inspection générale —
   Elle contrôle, elle n'administre pas : c'est ce qui la sépare des
   directions. Son existence est établie par l'arrêté n° 25569 ; le détail de
   ses inspections spécialisées suit la pratique du secteur éducatif. */
const REF_IG = "Détail des inspections spécialisées — arrêté n° 25569 non consulté intégralement";

const inspectionGenerale: E[] = [
  e("ENT-IG-SEC", "SEC-IG", "Secrétariat de l'inspection générale",
    "SECRETARIAT", "ENT-IG", "A_VERIFIER", REF_IG, "Brazzaville"),
  e("ENT-IG-IET", "IET", "Inspection de l'enseignement technique",
    "SERVICE", "ENT-IG", "A_VERIFIER", REF_IG, "Brazzaville"),
  e("ENT-IG-IET-BPED", "BPED", "Bureau du contrôle pédagogique",
    "BUREAU", "ENT-IG-IET", "A_VERIFIER", REF_IG, "Brazzaville"),
  e("ENT-IG-IFP", "IFP", "Inspection de la formation professionnelle et de l'apprentissage",
    "SERVICE", "ENT-IG", "A_VERIFIER", REF_IG, "Brazzaville"),
  e("ENT-IG-IFP-BCFP", "BCFP", "Bureau du contrôle des centres de formation",
    "BUREAU", "ENT-IG-IFP", "A_VERIFIER", REF_IG, "Brazzaville"),
  e("ENT-IG-IAF", "IAF", "Inspection administrative et financière",
    "SERVICE", "ENT-IG", "A_VERIFIER", REF_IG, "Brazzaville"),
  e("ENT-IG-IAF-BAUD", "BAUD", "Bureau de l'audit et des vérifications",
    "BUREAU", "ENT-IG-IAF", "A_VERIFIER", REF_IG, "Brazzaville"),
];

/* — Secrétariat de direction : 2 bureaux — *//* — Secrétariat de direction : 2 bureaux — */
const secretariat: E[] = [
  e("ENT-DGARH-SEC", "SEC", "Secrétariat de direction", "SECRETARIAT", "ENT-DGARH", "A_VERIFIER", TEXTES.ARR_25567),
  e("ENT-SEC-BCRPC", "BCRPC", "Bureau du courrier, des relations publiques et de la communication",
    "BUREAU", "ENT-DGARH-SEC", "A_VERIFIER", TEXTES.ARR_25567),
  e("ENT-SEC-BSR", "BSR", "Bureau de la saisie et de la reprographie",
    "BUREAU", "ENT-DGARH-SEC", "A_VERIFIER", TEXTES.ARR_25567),
];

/* — DPCEF : 3 services, 7 bureaux — */
const dpcef: E[] = [
  e("ENT-DPCEF", "DPCEF", "Direction du personnel, de la condition enseignante et de la formation",
    "DIRECTION", "ENT-DGARH", "A_VERIFIER", TEXTES.ARR_25567),

  e("ENT-DPCEF-SPC", "SPC", "Service du personnel et du contentieux", "SERVICE", "ENT-DPCEF", "A_VERIFIER"),
  e("ENT-SPC-BRM", "BRM", "Bureau du recrutement et des mouvements", "BUREAU", "ENT-DPCEF-SPC", "A_VERIFIER"),
  e("ENT-SPC-BGC", "BGC", "Bureau de la gestion de carrière", "BUREAU", "ENT-DPCEF-SPC", "A_VERIFIER"),
  e("ENT-SPC-BCX", "BCX", "Bureau du contentieux", "BUREAU", "ENT-DPCEF-SPC", "A_VERIFIER"),

  e("ENT-DPCEF-SCE", "SCE", "Service de la condition enseignante", "SERVICE", "ENT-DPCEF", "A_VERIFIER"),
  e("ENT-SCE-BSCE", "BSCE", "Bureau du suivi et de l'évaluation de la condition enseignante",
    "BUREAU", "ENT-DPCEF-SCE", "A_VERIFIER"),
  e("ENT-SCE-BPVV", "BPVV", "Bureau du suivi et de l'évaluation des prestataires, volontaires et vacataires",
    "BUREAU", "ENT-DPCEF-SCE", "A_VERIFIER"),

  e("ENT-DPCEF-SF", "SF", "Service de la formation", "SERVICE", "ENT-DPCEF", "A_VERIFIER"),
  e("ENT-SF-BFPE", "BFPE", "Bureau de la formation du personnel enseignant", "BUREAU", "ENT-DPCEF-SF", "A_VERIFIER"),
  e("ENT-SF-BFPAT", "BFPAT", "Bureau de la formation du personnel administratif et technique",
    "BUREAU", "ENT-DPCEF-SF", "A_VERIFIER"),
];

/* — DOBAS : attestée sur le site du ministère ; son détail reste à confirmer — */
const dobas: E[] = [
  e("ENT-DOBAS", "DOBAS", "Direction de l'orientation, des bourses et des aides scolaires",
    "DIRECTION", "ENT-DGARH", "TEXTE", "Site officiel du METP"),

  e("ENT-DOBAS-SO", "SO", "Service de l'orientation", "SERVICE", "ENT-DOBAS", "A_VERIFIER"),
  e("ENT-SO-BI", "BI", "Bureau de l'information", "BUREAU", "ENT-DOBAS-SO", "A_VERIFIER"),
  e("ENT-SO-BSS", "BSS", "Bureau du suivi de la scolarité et des statistiques", "BUREAU", "ENT-DOBAS-SO", "A_VERIFIER"),

  e("ENT-DOBAS-SB", "SB", "Service des bourses", "SERVICE", "ENT-DOBAS", "A_VERIFIER"),
  e("ENT-SB-BT", "BT", "Bureau du traitement", "BUREAU", "ENT-DOBAS-SB", "A_VERIFIER"),
  e("ENT-SB-BR", "BR", "Bureau des réclamations", "BUREAU", "ENT-DOBAS-SB", "A_VERIFIER"),

  e("ENT-DOBAS-SASS", "SASS", "Service des aides sociales et scolaires", "SERVICE", "ENT-DOBAS", "A_VERIFIER"),
  e("ENT-SASS-BT", "BT2", "Bureau du traitement", "BUREAU", "ENT-DOBAS-SASS", "A_VERIFIER"),
  e("ENT-SASS-BR", "BR2", "Bureau des réclamations", "BUREAU", "ENT-DOBAS-SASS", "A_VERIFIER"),
];

/* — DAFM : 3 services, 6 bureaux — */
const dafm: E[] = [
  e("ENT-DAFM", "DAFM", "Direction de l'administration, des finances et du matériel",
    "DIRECTION", "ENT-DGARH", "A_VERIFIER", TEXTES.ARR_25567),

  e("ENT-DAFM-SAA", "SAA", "Service des affaires administratives", "SERVICE", "ENT-DAFM", "A_VERIFIER"),
  e("ENT-SAA-BPDG", "BPDG", "Bureau du personnel de la direction générale", "BUREAU", "ENT-DAFM-SAA", "A_VERIFIER"),
  e("ENT-SAA-BICA", "BICA", "Bureau des indemnités et charges administratives", "BUREAU", "ENT-DAFM-SAA", "A_VERIFIER"),

  e("ENT-DAFM-SFM", "SFM", "Service des finances et du matériel", "SERVICE", "ENT-DAFM", "A_VERIFIER"),
  e("ENT-SFM-BF", "BF", "Bureau des finances", "BUREAU", "ENT-DAFM-SFM", "A_VERIFIER"),
  e("ENT-SFM-BM", "BM", "Bureau du matériel", "BUREAU", "ENT-DAFM-SFM", "A_VERIFIER"),

  e("ENT-DAFM-SAD", "SAD", "Service des archives et de la documentation", "SERVICE", "ENT-DAFM", "A_VERIFIER"),
  e("ENT-SAD-BA", "BA", "Bureau des archives", "BUREAU", "ENT-DAFM-SAD", "A_VERIFIER"),
  e("ENT-SAD-BD", "BD", "Bureau de la documentation", "BUREAU", "ENT-DAFM-SAD", "A_VERIFIER"),
];

/* — Déconcentration — cahier §10 —
   L'échelon interdépartemental existe (arrêté 25570) mais ses instances ne sont
   pas connues : on porte le corps, pas des unités inventées. */
/* — Déconcentration —
   L'arrêté n° 25570 crée les inspections interdépartementales et les antennes
   départementales d'appui et de contrôle, sans que leur découpage nous soit
   accessible. Le regroupement retenu ci-dessous est géographique et signalé
   comme tel : il donne à la vue nationale des points réels à situer. */
/** Identifiants en ASCII : une classe de caractères accentués dans une
 *  expression régulière devient invalide si le document n'est pas lu en UTF-8. */
const sansAccent = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const REF_IID = "Découpage des inspections interdépartementales — arrêté n° 25570 non consulté intégralement";

const GROUPES_IID: { id: string; sigle: string; nom: string; siege: string; departements: string[] }[] = [
  {
    id: "ENT-IID-SUD", sigle: "IID-SUD", nom: "Inspection interdépartementale du Sud", siege: "Pointe-Noire",
    departements: ["Pointe-Noire", "Kouilou", "Niari", "Bouenza", "Lékoumou"],
  },
  {
    id: "ENT-IID-CENTRE", sigle: "IID-CTR", nom: "Inspection interdépartementale du Centre", siege: "Brazzaville",
    departements: ["Brazzaville", "Pool", "Djoué-Léfini", "Plateaux", "Nkéni-Alima"],
  },
  {
    id: "ENT-IID-CUVETTES", sigle: "IID-CUV", nom: "Inspection interdépartementale des Cuvettes", siege: "Owando",
    departements: ["Cuvette", "Cuvette-Ouest", "Congo-Oubangui"],
  },
  {
    id: "ENT-IID-NORD", sigle: "IID-NRD", nom: "Inspection interdépartementale du Nord", siege: "Ouesso",
    departements: ["Sangha", "Likouala"],
  },
];

const deconcentration: E[] = [
  e("ENT-INTERDEP", "INTERDEP", "Inspections interdépartementales et antennes départementales d'appui et de contrôle",
    "INSPECTION_INTERDEPARTEMENTALE", "ENT-METP", "TEXTE", TEXTES.ARR_25570, "Brazzaville"),

  ...GROUPES_IID.flatMap((g) => [
    e(g.id, g.sigle, g.nom, "INSPECTION_INTERDEPARTEMENTALE", "ENT-INTERDEP", "A_VERIFIER", REF_IID, g.siege),
    ...g.departements.map((nom) => {
      const d = DEPARTEMENTS.find((x) => x.nom === nom)!;
      return e(
        `ENT-ANT-${sansAccent(nom).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`,
        `ANT-${nom.slice(0, 4).toUpperCase()}`,
        `Antenne départementale d'appui et de contrôle — ${nom}`,
        "ANTENNE_DEPARTEMENTALE", g.id, "A_VERIFIER", REF_IID, d.chefLieu
      );
    }),
  ]),

  ...DEPARTEMENTS.map((d, i) =>
    e(
      `ENT-DD-${String(i + 1).padStart(2, "0")}`,
      `DD-${d.nom.slice(0, 4).toUpperCase()}`,
      `Direction départementale de l'enseignement technique — ${d.nom}`,
      "DIRECTION_DEPARTEMENTALE",
      "ENT-METP",
      "TEXTE",
      TEXTES.ARR_25571,
      d.chefLieu
    )
  ),
];

/* — Établissements — cahier §10 —
   Le niveau local ferme la chaîne ascendante : c'est de là que partent les
   états de besoins. La liste réelle relève de la carte scolaire du ministère ;
   celle-ci est un gabarit, marqué comme tel. */
const MODELES_ETABLISSEMENT = [
  { prefixe: "LT", genre: "Lycée technique" },
  { prefixe: "CET", genre: "Collège d'enseignement technique" },
  { prefixe: "CFP", genre: "Centre de formation professionnelle" },
  { prefixe: "LTA", genre: "Lycée technique agricole" },
];

const etablissements: E[] = DEPARTEMENTS.flatMap((d, i) => {
  const ddId = `ENT-DD-${String(i + 1).padStart(2, "0")}`;
  const nb = d.nom === "Brazzaville" || d.nom === "Pointe-Noire" ? 4 : 3;
  return MODELES_ETABLISSEMENT.slice(0, nb).map((m, k) =>
    e(
      `ENT-ETB-${String(i + 1).padStart(2, "0")}-${k + 1}`,
      `${m.prefixe}-${d.nom.slice(0, 4).toUpperCase()}`,
      `${m.genre} de ${d.chefLieu}`,
      "ETABLISSEMENT",
      ddId,
      "A_VERIFIER",
      "Carte scolaire du ministère — liste non consultée",
      d.chefLieu
    )
  );
});

/** La semence : l'organigramme tel que les textes et le cahier le décrivent. */
export const ENTITES_SEMENCE: Entite[] = [
  ...sommet, ...cabinet, ...inspectionGenerale, ...secretariat, ...dpcef, ...dobas,
  ...dafm, ...deconcentration, ...etablissements,
] as Entite[];

/**
 * L'arborescence vivante. Elle part de la semence puis suit la base :
 * l'administrateur système crée des directions, et tout ce qui calcule un
 * périmètre doit en tenir compte immédiatement. Le tableau garde la même
 * référence pour ne pas invalider les appelants — il est modifié sur place.
 */
export const ENTITES: Entite[] = [...ENTITES_SEMENCE];

export const ETABLISSEMENTS = etablissements as Entite[];
/** Département (direction départementale) dont relève une entité locale. */
export const departementDe = (entiteId?: string | null) =>
  entiteId ? cheminDe(entiteId).find((x) => x.niveau === "DIRECTION_DEPARTEMENTALE") : undefined;

/* — Accès à l'arborescence — */

let parIdIndex = new Map(ENTITES.map((x) => [x.id, x]));

/**
 * Remplace l'arborescence vivante par celle de la base. Appelé une fois au
 * démarrage, puis après chaque création ou modification d'entité.
 */
export function hydraterEntites(liste: Entite[]): void {
  if (!liste?.length) return;
  ENTITES.splice(0, ENTITES.length, ...liste);
  parIdIndex = new Map(ENTITES.map((x) => [x.id, x]));
}

export const entiteById = (id?: string | null) => (id ? parIdIndex.get(id) : undefined);
export const enfantsDe = (id: string) => ENTITES.filter((x) => x.parentId === id && x.actif !== false);

/** Toutes les entités sous `id`, `id` compris. Base du calcul de périmètre. §11 */
export function descendantsDe(id: string): Entite[] {
  const out: Entite[] = [];
  const pile = [id];
  while (pile.length) {
    const cur = pile.pop()!;
    const ent = parIdIndex.get(cur);
    if (ent) out.push(ent);
    enfantsDe(cur).forEach((c) => pile.push(c.id));
  }
  return out;
}

/** Chemin depuis la racine, pour l'affichage « METP › DGARH › DPCEF › … ». */
export function cheminDe(id: string): Entite[] {
  const out: Entite[] = [];
  let cur = parIdIndex.get(id);
  while (cur) {
    out.unshift(cur);
    cur = cur.parentId ? parIdIndex.get(cur.parentId) : undefined;
  }
  return out;
}

/**
 * Situe une entité par le chef-lieu qu'elle porte. Plusieurs entités partagent
 * le même chef-lieu ; un décalage déterministe, tiré de leur identifiant, les
 * empêche de se superposer exactement sans les déplacer d'une ville à l'autre.
 */
export function coordonneesDe(entite: Entite): { lat: number; lon: number } | undefined {
  const d = entite.ville ? DEPARTEMENTS.find((x) => x.chefLieu === entite.ville) : undefined;
  if (!d) return undefined;
  let h = 0;
  for (let i = 0; i < entite.id.length; i++) h = (h * 31 + entite.id.charCodeAt(i)) & 0xffff;
  const angle = (h / 0xffff) * Math.PI * 2;
  const rayon = entite.niveau === "DIRECTION_DEPARTEMENTALE" ? 0 : 0.07 + (h % 7) * 0.018;
  return { lat: d.lat + Math.sin(angle) * rayon, lon: d.lon + Math.cos(angle) * rayon };
}

export const DGARH_ID = "ENT-DGARH";
export const METP_ID = "ENT-METP";
export const CABINET_ID = "ENT-CAB";

/**
 * Périmètre de gestion des ressources humaines de la DGARH : le ministère
 * entier, cabinet compris. La direction générale gère le personnel de toutes
 * les entités, pas seulement celui de sa propre arborescence — c'est sa
 * raison d'être. §02
 */
export const PERIMETRE_RH_ID = METP_ID;
export const entitesDGARH = () => descendantsDe(DGARH_ID);
export const bureaux = () => ENTITES.filter((x) => x.niveau === "BUREAU" && x.actif !== false);
export const SERVICES = ENTITES.filter((x) => x.niveau === "SERVICE");

export const NIVEAU_LABELS: Record<Entite["niveau"], string> = {
  MINISTERE: "Ministère",
  CABINET: "Cabinet",
  INSPECTION_GENERALE: "Inspection générale",
  DIRECTION_GENERALE: "Direction générale",
  SECRETARIAT: "Secrétariat",
  DIRECTION: "Direction",
  SERVICE: "Service",
  BUREAU: "Bureau",
  INSPECTION_INTERDEPARTEMENTALE: "Inspection interdépartementale",
  ANTENNE_DEPARTEMENTALE: "Antenne départementale",
  DIRECTION_DEPARTEMENTALE: "Direction départementale",
  ETABLISSEMENT: "Établissement",
};

/* ------------------------------------------------------------------ */
/* Catégories de personnel — cahier §05                                */
/* ------------------------------------------------------------------ */

export const REGLES_CATEGORIE: Record<CategoriePersonnel, RegleCategorie> = {
  FONCTIONNAIRE: {
    libelle: "Fonctionnaire", lien: "Statut général de la fonction publique",
    carriereStatutaire: true, titularisation: true, avancement: true, promotion: true, besoinAscendant: false,
  },
  CONTRACTUEL: {
    libelle: "Contractuel", lien: "Contrat de droit public",
    carriereStatutaire: true, titularisation: false, avancement: false, promotion: false, besoinAscendant: false,
  },
  PRESTATAIRE: {
    libelle: "Prestataire", lien: "Prestation de service",
    carriereStatutaire: false, titularisation: false, avancement: false, promotion: false, besoinAscendant: true,
  },
  VOLONTAIRE: {
    libelle: "Volontaire", lien: "Volontariat",
    carriereStatutaire: false, titularisation: false, avancement: false, promotion: false, besoinAscendant: true,
  },
  VACATAIRE: {
    libelle: "Vacataire", lien: "Vacation horaire",
    carriereStatutaire: false, titularisation: false, avancement: false, promotion: false, besoinAscendant: true,
  },
};

export const CATEGORIES: CategoriePersonnel[] =
  ["FONCTIONNAIRE", "CONTRACTUEL", "PRESTATAIRE", "VOLONTAIRE", "VACATAIRE"];

/* ------------------------------------------------------------------ */
/* Corps et grades — à confirmer sur les statuts particuliers          */
/* ------------------------------------------------------------------ */

export const CORPS: Corps[] = [
  { id: "C-INSP", libelle: "Inspection", categorie: "A", enseignant: false },
  { id: "C-DIR", libelle: "Direction et administration générale", categorie: "A", enseignant: false },
  { id: "C-ADM", libelle: "Administration", categorie: "A", enseignant: false },
  { id: "C-ENS-SUP", libelle: "Enseignement technique — professeurs", categorie: "A", enseignant: true },
  { id: "C-ENS-CERT", libelle: "Enseignement technique — certifiés", categorie: "B", enseignant: true },
  { id: "C-ENC", libelle: "Encadrement administratif", categorie: "B", enseignant: false },
  { id: "C-GEST", libelle: "Gestion administrative", categorie: "C", enseignant: false },
  { id: "C-TECH", libelle: "Technique", categorie: "C", enseignant: false },
  { id: "C-SERV", libelle: "Services", categorie: "D", enseignant: false },
];

export const GRADES: Grade[] = [
  { id: "GR-INSP-1", corpsId: "C-INSP", libelle: "Inspecteur général 1er grade", classes: 3, echelons: 8, indiceDebut: 1000, indiceFin: 1400 },
  { id: "GR-INSP-2", corpsId: "C-INSP", libelle: "Inspecteur général 2e grade", classes: 3, echelons: 8, indiceDebut: 900, indiceFin: 1300 },
  { id: "GR-DIR-DG", corpsId: "C-DIR", libelle: "Directeur général", classes: 2, echelons: 6, indiceDebut: 850, indiceFin: 1200 },
  { id: "GR-DIR-DC", corpsId: "C-DIR", libelle: "Directeur central", classes: 2, echelons: 6, indiceDebut: 800, indiceFin: 1100 },
  { id: "GR-ADM-1", corpsId: "C-ADM", libelle: "Administrateur des services administratifs", classes: 3, echelons: 8, indiceDebut: 720, indiceFin: 1020 },
  { id: "GR-ENS-PT", corpsId: "C-ENS-SUP", libelle: "Professeur technique", classes: 3, echelons: 8, indiceDebut: 700, indiceFin: 1050 },
  { id: "GR-ENS-PTC", corpsId: "C-ENS-CERT", libelle: "Professeur technique certifié", classes: 3, echelons: 8, indiceDebut: 620, indiceFin: 880 },
  { id: "GR-ENC-CS1", corpsId: "C-ENC", libelle: "Chef de service 1er grade", classes: 2, echelons: 8, indiceDebut: 700, indiceFin: 950 },
  { id: "GR-ENC-CS2", corpsId: "C-ENC", libelle: "Chef de service 2e grade", classes: 2, echelons: 8, indiceDebut: 650, indiceFin: 900 },
  { id: "GR-GEST-1", corpsId: "C-GEST", libelle: "Gestionnaire des ressources humaines", classes: 3, echelons: 12, indiceDebut: 400, indiceFin: 650 },
  { id: "GR-GEST-2", corpsId: "C-GEST", libelle: "Comptable", classes: 3, echelons: 12, indiceDebut: 350, indiceFin: 600 },
  { id: "GR-GEST-3", corpsId: "C-GEST", libelle: "Secrétaire principal", classes: 3, echelons: 12, indiceDebut: 380, indiceFin: 620 },
  { id: "GR-TECH-1", corpsId: "C-TECH", libelle: "Technicien supérieur", classes: 3, echelons: 12, indiceDebut: 400, indiceFin: 650 },
  { id: "GR-SERV-1", corpsId: "C-SERV", libelle: "Agent administratif", classes: 2, echelons: 9, indiceDebut: 250, indiceFin: 400 },
  { id: "GR-SERV-2", corpsId: "C-SERV", libelle: "Agent technique", classes: 2, echelons: 9, indiceDebut: 250, indiceFin: 400 },
];

const gradeIndex = new Map(GRADES.map((g) => [g.id, g]));
const corpsIndex = new Map(CORPS.map((c) => [c.id, c]));
export const gradeById = (id?: string) => (id ? gradeIndex.get(id) : undefined);
export const corpsById = (id?: string) => (id ? corpsIndex.get(id) : undefined);
export const categorieStatutaireDe = (gradeId?: string) => corpsById(gradeById(gradeId)?.corpsId)?.categorie;

/* ------------------------------------------------------------------ */
/* Actes — cahier §08                                                  */
/* ------------------------------------------------------------------ */

export const TYPES_ACTE: {
  type: TypeActe; libelle: string; effet: string; bureauId: string;
}[] = [
  { type: "RECRUTEMENT", libelle: "Recrutement", effet: "Création du dossier, carrière initiale", bureauId: "ENT-SPC-BRM" },
  { type: "PRISE_DE_SERVICE", libelle: "Prise de service", effet: "Date effective, activation", bureauId: "ENT-SPC-BRM" },
  { type: "TITULARISATION", libelle: "Titularisation", effet: "Situation statutaire", bureauId: "ENT-SPC-BGC" },
  { type: "AFFECTATION", libelle: "Affectation", effet: "Entité, poste, fonction", bureauId: "ENT-SPC-BRM" },
  { type: "MUTATION", libelle: "Mutation", effet: "Entité, poste, département", bureauId: "ENT-SPC-BRM" },
  { type: "AVANCEMENT", libelle: "Avancement", effet: "Échelon, indice, date d'effet", bureauId: "ENT-SPC-BGC" },
  { type: "PROMOTION", libelle: "Promotion", effet: "Grade, classe, corps", bureauId: "ENT-SPC-BGC" },
  { type: "FORMATION", libelle: "Formation ou stage", effet: "Bloc formation, position si détachement", bureauId: "ENT-SF-BFPE" },
  { type: "CONGE", libelle: "Congé", effet: "Position administrative, solde", bureauId: "ENT-SPC-BGC" },
  { type: "POSITION", libelle: "Position administrative", effet: "Disponibilité, détachement, mise à disposition", bureauId: "ENT-SPC-BGC" },
  { type: "SANCTION", libelle: "Sanction", effet: "Situation administrative, historique disciplinaire", bureauId: "ENT-SPC-BCX" },
  { type: "CONTENTIEUX", libelle: "Contentieux", effet: "Dossier contentieux et suites", bureauId: "ENT-SPC-BCX" },
  { type: "INDEMNITE", libelle: "Indemnité ou prime", effet: "Bloc rémunération", bureauId: "ENT-SAA-BICA" },
  { type: "FIN_CARRIERE", libelle: "Fin de carrière", effet: "Clôture du dossier", bureauId: "ENT-SPC-BGC" },
];

const typeActeIndex = new Map(TYPES_ACTE.map((t) => [t.type, t]));
export const typeActeById = (t: TypeActe) => typeActeIndex.get(t);

/** Circuit d'instruction de référence — cahier §09. */
export const CIRCUIT_ACTE: { ordre: number; libelle: string; entiteId: string }[] = [
  { ordre: 1, libelle: "Réception et enregistrement", entiteId: "ENT-SEC-BCRPC" },
  { ordre: 2, libelle: "Instruction du dossier", entiteId: "ENT-SPC-BRM" },
  { ordre: 3, libelle: "Avis et propositions du service", entiteId: "ENT-DPCEF-SPC" },
  { ordre: 4, libelle: "Validation de la direction", entiteId: "ENT-DPCEF" },
  { ordre: 5, libelle: "Signature", entiteId: "ENT-DGARH" },
  { ordre: 6, libelle: "Notification et archivage", entiteId: "ENT-SAD-BA" },
];

export const STATUT_ACTE_LABELS: Record<StatutActe, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  EN_INSTRUCTION: "En instruction",
  VALIDE_SERVICE: "Validé service",
  VALIDE_DIRECTION: "Validé direction",
  SIGNE: "Signé",
  NOTIFIE: "Notifié",
  ARCHIVE: "Archivé",
  REJETE: "Rejeté",
  RETOURNE: "Retourné pour complément",
};

/** Statuts qui comptent comme « dossier en circulation ». */
export const STATUTS_EN_COURS: StatutActe[] =
  ["SOUMIS", "EN_INSTRUCTION", "VALIDE_SERVICE", "VALIDE_DIRECTION", "RETOURNE"];

export const POSITION_LABELS: Record<NaturePosition, string> = {
  ACTIVITE: "En activité",
  CONGE: "Congé",
  DISPONIBILITE: "Disponibilité",
  DETACHEMENT: "Détachement",
  MISE_A_DISPOSITION: "Mise à disposition",
  SUSPENSION: "Suspension",
  RETRAITE: "Retraité",
};

/* ------------------------------------------------------------------ */
/* Rôles, modules et permissions — cahier §11                          */
/* ------------------------------------------------------------------ */

export type ModuleKey =
  | "dgarh" | "national" | "organigramme" | "organisation" | "pilotage" | "agents" | "actes"
  | "carrieres" | "conges" | "formations" | "contentieux" | "besoins"
  | "referentiels" | "documents" | "textes" | "rapports" | "journal" | "administration"
  | "postes" | "recrutement" | "delegations" | "annuaire" | "retraite" | "aide" | "cartes"
  | "messagerie" | "tickets" | "annonces" | "mon-dossier";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dgarh: "Tableau de bord",
  national: "Vue nationale",
  organigramme: "Organigramme",
  organisation: "Organisation",
  pilotage: "Pilotage des directions",
  agents: "Agents",
  actes: "Actes",
  carrieres: "Carrières",
  conges: "Congés et positions",
  formations: "Formation",
  contentieux: "Contentieux",
  besoins: "États de besoins",
  referentiels: "Référentiels",
  documents: "Archives et GED",
  textes: "Fonds réglementaire",
  postes: "Tableau des emplois",
  recrutement: "Recrutement et concours",
  delegations: "Délégations et intérims",
  annuaire: "Annuaire",
  cartes: "Cartes professionnelles",
  retraite: "Départs à la retraite",
  aide: "Aide",
  rapports: "Rapports",
  journal: "Journal d'audit",
  administration: "Système",
  messagerie: "Messagerie",
  tickets: "Réclamations",
  annonces: "Notes et circulaires",
  "mon-dossier": "Mon dossier",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN_SYSTEME: "Administrateur système",
  DIRECTEUR_GENERAL: "Directeur général",
  DIRECTEUR_CENTRAL: "Directeur central",
  CHEF_SERVICE: "Chef de service",
  CHEF_BUREAU: "Chef de bureau",
  AGENT_INSTRUCTEUR: "Agent instructeur",
  DIRECTEUR_DEPARTEMENTAL: "Directeur départemental",
  CHEF_ETABLISSEMENT: "Chef d'établissement",
  AGENT: "Agent",
};

/** R = lecture, W = écriture (inclut la lecture), absent = aucun accès. */
export const DROITS: Record<Role, Partial<Record<ModuleKey, "R" | "W">>> = {
  ADMIN_SYSTEME: {
    organigramme: "R", referentiels: "W", administration: "W", journal: "W",
    national: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    textes: "W", annuaire: "R", aide: "R",
    cartes: "R",
  },
  DIRECTEUR_GENERAL: {
    dgarh: "W", organigramme: "W", organisation: "W", pilotage: "W", agents: "W",
    national: "R",
    actes: "W", carrieres: "R", conges: "R", formations: "R", contentieux: "R",
    besoins: "R", referentiels: "R", documents: "R", rapports: "W", journal: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    postes: "W", recrutement: "W", delegations: "W", textes: "W",
    annuaire: "R", retraite: "W", aide: "R",
    cartes: "W",
  },
  DIRECTEUR_CENTRAL: {
    dgarh: "R", organigramme: "R", pilotage: "R", agents: "W", actes: "W",
    national: "R",
    carrieres: "R", conges: "R", formations: "R", contentieux: "R", besoins: "R",
    referentiels: "R", documents: "R", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    postes: "W", recrutement: "W", delegations: "R", textes: "R",
    annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  CHEF_SERVICE: {
    dgarh: "R", organigramme: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    formations: "R", contentieux: "R", besoins: "R", documents: "R", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", delegations: "R", textes: "R",
    annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  CHEF_BUREAU: {
    dgarh: "R", organigramme: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    formations: "R", contentieux: "R", besoins: "R", documents: "W",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "W", textes: "R", annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  AGENT_INSTRUCTEUR: {
    organigramme: "R", agents: "R", actes: "W", carrieres: "R", conges: "R", documents: "W",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", textes: "R", annuaire: "R", aide: "R",
    cartes: "R",
  },
  DIRECTEUR_DEPARTEMENTAL: {
    organigramme: "R", agents: "W", actes: "R", conges: "R", besoins: "W", documents: "R",
    national: "R",
    rapports: "R", messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", textes: "R", annuaire: "R", retraite: "R", aide: "R",
    cartes: "R",
  },
  CHEF_ETABLISSEMENT: {
    organigramme: "R", agents: "W", besoins: "W", documents: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", textes: "R", annuaire: "R", aide: "R",
    cartes: "R",
  },
  AGENT: {
    "mon-dossier": "W", conges: "R", formations: "R", documents: "R", organigramme: "R",
    messagerie: "W", tickets: "W", annonces: "R",
    annuaire: "R", textes: "R", aide: "R",
    cartes: "R",
  },
};

export const peut = (role: Role, mod: ModuleKey, mode: "R" | "W" = "R") => {
  const d = DROITS[role]?.[mod];
  if (!d) return false;
  return mode === "R" ? true : d === "W";
};

/**
 * Périmètre : ce que voit un utilisateur se déduit de son rattachement.
 * Cf. §11 — sinon chaque réorganisation devient un chantier de droits.
 */
export function perimetreDe(entiteId: string): Set<string> {
  return new Set(descendantsDe(entiteId).map((x) => x.id));
}

export const dansPerimetre = (entiteId: string, cible?: string | null) =>
  !!cible && perimetreDe(entiteId).has(cible);

/**
 * Règle de séparation : personne ne valide ce qu'il a instruit. §11
 * Renvoie vrai si `utilisateurId` peut valider l'étape courante de l'acte.
 */
export const peutValider = (utilisateurId: string, instruitPar?: string) =>
  !!instruitPar && instruitPar !== utilisateurId;

/** Où atterrit un utilisateur après connexion, selon ce que son rôle ouvre. */
export const pageAccueil = (role: Role) =>
  peut(role, "dgarh") ? "/dgarh"
  : peut(role, "administration") ? "/administration"
  : peut(role, "agents") ? "/dgarh/agents"
  : peut(role, "mon-dossier") ? "/mon-dossier"
  : "/dgarh/organigramme";

/** Module couvrant une route, pour le contrôle d'accès du layout. */
export function moduleDeRoute(pathname: string): ModuleKey | null {
  const routes: [string, ModuleKey][] = [
    ["/dgarh/national", "national"],
    ["/dgarh/organigramme", "organigramme"],
    ["/dgarh/organisation", "organisation"],
    ["/dgarh/pilotage", "pilotage"],
    ["/dgarh/agents", "agents"],
    ["/dgarh/bannette", "actes"],
    ["/dgarh/actes", "actes"],
    ["/dgarh", "dgarh"],
    ["/mon-dossier", "mon-dossier"],
    ["/carrieres", "carrieres"],
    ["/conges", "conges"],
    ["/formations", "formations"],
    ["/contentieux", "contentieux"],
    ["/besoins", "besoins"],
    ["/referentiels", "referentiels"],
    ["/documents", "documents"],
    ["/textes", "textes"],
    ["/postes", "postes"],
    ["/recrutement", "recrutement"],
    ["/delegations", "delegations"],
    ["/annuaire", "annuaire"],
    ["/cartes", "cartes"],
    ["/retraite", "retraite"],
    ["/aide", "aide"],
    ["/rapports", "rapports"],
    ["/journal", "journal"],
    ["/administration", "administration"],
    ["/messagerie", "messagerie"],
    ["/tickets", "tickets"],
    ["/annonces", "annonces"],
  ];
  return routes.find(([r]) => pathname === r || pathname.startsWith(r + "/"))?.[1] ?? null;
}
