/* ------------------------------------------------------------------ */
/* Les attributions, telles que les arrêtés les écrivent                */
/* ------------------------------------------------------------------ */

/**
 * Ce que chaque structure est chargée de faire, transcrit du Journal officiel.
 *
 * `lib/referentiels/attributions.ts` répond à « sur quoi cette direction
 * a-t-elle qualité ? » — c'est un axe de droits, six domaines, de quoi ouvrir
 * ou fermer un bouton. Ce fichier-ci répond à une autre question, et c'est la
 * question que pose un agent : **« de quoi mon service est-il chargé ? »** La
 * réponse n'est pas déduite, elle est citée : mille cent quatre-vingt-cinq
 * attributions, tirées article par article des neuf arrêtés du 17 octobre
 * 2022 publiés aux Journaux officiels n° 44-2022 et 45-2022.
 *
 * **Indexé par l'intitulé du texte, et non par identifiant d'entité.** Deux
 * raisons, et la seconde est la vraie :
 *
 *  - un arrêté décrit **un** service départemental et l'applique aux quinze
 *    départements ; écrire quinze fois les mêmes attributions les ferait
 *    diverger au premier correctif. Cinq cent vingt-deux entités sont ainsi
 *    dotées par deux cent quarante-cinq articles ;
 *  - l'identifiant d'entité est une invention de la plateforme, l'intitulé est
 *    du texte. Rattacher par l'intitulé, c'est se rattacher à ce qui fait foi —
 *    et un identifiant renommé ne casse rien.
 *
 * Rien n'est résumé, rien n'est reformulé : une attribution affichée doit
 * pouvoir être retrouvée mot pour mot dans le Journal officiel.
 */

/** `[numéro d'article, ...attributions]` — l'article d'abord, pour le citer. */
export type Attribution = [article: number, ...missions: string[]];

/** Par numéro d'arrêté, puis par intitulé du texte en minuscules. */
export type AttributionsParTexte = Record<string, Record<string, Attribution>>;
