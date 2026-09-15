/**
 * Modèles qui constatent : attestations, certificats, fiche, états.
 *
 * Ces documents ne décident rien — ils rapportent une situation projetée
 * depuis les actes. D'où la mention de la date d'établissement : la même
 * attestation tirée un mois plus tard peut dire autre chose.
 */

import { cheminDe, entiteById, gradeById } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import type { DocumentAdministratif } from "./types";
import type { ContexteDocument } from "./contexte";
import {
  AVERTISSEMENT, VISAS_SOCLE, aujourdHui, dateLongue,
  numeroDocument, qualiteSignataire, timbreDe,
} from "./commun";

const NATURE_CONGE: Record<string, string> = {
  ANNUEL: "congé annuel", MALADIE: "congé de maladie", MATERNITE: "congé de maternité",
  EXCEPTIONNEL: "congé exceptionnel", SANS_SOLDE: "congé sans solde",
};

const civilite = (a?: { sexe?: string }) => (a?.sexe === "F" ? "Madame" : "Monsieur");
const accord = (a?: { sexe?: string }) => (a?.sexe === "F" ? "e" : "");
const chaine = (id?: string) => (id ? cheminDe(id).map((e) => e.sigle).join(" › ") : "—");

const enTete = (c: ContexteDocument) => timbreDe(c.agent?.entiteId ?? c.entite?.id);

function signatureDGARH(c: ContexteDocument, date = aujourdHui()) {
  return {
    qualite: c.signataire?.qualite
      ?? "Le directeur général de l'administration et des ressources humaines",
    nom: c.signataire?.nom,
    lieu: "Brazzaville",
    date: dateLongue(date),
  };
}

export function composerAttestationService(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const grade = gradeById(a?.gradeId ?? "")?.libelle;
  return {
    cle: "ATTESTATION_SERVICE",
    intitule: "Attestation de service",
    reference: numeroDocument("ATT", a?.id ?? "x"),
    objet: "Attestation de présence au service",
    timbre: enTete(c),
    visas: [],
    paragraphes: [
      "Le directeur général de l'administration et des ressources humaines soussigné atteste que :",
      `${civilite(a)} ${a?.prenom ?? "……"} ${(a?.nom ?? "……").toUpperCase()}, `
      + `né${accord(a)} le ${dateLongue(a?.dateNaissance)} à ${a?.lieuNaissance ?? "……"}, `
      + `matricule ${a?.matricule ?? "……"}, `
      + (grade ? `titulaire du grade de ${grade}, ` : "")
      + `est en service au ministère de l'enseignement technique et professionnel `
      + `depuis le ${dateLongue(a?.dateRecrutement)}.`,
      `${a?.sexe === "F" ? "Elle" : "Il"} exerce actuellement les fonctions de `
      + `${a?.fonction ?? "……………"} à ${entiteById(a?.entiteId ?? "")?.nom ?? "……………"}.`,
      "En foi de quoi la présente attestation lui est délivrée pour servir et valoir ce que de droit.",
    ],
    articles: [],
    signature: signatureDGARH(c),
    avertissement: AVERTISSEMENT,
  };
}

export function composerCertificatPriseService(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  return {
    cle: "CERTIFICAT_PRISE_SERVICE",
    intitule: "Certificat de prise de service",
    reference: numeroDocument("CPS", a?.id ?? "x"),
    objet: "Constatation de la prise de service effective",
    timbre: enTete(c),
    visas: VISAS_SOCLE,
    paragraphes: [
      `Je soussigné, ${qualiteSignataire(a?.entiteId)}, certifie que `
      + `${civilite(a)} ${a?.prenom ?? "……"} ${(a?.nom ?? "……").toUpperCase()}, `
      + `matricule ${a?.matricule ?? "……"}, a effectivement pris service `
      + `le ${dateLongue(a?.datePriseService ?? a?.dateRecrutement)} `
      + `à ${entiteById(a?.entiteId ?? "")?.nom ?? "……………"}.`,
      "La présente pièce est établie en vue de la liquidation des droits de l'intéressé(e) "
      + "et versée à son dossier individuel.",
    ],
    articles: [],
    signature: {
      qualite: qualiteSignataire(a?.entiteId),
      nom: c.signataire?.nom,
      lieu: entiteById(a?.entiteId ?? "")?.ville ?? "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    ampliations: ["Direction des ressources humaines", "Dossier individuel", "Intéressé(e)"],
    avertissement: AVERTISSEMENT,
  };
}

export function composerCertificatCessation(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  return {
    cle: "CERTIFICAT_CESSATION",
    intitule: "Certificat de cessation de service",
    reference: numeroDocument("CCS", a?.id ?? "x"),
    objet: "Constatation de la cessation de service",
    timbre: enTete(c),
    visas: VISAS_SOCLE,
    paragraphes: [
      `Je soussigné, ${qualiteSignataire(a?.entiteId)}, certifie que `
      + `${civilite(a)} ${a?.prenom ?? "……"} ${(a?.nom ?? "……").toUpperCase()}, `
      + `matricule ${a?.matricule ?? "……"}, a cessé ses fonctions `
      + `à ${entiteById(a?.entiteId ?? "")?.nom ?? "……………"} le ……………………… .`,
      "L'intéressé(e) a été rempli(e) de ses droits jusqu'à cette date. "
      + "Le présent certificat est délivré pour servir et valoir ce que de droit.",
    ],
    articles: [],
    signature: signatureDGARH(c),
    ampliations: ["Ministère de la fonction publique", "Direction des ressources humaines", "Intéressé(e)"],
    avertissement: AVERTISSEMENT
      + " La date de cessation reste à renseigner : elle relève d'un acte de fin de carrière.",
  };
}

export function composerFicheAgent(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const grade = gradeById(a?.gradeId ?? "")?.libelle;
  return {
    cle: "FICHE_AGENT",
    intitule: "Fiche individuelle de l'agent",
    reference: numeroDocument("FIC", a?.id ?? "x"),
    objet: `${a?.prenom ?? ""} ${(a?.nom ?? "").toUpperCase()} — matricule ${a?.matricule ?? "……"}`,
    timbre: enTete(c),
    visas: [],
    articles: [],
    tableau: {
      colonnes: ["Rubrique", "Mention"],
      lignes: [
        ["Nom et prénom", `${a?.nom ?? "—"} ${a?.prenom ?? ""}`],
        ["Matricule", a?.matricule ?? "—"],
        ["Sexe", a?.sexe === "F" ? "Féminin" : "Masculin"],
        ["Date et lieu de naissance", `${dateLongue(a?.dateNaissance)} à ${a?.lieuNaissance ?? "—"}`],
        ["Nationalité", a?.nationalite ?? "—"],
        ["Situation familiale", `${a?.situationFamiliale ?? "—"} — ${a?.enfants ?? 0} enfant(s)`],
        ["Catégorie de personnel", a?.categorie ?? "—"],
        ["Grade", grade ?? "—"],
        ["Classe et échelon", a?.situation ? `${a.situation.classe} / ${a.echelon}` : "—"],
        ["Indice", a?.indice ?? "—"],
        ["Position administrative", a?.nature ?? "—"],
        ["Date de recrutement", dateLongue(a?.dateRecrutement)],
        ["Date de prise de service", dateLongue(a?.datePriseService)],
        ["Date de titularisation", dateLongue(a?.dateTitularisation)],
        ["Ancienneté", `${a?.anciennete ?? 0} an(s)`],
        ["Affectation", entiteById(a?.entiteId ?? "")?.nom ?? "—"],
        ["Chaîne de rattachement", chaine(a?.entiteId)],
        ["Fonction", a?.fonction ?? "—"],
        ["Diplôme le plus élevé", a?.diplomes?.[0]?.intitule ?? "—"],
        ["Complétude du dossier", `${a?.tauxCompletude ?? 0} %`],
      ],
    },
    paragraphes: [
      `Fiche arrêtée au ${dateLongue(aujourdHui())}. Les mentions de carrière sont projetées `
      + "depuis les actes notifiés : elles ne peuvent être modifiées sans un nouvel acte.",
    ],
    signature: signatureDGARH(c),
    avertissement: AVERTISSEMENT,
  };
}

export function composerEtatEffectifs(c: ContexteDocument): DocumentAdministratif {
  const lignes = c.effectifs ?? [];
  const totalDirect = lignes.reduce((s, l) => s + l.direct, 0);
  return {
    cle: "ETAT_EFFECTIFS",
    intitule: "État des effectifs",
    reference: numeroDocument("ETA", c.entite?.id ?? "metp"),
    objet: `Effectifs de ${c.entite?.nom ?? "l'ensemble du ministère"} `
      + `arrêtés au ${dateLongue(aujourdHui())}`,
    timbre: timbreDe(c.entite?.id),
    visas: [],
    articles: [],
    tableau: {
      colonnes: ["Structure", "Effectif propre", "Effectif branche"],
      lignes: lignes.length
        ? lignes.map((l) => [l.entite.nom, fmtNum(l.direct), fmtNum(l.total)])
        : [["Aucune structure rattachée", "0", "0"]],
      total: ["Total", fmtNum(totalDirect), fmtNum(lignes[0]?.total ?? totalDirect)],
    },
    paragraphes: [
      "L'effectif propre compte les agents affectés à la structure elle-même ; "
      + "l'effectif de branche y ajoute celui de toutes les structures qui lui sont rattachées.",
    ],
    signature: signatureDGARH(c),
    ampliations: ["Cabinet du ministre", "Direction générale de l'administration et des ressources humaines"],
    avertissement: AVERTISSEMENT,
  };
}

/**
 * La note de service, adressée à un service ou à des agents nommés.
 *
 * « À l'attention de : tous services » ne se vérifie pas : personne ne peut
 * dire, un an après, qui était censé l'appliquer. Quand la note part d'une
 * sélection du fichier du personnel, elle nomme donc ses destinataires —
 * matricule compris, parce que deux agents portent parfois le même nom — et
 * la liste elle-même fait la preuve de diffusion.
 */
export function composerNoteService(c: ContexteDocument): DocumentAdministratif {
  const s = c.saisie ?? {};
  const corps = (s.corps ?? "").split(/\n{2,}/).filter(Boolean);
  const vises = c.agents ?? [];
  return {
    cle: "NOTE_SERVICE",
    intitule: "Note de service",
    reference: numeroDocument("NS", s.objet ?? "note"),
    objet: s.objet || "……………",
    timbre: timbreDe(c.entite?.id),
    visas: [],
    paragraphes: [
      vises.length
        ? `À l'attention des agents désignés ci-après — ${vises.length} agent${vises.length > 1 ? "s" : ""} :`
        : `À l'attention de : ${s.destinataire || "l'ensemble des services"}.`,
      ...(corps.length ? corps : ["……………"]),
    ],
    /* Les destinataires sont posés en articles numérotés : c'est la forme sous
       laquelle un état nominatif se relit et se coche. */
    articles: vises.map((a) => ({
      texte: `${a.prenom} ${a.nom.toUpperCase()}, matricule ${a.matricule}`
        + `${a.fonction ? `, ${a.fonction}` : ""}`
        + ` — ${entiteById(a.entiteId ?? "")?.nom ?? "structure non renseignée"}.`,
    })),
    signature: {
      qualite: c.signataire?.qualite ?? qualiteSignataire(c.entite?.id),
      nom: c.signataire?.nom,
      lieu: entiteById(c.entite?.id ?? "")?.ville ?? "Brazzaville",
      date: dateLongue(aujourdHui()),
    },
    /* Une note nominative ne s'affiche pas au tableau : elle se remet, et sa
       trace va au dossier de chacun. */
    ampliations: vises.length
      ? ["Les intéressés", "Dossiers individuels", "Chrono"]
      : ["Tous services", "Affichage", "Chrono"],
    avertissement: AVERTISSEMENT,
  };
}

export function composerOrdreMission(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const s = c.saisie ?? {};
  return {
    cle: "ORDRE_MISSION",
    intitule: "Ordre de mission",
    reference: numeroDocument("OM", (a?.id ?? "") + (s.destination ?? "")),
    objet: s.objet || "Mission de service",
    timbre: enTete(c),
    visas: VISAS_SOCLE,
    formule: "Il est prescrit :",
    articles: [
      {
        texte: `${civilite(a)} ${a?.prenom ?? "……"} ${(a?.nom ?? "……").toUpperCase()}, `
          + `matricule ${a?.matricule ?? "……"}, ${a?.fonction ?? "agent"} `
          + `à ${entiteById(a?.entiteId ?? "")?.nom ?? "……………"}, `
          + `est chargé${accord(a)} de se rendre à ${s.destination || "……………"}.`,
      },
      {
        texte: `Objet de la mission : ${s.objet || "……………"}.`,
        alinea: `Durée : du ${dateLongue(s.debut)} au ${dateLongue(s.fin)}.`,
      },
      {
        texte: "Les autorités civiles et militaires sont priées de faciliter l'accomplissement "
          + "de la présente mission.",
      },
    ],
    signature: signatureDGARH(c),
    ampliations: ["Intéressé(e)", "Direction administrative et financière", "Chrono"],
    avertissement: AVERTISSEMENT,
  };
}

export function composerDecisionConge(c: ContexteDocument): DocumentAdministratif {
  const a = c.agent;
  const g = c.conge;
  const nature = g ? (NATURE_CONGE[g.nature] ?? g.nature) : "congé";
  return {
    cle: "DECISION_CONGE",
    intitule: "Décision",
    reference: numeroDocument("DEC", g?.id ?? "conge"),
    objet: `Octroi d'un ${nature.toLowerCase()}`,
    timbre: enTete(c),
    autorite: "LE DIRECTEUR GÉNÉRAL DE L'ADMINISTRATION ET DES RESSOURCES HUMAINES",
    visas: [
      ...VISAS_SOCLE,
      `Vu la demande de l'intéressé(e) au titre de l'exercice ${g?.exercice ?? new Date().getFullYear()}`,
    ],
    formule: "Décide :",
    articles: [
      {
        texte: `Il est accordé à ${civilite(a)} ${a?.prenom ?? "……"} `
          + `${(a?.nom ?? "……").toUpperCase()}, matricule ${a?.matricule ?? "……"}, `
          + `un ${nature.toLowerCase()} de ${g?.jours ?? "……"} jours.`,
        alinea: `Du ${dateLongue(g?.dateDebut)} au ${dateLongue(g?.dateFin)} inclus.`,
      },
      {
        texte: "L'intéressé(e) est tenu(e) de reprendre son service à l'expiration de ce délai, "
          + "sous peine des sanctions prévues par le statut général de la fonction publique.",
      },
      { texte: "La présente décision sera notifiée à l'intéressé(e) et versée à son dossier." },
    ],
    signature: signatureDGARH(c),
    ampliations: ["Direction des ressources humaines", "Supérieur hiérarchique", "Intéressé(e)"],
    avertissement: AVERTISSEMENT,
  };
}
