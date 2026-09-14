import type { Entite, NiveauEntite } from "@/lib/types";
import { NIVEAU_LABELS, descendantsDe, entiteById } from "./entites";

/* ------------------------------------------------------------------ */
/* La grammaire de l'organigramme — ce qui se rattache à quoi          */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi une grammaire, et ce qu'elle corrige.
 *
 * Jusqu'ici, « créer une entité » était un geste unique : on choisissait un
 * niveau dans une liste de onze et un parent dans une autre, et la plateforme
 * enregistrait le couple sans le lire. Rien n'empêchait donc un chef de
 * bureau de créer une **direction générale sous son bureau**, ni un
 * établissement de porter un cabinet. L'arbre restait valide au sens
 * informatique — un parent, des enfants — et faux au sens administratif,
 * c'est-à-dire au seul qui compte : les périmètres, les rangs et les profils
 * proposés se déduisent tous du niveau, et un niveau posé au mauvais endroit
 * les fausse tous en silence.
 *
 * C'est aussi la réponse à la question « quelle différence entre créer une
 * organisation et créer une direction ». Il n'y en a **qu'une seule**, de
 * création, et elle produit toujours la même chose : une **entité**. Ce qui
 * change d'un cas à l'autre est le **niveau** qu'on lui donne — direction,
 * service, bureau, établissement — et ce niveau n'est pas une étiquette
 * décorative : il dit ce que l'entité peut contenir, et qui peut la diriger.
 *
 * La table ci-dessous est donc le texte d'organisation du ministère, écrit
 * une fois. Elle se lit « sous un X, on peut créer un Y ».
 */
export const ENFANTS_AUTORISES: Record<NiveauEntite, NiveauEntite[]> = {
  /* Le ministère porte les grandes structures, et rien d'autre : un bureau
     accroché directement au ministère n'aurait au-dessus de lui personne
     pour l'administrer.

     Les directions départementales n'y figurent plus. Elles relèvent des deux
     directions générales d'enseignement — l'arrêté n° 25565 range « les
     directions départementales » parmi les composantes de la direction
     générale de l'enseignement technique, et le n° 25566 fait de même pour
     l'enseignement professionnel. Les accrocher au ministère en faisait des
     structures sans tutelle, et le directeur général de l'enseignement
     technique n'avait alors aucun périmètre sur son propre réseau. */
  MINISTERE: ["CABINET", "INSPECTION_GENERALE", "DIRECTION_GENERALE", "SECRETARIAT"],
  /* Les structures rattachées au cabinet sont des directions, plus une
     cellule et une unité que l'arrêté n° 25564 place au même rang. */
  CABINET: ["DIRECTION", "SERVICE", "SECRETARIAT"],
  /* L'inspection générale porte son secrétariat, sa direction des affaires
     administratives et financières, ses quatre inspections spécialisées, et
     ses relais déconcentrés. */
  INSPECTION_GENERALE: [
    "DIRECTION", "SERVICE", "SECRETARIAT",
    "INSPECTION_INTERDEPARTEMENTALE", "ANTENNE_DEPARTEMENTALE",
  ],
  DIRECTION_GENERALE: [
    "DIRECTION", "SERVICE", "SECRETARIAT", "DIRECTION_DEPARTEMENTALE",
  ],
  DIRECTION: ["SERVICE", "SECRETARIAT"],
  /* Un service porte des bureaux dans l'administration centrale, et des
     divisions dans l'inspection : les deux existent, et le texte les nomme
     côte à côte. */
  SERVICE: ["BUREAU", "DIVISION"],
  /* La division est la maille propre au contrôle : elle porte des sections. */
  DIVISION: ["SECTION", "BUREAU"],
  SECRETARIAT: ["BUREAU"],
  /* Le bureau est la maille terminale de l'administration centrale : il porte
     des agents, pas des entités. */
  BUREAU: [],
  /* La section ferme la chaîne du côté de l'inspection. */
  SECTION: [],
  DIRECTION_DEPARTEMENTALE: ["SERVICE", "SECRETARIAT", "ETABLISSEMENT"],
  /* Une inspection interdépartementale tient son secrétariat, ses deux
     services, ses quatre divisions et ses antennes départementales. */
  INSPECTION_INTERDEPARTEMENTALE: [
    "SERVICE", "DIVISION", "SECRETARIAT", "ANTENNE_DEPARTEMENTALE",
  ],
  /* L'antenne départementale reprend la même organisation que l'inspection
     dont elle relève : l'arrêté n° 25570 lui donne les mêmes quatre
     divisions. */
  ANTENNE_DEPARTEMENTALE: ["SERVICE", "DIVISION", "SECRETARIAT"],
  /* Un établissement scolaire porte du personnel, pas des directions. */
  ETABLISSEMENT: [],
};

/**
 * Les niveaux qui, dans ce ministère, portent un chef et donc une délégation.
 *
 * La liste vivait dans l'écran de l'administrateur et s'arrêtait aux
 * directions. C'était trop court : un **service**, un **établissement** et une
 * **inspection interdépartementale** portent eux aussi un responsable qui
 * inscrit du personnel, et une chaîne qui s'interrompt à ce niveau-là
 * s'interrompt pour de bon. Le bureau n'y figure pas : il est la maille
 * terminale, son chef relève du service, et l'y compter noierait le signal.
 *
 * Elle est ici, avec le reste de la grammaire, parce que trois lecteurs la
 * lisent désormais — le tableau de bord qui compte les entités sans chef, le
 * semis qui les pourvoit, et l'écran qui propose de désigner. Trois copies,
 * c'est trois vérités le jour où l'une bouge.
 */
export const NIVEAUX_DE_COMMANDEMENT: NiveauEntite[] = [
  "DIRECTION_GENERALE", "DIRECTION", "DIRECTION_DEPARTEMENTALE",
  "INSPECTION_GENERALE", "INSPECTION_INTERDEPARTEMENTALE",
  "ANTENNE_DEPARTEMENTALE", "CABINET", "SERVICE", "DIVISION", "ETABLISSEMENT",
];

/**
 * Profil **proposé** pour celui qui dirige une entité de ce niveau.
 *
 * Une proposition, non une règle : la correspondance entre un niveau
 * d'organigramme et un profil d'accès relève de l'organisation du ministère,
 * pas de l'outil. Elle évite de choisir au jugé dans une liste de quinze, et
 * se corrige d'un clic à l'écran.
 */
export const ROLE_ATTENDU: Partial<Record<NiveauEntite, string>> = {
  MINISTERE: "MINISTRE",
  /* Le cabinet est dirigé par le directeur de cabinet, dont le profil porte
     ce nom et ce rang. Y proposer « directeur central » le plaçait deux
     marches en dessous de sa fonction réelle, et lui interdisait de désigner
     les chefs de service de son propre cabinet. */
  CABINET: "CABINET",
  DIRECTION_GENERALE: "DIRECTEUR_GENERAL",
  /* L'inspection générale est dirigée par un inspecteur, pas par un directeur
     central : c'est un corps distinct, et la confusion se voyait à l'écran. */
  INSPECTION_GENERALE: "INSPECTEUR",
  SECRETARIAT: "CHEF_SERVICE",
  DIRECTION: "DIRECTEUR_CENTRAL",
  SERVICE: "CHEF_SERVICE",
  /* Le chef de division n'a pas de profil à lui : l'arrêté n° 25570 donne
     aux inspecteurs coordonnateurs interdépartementaux « rang de chef de
     division », entre le chef de service et le chef de bureau. Faute d'un
     profil livré à ce rang, on propose celui du chef de service — c'est une
     proposition, elle se corrige d'un clic, et le ministère peut créer le
     profil manquant depuis l'écran Système. */
  DIVISION: "CHEF_SERVICE",
  BUREAU: "CHEF_BUREAU",
  SECTION: "CHEF_BUREAU",
  DIRECTION_DEPARTEMENTALE: "DIRECTEUR_DEPARTEMENTAL",
  INSPECTION_INTERDEPARTEMENTALE: "DIRECTEUR_DEPARTEMENTAL",
  ANTENNE_DEPARTEMENTALE: "CHEF_SERVICE",
  ETABLISSEMENT: "CHEF_ETABLISSEMENT",
};

/** Le titre que porte celui qui dirige une entité de ce niveau. */
export const TITRE_DU_CHEF: Partial<Record<NiveauEntite, string>> = {
  CABINET: "Directeur de cabinet",
  DIRECTION_GENERALE: "Directeur général",
  INSPECTION_GENERALE: "Inspecteur général",
  DIRECTION: "Directeur",
  SERVICE: "Chef de service",
  DIVISION: "Chef de division",
  SECRETARIAT: "Chef du secrétariat",
  BUREAU: "Chef de bureau",
  SECTION: "Chef de section",
  DIRECTION_DEPARTEMENTALE: "Directeur départemental",
  INSPECTION_INTERDEPARTEMENTALE: "Inspecteur interdépartemental",
  ANTENNE_DEPARTEMENTALE: "Chef d'antenne",
  ETABLISSEMENT: "Chef d'établissement",
};

/**
 * Les niveaux créables sous une entité donnée.
 *
 * Rend une liste vide quand l'entité est terminale — l'écran doit alors le
 * dire, plutôt que d'offrir un formulaire qui sera refusé à l'envoi.
 */
export function niveauxCreablesSous(parentId?: string | null): NiveauEntite[] {
  const parent = entiteById(parentId ?? undefined);
  if (!parent) return [];
  return ENFANTS_AUTORISES[parent.niveau] ?? [];
}

/** Ce que la liste des niveaux affiche : le libellé, pas le code. */
export const optionsNiveaux = (parentId?: string | null) =>
  niveauxCreablesSous(parentId).map((n) => ({ valeur: n, libelle: NIVEAU_LABELS[n] }));

/**
 * Ce rattachement est-il recevable ?
 *
 * On renvoie le motif plutôt qu'un booléen : refuser sans dire pourquoi
 * transforme une règle d'organisation en panne apparente, et le service
 * appelle l'administrateur pour rien.
 */
export function verdictRattachement(niveau: NiveauEntite, parentId?: string | null): {
  ok: boolean; motif?: string;
} {
  const parent = entiteById(parentId ?? undefined);
  if (!parent) {
    return { ok: false, motif: "Choisissez l'entité de rattachement." };
  }
  const admis = ENFANTS_AUTORISES[parent.niveau] ?? [];
  if (admis.length === 0) {
    return {
      ok: false,
      motif: `${NIVEAU_LABELS[parent.niveau]} est une maille terminale : `
        + "elle porte des agents, pas des entités.",
    };
  }
  if (!admis.includes(niveau)) {
    return {
      ok: false,
      motif: `Sous ${parent.sigle} (${NIVEAU_LABELS[parent.niveau].toLowerCase()}), `
        + `on ne crée que : ${admis.map((n) => NIVEAU_LABELS[n].toLowerCase()).join(", ")}.`,
    };
  }
  return { ok: true };
}

/**
 * Les entités dont le niveau ne s'accorde pas avec celui de leur parent.
 *
 * La grammaire ne s'applique qu'à l'écriture : une règle posée aujourd'hui ne
 * réécrit pas l'existant, et refuser de charger un organigramme déjà en place
 * serait le pire des remèdes. Mais on ne peut pas non plus faire comme si de
 * rien n'était — d'où cette relecture, affichée au tableau de bord de
 * l'administrateur, qui dit ce qui reste à régulariser sans rien casser.
 */
export function incoherencesOrganigramme(entites: Entite[]): {
  entite: Entite; parent: Entite | undefined; motif: string;
}[] {
  return entites.reduce<{ entite: Entite; parent: Entite | undefined; motif: string }[]>((acc, e) => {
    if (!e.parentId) return acc;
    const parent = entites.find((p) => p.id === e.parentId);
    if (!parent) {
      acc.push({ entite: e, parent: undefined, motif: "Rattachée à une entité qui n'existe pas." });
      return acc;
    }
    const v = verdictRattachement(e.niveau, e.parentId);
    if (!v.ok) acc.push({ entite: e, parent, motif: v.motif ?? "Rattachement non conforme." });
    return acc;
  }, []);
}

/**
 * Rattacher une entité à l'une de celles qu'elle contient ferait de l'arbre
 * un cycle, et `descendantsDe` — qui calcule tous les périmètres de la
 * plateforme — tournerait sans fin.
 */
export const creeUnCycle = (entiteId: string, parentId?: string | null) =>
  !!parentId && (parentId === entiteId || descendantsDe(entiteId).some((d) => d.id === parentId));
