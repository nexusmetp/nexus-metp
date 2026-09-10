/**
 * Modèles qui décident : arrêté, décision, notification, bordereau.
 *
 * Le dispositif est tiré du type de l'acte, pas d'un texte libre : c'est
 * ce qui garantit que le papier dit la même chose que le circuit.
 */

import { entiteById, gradeById, typeActeById } from "@/lib/referentiels";
import type { DocumentAdministratif } from "./types";
import type { ContexteDocument } from "./contexte";
import {
  AMPLIATIONS_USUELLES, AVERTISSEMENT, VISAS_SOCLE, dateLongue,
  numeroDocument, qualiteSignataire, timbreDe,
} from "./commun";

const civilite = (a?: { sexe?: string }) => (a?.sexe === "F" ? "Madame" : "Monsieur");

/** « de » ou « d' » selon l'initiale : un acte mal élidé se lit mal à voix haute. */
const de = (mot?: string) => (mot && /^[aeiouyàâéèêëîïôöùûü]/i.test(mot.trim()) ? `d'${mot}` : `de ${mot}`);
const accord = (a?: { sexe?: string }) => (a?.sexe === "F" ? "e" : "");

/** Identité complète telle qu'un acte la porte : nom, matricule, grade. */
function designation(c: ContexteDocument): string {
  const a = c.agent;
  if (!a) return "l'intéressé(e)";
  const grade = gradeById(a.gradeId ?? "")?.libelle;
  return `${civilite(a)} ${a.prenom} ${a.nom.toUpperCase()}, matricule ${a.matricule}`
    + (grade ? `, ${grade}` : "");
}

/** Désignation en position de sujet : la virgule ferme l'apposition du grade. */
const sujet = (c: ContexteDocument) => `${designation(c)},`;

/** Le dispositif : une phrase par type d'acte, à la forme administrative. */
function dispositif(c: ContexteDocument): string {
  const a = c.agent;
  const e = accord(a);
  const qui = designation(c);
  const entite = c.acte?.cible?.entiteId
    ? entiteById(c.acte.cible.entiteId)?.nom
    : a?.entiteId ? entiteById(a.entiteId)?.nom : undefined;
  const grade = gradeById(c.acte?.cible?.gradeId ?? a?.gradeId ?? "")?.libelle;
  const fonction = c.acte?.cible?.fonction ?? a?.fonction;

  switch (c.acte?.type) {
    case "RECRUTEMENT":
      return `${sujet(c)} est recruté${e} dans la fonction publique et nommé${e} au grade de `
        + `${grade ?? "……………"}, et affecté${e} à ${entite ?? "……………"}.`;
    case "PRISE_DE_SERVICE":
      return `Il est donné acte à ${qui} de sa prise de service à ${entite ?? "……………"}.`;
    case "TITULARISATION":
      return `${sujet(c)} est titularisé${e} dans le grade de ${grade ?? "……………"}.`;
    case "AFFECTATION":
      return `${sujet(c)} est affecté${e} à ${entite ?? "……………"}`
        + (fonction ? `, en qualité ${de(fonction)}.` : ".");
    case "MUTATION":
      return `${sujet(c)} est muté${e} à ${entite ?? "……………"}`
        + (fonction ? `, en qualité ${de(fonction)}.` : ".");
    case "AVANCEMENT":
      return `${sujet(c)} est promu${e} à l'échelon ${c.acte?.cible?.echelon ?? a?.echelon ?? "……"}`
        + (a?.indice ? `, indice ${a.indice}.` : ".");
    case "PROMOTION":
      return `${sujet(c)} est promu${e} au grade de ${grade ?? "……………"}.`;
    case "FORMATION":
      return `${sujet(c)} est autorisé${e} à suivre la formation mentionnée en objet.`;
    case "CONGE":
      return `Il est accordé à ${qui} le congé mentionné en objet.`;
    case "POSITION":
      return `${sujet(c)} est placé${e} dans la position administrative mentionnée en objet.`;
    case "SANCTION":
      return `La sanction disciplinaire mentionnée en objet est infligée à ${qui}.`;
    case "CONTENTIEUX":
      return `Il est statué sur la réclamation introduite par ${qui}, dans les termes de l'objet.`;
    case "INDEMNITE":
      return `Le bénéfice de l'indemnité mentionnée en objet est ouvert à ${qui}.`;
    case "FIN_CARRIERE":
      return `${sujet(c)} est admis${e} à faire valoir ses droits à la retraite.`;
    default:
      return `${qui} — ${c.acte?.objet ?? "……………"}.`;
  }
}

const VISA_DOSSIER = (c: ContexteDocument) =>
  c.acte ? `Vu le dossier n° ${c.acte.reference} instruit par `
    + `${entiteById(c.acte.entiteInstructriceId)?.nom ?? "la direction générale"}` : null;

function socle(c: ContexteDocument): string[] {
  const v = [...VISAS_SOCLE];
  const d = VISA_DOSSIER(c);
  if (d) v.push(d);
  return v;
}

export function composerArrete(c: ContexteDocument): DocumentAdministratif {
  const acte = c.acte;
  const emetteur = acte?.entiteInstructriceId;
  const effet = acte?.cible?.dateEffet ?? acte?.dateSignature ?? acte?.dateCreation;
  return {
    cle: "ARRETE",
    intitule: "Arrêté",
    reference: acte?.reference ?? numeroDocument("ARR", "sans-acte"),
    objet: acte?.objet ?? "……………",
    timbre: timbreDe(emetteur),
    autorite: "Le ministre de l'enseignement technique et professionnel",
    visas: socle(c),
    formule: "Arrête :",
    articles: [
      { texte: dispositif(c) },
      {
        texte: `Le présent arrêté prend effet à compter du ${dateLongue(effet)}.`,
        alinea: "La situation de l'intéressé(e) n'est portée au dossier qu'après notification.",
      },
      {
        texte: "Le directeur général de l'administration et des ressources humaines est chargé "
          + "de l'exécution du présent arrêté qui sera enregistré, publié au Journal officiel "
          + "de la République du Congo et communiqué partout où besoin sera.",
      },
    ],
    signature: {
      qualite: "Le ministre de l'enseignement technique et professionnel",
      // Volontairement sans nom : l'arrêté est signé du ministre, et porter
      // sous sa qualité le nom de l'agent qui a édité le document en ferait un faux.
      lieu: "Brazzaville",
      date: dateLongue(acte?.dateSignature ?? acte?.dateCreation),
    },
    ampliations: AMPLIATIONS_USUELLES,
    avertissement: AVERTISSEMENT,
  };
}

export function composerDecision(c: ContexteDocument): DocumentAdministratif {
  const acte = c.acte;
  const emetteur = acte?.entiteInstructriceId;
  return {
    cle: "DECISION",
    intitule: "Décision",
    reference: (acte?.reference ?? numeroDocument("DEC", "sans-acte")).replace(/^ARR/, "DEC"),
    objet: acte?.objet ?? "……………",
    timbre: timbreDe(emetteur),
    autorite: qualiteSignataire(emetteur).replace(/^Le /, "LE "),
    visas: socle(c),
    formule: "Décide :",
    articles: [
      { texte: dispositif(c) },
      { texte: `La présente décision prend effet à compter du ${dateLongue(acte?.cible?.dateEffet ?? acte?.dateCreation)}.` },
      { texte: "La présente décision sera notifiée à l'intéressé(e) et versée à son dossier." },
    ],
    signature: {
      qualite: c.signataire?.qualite ?? qualiteSignataire(emetteur),
      nom: c.signataire?.nom,
      lieu: "Brazzaville",
      date: dateLongue(acte?.dateSignature ?? acte?.dateCreation),
    },
    ampliations: ["Direction des ressources humaines — dossier de l'intéressé(e)", "Intéressé(e)", "Chrono"],
    avertissement: AVERTISSEMENT,
  };
}

export function composerNotification(c: ContexteDocument): DocumentAdministratif {
  const acte = c.acte;
  const a = c.agent;
  return {
    cle: "NOTIFICATION",
    intitule: "Notification",
    reference: numeroDocument("NOT", acte?.id ?? "x"),
    objet: `Notification de l'acte n° ${acte?.reference ?? "……………"}`,
    timbre: timbreDe(acte?.entiteInstructriceId),
    visas: [],
    paragraphes: [
      `${civilite(a)},`,
      `J'ai l'honneur de vous notifier ${typeActeById(acte?.type ?? "AFFECTATION")?.libelle.toLowerCase() ?? "l'acte"} `
      + `n° ${acte?.reference ?? "……………"} du ${dateLongue(acte?.dateSignature)}, dont l'objet est : `
      + `« ${acte?.objet ?? "……………"} ».`,
      `Cet acte prend effet à compter du ${dateLongue(acte?.cible?.dateEffet ?? acte?.dateSignature)}. `
      + `Une ampliation en est versée à votre dossier individuel.`,
      "Vous disposez d'un délai de deux mois à compter de la présente notification pour former, "
      + "le cas échéant, un recours gracieux devant l'autorité signataire.",
      "Veuillez agréer l'expression de ma considération distinguée.",
    ],
    articles: [],
    signature: {
      qualite: c.signataire?.qualite ?? "Le directeur général de l'administration et des ressources humaines",
      nom: c.signataire?.nom,
      lieu: "Brazzaville",
      date: dateLongue(new Date().toISOString().slice(0, 10)),
    },
    ampliations: ["Dossier individuel", "Chrono"],
    avertissement: AVERTISSEMENT,
  };
}

export function composerBordereau(c: ContexteDocument): DocumentAdministratif {
  const acte = c.acte;
  const pieces = acte?.pieces ?? [];
  return {
    cle: "BORDEREAU",
    intitule: "Bordereau de transmission",
    reference: numeroDocument("BT", acte?.id ?? "x"),
    objet: `Transmission du dossier n° ${acte?.reference ?? "……………"}`,
    timbre: timbreDe(acte?.entiteInstructriceId),
    visas: [],
    paragraphes: [
      `Destinataire : ${entiteById(acte?.etapes?.find((e) => e.statut === "EN_COURS")?.entiteId ?? "")?.nom
        ?? "Direction générale de l'administration et des ressources humaines"}.`,
    ],
    articles: [],
    tableau: {
      colonnes: ["Pièce", "Catégorie", "Versée le", "Empreinte"],
      lignes: pieces.length
        ? pieces.map((p) => [p.nom, p.categorie, dateLongue(p.date), p.empreinte ?? "—"])
        : [["Aucune pièce jointe au dossier", "—", "—", "—"]],
      total: [`${pieces.length} pièce(s)`, "", "", ""],
    },
    signature: {
      qualite: c.signataire?.qualite ?? qualiteSignataire(acte?.entiteInstructriceId),
      nom: c.signataire?.nom,
      lieu: "Brazzaville",
      date: dateLongue(new Date().toISOString().slice(0, 10)),
    },
    ampliations: ["Chrono du service émetteur"],
    avertissement: AVERTISSEMENT,
  };
}
