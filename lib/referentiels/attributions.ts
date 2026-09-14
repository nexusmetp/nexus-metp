import type { CodeProfil } from "@/lib/types";
import { entiteById } from "./entites";
import { type ModuleKey, peut } from "./droits";

/* ------------------------------------------------------------------ */
/* Les attributions — sur quoi une direction est compétente            */
/* ------------------------------------------------------------------ */

/**
 * Le troisième axe, et il manquait.
 *
 * La plateforme savait répondre à deux questions et se croyait complète :
 *
 *  - **jusqu'où puis-je aller ?** — c'est le rang (`RANG_HIERARCHIQUE`) ;
 *  - **sur qui ?** — c'est le périmètre, déduit de l'arbre des entités.
 *
 * Il en manquait une troisième, et c'est celle que pose tout arrêté
 * d'organisation de ce ministère : **sur quoi ?** Les textes d'octobre 2022
 * s'intitulent tous « fixant les **attributions** et l'organisation… » ; la
 * plateforme n'en retenait que l'organisation.
 *
 * Ce que cela produisait. `DIRECTEUR_CENTRAL` est une seule ligne de matrice,
 * partagée par les directeurs de la DPCEF, de la DOBAS et de la DAFM — trois
 * métiers sans rien de commun. Conséquence exacte et vérifiable : le directeur
 * de l'administration, **des finances** et du matériel ne pouvait pas
 * renseigner la valeur du point indiciaire ni enregistrer une rémunération
 * (`remuneration: "R"`), ne pouvait pas verser aux archives alors que le
 * service des archives est chez lui, et pouvait en revanche instruire des
 * actes de carrière et recruter — le métier de la DPCEF.
 *
 * **La règle, en une phrase :** le rang dit *jusqu'où*, le périmètre dit *sur
 * qui*, l'attribution dit *sur quoi*. Une écriture demande les trois.
 *
 * **Ce que l'attribution ne borne pas.** Les gestes de commandement — inscrire
 * le personnel de sa propre entité, en désigner les chefs, constater les
 * présences, accorder un congé — appartiennent à tout chef quel que soit son
 * domaine, sinon un directeur ne pourrait plus tenir sa propre maison. Et
 * elle ne borne **jamais la lecture** : ce qu'on a le droit de voir est déjà
 * borné par le profil et par le périmètre, et ajouter là une seconde barrière
 * fermerait des écrans qui fonctionnent sans rien protéger de plus.
 */

export type Domaine =
  | "PERSONNEL"
  | "FINANCES"
  | "MATERIEL"
  | "ARCHIVES"
  | "SCOLARITE"
  | "CONTROLE";

export const LIBELLES_DOMAINE: Record<Domaine, string> = {
  PERSONNEL: "Personnel et carrières",
  FINANCES: "Finances et rémunération",
  MATERIEL: "Matériel et patrimoine",
  ARCHIVES: "Archives et documentation",
  SCOLARITE: "Orientation, bourses et aides",
  CONTROLE: "Inspection et contrôle",
};

/**
 * Les modules qu'un domaine ouvre à l'écriture.
 *
 * Un module peut relever de deux domaines : un **état de besoins** en
 * personnel s'exprime en effectifs et s'arbitre en francs, si bien que la
 * DPCEF et la DAFM y ont l'une et l'autre qualité. Deux domaines pour un
 * module n'est donc pas une imprécision, c'est la réalité de l'arbitrage.
 *
 * Deux domaines n'ouvrent rien : **MATERIEL** et **SCOLARITE**. Ce n'est pas
 * un oubli — la plateforme ne tient ni inventaire du patrimoine ni dossier de
 * bourse. Les déclarer quand même a un sens : l'écran peut dire à un
 * directeur que sa compétence est reconnue et pas encore outillée, ce qui vaut
 * mieux que de lui laisser croire qu'il n'en a aucune.
 */
export const MODULES_DU_DOMAINE: Record<Domaine, ModuleKey[]> = {
  PERSONNEL: [
    "actes", "carrieres", "recrutement", "contentieux", "formations",
    "postes", "retraite", "besoins", "cartes", "delegations",
  ],
  FINANCES: ["remuneration", "besoins"],
  MATERIEL: [],
  ARCHIVES: ["archives"],
  SCOLARITE: [],
  CONTROLE: [],
};

/**
 * Les modules qui suivent le **commandement** et non l'attribution.
 *
 * On les exerce chez soi, quel que soit le domaine de sa direction : tenir son
 * fichier, désigner ses chefs, constater les présences, écrire une note. Les
 * soumettre à l'attribution empêcherait le directeur des finances d'inscrire
 * son propre personnel — et couperait la chaîne de délégation à sa racine.
 */
const MODULES_DE_COMMANDEMENT: ModuleKey[] = [
  "organisation", "organigramme", "agents", "presences", "sorties", "conges",
  "annuaire", "documents", "redaction", "messagerie", "tickets", "annonces",
  "mon-dossier", "aide", "textes", "dgarh", "national", "pilotage", "rapports",
  "profils", "referentiels", "journal", "administration", "ministre",
];

/**
 * Les attributions déclarées, et d'où elles viennent.
 *
 * **Elles se lisent dans l'intitulé de la direction**, qui est lui-même dans
 * l'arrêté : « direction de l'administration, **des finances** et du
 * matériel ». Ce n'est pas une déduction sur le contenu des textes — dont
 * aucun n'a pu être consulté intégralement, et le référentiel des entités le
 * dit déjà — c'est la lecture de leur titre.
 *
 * Une entité non déclarée n'est **pas restreinte** : elle hérite de son
 * parent, et à défaut ses droits restent ceux de son profil. C'est ce qui
 * permet de poser cet axe sans rien casser — les directions départementales,
 * les établissements et le cabinet ne déclarent rien et ne changent pas.
 */
export const DOMAINES_DECLARES: Record<string, Domaine[]> = {
  /* La direction générale porte les trois métiers de ses directions : c'est
     elle qui répond de l'ensemble devant le ministre. */
  "ENT-DGARH": ["PERSONNEL", "FINANCES", "MATERIEL", "ARCHIVES"],

  /* « du personnel, de la condition enseignante et de la formation » */
  "ENT-DPCEF": ["PERSONNEL"],

  /* « de l'orientation, des bourses et des aides scolaires » — reconnue,
     pas encore outillée : la plateforme ne tient pas de dossier de bourse. */
  "ENT-DOBAS": ["SCOLARITE"],

  /* « de l'administration, des finances et du matériel ». Les archives s'y
     ajoutent parce que le service des archives et de la documentation, avec
     son bureau des archives, est l'un de ses trois services. */
  "ENT-DAFM": ["FINANCES", "MATERIEL", "ARCHIVES"],

  /* Les trois services de la DAFM, déclarés séparément — c'est le seul
     endroit où descendre sous la direction apporte quelque chose : sans cela
     le chef du service des archives hériterait des finances et celui des
     finances des archives, chacun pouvant écrire dans le registre de l'autre
     à l'intérieur d'une même direction. */
  "ENT-DAFM-SFM": ["FINANCES", "MATERIEL"],
  "ENT-DAFM-SAD": ["ARCHIVES"],
  /* Le service des affaires administratives tient le personnel et les
     indemnités de la seule direction générale : c'est du commandement chez
     soi, pas un métier ministériel. */
  "ENT-DAFM-SAA": [],

  /* Le secrétariat de la direction générale tient le courrier et la saisie :
     aucun métier ministériel, et c'est exact. */
  "ENT-DGARH-SEC": [],

  /* L'inspection générale contrôle et n'administre pas. Instruire un dossier
     puis le contrôler n'est pas un contrôle. */
  "ENT-IG": ["CONTROLE"],
};

/**
 * Les domaines d'une entité — `null` quand rien n'est déclaré sur sa branche.
 *
 * On remonte l'arbre : un service hérite des attributions de sa direction,
 * qui est le niveau auquel les arrêtés les fixent. Déclarer chaque bureau
 * serait plus précis et plus faux — le texte ne descend pas jusque-là.
 */
export function domainesDe(entiteId?: string | null): Domaine[] | null {
  let courante = entiteById(entiteId ?? undefined);
  for (let saut = 0; courante && saut < 12; saut += 1) {
    const declares = DOMAINES_DECLARES[courante.id];
    if (declares) return declares;
    courante = courante.parentId ? entiteById(courante.parentId) : undefined;
  }
  return null;
}

/** L'attribution de cette entité couvre-t-elle ce module ? */
export function attributionCouvre(entiteId: string | null | undefined, mod: ModuleKey): boolean {
  if (MODULES_DE_COMMANDEMENT.includes(mod)) return true;
  const domaines = domainesDe(entiteId);
  if (domaines === null) return true; // rien de déclaré : rien de restreint
  return domaines.some((d) => MODULES_DU_DOMAINE[d].includes(mod));
}

/**
 * Le droit effectif : le rang **et** l'attribution.
 *
 * À employer partout où un écran ouvre un geste d'écriture. La lecture passe
 * par `peut` comme avant : l'attribution ne ferme aucun écran, elle ferme des
 * boutons.
 */
export function peutDans(
  utilisateur: { role: CodeProfil; entiteId?: string | null },
  mod: ModuleKey,
  mode: "R" | "W" = "R"
): boolean {
  if (!peut(utilisateur.role, mod, mode)) return false;
  if (mode === "R") return true;
  return attributionCouvre(utilisateur.entiteId, mod);
}

/**
 * Pourquoi ce geste est fermé — de quoi l'écrire à l'écran.
 *
 * Un bouton qui disparaît sans un mot est un bouton dont on accuse l'outil.
 * Rendre la phrase ici évite que chaque écran invente la sienne.
 */
export function motifHorsAttribution(
  utilisateur: { role: CodeProfil; entiteId?: string | null },
  mod: ModuleKey
): string | null {
  if (peutDans(utilisateur, mod, "W")) return null;
  if (!peut(utilisateur.role, mod, "W")) return null; // c'est le profil qui ferme, pas l'attribution
  const entite = entiteById(utilisateur.entiteId ?? undefined);
  const domaines = domainesDe(utilisateur.entiteId);
  const liste = (domaines ?? []).map((d) => LIBELLES_DOMAINE[d].toLowerCase());
  return `Ce registre relève d'une autre direction. ${entite?.sigle ?? "Votre direction"} a pour `
    + (liste.length
      ? `attributions : ${liste.join(", ")}.`
      : "attributions le fonctionnement de sa propre structure.")
    + " Vous le consultez ; vous ne l'écrivez pas.";
}
