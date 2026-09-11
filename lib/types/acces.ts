import type { Affectation, Agent, NaturePosition, Position, SituationCarriere } from "./agent";
import type { CategorieStatutaire } from "./organisation";

/* ------------------------------------------------------------------ */
/* Utilisateurs, rôles et périmètres — cahier §11                      */
/* ------------------------------------------------------------------ */

export type Role =
  | "ADMIN_SYSTEME"
  | "DIRECTEUR_GENERAL"
  | "DIRECTEUR_CENTRAL"
  | "CHEF_SERVICE"
  | "CHEF_BUREAU"
  | "AGENT_INSTRUCTEUR"
  | "DIRECTEUR_DEPARTEMENTAL"
  | "CHEF_ETABLISSEMENT"
  | "AGENT";

export interface Utilisateur {
  id: string;
  email: string;
  motDePasse: string;
  nomComplet: string;
  role: Role;
  /** Le périmètre se déduit de l'arborescence, il ne se saisit pas. §11 */
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
  action: "CREATION" | "MODIFICATION" | "CONSULTATION" | "VALIDATION" | "SIGNATURE" | "REJET";
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
