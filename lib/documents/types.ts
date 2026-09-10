/**
 * Le document administratif — cahier §14, §15.
 *
 * Un acte au sens juridique et le papier qui le porte sont deux choses
 * distinctes : l'acte vit dans le circuit, le document en est l'expression
 * imprimable, signable et transmissible. Ce fichier décrit le papier.
 *
 * La structure retenue est celle des actes de l'administration congolaise :
 * timbre à gauche, date et lieu à droite, intitulé centré, visas, formule
 * exécutoire, articles numérotés, signature, ampliations.
 */

export type CleModele =
  | "ARRETE"
  | "DECISION"
  | "NOTIFICATION"
  | "BORDEREAU"
  | "ATTESTATION_SERVICE"
  | "CERTIFICAT_PRISE_SERVICE"
  | "CERTIFICAT_CESSATION"
  | "FICHE_AGENT"
  | "ETAT_EFFECTIFS"
  | "NOTE_SERVICE"
  | "ORDRE_MISSION"
  | "DECISION_CONGE";

/** D'où part le document : ce qu'il faut fournir pour le composer. */
export type SourceModele = "acte" | "agent" | "entite" | "conge" | "libre";

export interface Article {
  /** « Article premier » puis « Article 2 » : la numérotation est réglée au rendu. */
  texte: string;
  /** Un alinéa secondaire, en retrait. */
  alinea?: string;
}

export interface Tableau {
  colonnes: string[];
  lignes: (string | number)[][];
  /** Ligne de total, rendue en gras sous un filet. */
  total?: (string | number)[];
}

export interface BlocSignature {
  /** « Le directeur général de l'administration et des ressources humaines » */
  qualite: string;
  nom?: string;
  lieu: string;
  date: string;
}

export interface DocumentAdministratif {
  cle: CleModele;
  /** ARRÊTÉ, DÉCISION, ATTESTATION… — centré sous le timbre. */
  intitule: string;
  reference: string;
  objet: string;
  /** Timbre : la chaîne hiérarchique, du ministère au service émetteur. */
  timbre: string[];
  visas: string[];
  /** Formule qui ouvre le dispositif : « ARRÊTE : », « DÉCIDE : ». */
  formule?: string;
  /** Qui prend l'acte : « LE MINISTRE DE L'ENSEIGNEMENT TECHNIQUE… ». */
  autorite?: string;
  articles: Article[];
  /** Corps rédigé, pour les attestations et certificats qui n'ont pas d'articles. */
  paragraphes?: string[];
  tableau?: Tableau;
  signature: BlocSignature;
  ampliations?: string[];
  /** Ce que la maquette ne peut pas garantir : dit sur le document lui-même. */
  avertissement?: string;
}

import type { ModuleKey } from "@/lib/referentiels";

export interface DescripteurModele {
  cle: CleModele;
  libelle: string;
  /** Une phrase qui dit à quoi sert ce document, et quand on l'établit. */
  usage: string;
  source: SourceModele;
  /** Famille d'affichage dans la bibliothèque. */
  famille: "Actes" | "Attestations" | "États" | "Correspondance";
  /** Module dont le droit d'écriture conditionne l'établissement. */
  module: ModuleKey;
}
