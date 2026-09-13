/**
 * Référentiels du SIRH du METP — point d'entrée.
 *
 * Découpé par nature : les textes qui fondent, la géographie, l'arborescence,
 * le statut, les actes, les droits. L'ordre des dépendances suit celui du
 * droit — un texte fonde une entité, une entité porte un périmètre, un
 * périmètre borne un droit — et jamais l'inverse.
 */

export * from "./textes";
export * from "./geo";
export * from "./entites";
export * from "./statut";
export * from "./actes";
export * from "./droits";
export * from "./presence";
export * from "./remuneration";
export * from "./archives";
