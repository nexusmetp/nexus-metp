import type { Entite, Provenance } from "@/lib/types";
import { DEPARTEMENTS } from "./geo";
import { MINISTERE_NOM, TEXTES } from "./textes";

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
  // Une localisation saisie prime sur toute reconstitution : c'est la seule
  // qui dise où la structure se trouve vraiment.
  if (typeof entite.lat === "number" && typeof entite.lon === "number") {
    return { lat: entite.lat, lon: entite.lon };
  }
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
