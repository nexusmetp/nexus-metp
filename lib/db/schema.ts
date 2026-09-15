"use client";

/* ------------------------------------------------------------------ */
/* Le schéma : le nom de la base, sa version, ses tiroirs                */
/* ------------------------------------------------------------------ */

export const DB_NAME = "nexus-metp";
/**
 * v21 : tout agent a un compte. Le profil Agent, sur son entité
 *        d'affectation, est l'accès de base du ministère : consulter son
 *        dossier, l'annuaire, les notes de service. La plateforme cesse
 *        d'être réservée à l'encadrement.
 * v20 : tous les profils passent en table — ministre et directeur général
 *        compris. Il n'y avait aucune raison que le ministère puisse créer
 *        un profil sans pouvoir corriger ceux qu'on lui avait livrés.
 * v19 : profils d'accès — les droits cessent d'être une matrice écrite en
 *        dur pour devenir une donnée que l'administrateur système règle.
 * v18 : mutations récentes — le semis ne donnait qu'une affectation par
 *        agent, datée du recrutement : un ministère où personne n'avait
 *        bougé depuis 1992, et donc aucune arrivée à suivre.
 * v17 : habilitations — l'accès cesse d'être un champ posé sur un compte
 *        pour devenir un acte daté, accordé par quelqu'un, sur un périmètre.
 * v16 : points d'accueil, prises de service, registres d'émargement — le
 *        lieu où l'agent est reçu, et le cahier dont quelqu'un répond.
 * v14 : modèles écrits par la maison, rangés à côté des modèles livrés.
 * v13 : brouillons de rédaction et échanges avec l'assistant.
 * v12 : fonds d'archives — versements, articles cotés, communications.
 * v11 : horodatages du semis ramenés avant le jour de référence.
 * v10 : registre des documents établis.
 * v9 : cartes professionnelles et photographies.
 * v15 : présences, sorties du territoire, rémunérations non statutaires — et
 *        le semis cesse de détruire ce qui a été saisi (voir `ensureSeed`).
 * v8 : emplois, délégations, fonds documentaire, recrutement et formation.
 * v7 : inspections détaillées. v6 : cabinet du ministre. v5 : collaboration.
 * v4 : dossier personnel pour tous les rôles. v3 : niveau établissement (§10).
 */
export const DB_VERSION = 30;

export const STORES = [
  "entites", "corps", "grades", "postes", "agents",
  "situations", "affectations", "positions",
  "actes", "besoins", "utilisateurs", "journal", "notifications",
  "tickets", "messagesTicket", "conversations", "messages", "annonces", "parametres",
  "conges", "delegations", "textes", "campagnes", "candidatures",
  "offresFormation", "inscriptions", "cartes", "documents",
  "versements", "articlesArchives", "communications",
  "pointages", "sorties", "remunerations",
  "pointsAccueil", "prisesService", "registres", "habilitations", "profils",
  "brouillons", "modelesMaison", "conversationsIA", "echangesIA", "meta",
] as const;
export type StoreName = (typeof STORES)[number];

/**
 * Ce que le semis n'a pas le droit d'effacer.
 *
 * Le reste de la base est un jeu de données fictif qu'on peut refaire à
 * volonté ; un brouillon, lui, a été écrit par quelqu'un. Le réinitialiser
 * avec le décor reviendrait à jeter son travail pour rafraîchir l'exemple.
 */
export const STORES_UTILISATEUR: StoreName[] = [
  "brouillons", "modelesMaison", "conversationsIA", "echangesIA",
];
export const STORES_SEMES = STORES.filter((s) => !STORES_UTILISATEUR.includes(s));
