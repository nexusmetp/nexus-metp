/** Ce qu'un modèle reçoit pour se composer. */

import type {
  Acte, AgentProjete, ArticleArchive, Conge, Entite, Poste, Versement,
} from "@/lib/types";
import type { EvenementCarriere } from "@/lib/carriere";

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
  poste?: Poste;
  versement?: Versement;
  articlesArchives?: ArticleArchive[];
  /** Ligne de vie de l'agent — sert l'état signalétique des services. */
  evenements?: EvenementCarriere[];
  /** Champs saisis par le rédacteur : note de service, ordre de mission. */
  saisie?: Record<string, string>;
  signataire?: { nom?: string; qualite?: string };
}
