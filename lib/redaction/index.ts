/**
 * Rédaction — le traitement de texte interne de la DGARH.
 *
 * Un brouillon vit ici, dans le navigateur, jusqu'à ce que son auteur
 * l'arrête. Il ne touche à aucun dossier : c'est ce qui permet d'écrire
 * sans conséquence, puis de verser au circuit d'un seul geste conscient.
 */

export * from "./assainir";
export * from "./depart";
export * from "./jetons";
export { versDocx, DOCX_DISPONIBLE } from "./docx";
