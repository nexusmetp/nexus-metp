import localFont from "next/font/local";

/**
 * La police de l'interface, servie par le ministère lui-même.
 *
 * Elle arrivait de `fonts.googleapis.com`, deux balises dans l'en-tête. Trois
 * raisons de la rapatrier :
 *
 *  - la plateforme promet de s'afficher entièrement hors ligne et de ne rien
 *    charger depuis un hébergeur tiers. Deux requêtes vers Google à chaque
 *    ouverture démentaient la promesse, et un poste sans accès sortant — il y
 *    en a dans les services — n'avait jamais l'Inter annoncée ;
 *  - une feuille de style distante bloque le rendu : la page attendait Google
 *    avant de peindre son premier caractère ;
 *  - chaque ouverture disait l'adresse du ministère à un tiers.
 *
 * Le fichier est le sous-ensemble **latin** de l'Inter variable (47 Ko, une
 * seule graisse continue de 100 à 900, là où l'appel distant en tirait cinq).
 * Le latin couvre le français en entier, accents, œ, « » et € compris ; un
 * glyphe hors de ce jeu retombe sur la pile système, comme avant.
 *
 * Licence SIL Open Font 1.1, texte intégral dans LICENCE-OFL.txt : elle
 * autorise la redistribution, y compris incorporée à une application.
 */
export const policeInterface = localFont({
  src: "./inter-latin-variable.woff2",
  // Fonte variable : une seule ressource porte toute la plage de graisses.
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--police-interface",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});
