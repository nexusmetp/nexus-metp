/**
 * Modèles de carrière : nomination, installation, services, notation, retraite.
 *
 * Ces pièces sont celles que l'administration réclame quand un dossier change
 * de main — au ministère de la fonction publique, à la solde, à la caisse de
 * retraite. Elles se composent des mêmes historiques que le dossier de l'agent :
 * une pièce qui contredirait le dossier n'aurait aucune valeur.
 */

import { cheminDe, entiteById, gradeById } from "@/lib/referentiels";
import type { DocumentAdministratif } from "./types";
import type { ContexteDocument } from "./contexte";
import {
  AVERTISSEMENT, VISAS_SOCLE, aujourdHui, dateLongue,
  numeroDocument, qualiteSignataire, timbreDe,
} from "./commun";

const civilite = (a?: { sexe?: string }) => (a?.sexe === "F" ? "Madame" : "Monsieur");
const accord = (a?: { sexe?: string }) => (a?.sexe === "F" ? "e" : "");
const enTete = (c: ContexteDocument) => timbreDe(c.agent?.entiteId ?? c.entite?.id);

const nomme = (a?: { prenom?: string; nom?: string; matricule?: string }) =>
  `${a?.prenom ?? "……"} ${(a?.nom ?? "……").toUpperCase()}, matricule ${a?.matricule ?? "……"}`;

function signatureDG(c: ContexteDocument) {
  return {
    qualite: c.signataire?.qualite
      ?? "Le directeur général de l'administration et des ressources humaines",
    nom: c.signataire?.nom,
    lieu: "Brazzaville",
    date: dateLongue(aujourdHui()),
  };
}

export function composerDecisionNomination(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const e = c.entite ?? (a?.entiteId ? entiteById(a.entiteId) : undefined);
  const fonction = c.saisie?.fonction || a?.fonction || "……………";
  return {
    cle: "DECISION_NOMINATION",
    intitule: "Décision",
    reference: numeroDocument("DEC", (a?.id ?? "") + fonction),
    objet: `Nomination aux fonctions ${fonction.match(/^[aeiouyéè]/i) ? "d'" : "de "}${fonction}`,
    timbre: enTete(c),
    autorite: "LE DIRECTEUR GÉNÉRAL DE L'ADMINISTRATION ET DES RESSOURCES HUMAINES",
    visas: VISAS_SOCLE,
    formule: "Décide :",
    articles: [
      {
        texte: `${civilite(a)} ${nomme(a)}, est nommé${accord(a)} `
          + `aux fonctions de ${fonction} à ${e?.nom ?? "……………"}.`,
        alinea: e ? `Rattachement : ${cheminDe(e.id).map((x) => x.sigle).join(" › ")}.` : undefined,
      },
      {
        texte: `L'intéressé${accord(a)} percevra les indemnités attachées à cette fonction, `
          + "dans les conditions fixées par la réglementation en vigueur.",
      },
      {
        texte: "La présente décision prend effet à compter de la date d'installation de "
          + "l'intéressé(e), constatée par procès-verbal.",
      },
    ],
    signature: signatureDG(c),
    ampliations: ["Direction des ressources humaines", "Structure d'affectation", "Intéressé(e)", "Chrono"],
    avertissement: AVERTISSEMENT,
  };
}

export function composerProcesVerbalInstallation(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const e = c.entite ?? (a?.entiteId ? entiteById(a.entiteId) : undefined);
  return {
    cle: "PROCES_VERBAL_INSTALLATION",
    intitule: "Procès-verbal d'installation",
    reference: numeroDocument("PV", (a?.id ?? "") + (e?.id ?? "")),
    objet: `Installation de ${civilite(a)} ${a?.prenom ?? ""} ${(a?.nom ?? "").toUpperCase()}`,
    timbre: enTete(c),
    visas: [],
    paragraphes: [
      `L'an deux mille vingt-six, le ${dateLongue(aujourdHui())}, `
      + `à ${entiteById(e?.id ?? "")?.ville ?? "Brazzaville"} ;`,
      `Nous soussigné, ${qualiteSignataire(e?.parentId ?? e?.id)}, avons procédé à `
      + `l'installation de ${civilite(a)} ${nomme(a)}, `
      + `dans ses fonctions de ${c.saisie?.fonction || a?.fonction || "……………"} `
      + `à ${e?.nom ?? "……………"}.`,
      "L'intéressé(e) a pris possession de son poste et a été présenté(e) au personnel de la structure.",
      "En foi de quoi, le présent procès-verbal a été dressé pour servir et valoir ce que de droit.",
    ],
    articles: [],
    signature: {
      qualite: "L'autorité installante",
      nom: c.signataire?.nom,
      lieu: entiteById(e?.id ?? "")?.ville ?? "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    ampliations: ["Ministère de la fonction publique", "Direction des ressources humaines", "Intéressé(e)"],
    avertissement: AVERTISSEMENT,
  };
}

/**
 * État signalétique des services.
 *
 * La pièce que réclame la caisse de retraite : la suite des positions et
 * affectations, chacune datée et rattachée à l'acte qui l'a produite. Elle
 * se lit directement dans l'historique — c'est l'usage qui justifie le
 * mieux d'avoir historisé plutôt que d'écraser.
 */
export function composerEtatSignaletique(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const ev = c.evenements ?? [];
  return {
    cle: "ETAT_SIGNALETIQUE",
    intitule: "État signalétique des services",
    reference: numeroDocument("ESS", a?.id ?? "x"),
    objet: `${a?.prenom ?? ""} ${(a?.nom ?? "").toUpperCase()} — matricule ${a?.matricule ?? "……"}`,
    timbre: enTete(c),
    visas: [],
    articles: [],
    paragraphes: [
      `Le directeur général de l'administration et des ressources humaines certifie que `
      + `${civilite(a)} ${nomme(a)}, né${accord(a)} le ${dateLongue(a?.dateNaissance)} `
      + `à ${a?.lieuNaissance ?? "……"}, a accompli les services ci-après :`,
    ],
    tableau: {
      colonnes: ["Date", "Événement", "Détail", "Acte"],
      lignes: ev.length
        ? ev.map((e) => [dateLongue(e.date), e.libelle, e.detail ?? "—", e.acteId ?? "—"])
        : [["—", "Aucun événement de carrière enregistré", "—", "—"]],
      total: [`${ev.length} événement(s)`, "", "", ""],
    },
    signature: signatureDG(c),
    ampliations: ["Caisse de retraite des fonctionnaires", "Dossier individuel", "Intéressé(e)"],
    avertissement: AVERTISSEMENT
      + " Chaque ligne renvoie à l'acte qui la fonde : un service sans acte n'y figure pas.",
  };
}

export function composerFicheNotation(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const s = c.saisie ?? {};
  const criteres = [
    "Connaissance du travail", "Sens de l'organisation", "Rendement et efficacité",
    "Assiduité et ponctualité", "Sens des relations humaines", "Discrétion professionnelle",
  ];
  return {
    cle: "FICHE_NOTATION",
    intitule: "Fiche de notation",
    reference: numeroDocument("NOT", (a?.id ?? "") + (s.exercice ?? "")),
    objet: `Exercice ${s.exercice || new Date().getFullYear()} — `
      + `${a?.prenom ?? ""} ${(a?.nom ?? "").toUpperCase()}`,
    timbre: enTete(c),
    visas: [],
    articles: [],
    tableau: {
      colonnes: ["Critère d'appréciation", "Note sur 20", "Observations"],
      lignes: criteres.map((k) => [k, "……", "……………………"]),
      total: ["Moyenne générale", "……", ""],
    },
    paragraphes: [
      `Agent noté : ${civilite(a)} ${nomme(a)}, `
      + `${gradeById(a?.gradeId ?? "")?.libelle ?? "……"}, `
      + `${a?.fonction ?? "……"} à ${entiteById(a?.entiteId ?? "")?.nom ?? "……"}.`,
      "Appréciation générale du supérieur hiérarchique : ……………………………………………………",
      "Observations de l'intéressé(e) : ……………………………………………………",
    ],
    signature: {
      qualite: "Le supérieur hiérarchique",
      nom: c.signataire?.nom,
      lieu: "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    ampliations: ["Direction des ressources humaines", "Dossier individuel", "Intéressé(e)"],
    avertissement: AVERTISSEMENT
      + " La note conditionne l'avancement : elle n'est opposable qu'une fois notifiée à l'agent.",
  };
}

export function composerCessationPaiement(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  return {
    cle: "CERTIFICAT_CESSATION_PAIEMENT",
    intitule: "Certificat de cessation de paiement",
    reference: numeroDocument("CCP", a?.id ?? "x"),
    objet: "Constatation de l'arrêt de la solde",
    timbre: enTete(c),
    visas: VISAS_SOCLE,
    paragraphes: [
      `Le directeur général de l'administration et des ressources humaines certifie que `
      + `${civilite(a)} ${nomme(a)}, `
      + `${gradeById(a?.gradeId ?? "")?.libelle ?? "……"}, `
      + `a cessé de percevoir sa solde à compter du ……………………… .`,
      `Dernier indice détenu : ${a?.indice ?? "……"}. `
      + `Dernière affectation : ${entiteById(a?.entiteId ?? "")?.nom ?? "……………"}.`,
      "Le présent certificat est établi en vue du transfert du dossier de solde "
      + "et de la liquidation des droits de l'intéressé(e).",
    ],
    articles: [],
    signature: signatureDG(c),
    ampliations: ["Direction générale du budget", "Caisse de retraite", "Intéressé(e)"],
    avertissement: AVERTISSEMENT + " La date de cessation relève d'un acte de fin de fonctions.",
  };
}

export function composerArreteRetraite(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const s = c.saisie ?? {};
  return {
    cle: "ARRETE_RETRAITE",
    intitule: "Arrêté",
    reference: numeroDocument("ARR", (a?.id ?? "") + "retraite"),
    objet: `Admission à la retraite — ${a?.prenom ?? ""} ${(a?.nom ?? "").toUpperCase()}`,
    timbre: enTete(c),
    autorite: "Le ministre de l'enseignement technique et professionnel",
    visas: [...VISAS_SOCLE, "Vu l'état signalétique des services de l'intéressé(e)"],
    formule: "Arrête :",
    articles: [
      {
        texte: `${civilite(a)} ${nomme(a)}, `
          + `${gradeById(a?.gradeId ?? "")?.libelle ?? "……"}, `
          + `en service à ${entiteById(a?.entiteId ?? "")?.nom ?? "……………"}, `
          + `est admis${accord(a)} à faire valoir ses droits à la retraite.`,
        alinea: a?.dateNaissance
          ? `Né(e) le ${dateLongue(a.dateNaissance)}, l'intéressé(e) est âgé(e) de ${a.age} ans.`
          : undefined,
      },
      { texte: `Le présent arrêté prend effet à compter du ${dateLongue(s.dateEffet)}.` },
      {
        texte: "Le directeur général de l'administration et des ressources humaines est chargé "
          + "de l'exécution du présent arrêté qui sera enregistré, publié au Journal officiel "
          + "de la République du Congo et communiqué partout où besoin sera.",
      },
    ],
    signature: {
      qualite: "Le ministre de l'enseignement technique et professionnel",
      lieu: "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    ampliations: [
      "Ministère de la fonction publique", "Caisse de retraite des fonctionnaires",
      "Direction générale du budget", "Intéressé(e)", "Journal officiel",
    ],
    avertissement: AVERTISSEMENT,
  };
}
