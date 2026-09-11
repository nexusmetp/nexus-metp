/**
 * Français — langue officielle de la République du Congo, et langue de
 * référence de la plateforme. Toute autre langue se traduit depuis celle-ci :
 * en cas de désaccord entre deux versions, c'est ce fichier qui fait foi.
 */
export const fr = {
  code: "fr",
  nom: "Français",
  nomLocal: "Français",

  etat: {
    republique: "République du Congo",
    ministere: "Ministère de l'Enseignement Technique et Professionnel",
    devise: "Unité · Travail · Progrès",
  },

  ouverture: {
    etapes: [
      "Initialisation du noyau NEXUS",
      "Chargement des référentiels METP",
      "Mise en cache navigateur (IndexedDB)",
      "Sécurisation de la session",
      "Prêt",
    ],
  },

  connexion: {
    titre: "Ouvrir une session",
    email: "Adresse professionnelle",
    emailExemple: "prenom.nom@metp.gouv.cg",
    motDePasse: "Mot de passe",
    afficher: "Afficher le mot de passe",
    masquer: "Masquer le mot de passe",
    seSouvenir: "Se souvenir de moi",
    suivant: "Suivant",
    enCours: "Authentification…",
    ouvrirCompte: "Demander l'ouverture d'un compte",
    impossible: "Impossible de vous connecter ?",
    securite:
      "Les tentatives d'accès sont enregistrées et contrôlées. L'accès non autorisé à un traitement de données de l'État est passible de poursuites.",
    comptesDemo: "Comptes de démonstration",
    motDePasseCommun: "Mot de passe commun :",
    langue: "Langue de l'interface",
    piedDePage: "données fictives, environnement de démonstration",
  },

  confirmation: {
    titre: "Connexion réussie",
    sousTitre: "Votre identité a été vérifiée.",
    conditions:
      "En me connectant, j'accepte les conditions d'usage du système d'information de la DGARH et confirme avoir pris connaissance des règles de confidentialité applicables aux données personnelles des agents de l'État.",
    continuer: "Continuer vers mon espace",
    ouverture: "Ouverture de votre espace…",
  },

  messages: {
    invalides: "Identifiants invalides",
    invalidesDetail: "Vérifiez votre adresse professionnelle et votre mot de passe.",
    desactive: "Compte désactivé",
    desactiveDetail: "Contactez la DGARH pour réactiver votre accès.",
    bienvenue: "Bienvenue",
    procedureCompteTitre: "Ouverture d'un compte",
    procedureCompteTexte:
      "Un compte est ouvert par la DGARH sur transmission de l'acte d'affectation de l'agent.",
    procedureMdpTitre: "Réinitialisation du mot de passe",
    procedureMdpTexte:
      "La réinitialisation est faite par la DGARH, sur demande écrite du chef de service.",
  },

  commentaires: {
    onglet: "Commentaires",
    titre: "Commentaires",
    description:
      "Votre avis oriente les prochaines versions de NEXUS-METP. Dites-nous ce qui vous a aidé, ce qui vous a manqué, ou ce qui vous a arrêté.",
    champ: "Votre commentaire",
    champExemple: "Ce qui fonctionne, ce qui manque, ce qui vous a bloqué…",
    email: "Adresse électronique",
    facultatif: "(facultatif)",
    anonyme: "Sans adresse, votre commentaire reste anonyme — et sans réponse possible.",
    envoyer: "Envoyer",
    envoi: "Envoi…",
    fermer: "Fermer",
    merci: "Merci, votre commentaire est enregistré",
    merciDetail: "La DGARH en prend connaissance. Aucune réponse n'est envoyée automatiquement.",
  },
};

/**
 * La forme du dictionnaire. Toute autre langue doit la remplir entièrement :
 * une clé oubliée est une erreur de compilation, pas un trou découvert en
 * production.
 *
 * Volontairement sans `as const` : les valeurs doivent être des `string`, non
 * les littéraux français, sinon aucune traduction ne serait assignable.
 */
export type Dictionnaire = typeof fr;
