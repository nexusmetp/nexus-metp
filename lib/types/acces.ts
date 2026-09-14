import type { Affectation, Agent, NaturePosition, Position, SituationCarriere } from "./agent";
import type { CodeProfil } from "./profil";
import type { CategorieStatutaire } from "./organisation";

/* ------------------------------------------------------------------ */
/* Utilisateurs, rôles et périmètres — cahier §11                      */
/* ------------------------------------------------------------------ */

export type Role =
  /* Le sommet, ajouté après coup : la plateforme était née sans lui, et un
     tableau de bord du ministre n'a pas de titulaire sans ces quatre rôles.
     Ils lisent beaucoup et n'écrivent presque rien — c'est leur nature :
     décider et contrôler ne sont pas instruire. */
  | "MINISTRE"
  | "CABINET"
  | "SECRETAIRE_GENERAL"
  | "INSPECTEUR"
  | "ADMIN_SYSTEME"
  | "DIRECTEUR_GENERAL"
  | "DIRECTEUR_CENTRAL"
  | "CHEF_SERVICE"
  | "CHEF_BUREAU"
  | "AGENT_INSTRUCTEUR"
  | "DIRECTEUR_DEPARTEMENTAL"
  | "CHEF_ETABLISSEMENT"
  /* Le secrétariat, ajouté en dernier et pourtant central : c'est lui qui
     reçoit l'agent qui arrive et qui tient le cahier d'émargement. Sans ce
     rôle, le responsable d'un point d'accueil n'était qu'un nom recopié,
     sans droit propre et sans compte pour l'exercer. */
  | "SECRETAIRE"
  | "AGENT";

export interface Utilisateur {
  id: string;
  email: string;
  motDePasse: string;
  nomComplet: string;
  /**
   * Le code du profil que porte ce compte. Les treize d'origine en font
   * partie, mais rien ne les distingue plus : depuis que le catalogue vit en
   * table, « Ministre » et « Chargé du courrier » sont deux profils d'accès.
   */
  role: CodeProfil;
  /**
   * Le périmètre se déduit de l'arborescence, il ne se saisit pas. §11
   *
   * `role` et `entiteId` sont désormais la **projection** de l'habilitation
   * en vigueur (`lib/types/habilitation.ts`), recopiée ici pour la lecture.
   * Les écrire directement reste possible — le semis le fait — mais tout
   * changement décidé par un chef passe par une habilitation, qui, elle,
   * porte son auteur, sa durée et son motif.
   */
  entiteId: string;
  agentId?: string | null;
  fonction: string;
  actif: boolean;
  derniereConnexion?: string;
  telephone?: string;
  dateCreation?: string;
  creePar?: string;
  /** Le compte doit changer son mot de passe à la première connexion. */
  motDePasseAChanger?: boolean;
}

/* ------------------------------------------------------------------ */
/* Journal d'audit — en ajout seul, cahier §12                         */
/* ------------------------------------------------------------------ */

export interface EntreeJournal {
  id: string;
  horodatage: string;
  utilisateurId: string;
  utilisateur: string;
  adresseIp: string;
  action:
    | "CREATION" | "MODIFICATION" | "SUPPRESSION"
    | "CONSULTATION" | "VALIDATION" | "SIGNATURE" | "REJET";
  cibleType: string;
  cibleId: string;
  champ?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  /** Une modification sans acte de référence est une anomalie. §12 */
  acteId?: string;
  justification?: string;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  date: string;
  type: "info" | "alerte" | "succes";
  lu: boolean;
}

/* ------------------------------------------------------------------ */
/* Projection — l'état courant est calculé, jamais stocké. §06, §07     */
/* ------------------------------------------------------------------ */

export interface AgentProjete extends Agent {
  situation?: SituationCarriere;
  affectation?: Affectation;
  position?: Position;
  gradeId?: string;
  echelon?: number;
  indice?: number;
  categorieStatutaire?: CategorieStatutaire;
  entiteId?: string;
  fonction?: string;
  nature: NaturePosition;
  anciennete: number;
  age: number;
  tauxCompletude: number;
}
