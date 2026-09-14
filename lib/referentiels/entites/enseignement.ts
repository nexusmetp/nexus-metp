import { TEXTES } from "../textes";
import { type E, type Noeud, deplier, e } from "./socle";

/* ------------------------------------------------------------------ */
/* Les deux directions générales d'enseignement — 25565 et 25566       */
/* ------------------------------------------------------------------ */

/**
 * Le ministère a quatre directions générales ; nous n'en montrions qu'une.
 *
 * La DGARH était la seule représentée, ce qui donnait à croire que la
 * plateforme couvrait le ministère entier alors qu'elle n'en montrait que le
 * quart administratif. Les trois autres ont chacune leur arrêté, publié le
 * même jour au même Journal officiel : l'enseignement technique (25565),
 * l'enseignement professionnel (25566) et l'équipement et le patrimoine
 * (25568).
 *
 * **Les directions départementales relèvent d'ici.** L'article 2 de chaque
 * arrêté range « les directions départementales » parmi les composantes de sa
 * direction générale. Nous les accrochions au ministère : elles n'avaient donc
 * aucune tutelle, et le directeur général de l'enseignement technique n'avait
 * aucun périmètre sur son propre réseau. Elles sont déclarées dans
 * `deconcentration.ts`, avec le département qui les situe.
 *
 * **Le même intitulé, deux entités.** Chacune de ces directions générales a sa
 * propre « direction de l'administration, des finances et du matériel » — le
 * nom de la DAFM de la DGARH. Ce ne sont pas les mêmes services, et les
 * confondre reviendrait à faire payer l'un par le budget de l'autre. D'où les
 * sigles suffixés : `DAFM-DGET`, `DAFM-DGEP`.
 */

export const DGET_ID = "ENT-DGET";
export const DGEP_ID = "ENT-DGEP";

/** Les trois services que chaque direction générale donne à sa DAFM. */
const servicesDafm = (suffixe: string): Noeud[] => [
  ["SERVICE", `SFM-${suffixe}`, "Service des finances et du matériel", [
    ["BUREAU", `BF-${suffixe}`, "Bureau des finances"],
    ["BUREAU", `BM-${suffixe}`, "Bureau du matériel"],
  ]],
  ["SERVICE", `SRH-${suffixe}`, "Service des ressources humaines", [
    ["BUREAU", `BPER-${suffixe}`, "Bureau du personnel"],
    ["BUREAU", `BSCP-${suffixe}`, "Bureau du suivi de la carrière du personnel"],
  ]],
  ["SERVICE", `SAD-${suffixe}`, "Service des archives et de la documentation", [
    ["BUREAU", `BA-${suffixe}`, "Bureau des archives"],
    ["BUREAU", `BD-${suffixe}`, "Bureau de la documentation"],
  ]],
];

/** Le secrétariat de direction, identique dans les quatre directions générales. */
const secretariatDirection = (suffixe: string): Noeud => [
  "SECRETARIAT", `SEC-${suffixe}`, "Secrétariat de direction", [
    ["BUREAU", `BCRPC-${suffixe}`, "Bureau du courrier, des relations publiques et de la communication"],
    ["BUREAU", `BSR-${suffixe}`, "Bureau de la saisie et de la reprographie"],
  ],
];

/** Les deux cycles de l'enseignement technique ont la même organisation. */
const cycleTechnique = (rang: "1" | "2", libelle: string): Noeud => [
  "DIRECTION", `DET${rang}C`, `Direction de l'enseignement technique du ${libelle} cycle`, [
    ["SERVICE", `SEP${rang}C`, "Service de l'encadrement pédagogique", [
      ["BUREAU", `BEF${rang}C`, "Bureau de l'encadrement et de la formation"],
      ["BUREAU", `BRAP${rang}C`, "Bureau de la recherche et de l'action pédagogique"],
      ["BUREAU", `BSTP${rang}C`, `Bureau du suivi des établissements techniques privés du ${libelle} cycle`],
    ]],
    ["SERVICE", `SEPR${rang}C`, "Service des études et de la prospective", [
      ["BUREAU", `BES${rang}C`, "Bureau des études et des statistiques"],
      ["BUREAU", `BPP${rang}C`, "Bureau de la prospective et de la programmation"],
    ]],
  ],
];

export const directionGeneraleEnseignementTechnique: E[] = [
  e(DGET_ID, "DGET", "Direction générale de l'enseignement technique",
    "DIRECTION_GENERALE", "ENT-METP", "TEXTE", TEXTES.ARR_25565, "Brazzaville"),
  ...deplier([
    secretariatDirection("DGET"),
    cycleTechnique("1", "premier"),
    cycleTechnique("2", "deuxième"),
    ["DIRECTION", "DAFM-DGET", "Direction de l'administration, des finances et du matériel",
      servicesDafm("DGET")],
  ], DGET_ID, "TEXTE", TEXTES.ARR_25565, "Brazzaville"),
];

export const directionGeneraleEnseignementProfessionnel: E[] = [
  e(DGEP_ID, "DGEP", "Direction générale de l'enseignement professionnel",
    "DIRECTION_GENERALE", "ENT-METP", "TEXTE", TEXTES.ARR_25566, "Brazzaville"),
  ...deplier([
    secretariatDirection("DGEP"),
    ["DIRECTION", "DECFP", "Direction des écoles et centres de formation professionnelle", [
      ["SERVICE", "SREG", "Service de la réglementation", [
        ["BUREAU", "BRPRO", "Bureau de la rédaction et de la prospective"],
        ["BUREAU", "BCONT-REG", "Bureau du contrôle"],
      ]],
      ["SERVICE", "SPED", "Service pédagogique", [
        ["BUREAU", "BSAP", "Bureau du suivi des activités pédagogiques"],
        ["BUREAU", "BSEPR", "Bureau du suivi et de l'évaluation des programmes"],
      ]],
    ]],
    ["DIRECTION", "DFFP", "Direction de la formation des formateurs et de la formation permanente", [
      ["SERVICE", "SFFOR", "Service de la formation des formateurs", [
        ["BUREAU", "BEPRO", "Bureau des études et de la programmation"],
        ["BUREAU", "BSCTL", "Bureau du suivi et du contrôle"],
      ]],
      ["SERVICE", "SSFP", "Service des stages et de la formation permanente", [
        ["BUREAU", "BSTAG", "Bureau des stages"],
        ["BUREAU", "BFPERM", "Bureau de la formation permanente"],
      ]],
    ]],
    ["DIRECTION", "DAFM-DGEP", "Direction de l'administration, des finances et du matériel",
      servicesDafm("DGEP")],
  ], DGEP_ID, "TEXTE", TEXTES.ARR_25566, "Brazzaville"),
];

export { secretariatDirection, servicesDafm };
