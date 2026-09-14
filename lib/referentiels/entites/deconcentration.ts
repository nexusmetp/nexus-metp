import { DEPARTEMENTS } from "../geo";
import { TEXTES } from "../textes";
import { type E, type Noeud, deplier, e } from "./socle";
import { DGEP_ID, DGET_ID } from "./enseignement";
import { IG_ID } from "./inspection";

/* ------------------------------------------------------------------ */
/* La déconcentration — arrêtés n° 25570, 25571 et 25572               */
/* ------------------------------------------------------------------ */

/**
 * Trois corrections, et la première change la tutelle de tout le réseau.
 *
 * **1. Les directions départementales relevaient du ministère.** Elles y
 * étaient accrochées directement, ce qui ne leur donnait aucune tutelle : le
 * directeur général de l'enseignement technique n'avait alors aucun périmètre
 * sur son propre réseau départemental. L'article 2 de l'arrêté n° 25565 range
 * « les directions départementales » parmi les composantes de la direction
 * générale de l'enseignement technique ; le n° 25566 fait de même pour
 * l'enseignement professionnel.
 *
 * **2. Il y a deux séries de directions départementales**, et nous n'en
 * montrions qu'une : l'arrêté n° 25571 organise celles de l'enseignement
 * technique, le n° 25572 celles de l'enseignement professionnel. Deux réseaux
 * distincts, deux tutelles distinctes, dans les mêmes quinze départements.
 *
 * **3. Les antennes s'appellent « d'encadrement ».** Nous écrivions « antennes
 * départementales **d'appui** et de contrôle », et une note du corpus proposait
 * de corriger en « bureaux départementaux de la supervision et du contrôle ».
 * Les deux sont fausses : le titre de l'arrêté n° 25570 et l'article 2 du
 * n° 25569 disent « antennes départementales **d'encadrement** et de
 * contrôle ».
 *
 * Ce qui reste marqué « à vérifier » : le **découpage** des quatre inspections
 * interdépartementales, que l'arrêté ne donne pas, et la **carte scolaire**,
 * qui n'est pas dans ces textes. Le regroupement géographique des antennes est
 * donc une commodité déclarée comme telle — le reste vient du texte.
 */

/** Identifiants en ASCII : un accent dans un identifiant voyage mal. */
const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Le code court d'un département, et pourquoi il ne peut pas être les quatre
 * premières lettres.
 *
 * « Cuvette » et « Cuvette-Ouest » commencent tous deux par CUVE — deux
 * départements, un seul code. La collision existait déjà : deux lycées
 * techniques portaient le sigle `LT-CUVE`, et rien à l'écran ne permettait de
 * savoir lequel on regardait. Un nom composé donne donc trois lettres de son
 * premier terme et l'initiale du second : Cuvette-Ouest devient CUVO.
 */
const code = (nom: string) => {
  const net = (t: string) => t.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const [premier, second] = sansAccent(nom).split(/[-\s]+/);
  return second ? `${net(premier).slice(0, 3)}${net(second).slice(0, 1)}` : net(premier).slice(0, 4);
};

const REF_IID = "Découpage des inspections interdépartementales — arrêté n° 25570, découpage non publié";

/* ---------------- Les directions départementales ---------------- */

/**
 * Les cinq services d'une direction départementale, plus son secrétariat.
 *
 * Identiques dans les deux séries à un mot près — « examens et concours
 * **techniques** » contre « **professionnels** », « service de l'enseignement
 * **technique** » contre « **professionnel** » — ce qui est exactement ce que
 * disent les articles 3 des deux arrêtés.
 */
const servicesDepartementaux = (suffixe: string, dep: string, filiere: string): Noeud[] => [
  ["SECRETARIAT", `SEC-${suffixe}${dep}`, "Secrétariat"],
  ["SERVICE", `SFM-${suffixe}${dep}`, "Service des finances et du matériel"],
  ["SERVICE", `SEC${suffixe}${dep}`, `Service des examens et concours ${filiere}s`],
  ["SERVICE", `SARH-${suffixe}${dep}`, "Service de l'administration et des ressources humaines"],
  ["SERVICE", `SENS-${suffixe}${dep}`, `Service de l'enseignement ${filiere}`],
  ["SERVICE", `SEQP-${suffixe}${dep}`, "Service de l'équipement et du patrimoine"],
];

/** Une série de directions départementales : une par département. */
function serieDepartementale(
  prefixe: "DDET" | "DDEP", tutelle: string, filiere: string, reference: string
): E[] {
  return DEPARTEMENTS.flatMap((d, i) => {
    const rang = String(i + 1).padStart(2, "0");
    const suffixe = prefixe === "DDET" ? "T" : "P";
    const id = `ENT-${prefixe}-${rang}`;
    return [
      e(id, `${prefixe}-${code(d.nom)}`,
        `Direction départementale de l'enseignement ${filiere} — ${d.nom}`,
        "DIRECTION_DEPARTEMENTALE", tutelle, "TEXTE", reference, d.chefLieu),
      ...deplier(servicesDepartementaux(suffixe, rang, filiere), id, "TEXTE", reference, d.chefLieu),
    ];
  });
}

export const directionsDepartementalesTechnique =
  serieDepartementale("DDET", DGET_ID, "technique", TEXTES.ARR_25571);

export const directionsDepartementalesProfessionnel =
  serieDepartementale("DDEP", DGEP_ID, "professionnel", TEXTES.ARR_25572);

/* ---------------- L'inspection déconcentrée ---------------- */

/**
 * Ce que l'arrêté n° 25570 donne à une inspection interdépartementale — et,
 * mot pour mot, à chacune de ses antennes départementales.
 */
const organesInspection = (suffixe: string): Noeud[] => [
  ["SECRETARIAT", `SEC-${suffixe}`, "Secrétariat"],
  ["SERVICE", `SFM-${suffixe}`, "Service des finances et du matériel"],
  ["SERVICE", `SPSAD-${suffixe}`, "Service du personnel, des statistiques, des archives et de la documentation"],
  ["DIVISION", `DPED-${suffixe}`, "Division pédagogique"],
  ["DIVISION", `DAARH-${suffixe}`, "Division des affaires administratives et des ressources humaines"],
  ["DIVISION", `DMAQ-${suffixe}`, "Division du management et de l'assurance qualité"],
  ["DIVISION", `DFEP-${suffixe}`, "Division des finances, de l'équipement et du patrimoine"],
];

const GROUPES_IID: {
  id: string; sigle: string; nom: string; siege: string; departements: string[];
}[] = [
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

export const inspectionDeconcentree: E[] = GROUPES_IID.flatMap((g) => {
  const cle = g.sigle.replace("IID-", "");
  return [
    /* L'inspection elle-même vient du texte ; c'est son ressort géographique
       qui reste à confirmer, et c'est lui seul que « à vérifier » vise. */
    e(g.id, g.sigle, g.nom, "INSPECTION_INTERDEPARTEMENTALE", IG_ID, "A_VERIFIER", REF_IID, g.siege),
    ...deplier(organesInspection(cle), g.id, "TEXTE", TEXTES.ARR_25570, g.siege),
    ...g.departements.flatMap((nom) => {
      const d = DEPARTEMENTS.find((x) => x.nom === nom)!;
      const cleAnt = code(nom);
      const id = `ENT-ANT-${cleAnt}`;
      return [
        e(id, `ANT-${cleAnt}`,
          `Antenne départementale d'encadrement et de contrôle — ${nom}`,
          "ANTENNE_DEPARTEMENTALE", g.id, "TEXTE", TEXTES.ARR_25570, d.chefLieu),
        ...deplier(organesInspection(`A${cleAnt}`), id, "TEXTE", TEXTES.ARR_25570, d.chefLieu),
      ];
    }),
  ];
});

/* ---------------- Les établissements ---------------- */

/**
 * Le niveau local ferme la chaîne ascendante : c'est de là que partent les
 * états de besoins. La liste réelle relève de la **carte scolaire** du
 * ministère, qui n'est dans aucun des arrêtés d'organisation : celle-ci reste
 * un gabarit, marqué comme tel, et rattaché à la direction départementale de
 * l'enseignement technique du département.
 */
const MODELES_ETABLISSEMENT = [
  { prefixe: "LT", genre: "Lycée technique" },
  { prefixe: "CET", genre: "Collège d'enseignement technique" },
  { prefixe: "CFP", genre: "Centre de formation professionnelle" },
  { prefixe: "LTA", genre: "Lycée technique agricole" },
];

export const etablissements: E[] = DEPARTEMENTS.flatMap((d, i) => {
  const rang = String(i + 1).padStart(2, "0");
  const nb = d.nom === "Brazzaville" || d.nom === "Pointe-Noire" ? 4 : 3;
  return MODELES_ETABLISSEMENT.slice(0, nb).map((m, k) =>
    e(`ENT-ETB-${rang}-${k + 1}`, `${m.prefixe}-${code(d.nom)}`,
      `${m.genre} de ${d.chefLieu}`, "ETABLISSEMENT", `ENT-DDET-${rang}`,
      "A_VERIFIER", "Carte scolaire du ministère — liste non consultée", d.chefLieu)
  );
});

export const deconcentration: E[] = [
  ...directionsDepartementalesTechnique,
  ...directionsDepartementalesProfessionnel,
  ...inspectionDeconcentree,
];
