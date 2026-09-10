/**
 * Bibliothèque documentaire — le point d'entrée unique.
 *
 * Chaque modèle sait ce qu'il lui faut pour se composer (`source`) : c'est
 * cette déclaration, et non une suite de conditions dans l'interface, qui
 * décide quels documents sont proposés sur un acte, un agent ou une entité.
 */

import type { CleModele, DescripteurModele, DocumentAdministratif } from "./types";
import type { ContexteDocument } from "./contexte";
import {
  composerArrete, composerBordereau, composerDecision, composerNotification,
} from "./composer-actes";
import {
  composerAttestationService, composerCertificatCessation, composerCertificatPriseService,
  composerDecisionConge, composerEtatEffectifs, composerFicheAgent, composerNoteService,
  composerOrdreMission,
} from "./composer-etats";

export * from "./types";
export * from "./contexte";
export { rendreDocument, rendreFichier, rendreTexte, STYLES_DOCUMENT } from "./rendu";
export { dateLongue, AVERTISSEMENT } from "./commun";

export const MODELES: DescripteurModele[] = [
  {
    cle: "ARRETE", libelle: "Arrêté", famille: "Actes", source: "acte", module: "actes",
    usage: "Instrument par lequel le ministre décide. C'est lui qui produit l'effet : "
      + "sans arrêté signé puis notifié, le dossier de l'agent ne bouge pas.",
  },
  {
    cle: "DECISION", libelle: "Décision", famille: "Actes", source: "acte", module: "actes",
    usage: "Même portée qu'un arrêté, prise à un échelon inférieur au ministre. "
      + "S'emploie pour les mesures d'organisation interne et de gestion courante.",
  },
  {
    cle: "NOTIFICATION", libelle: "Lettre de notification", famille: "Correspondance",
    source: "acte", module: "actes",
    usage: "Porte l'acte à la connaissance de l'agent. C'est elle qui ouvre le délai "
      + "de recours et qui déclenche l'application de l'acte au dossier.",
  },
  {
    cle: "BORDEREAU", libelle: "Bordereau de transmission", famille: "Correspondance",
    source: "acte", module: "actes",
    usage: "Accompagne un dossier qui change de service. Il énumère les pièces "
      + "transmises et leurs empreintes : ce qui part est ce qui arrive.",
  },
  {
    cle: "ATTESTATION_SERVICE", libelle: "Attestation de service", famille: "Attestations",
    source: "agent", module: "agents",
    usage: "Atteste qu'un agent est en service et depuis quand. Demandée par les banques, "
      + "les bailleurs et les administrations.",
  },
  {
    cle: "CERTIFICAT_PRISE_SERVICE", libelle: "Certificat de prise de service",
    famille: "Attestations", source: "agent", module: "agents",
    usage: "Constate l'entrée effective en fonction. Pièce d'appui indispensable "
      + "à la liquidation de la première solde.",
  },
  {
    cle: "CERTIFICAT_CESSATION", libelle: "Certificat de cessation de service",
    famille: "Attestations", source: "agent", module: "agents",
    usage: "Constate la fin des fonctions. Exigé par la fonction publique pour "
      + "la liquidation des droits et le transfert de dossier.",
  },
  {
    cle: "ORDRE_MISSION", libelle: "Ordre de mission", famille: "Actes",
    source: "agent", module: "agents",
    usage: "Autorise et couvre un déplacement de service. À établir avant le départ : "
      + "il conditionne la prise en charge des frais.",
  },
  {
    cle: "FICHE_AGENT", libelle: "Fiche individuelle", famille: "États",
    source: "agent", module: "agents",
    usage: "Résume l'état civil, la carrière et l'affectation à une date donnée. "
      + "Sert de pièce d'ouverture du dossier physique.",
  },
  {
    cle: "DECISION_CONGE", libelle: "Décision de congé", famille: "Actes",
    source: "conge", module: "conges",
    usage: "Formalise l'octroi d'un congé et fixe les dates opposables. "
      + "C'est elle qui protège l'agent absent.",
  },
  {
    cle: "ETAT_EFFECTIFS", libelle: "État des effectifs", famille: "États",
    source: "entite", module: "rapports",
    usage: "Photographie chiffrée d'une structure et de sa branche. "
      + "Pièce de base des arbitrages d'effectifs et des besoins.",
  },
  {
    cle: "NOTE_SERVICE", libelle: "Note de service", famille: "Correspondance",
    source: "libre", module: "annonces",
    usage: "Instruction interne d'application immédiate. N'a pas la portée d'un acte : "
      + "elle organise, elle ne décide pas de la situation d'un agent.",
  },
];

export const modeleParCle = (cle: CleModele) => MODELES.find((m) => m.cle === cle);

export const modelesPourSource = (source: DescripteurModele["source"]) =>
  MODELES.filter((m) => m.source === source);

const FABRIQUES: Record<CleModele, (c: ContexteDocument) => DocumentAdministratif> = {
  ARRETE: composerArrete,
  DECISION: composerDecision,
  NOTIFICATION: composerNotification,
  BORDEREAU: composerBordereau,
  ATTESTATION_SERVICE: composerAttestationService,
  CERTIFICAT_PRISE_SERVICE: composerCertificatPriseService,
  CERTIFICAT_CESSATION: composerCertificatCessation,
  FICHE_AGENT: composerFicheAgent,
  ETAT_EFFECTIFS: composerEtatEffectifs,
  NOTE_SERVICE: composerNoteService,
  ORDRE_MISSION: composerOrdreMission,
  DECISION_CONGE: composerDecisionConge,
};

export function composer(cle: CleModele, contexte: ContexteDocument): DocumentAdministratif {
  return FABRIQUES[cle](contexte);
}

/** Nom du fichier proposé au téléchargement. */
export function nomFichier(d: DocumentAdministratif): string {
  const base = `${d.reference} ${d.objet}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return `${base || "document"}.html`;
}
