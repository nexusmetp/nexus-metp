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
import {
  composerArreteRetraite, composerCessationPaiement, composerDecisionNomination,
  composerEtatSignaletique, composerFicheNotation, composerProcesVerbalInstallation,
} from "./composer-carriere";
import {
  composerAvisVacance, composerBordereauElimination, composerBordereauVersement,
  composerDemandeConge,
} from "./composer-gestion";

export * from "./types";
export * from "./contexte";
export { rendreDocument, rendreFichier, rendreTexte, STYLES_DOCUMENT } from "./rendu";
export { exporter, envelopper, LIBELLE_FORMAT, nomFichier, type Format, type Sortie } from "./formats";
export { dateLongue, timbreDe, AVERTISSEMENT } from "./commun";

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
  {
    cle: "DECISION_NOMINATION", libelle: "Décision de nomination", famille: "Actes",
    source: "agent", module: "agents",
    usage: "Confie une fonction de responsabilité. Elle ne prend effet qu'à l'installation, "
      + "constatée par procès-verbal — nommer et installer sont deux gestes distincts.",
  },
  {
    cle: "PROCES_VERBAL_INSTALLATION", libelle: "Procès-verbal d'installation",
    famille: "Actes", source: "agent", module: "agents",
    usage: "Constate la prise de fonction effective d'un responsable. C'est la pièce qui "
      + "fait courir les indemnités de fonction et engage la responsabilité du poste.",
  },
  {
    cle: "ETAT_SIGNALETIQUE", libelle: "État signalétique des services", famille: "États",
    source: "agent", module: "agents",
    usage: "Récapitule toute la carrière, chaque ligne rattachée à son acte. Pièce maîtresse "
      + "du dossier de pension : sans elle, les services accomplis ne sont pas liquidables.",
  },
  {
    cle: "FICHE_NOTATION", libelle: "Fiche de notation", famille: "États",
    source: "agent", module: "carrieres",
    usage: "Évaluation annuelle par le supérieur hiérarchique. Elle conditionne l'avancement "
      + "et n'est opposable qu'une fois notifiée à l'agent.",
  },
  {
    cle: "CERTIFICAT_CESSATION_PAIEMENT", libelle: "Certificat de cessation de paiement",
    famille: "Attestations", source: "agent", module: "agents",
    usage: "Constate l'arrêt de la solde. Exigé pour transférer un dossier de solde "
      + "ou ouvrir un droit à pension.",
  },
  {
    cle: "ARRETE_RETRAITE", libelle: "Arrêté d'admission à la retraite", famille: "Actes",
    source: "agent", module: "retraite",
    usage: "Met fin à la carrière et ouvre le droit à pension. À préparer bien avant la "
      + "limite d'âge : un agent maintenu sans acte est en situation irrégulière.",
  },
  {
    cle: "AVIS_VACANCE", libelle: "Avis de vacance de poste", famille: "Correspondance",
    source: "poste", module: "postes",
    usage: "Publie un emploi à pourvoir. Un emploi non budgétisé peut être publié, "
      + "mais l'avis ne vaut alors pas engagement de recrutement.",
  },
  {
    cle: "DEMANDE_CONGE", libelle: "Demande de congé", famille: "Correspondance",
    source: "conge", module: "conges",
    usage: "Formulée par l'agent lui-même. Une demande ne vaut pas autorisation : "
      + "le départ n'est régulier qu'après décision.",
  },
  {
    cle: "BORDEREAU_VERSEMENT", libelle: "Bordereau de versement", famille: "Archives",
    source: "archives", module: "archives",
    usage: "Accompagne obligatoirement tout versement d'archives. Il décrit article par "
      + "article ce qui est remis : c'est la preuve de la prise en charge.",
  },
  {
    cle: "BORDEREAU_ELIMINATION", libelle: "Bordereau d'élimination", famille: "Archives",
    source: "archives", module: "archives",
    usage: "Propose la destruction des articles dont la durée d'utilité est échue. "
      + "Aucune élimination d'archives publiques ne peut se faire sans ce visa.",
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
  DECISION_NOMINATION: composerDecisionNomination,
  PROCES_VERBAL_INSTALLATION: composerProcesVerbalInstallation,
  ETAT_SIGNALETIQUE: composerEtatSignaletique,
  FICHE_NOTATION: composerFicheNotation,
  CERTIFICAT_CESSATION_PAIEMENT: composerCessationPaiement,
  ARRETE_RETRAITE: composerArreteRetraite,
  AVIS_VACANCE: composerAvisVacance,
  DEMANDE_CONGE: composerDemandeConge,
  BORDEREAU_VERSEMENT: composerBordereauVersement,
  BORDEREAU_ELIMINATION: composerBordereauElimination,
};

export function composer(cle: CleModele, contexte: ContexteDocument): DocumentAdministratif {
  return FABRIQUES[cle](contexte);
}

