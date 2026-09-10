"use client";

/**
 * Couche d'accès aux données — point d'entrée.
 *
 * Lecture d'un côté, écriture de l'autre, et l'écriture regroupée par ce
 * qu'elle touche : les actes et leur circuit, l'organisation, la
 * collaboration, la gestion courante. Une mutation qui change un dossier
 * n'a rien à faire à côté d'une qui envoie un message.
 */

export * from "./base";
export * from "./actes";
export * from "./organisation";
export * from "./collaboration";
export * from "./gestion";
