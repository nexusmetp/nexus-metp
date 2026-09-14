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
     pour l'administrer. */
  MINISTERE: [
    "CABINET", "INSPECTION_GENERALE", "DIRECTION_GENERALE",
    "DIRECTION_DEPARTEMENTALE", "INSPECTION_INTERDEPARTEMENTALE", "SECRETARIAT",
  ],
  CABINET: ["DIRECTION", "SERVICE", "SECRETARIAT"],
  /* L'inspection générale tient ses inspections de terrain, ses services et
     son secrétariat. */
  INSPECTION_GENERALE: ["SERVICE", "SECRETARIAT", "INSPECTION_INTERDEPARTEMENTALE"],
  DIRECTION_GENERALE: ["DIRECTION", "SERVICE", "SECRETARIAT"],
  DIRECTION: ["SERVICE", "SECRETARIAT"],
  SERVICE: ["BUREAU"],
  SECRETARIAT: ["BUREAU"],
  /* Le bureau est la maille terminale de l'administration centrale : il porte
     des agents, pas des entités. */
  BUREAU: [],
  DIRECTION_DEPARTEMENTALE: ["SERVICE", "SECRETARIAT", "ETABLISSEMENT"],
  /* Une inspection interdépartementale en contient d'autres : le ministère
     en groupe cinq sous une entité de tête, et c'est l'organisation réelle,
     non un artefact. */
  INSPECTION_INTERDEPARTEMENTALE: [
    "INSPECTION_INTERDEPARTEMENTALE", "ANTENNE_DEPARTEMENTALE", "SECRETARIAT",
  ],
  ANTENNE_DEPARTEMENTALE: ["BUREAU"],
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
  "INSPECTION_GENERALE", "INSPECTION_INTERDEPARTEMENTALE", "CABINET",
  "SERVICE", "ETABLISSEMENT",
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
  BUREAU: "CHEF_BUREAU",
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
  SECRETARIAT: "Chef du secrétariat",
  BUREAU: "Chef de bureau",
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
