import { TEXTES } from "../textes";
import { type E, deplier, e } from "./socle";
import { secretariatDirection, servicesDafm } from "./enseignement";

/* ------------------------------------------------------------------ */
/* La direction générale de l'équipement et du patrimoine — 25568      */
/* ------------------------------------------------------------------ */

/**
 * La quatrième direction générale, et un désaccord du texte avec lui-même.
 *
 * L'article 2 de l'arrêté n° 25568 annonce « la direction des finances et du
 * matériel » ; son chapitre 3 et ses articles 21 et 22 l'appellent « la
 * direction de **l'administration**, des finances et du matériel », et lui
 * donnent les trois services habituels. On retient l'intitulé des articles —
 * c'est celui qui organise, et c'est le même dans les trois autres directions
 * générales — et on écrit ici la divergence plutôt que de la trancher en
 * silence : quelqu'un, au ministère, saura laquelle des deux rédactions fait
 * foi.
 */

export const DGEQP_ID = "ENT-DGEQP";

export const directionGeneraleEquipement: E[] = [
  e(DGEQP_ID, "DGEQP", "Direction générale de l'équipement et du patrimoine",
    "DIRECTION_GENERALE", "ENT-METP", "TEXTE", TEXTES.ARR_25568, "Brazzaville"),
  ...deplier([
    secretariatDirection("DGEQP"),
    ["DIRECTION", "DEQP", "Direction de l'équipement et du patrimoine", [
      ["SERVICE", "SEQU", "Service de l'équipement", [
        ["BUREAU", "BACQ", "Bureau des acquisitions"],
        ["BUREAU", "BFICH-EQ", "Bureau du fichier"],
      ]],
      ["SERVICE", "SPAT", "Service du patrimoine", [
        ["BUREAU", "BGPAT", "Bureau de la gestion du patrimoine"],
        ["BUREAU", "BFICH-PAT", "Bureau du fichier"],
      ]],
      ["SERVICE", "SCTX-EQP", "Service du contentieux", [
        ["BUREAU", "BRECL", "Bureau des réclamations"],
        ["BUREAU", "BCONT-EQP", "Bureau du contrôle"],
      ]],
    ]],
    ["DIRECTION", "DAFM-DGEQP", "Direction de l'administration, des finances et du matériel",
      servicesDafm("DGEQP")],
  ], DGEQP_ID, "TEXTE", TEXTES.ARR_25568, "Brazzaville"),
];
