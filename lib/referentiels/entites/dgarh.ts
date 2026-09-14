import { TEXTES } from "../textes";
import { type E, e } from "./socle";

/* ------------------------------------------------------------------ */
/* La DGARH — arrêté n° 25567 du 17 octobre 2022                       */
/* ------------------------------------------------------------------ */

/**
 * La seule branche que la lecture des textes n'a pas démentie.
 *
 * Confrontée à l'arrêté n° 25567, cette arborescence s'est révélée **exacte,
 * nom pour nom** : le secrétariat de direction et ses deux bureaux, puis les
 * trois directions de l'article 2 — du personnel, de la condition enseignante
 * et de la formation ; de l'orientation, des bourses et des aides scolaires ;
 * de l'administration, des finances et du matériel — et, sous chacune, les
 * services et bureaux que les articles 8 à 49 énumèrent.
 *
 * Elle garde donc ses identifiants d'origine, écrits un par un plutôt que
 * dépliés : ils sont cités par les comptes de démonstration, par les
 * attributions déclarées et par la base des installations déjà montées. Un
 * identifiant qui change est un rattachement qui se perd.
 *
 * L'article 7 mérite d'être lu en entier, parce qu'il règle une question que
 * la plateforme posait encore : la DPCEF est chargée d'« assurer la gestion du
 * personnel administratif et enseignant **du ministère** ». Sa compétence est
 * ministérielle, quand son commandement s'arrête à ses dix sous-entités.
 */

/* — Secrétariat de direction : 2 bureaux — */
const secretariat: E[] = [
  e("ENT-DGARH-SEC", "SEC", "Secrétariat de direction", "SECRETARIAT", "ENT-DGARH", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SEC-BCRPC", "BCRPC", "Bureau du courrier, des relations publiques et de la communication",
    "BUREAU", "ENT-DGARH-SEC", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SEC-BSR", "BSR", "Bureau de la saisie et de la reprographie",
    "BUREAU", "ENT-DGARH-SEC", "TEXTE", TEXTES.ARR_25567),
];

/* — DPCEF : 3 services, 7 bureaux — */
const dpcef: E[] = [
  e("ENT-DPCEF", "DPCEF", "Direction du personnel, de la condition enseignante et de la formation",
    "DIRECTION", "ENT-DGARH", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DPCEF-SPC", "SPC", "Service du personnel et du contentieux", "SERVICE", "ENT-DPCEF", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SPC-BRM", "BRM", "Bureau du recrutement et des mouvements", "BUREAU", "ENT-DPCEF-SPC", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SPC-BGC", "BGC", "Bureau de la gestion de carrière", "BUREAU", "ENT-DPCEF-SPC", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SPC-BCX", "BCX", "Bureau du contentieux", "BUREAU", "ENT-DPCEF-SPC", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DPCEF-SCE", "SCE", "Service de la condition enseignante", "SERVICE", "ENT-DPCEF", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SCE-BSCE", "BSCE", "Bureau du suivi et de l'évaluation de la condition enseignante",
    "BUREAU", "ENT-DPCEF-SCE", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SCE-BPVV", "BPVV", "Bureau du suivi et de l'évaluation des prestataires, volontaires et vacataires",
    "BUREAU", "ENT-DPCEF-SCE", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DPCEF-SF", "SF", "Service de la formation", "SERVICE", "ENT-DPCEF", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SF-BFPE", "BFPE", "Bureau de la formation du personnel enseignant", "BUREAU", "ENT-DPCEF-SF", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SF-BFPAT", "BFPAT", "Bureau de la formation du personnel administratif et technique",
    "BUREAU", "ENT-DPCEF-SF", "TEXTE", TEXTES.ARR_25567),
];

/* — DOBAS : attestée sur le site du ministère ; son détail reste à confirmer — */
const dobas: E[] = [
  e("ENT-DOBAS", "DOBAS", "Direction de l'orientation, des bourses et des aides scolaires",
    "DIRECTION", "ENT-DGARH", "TEXTE", "Site officiel du METP"),

  e("ENT-DOBAS-SO", "SO", "Service de l'orientation", "SERVICE", "ENT-DOBAS", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SO-BI", "BI", "Bureau de l'information", "BUREAU", "ENT-DOBAS-SO", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SO-BSS", "BSS", "Bureau du suivi de la scolarité et des statistiques", "BUREAU", "ENT-DOBAS-SO", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DOBAS-SB", "SB", "Service des bourses", "SERVICE", "ENT-DOBAS", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SB-BT", "BT", "Bureau du traitement", "BUREAU", "ENT-DOBAS-SB", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SB-BR", "BR", "Bureau des réclamations", "BUREAU", "ENT-DOBAS-SB", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DOBAS-SASS", "SASS", "Service des aides sociales et scolaires", "SERVICE", "ENT-DOBAS", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SASS-BT", "BT2", "Bureau du traitement", "BUREAU", "ENT-DOBAS-SASS", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SASS-BR", "BR2", "Bureau des réclamations", "BUREAU", "ENT-DOBAS-SASS", "TEXTE", TEXTES.ARR_25567),
];

/* — DAFM : 3 services, 6 bureaux — */
const dafm: E[] = [
  e("ENT-DAFM", "DAFM", "Direction de l'administration, des finances et du matériel",
    "DIRECTION", "ENT-DGARH", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DAFM-SAA", "SAA", "Service des affaires administratives", "SERVICE", "ENT-DAFM", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SAA-BPDG", "BPDG", "Bureau du personnel de la direction générale", "BUREAU", "ENT-DAFM-SAA", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SAA-BICA", "BICA", "Bureau des indemnités et charges administratives", "BUREAU", "ENT-DAFM-SAA", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DAFM-SFM", "SFM", "Service des finances et du matériel", "SERVICE", "ENT-DAFM", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SFM-BF", "BF", "Bureau des finances", "BUREAU", "ENT-DAFM-SFM", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SFM-BM", "BM", "Bureau du matériel", "BUREAU", "ENT-DAFM-SFM", "TEXTE", TEXTES.ARR_25567),

  e("ENT-DAFM-SAD", "SAD", "Service des archives et de la documentation", "SERVICE", "ENT-DAFM", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SAD-BA", "BA", "Bureau des archives", "BUREAU", "ENT-DAFM-SAD", "TEXTE", TEXTES.ARR_25567),
  e("ENT-SAD-BD", "BD", "Bureau de la documentation", "BUREAU", "ENT-DAFM-SAD", "TEXTE", TEXTES.ARR_25567),
];


export const dgarh: E[] = [...secretariat, ...dpcef, ...dobas, ...dafm];
