import type { Dictionnaire } from "./fr";

/**
 * English. Traduction de travail, destinée aux agents et aux partenaires
 * techniques qui ne lisent pas le français. Le français reste la langue de
 * référence : les intitulés d'actes, de corps et de grades ne sont PAS
 * traduits ailleurs dans l'application, parce qu'ils désignent des catégories
 * juridiques congolaises qui n'ont pas d'équivalent exact.
 */
export const en: Dictionnaire = {
  code: "en",
  nom: "English",
  nomLocal: "English",

  etat: {
    republique: "Republic of the Congo",
    ministere: "Ministry of Technical and Vocational Education",
    devise: "Unity · Work · Progress",
  },

  ouverture: {
    etapes: [
      "Starting the NEXUS core",
      "Loading METP reference data",
      "Caching in the browser (IndexedDB)",
      "Securing the session",
      "Ready",
    ],
  },

  connexion: {
    titre: "Sign in",
    email: "Work email address",
    emailExemple: "first.last@metp.gouv.cg",
    motDePasse: "Password",
    afficher: "Show password",
    masquer: "Hide password",
    seSouvenir: "Remember me",
    suivant: "Next",
    enCours: "Signing in…",
    ouvrirCompte: "Request an account",
    impossible: "Can't sign in?",
    securite:
      "Access attempts are recorded and monitored. Unauthorised access to a State data processing system is a prosecutable offence.",
    comptesDemo: "Demonstration accounts",
    motDePasseCommun: "Shared password:",
    langue: "Interface language",
    piedDePage: "fictitious data, demonstration environment",
  },

  confirmation: {
    titre: "Signed in",
    sousTitre: "Your identity has been verified.",
    conditions:
      "By signing in, I accept the terms of use of the DGARH information system and confirm that I have read the confidentiality rules applying to the personal data of State employees.",
    continuer: "Continue to my workspace",
    ouverture: "Opening your workspace…",
  },

  messages: {
    invalides: "Invalid credentials",
    invalidesDetail: "Check your work email address and your password.",
    desactive: "Account disabled",
    desactiveDetail: "Contact the DGARH to have your access restored.",
    bienvenue: "Welcome",
    procedureCompteTitre: "Opening an account",
    procedureCompteTexte:
      "An account is opened by the DGARH once the employee's posting order has been filed.",
    procedureMdpTitre: "Password reset",
    procedureMdpTexte:
      "Resets are carried out by the DGARH, on written request from the head of service.",
  },

  commentaires: {
    onglet: "Feedback",
    titre: "Feedback",
    description:
      "Your feedback shapes the next versions of NEXUS-METP. Tell us what helped, what was missing, or what stopped you.",
    champ: "Your comment",
    champExemple: "What works, what is missing, what blocked you…",
    email: "Email address",
    facultatif: "(optional)",
    anonyme: "Without an address your comment stays anonymous — and cannot be answered.",
    envoyer: "Send",
    envoi: "Sending…",
    fermer: "Close",
    merci: "Thank you, your comment has been recorded",
    merciDetail: "The DGARH reads them. No automatic reply is sent.",
  },
};
