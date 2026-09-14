import type { Provenance } from "./organisation";

/* ------------------------------------------------------------------ */
/* Le lieu où le personnel est reçu, et le cahier qu'on y tient        */
/* ------------------------------------------------------------------ */

/**
 * Ce que ce fichier répare.
 *
 * La plateforme savait qu'un agent était *affecté* à une direction — c'est
 * l'`Affectation`, née d'un acte, avec sa date d'effet. Elle ne savait pas
 * s'il s'y était **présenté**. Entre « affecté sur le papier au 1er septembre »
 * et « en poste », il n'y avait rien : aucun lieu, aucune date d'arrivée,
 * personne qui l'ait reçu. Un agent pouvait donc occuper un poste dans le
 * tableau des emplois sans que quiconque l'ait jamais vu.
 *
 * De même pour la présence quotidienne. Le `Pointage` portait une entité
 * recopiée, mais il ne s'inscrivait dans **aucun registre** et personne n'en
 * répondait. D'où un chiffre qui ne voulait rien dire — « 1 614 agents non
 * pointés » — alors qu'un service dont personne ne tient le cahier n'est pas
 * un service où tout le monde est absent.
 *
 * L'administration, elle, a toujours eu la réponse : **chaque direction,
 * chaque service tient son point**. C'est le secrétariat, ou le bureau du
 * personnel. On y reçoit l'agent qui arrive, on y ouvre le cahier
 * d'émargement le matin et on l'y clôt le soir, et c'est quelqu'un de nommé
 * qui en répond. Trois objets suffisent à l'écrire.
 */

/* ------------------------------------------------------------------ */
/* 1. Le lieu                                                          */
/* ------------------------------------------------------------------ */

/**
 * Comment le service relève la présence. Le mode commande ce qu'on peut
 * conclure du registre : un service au cahier papier saisi en fin de semaine
 * ne produit pas la même donnée qu'un service qui pointe le matin même.
 */
export type ModeReleve =
  /** Cahier tenu à la main, reporté ensuite dans la plateforme. */
  | "REGISTRE_PAPIER"
  /** Saisi directement dans la plateforme, le jour même. */
  | "SAISIE_DIRECTE"
  /** Les deux coexistent — le cas le plus fréquent en période de bascule. */
  | "MIXTE"
  /** Le service n'a pas déclaré son mode. À ne jamais deviner. */
  | "NON_RENSEIGNE";

/**
 * Le point d'accueil du personnel d'une entité : **un seul par entité**.
 *
 * Son identifiant est déterministe (`PTA-<entiteId>`) pour cette raison même.
 * Deux points d'accueil dans une même direction, ce serait deux cahiers, deux
 * versions de la même journée, et aucune des deux opposable.
 *
 * Une entité **sans** point d'accueil n'est pas une anomalie en soi : une
 * antenne de trois agents émarge souvent à la direction départementale dont
 * elle dépend. C'est ce que dit `rattacheA`. Ce qui est une anomalie, c'est
 * une direction de cent agents qui n'a ni point propre ni rattachement.
 */
export interface PointAccueil {
  id: string;
  entiteId: string;
  /** « Secrétariat de la DGARH », « Bureau du personnel de la DEP »… */
  libelle: string;
  /**
   * Bâtiment, étage, numéro de bureau. Non renseigné le plus souvent, et
   * affiché comme tel : un agent muté a besoin de savoir où se présenter.
   */
  localisation?: string | null;
  /** L'agent qui tient le registre et reçoit les arrivants. */
  responsableId?: string | null;
  /** Celui qui le remplace. Un cahier sans suppléant ferme avec son titulaire. */
  suppleantId?: string | null;
  /**
   * Heures d'ouverture du service, HH:MM. `null` = non renseignée, et alors
   * **aucun retard n'est calculé** : un retard suppose une heure due, et une
   * heure due se fixe par décision, pas par habitude.
   */
  heureOuverture?: string | null;
  heureFermeture?: string | null;
  modeReleve: ModeReleve;
  /**
   * Entité dont ce point dépend, quand celle-ci n'en tient pas elle-même.
   * Renseigné sur l'entité qui n'a pas de point propre.
   */
  rattacheA?: string | null;
  actif: boolean;
  /** Comme partout : d'où vient l'existence de ce point. */
  provenance: Provenance;
  creePar?: string;
  dateCreation?: string;
  observations?: string;
}

/* ------------------------------------------------------------------ */
/* 2. L'arrivée                                                        */
/* ------------------------------------------------------------------ */

/**
 * Où en est l'agent entre son acte d'affectation et son installation.
 *
 * `ATTENDUE` n'accuse personne : un agent attendu depuis quarante jours peut
 * être hospitalisé, en attente de titre de transport, ou déjà installé sans
 * que le secrétariat l'ait saisi. C'est un **dossier à vérifier**, et l'écran
 * doit le dire dans ces termes.
 */
export type StatutPriseService =
  /** L'acte a pris effet, l'agent ne s'est pas encore présenté. */
  | "ATTENDUE"
  /** L'agent s'est présenté au point d'accueil ; l'arrivée est enregistrée. */
  | "ENREGISTREE"
  /** Le procès-verbal d'installation est établi : l'agent est en poste. */
  | "INSTALLEE"
  /** Constat d'une non-présentation, après vérification. Jamais automatique. */
  | "NON_PRESENTEE"
  /** L'affectation a été rapportée avant que l'agent n'arrive. */
  | "ANNULEE";

/**
 * La prise de service : **le fait qui rend une affectation effective**.
 *
 * Elle ne remplace pas l'acte — elle le constate au sol. L'acte dit où
 * l'agent doit servir ; la prise de service dit qu'il s'y est présenté, quel
 * jour, et devant qui. Sans elle, le tableau des emplois compte comme occupé
 * un poste que personne n'occupe.
 *
 * Elle se rattache toujours à une `Affectation` : c'est elle qu'elle rend
 * effective, et rien d'autre. Une prise de service sans affectation serait un
 * agent arrivé sans y avoir été nommé.
 */
export interface PriseDeService {
  id: string;
  agentId: string;
  /** L'affectation que cette arrivée rend effective. */
  affectationId: string;
  /** Recopiée depuis l'affectation, pour que l'historique ne bouge plus. */
  entiteId: string;
  /** Le point qui a reçu l'agent. Absent si l'entité n'en tient pas. */
  pointAccueilId?: string | null;
  /** Date d'effet de l'acte : le jour où l'agent était attendu. */
  dateAttendue: string;
  /** Le jour où il s'est effectivement présenté. `null` tant qu'il ne l'a pas. */
  dateArrivee?: string | null;
  /** Date du procès-verbal d'installation, quand il est établi. */
  dateInstallation?: string | null;
  statut: StatutPriseService;
  /** Qui l'a reçu — un nom engage davantage qu'une case cochée. */
  recuPar?: string | null;
  recuParNom?: string | null;
  /** Référence du PV d'installation, et le document s'il a été établi ici. */
  referencePV?: string | null;
  documentId?: string | null;
  acteId?: string | null;
  /**
   * Ce que le secrétariat a constaté. C'est ici qu'on écrit « en attente de
   * titre de transport » plutôt que de laisser un dossier muet quarante jours.
   */
  observations?: string;
  enregistrePar?: string;
  enregistreLe?: string;
}

/* ------------------------------------------------------------------ */
/* 3. Le cahier                                                        */
/* ------------------------------------------------------------------ */

/**
 * Une journée de registre, dans un service, ouverte et close.
 *
 * C'est l'objet qui manquait le plus. Sans lui, l'absence de pointage est
 * ambiguë : agent absent, ou service qui ne tient pas son cahier ? La
 * distinction n'est pas un détail de méthode — elle sépare une question de
 * discipline individuelle d'une question d'organisation, et les deux
 * n'appellent pas la même décision du ministre.
 *
 * Identifiant déterministe (`REG-<entiteId>-<date>`) : un service, un jour,
 * un cahier.
 */
export interface RegistreJour {
  id: string;
  entiteId: string;
  pointAccueilId: string;
  /** AAAA-MM-JJ. */
  date: string;
  ouvertPar: string;
  ouvertParNom: string;
  ouvertLe: string;
  /**
   * La clôture est ce qui rend le cahier opposable : tant qu'il est ouvert,
   * les lignes peuvent encore changer. Un cahier jamais clos n'atteste rien.
   */
  closPar?: string | null;
  closParNom?: string | null;
  closLe?: string | null;
  /**
   * Effectif attendu et effectif émargé, figés à la clôture. On les recopie
   * plutôt que de les recalculer : l'effectif d'un service change avec les
   * mutations, et un cahier de mars doit rester lisible en décembre.
   */
  attendus?: number | null;
  emarges?: number | null;
  observations?: string;
}
