import type { CodeProfil } from "./profil";

/* ------------------------------------------------------------------ */
/* Habilitations — qui peut donner l'accès, à qui, et sur quoi         */
/* ------------------------------------------------------------------ */

/**
 * Ce que ce fichier corrige.
 *
 * Jusqu'ici, l'accès d'un agent tenait dans deux champs posés sur son compte :
 * `role` et `entiteId`. Cela suffit à *dire* ce qu'il peut faire, et ne suffit
 * à rien d'autre. Il manquait tout le reste :
 *
 *  - **qui le lui a donné.** Un compte de chef de service apparu un matin
 *    n'avait pas d'auteur. Dans une administration, une habilitation est un
 *    acte de quelqu'un sur quelqu'un — l'anonymat y est une anomalie ;
 *  - **jusqu'à quand.** Un intérim de trois semaines s'accordait comme un
 *    accès définitif, et le retirer supposait que quelqu'un s'en souvienne ;
 *  - **ce qu'il y avait avant.** Écraser `role` efface l'historique : on ne
 *    peut plus dire qui tenait le registre en mars, ni sous quelle autorité.
 *
 * Le dépôt sait déjà faire cela partout ailleurs : la carrière d'un agent est
 * une suite d'actes datés dont l'état courant se **projette**. L'habilitation
 * suit désormais la même règle. `Utilisateur.role` reste, mais comme
 * projection — la valeur en vigueur, recopiée pour la lecture — et non plus
 * comme la source de vérité.
 */

/**
 * Le droit d'agir, accordé par quelqu'un, sur un périmètre, pour une durée.
 *
 * Une habilitation ne se modifie pas : elle se clôt et une autre s'ouvre.
 * C'est ce qui permet de répondre, six mois plus tard, à la seule question
 * qui compte devant un contrôle — *qui avait ce droit ce jour-là, et de qui
 * le tenait-il ?*
 */
export interface Habilitation {
  id: string;
  utilisateurId: string;
  role: CodeProfil;
  /**
   * Le périmètre : cette entité et tout ce qu'elle contient. Il ne se saisit
   * pas librement — il doit être dans le périmètre de celui qui accorde,
   * sans quoi un chef de service habiliterait dans la direction voisine.
   */
  entiteId: string;
  /** Le compte qui a accordé. `null` seulement pour le semis d'origine. */
  accordePar: string | null;
  accordeParNom: string;
  accordeLe: string;
  /** Prise d'effet. Une habilitation peut être préparée pour plus tard. */
  dateDebut: string;
  /** `null` = sans terme. Une date passée vaut habilitation éteinte. */
  dateFin: string | null;
  /**
   * Pourquoi. Obligatoire à l'écriture : accorder un accès sans dire au titre
   * de quoi est exactement ce que le journal d'audit sert à empêcher.
   */
  motif: string;
  /** L'acte de nomination, quand il y en a un. */
  acteId?: string | null;
  /** Retrait avant terme — distinct d'une extinction par date. */
  revoqueePar?: string | null;
  revoqueeParNom?: string | null;
  revoqueeLe?: string | null;
  motifRevocation?: string;
}

/**
 * Ce qu'un chef peut faire, ou non, à l'égard d'un profil donné.
 *
 * On renvoie le motif du refus plutôt qu'un booléen nu : un écran qui grise
 * un bouton sans dire pourquoi transforme une règle d'organisation en panne
 * apparente, et le service appelle l'administrateur pour rien.
 */
export interface VerdictHabilitation {
  ok: boolean;
  motif?: string;
}
