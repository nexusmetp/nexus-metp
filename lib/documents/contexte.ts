/** Ce qu'un modèle reçoit pour se composer. */

import type { Acte, AgentProjete, Conge, Entite } from "@/lib/types";

export interface LigneEffectif {
  entite: Entite;
  direct: number;
  total: number;
}

export interface ContexteDocument {
  acte?: Acte;
  agent?: AgentProjete;
  entite?: Entite;
  conge?: Conge;
  effectifs?: LigneEffectif[];
  /** Champs saisis par le rédacteur : note de service, ordre de mission. */
  saisie?: Record<string, string>;
  signataire?: { nom?: string; qualite?: string };
}
