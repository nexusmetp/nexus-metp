import type { Role } from "./acces";

/* ------------------------------------------------------------------ */
/* Profils d'accès — les droits deviennent une donnée, pas du code     */
/* ------------------------------------------------------------------ */

/**
 * Ce que ce fichier change, et pourquoi il fallait le changer.
 *
 * Les droits vivaient dans une union TypeScript et une matrice écrite en
 * dur. Conséquence : **créer un profil demandait de modifier le code et de
 * redéployer.** Un ministère qui veut distinguer « secrétaire de direction »
 * de « chargé du courrier » devait ouvrir un ticket. L'écran « Matrice des
 * droits » de l'espace Système le donnait d'ailleurs à lire sans permettre
 * d'y toucher — un tableau qui décrit une règle que son lecteur ne peut pas
 * régler.
 *
 * Un profil est donc désormais une **donnée** : un nom, une description, des
 * droits par module, un rang. Et il est **prédéfini au centre** : deux
 * secrétaires de deux directions font le même métier, leurs droits ne
 * doivent pas dépendre du service qui les a nommés. Le chef **attribue** un
 * profil ; il n'en définit pas.
 *
 * Un profil est un **type, pas un poste** : plusieurs agents d'une même
 * direction le portent en même temps. C'est ce qui permet à une direction
 * d'avoir trois secrétaires sans que rien n'ait à être dupliqué.
 *
 * Deux étages, repris du motif que le dépôt applique déjà aux modèles de
 * documents (voir `CLAUDE.md`) :
 *
 *  1. **les profils livrés** sont du code (`lib/referentiels/droits.ts`) et
 *     ne se modifient jamais depuis l'écran. Ils portent la répartition des
 *     attributions du cahier §11 ; une correction maladroite s'y répandrait
 *     sur toute la plateforme sans relecture ;
 *  2. **les profils de la maison** sont la reprise d'un profil livré, ou une
 *     feuille blanche, déposée par l'administrateur système. Ils se
 *     distinguent à l'œil : un profil réglé par un service n'a pas été relu
 *     par un juriste.
 */

/**
 * Le code d'un profil : l'un des treize livrés, ou celui d'un profil de la
 * maison.
 *
 * `string & {}` élargit le type sans éteindre l'autocomplétion sur les
 * treize — on garde l'aide de l'éditeur là où elle sert, et on accepte les
 * codes que l'administrateur créera.
 */
export type CodeProfil = Role | (string & {});

/** D'où vient un profil, et donc ce qu'on a le droit d'en faire. */
export type OrigineProfil = "LIVRE" | "MAISON";

export interface ProfilAcces {
  /** Identifiant technique. Pour un livré, il vaut le code. */
  id: string;
  /**
   * Clé stable, portée par les comptes. Elle ne change jamais : la changer
   * romprait le lien avec tous les comptes qui la portent, et ceux-ci se
   * retrouveraient sans droits du jour au lendemain.
   */
  code: string;
  libelle: string;
  /** À quoi sert ce profil, dit au chef qui va l'attribuer. */
  description: string;
  /**
   * Rang hiérarchique. C'est lui, et rien d'autre, qui décide qui peut
   * attribuer quoi : on n'accorde qu'un profil de rang strictement inférieur
   * au sien. `0` = hors chaîne hiérarchique, n'attribue rien.
   */
  rang: number;
  /** Les droits, module par module. Absent = aucun accès. */
  droits: Record<string, "R" | "W">;
  origine: OrigineProfil;
  /** Le profil livré dont celui-ci est la reprise, quand il en a un. */
  deriveDe?: string | null;
  /**
   * Réservé à l'administrateur système : un chef ne peut pas l'attribuer,
   * même s'il est d'un rang inférieur au sien. C'est le cas des fonctions
   * qui procèdent d'un acte de nomination, désignées hors de la plateforme.
   */
  reserveAdmin: boolean;
  /** Un profil désactivé ne s'attribue plus, sans disparaître de l'historique. */
  actif: boolean;
  /**
   * Profil **technique** : son porteur n'est pas un agent du ministère.
   *
   * C'est l'exception au socle, et la seule. L'administrateur système n'a pas
   * de dossier, pas de carrière, pas de congés à consulter : il fait vivre la
   * plateforme, il ne sert dans aucune direction. Lui donner le socle d'agent
   * lui ouvrirait les présences, les dossiers et les documents de tout le
   * ministère — c'est-à-dire tout ce dont il n'a pas besoin, et précisément ce
   * qu'un administrateur ne devrait pas pouvoir lire sans raison.
   *
   * Un profil technique n'hérite donc de rien : il n'a que ce qu'on lui donne,
   * ligne par ligne.
   */
  technique?: boolean;
  /**
   * Jusqu'où porte le regard : son périmètre, ou le ministère entier.
   *
   * C'est le pendant indispensable des droits. `agents: "R"` dit *qu'on peut
   * lire le fichier du personnel* ; il ne dit pas *lequel*. Faute de cette
   * précision, un chef de service ouvrait la liste des deux mille quatre cents
   * agents du ministère — le filtre « toutes les entités » étant un choix
   * offert, non une limite. Le dossier d'un agent est une donnée personnelle :
   * le voir suppose une raison, et la raison ordinaire est qu'on en répond.
   *
   * `PERIMETRE` est le défaut, et doit le rester : on ne voit que son entité
   * et ce qu'elle contient. `MINISTERE` est l'exception motivée — le ministre
   * et son cabinet, qui décident à cette échelle ; la direction générale des
   * ressources humaines, qui gère le personnel de tout le ministère ;
   * l'inspection, qui ne contrôlerait rien si son objet pouvait se soustraire
   * à elle. Elle se règle depuis l'écran Système et le changement est
   * journalisé : élargir la vue de quelqu'un est une décision, pas un réglage.
   */
  portee?: "PERIMETRE" | "MINISTERE";
  /**
   * Jusqu'où ce profil **administre** — et c'est une autre question que
   * jusqu'où il voit.
   *
   * Lire et administrer ne se recouvrent pas. L'inspecteur lit le ministère
   * entier et n'y crée rien : contrôler n'est pas commander. Le ministre lit
   * tout et n'administre rien : décider n'est pas instruire. À l'inverse, le
   * **directeur général de la DGARH** administre tout le ministère — le
   * cabinet compris — parce que c'est l'objet même de sa direction : la
   * gestion administrative et les ressources humaines de l'ensemble des
   * structures. Il ne siège pourtant que dans l'une d'elles.
   *
   * Confondre les deux portées avait une conséquence précise et invisible :
   * le périmètre d'administration se déduisait de l'**entité de
   * rattachement**, si bien que le DG, assis à la DGARH, ne pouvait créer une
   * entité ni désigner un chef nulle part ailleurs — ni au cabinet, ni dans
   * une direction départementale. La chaîne s'arrêtait donc à la première
   * marche, et il fallait l'administrateur système pour chaque service du
   * ministère, ce qui est exactement ce qu'on voulait éviter.
   *
   * `MINISTERE` : crée et désigne partout. `PERIMETRE` (défaut) : dans son
   * entité et ce qu'elle contient, et rien au-delà.
   */
  administre?: "PERIMETRE" | "MINISTERE";
  creePar?: string;
  dateCreation?: string;
  modifiePar?: string;
  dateModification?: string;
}
