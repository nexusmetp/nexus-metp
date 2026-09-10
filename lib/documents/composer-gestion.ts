/**
 * Modèles de gestion : vacance d'emploi, demande de congé, bordereaux d'archives.
 *
 * Les deux bordereaux sont réglementaires, pas décoratifs : aucun versement
 * ni aucune élimination d'archives publiques ne se fait sans un bordereau
 * visé. C'est lui qui engage la responsabilité de qui détruit.
 */

import { entiteById, gradeById } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import type { DocumentAdministratif } from "./types";
import type { ContexteDocument } from "./contexte";
import {
  AVERTISSEMENT, aujourdHui, dateLongue, numeroDocument, qualiteSignataire, timbreDe,
} from "./commun";

const civilite = (a?: { sexe?: string }) => (a?.sexe === "F" ? "Madame" : "Monsieur");
const nomme = (a?: { prenom?: string; nom?: string; matricule?: string }) =>
  `${a?.prenom ?? "……"} ${(a?.nom ?? "……").toUpperCase()}, matricule ${a?.matricule ?? "……"}`;

const SORT_FINAL: Record<string, string> = {
  CONSERVATION: "Conservation", ELIMINATION: "Élimination", TRI: "Tri",
};

const NATURE_CONGE: Record<string, string> = {
  ANNUEL: "congé annuel", MALADIE: "congé de maladie", MATERNITE: "congé de maternité",
  EXCEPTIONNEL: "congé exceptionnel", SANS_SOLDE: "congé sans solde",
};

export function composerAvisVacance(c: ContexteDocument): DocumentAdministratif {
  const p = c.poste;
  const e = c.entite ?? (p?.entiteId ? entiteById(p.entiteId) : undefined);
  return {
    cle: "AVIS_VACANCE",
    intitule: "Avis de vacance de poste",
    reference: numeroDocument("AVP", p?.id ?? e?.id ?? "x"),
    objet: p?.intitule ?? "Emploi à pourvoir",
    timbre: timbreDe(e?.id),
    visas: [],
    paragraphes: [
      "Le directeur général de l'administration et des ressources humaines porte à la "
      + "connaissance des agents du ministère qu'un emploi est vacant dans les conditions suivantes.",
    ],
    articles: [],
    tableau: {
      colonnes: ["Rubrique", "Mention"],
      lignes: [
        ["Intitulé de l'emploi", p?.intitule ?? "……………"],
        ["Code de l'emploi", p?.code ?? "……………"],
        ["Structure", e?.nom ?? "……………"],
        ["Lieu d'affectation", e?.ville ?? "……………"],
        ["Grade requis", gradeById(p?.gradeRequisId ?? "")?.libelle ?? "……………"],
        ["Emploi budgétisé", p?.budgetise ? "Oui" : "Non"],
        ["Date limite de dépôt", c.saisie?.dateLimite ?? "……………"],
      ],
    },
    signature: {
      qualite: c.signataire?.qualite ?? qualiteSignataire(e?.id),
      nom: c.signataire?.nom,
      lieu: e?.ville ?? "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    ampliations: ["Affichage", "Tous services", "Chrono"],
    avertissement: AVERTISSEMENT
      + (p?.budgetise === false
        ? " Cet emploi n'est pas budgétisé : l'avis ne vaut pas engagement de recrutement."
        : ""),
  };
}

export function composerDemandeConge(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const g = c.conge;
  const nature = g ? (NATURE_CONGE[g.nature] ?? g.nature) : "congé";
  return {
    cle: "DEMANDE_CONGE",
    intitule: "Demande de congé",
    reference: numeroDocument("DC", g?.id ?? a?.id ?? "x"),
    objet: `Demande de ${nature}`,
    timbre: timbreDe(a?.entiteId),
    visas: [],
    paragraphes: [
      `À Monsieur le directeur général de l'administration et des ressources humaines,`,
      `J'ai l'honneur de solliciter de votre haute bienveillance l'octroi d'un ${nature} `
      + `de ${g?.jours ?? "……"} jours, du ${dateLongue(g?.dateDebut)} au ${dateLongue(g?.dateFin)} inclus, `
      + `au titre de l'exercice ${g?.exercice ?? new Date().getFullYear()}.`,
      g?.motif ? `Motif : ${g.motif}.` : "",
      `Je suis ${civilite(a) === "Madame" ? "employée" : "employé"} en qualité de `
      + `${a?.fonction ?? "……………"} à ${entiteById(a?.entiteId ?? "")?.nom ?? "……………"}, `
      + `sous le matricule ${a?.matricule ?? "……"}.`,
      "Dans l'attente d'une suite favorable, veuillez agréer l'expression de ma haute considération.",
    ].filter(Boolean),
    articles: [],
    signature: {
      qualite: "L'intéressé(e)",
      nom: a ? `${a.prenom} ${a.nom}` : undefined,
      lieu: entiteById(a?.entiteId ?? "")?.ville ?? "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    ampliations: ["Avis du supérieur hiérarchique", "Direction des ressources humaines"],
    avertissement: AVERTISSEMENT
      + " Une demande ne vaut pas autorisation : le départ n'est régulier qu'après décision.",
  };
}

export function composerBordereauVersement(c: ContexteDocument): DocumentAdministratif {
  const v = c.versement;
  const e = c.entite ?? (v?.entiteId ? entiteById(v.entiteId) : undefined);
  const art = c.articlesArchives ?? [];
  return {
    cle: "BORDEREAU_VERSEMENT",
    intitule: "Bordereau de versement",
    reference: v?.reference ?? numeroDocument("BV", e?.id ?? "x"),
    objet: v?.intitule ?? "Versement d'archives",
    timbre: timbreDe(e?.id),
    visas: [],
    paragraphes: [
      `Service versant : ${e?.nom ?? "……………"}. `
      + `Dates extrêmes : ${v?.dateDebut ?? "……"} — ${v?.dateFin ?? "……"}. `
      + `Métrage : ${v?.metrage ?? "……"} ml.`,
    ],
    articles: [],
    tableau: {
      colonnes: ["Cote", "Description du contenu", "Dates extrêmes", "DUA", "Sort final"],
      lignes: art.length
        ? art.map((x) => [x.cote, x.intitule, `${x.dateDebut} — ${x.dateFin}`, `${x.dua} ans`, SORT_FINAL[x.sortFinal] ?? x.sortFinal])
        : [["—", "Aucun article décrit", "—", "—", "—"]],
      total: [`${fmtNum(art.length)} article(s)`, "", "", "", ""],
    },
    signature: {
      qualite: "Le responsable du service versant",
      nom: c.signataire?.nom,
      lieu: e?.ville ?? "Brazzaville",
      date: dateLongue(v?.dateVersement ?? aujourdHui()),
    },
    ampliations: ["Service des archives", "Service versant", "Chrono"],
    avertissement: AVERTISSEMENT
      + " Le bordereau est la preuve de la prise en charge : sans lui, le versement n'est pas opposable.",
  };
}

export function composerBordereauElimination(c: ContexteDocument): DocumentAdministratif {
  const art = (c.articlesArchives ?? []).filter((x) => x.sortFinal === "ELIMINATION");
  const e = c.entite;
  return {
    cle: "BORDEREAU_ELIMINATION",
    intitule: "Bordereau d'élimination",
    reference: numeroDocument("BE", (e?.id ?? "") + art.length),
    objet: "Proposition d'élimination d'archives publiques",
    timbre: timbreDe(e?.id),
    visas: [],
    paragraphes: [
      "Le service soussigné propose l'élimination des articles ci-après, dont la durée "
      + "d'utilité administrative est échue et dont le sort final est l'élimination.",
    ],
    articles: [],
    tableau: {
      colonnes: ["Cote", "Description", "Dates extrêmes", "DUA échue le"],
      lignes: art.length
        ? art.map((x) => [x.cote, x.intitule, `${x.dateDebut} — ${x.dateFin}`, x.echeanceDua ?? "—"])
        : [["—", "Aucun article éliminable", "—", "—"]],
      total: [`${fmtNum(art.length)} article(s)`, "", "", ""],
    },
    signature: {
      qualite: "Visa du responsable du contrôle scientifique et technique",
      nom: c.signataire?.nom,
      lieu: "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    ampliations: ["Service des archives", "Service producteur", "Chrono"],
    avertissement: AVERTISSEMENT
      + " Aucune destruction d'archives publiques ne peut intervenir avant le visa porté ci-dessus.",
  };
}
