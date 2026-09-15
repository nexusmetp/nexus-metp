"use client";

import type { StoreName } from "./schema";
import { STORES_SEMES } from "./schema";

/* ------------------------------------------------------------------ */
/* Ce qu'une montée de version fait au décor                            */
/* ------------------------------------------------------------------ */

/**
 * Les tiroirs qu'une montée de version doit **rafraîchir**, et pas seulement
 * compléter.
 *
 * Le complément par identifiant absent — posé en v15 pour cesser de détruire
 * ce qu'un agent avait saisi — a une limite qu'il fallait bien rencontrer un
 * jour : il ne sait pas *corriger* une ligne du décor. En v18, les mutations
 * ferment l'affectation qu'elles remplacent ; ajouter les nouvelles sans
 * mettre à jour les anciennes laisserait deux affectations en vigueur pour
 * le même agent, et chaque agent muté compterait deux fois dans l'effectif.
 *
 * Le rafraîchissement **n'efface jamais rien** : il réécrit les lignes du
 * décor dont l'identifiant figure dans le jeu de données, et laisse
 * intactes toutes les autres — dont celles qu'un service a créées, qui
 * portent des identifiants que le semis ne produit pas.
 *
 * Le prix, assumé et le seul : une ligne du décor qu'un agent aurait
 * modifiée à la main retrouve sa valeur d'origine. Cela ne vaut que pour les
 * tiroirs listés ici, et seulement à la version qui les y inscrit.
 */
/**
 * Les lignes du décor qu'une montée de version doit **retirer**.
 *
 * Le rafraîchissement réécrit, il ne supprime pas — et il le faut bien, sans
 * quoi une ligne créée par un service disparaîtrait au déploiement suivant.
 * Mais il laisse alors derrière lui les lignes que le semis ne produit plus.
 *
 * En v17, quatorze comptes `USR-S…` avaient été ouverts pour les secrétaires.
 * En v21, ces mêmes personnes ont un compte d'agent dont l'habilitation a été
 * élevée : deux comptes pour un seul agent, c'est-à-dire deux historiques et
 * aucun des deux complet. Il faut donc les retirer, et le dire.
 *
 * La liste est **explicite et bornée à un préfixe** : on ne devine jamais
 * qu'une ligne « vient du semis », on nomme celles qu'on retire.
 */
export const PURGER: { version: number; tiroir: StoreName; prefixe: string; motif: string }[] = [
  {
    version: 21,
    tiroir: "utilisateurs",
    prefixe: "USR-S",
    motif: "Comptes de secrétaires de la v17, remplacés par le compte d'agent de la même personne.",
  },
];

export const RAFRAICHIR: { version: number; tiroirs: StoreName[] }[] = [
  { version: 18, tiroirs: ["affectations", "postes", "actes", "prisesService"] },
  /* v21 ouvre un compte à chaque agent. Les vingt-huit comptes semés jusque-là
     gardent leur identifiant et sont réécrits à l'identique ; les deux mille
     quatre cents autres s'ajoutent. Un compte ouvert depuis l'application
     porte un identifiant que le semis ne produit pas : il n'est pas touché. */
  { version: 21, tiroirs: ["utilisateurs", "habilitations"] },
  /* v22 : le profil Agent devient le socle de tous les autres. Chaque profil
     ne garde donc plus que ce qu'il **ajoute**, et trois modules devenus des
     onglets de « Présences » disparaissent des matrices. Une base montée sans
     cette réécriture garderait les anciennes lignes, droits périmés compris —
     et l'écran des profils montrerait des modules qui n'existent plus. */
  { version: 22, tiroirs: ["profils"] },
  /* v23 : l'administrateur système cesse d'être un agent du ministère. Son
     profil devient **technique** — il n'hérite plus du socle — et sa matrice
     se réduit à ce qu'il fait vraiment : les entités, les profils, le journal.
     Sans cette réécriture, une base montée garderait l'ancienne matrice et
     continuerait de lui ouvrir les dossiers et les documents. */
  { version: 23, tiroirs: ["profils"] },
  /* v24 : les comptes du semis cessent de porter « mot de passe à changer ».
     Le drapeau ne vaut désormais que pour un compte réellement ouvert par
     quelqu'un, avec un mot de passe provisoire qui n'appartient qu'à lui — et
     il force alors le changement à la première connexion. */
  { version: 24, tiroirs: ["utilisateurs"] },
  /* v25 : la chaîne de délégation s'ouvre sur toute la hauteur de
     l'organigramme. Chaque chef désigne désormais la tête de ses sous-entités
     dans son périmètre, le secrétariat inscrit le personnel de sa direction,
     et il ne reste que deux profils que nul ne peut accorder. Une base montée
     sans cette réécriture garderait les anciennes matrices : la chaîne y
     mourrait au deuxième niveau, comme avant. */
  { version: 25, tiroirs: ["profils"] },
  /* v26 : chaque profil porte désormais sa **portée**. Sans cette réécriture,
     les profils en base n'en auraient aucune et retomberaient sur le défaut —
     qui est le bon, mais qui priverait le ministre, son cabinet, la DGARH et
     l'inspection de la vue d'ensemble dont ils ont besoin. */
  { version: 26, tiroirs: ["profils"] },
  /* v27 : trois corrections de fond des profils livrés.
     — Le **directeur général** et le **secrétaire général** administrent
       désormais le ministère entier et non leur seule direction : tout, dans
       ce ministère, est géré par la DGARH, cabinet compris. Sans cela le DG
       ne pouvait créer une entité ni désigner un chef hors de chez lui, et
       la chaîne s'arrêtait à sa première marche.
     — Le **ministre** perd l'écriture sur l'organisation : il voit tout et
       n'administre rien, son compte étant ouvert par l'administrateur au même
       titre que celui du directeur général.
     — L'**inspecteur général** cesse d'être de rang nul — il dirige une
       inspection et ne pouvait y désigner personne — et le **chef
       d'établissement** reçoit la lecture des congés, carrières, sorties et
       retraites de son établissement.
     Sans cette réécriture, une base déjà montée garderait les anciennes
     lignes, et la portée d'administration y serait absente. */
  { version: 27, tiroirs: ["profils"] },
  /* v28 : le semis désigne enfin la tête de chaque entité qu'il peuple.
     Jusqu'ici il dressait l'organigramme, y affectait deux mille quatre cents
     agents, et ne nommait de responsable que pour les quinze entités portant
     un compte de démonstration : soixante-seize services, directions
     départementales et lycées techniques arrivaient **peuplés et acéphales**.
     Le tableau de bord le comptait comme une anomalie du ministère alors que
     l'anomalie était dans le décor.

     Quatre tiroirs sont réécrits parce que la désignation les touche tous :
     l'**entité** reçoit son responsable, le **compte** de l'intéressé passe du
     profil d'agent à celui de son niveau, son **affectation** prend le titre
     de la fonction, et une **habilitation** dit de qui il le tient — le chef
     de l'entité de rattachement, puisque l'arbre est pourvu de haut en bas.
     Personne n'est inventé : le chef est le plus ancien en service parmi les
     agents déjà affectés là, et une entité sans personne en poste reste sans
     chef. */
  { version: 28, tiroirs: ["entites", "utilisateurs", "habilitations", "affectations"] },
  /* v29 : quatre comptes, et l'un d'eux était assis au mauvais étage.
     La DOBAS — troisième direction de la DGARH — n'avait aucune porte
     d'entrée, non plus que les deux services de la DAFM par lesquels passent
     la dépense et les archives : on ne pouvait donc pas vérifier ce que fait
     une sous-direction, seulement le lire dans l'organigramme. Et le compte
     « chef d'établissement » était rattaché à la direction départementale,
     c'est-à-dire au-dessus de l'établissement qu'il dirige : son périmètre
     couvrait tout le département.

     Les mêmes quatre tiroirs qu'en v28, pour la même raison : un compte
     déplacé emporte son affectation, son habilitation et la tête de son
     entité.

     Et **les profils**, sans quoi rien de tout cela ne se verrait. La matrice
     du directeur central s'élargit à la rémunération, aux archives et aux
     carrières — c'est désormais l'attribution de sa direction qui choisit,
     parmi ces droits, ceux qu'il exerce. Les profils vivent en base depuis
     qu'on peut les régler à l'écran : sans réécriture, une base déjà montée
     garderait l'ancienne ligne et le directeur des finances resterait en
     lecture seule sur les finances, l'axe des attributions installé ou non. */
  { version: 29, tiroirs: ["entites", "utilisateurs", "habilitations", "affectations", "profils"] },
  /* v30 : l'organigramme est relu sur les arrêtés, et il triple.
     Les textes d'organisation du ministère — Journal officiel n° 44-2022 et
     n° 45-2022, arrêtés n° 25564 à 25572 du 17 octobre 2022 — sont publics et
     lisibles ; le référentiel avait été bâti sur l'hypothèse inverse. Ce que
     la lecture a corrigé : trois directions générales sur quatre manquaient,
     le cabinet était inventé de toutes pièces, les inspections portaient des
     noms imaginés, les directions départementales relevaient du ministère au
     lieu de leur direction générale, et l'une des deux séries n'existait pas.
     151 entités deviennent 639.

     Tous les tiroirs semés sont donc réécrits, et il n'y a pas de demi-mesure
     possible : un agent affecté à `ENT-DD-02`, un acte instruit par une entité
     qui n'existe plus, un compte assis sur un identifiant disparu — chacun
     serait un orphelin muet. Ce que quelqu'un a écrit (brouillons, modèles de
     la maison, échanges avec l'assistant) reste intact : `STORES_UTILISATEUR`
     est hors du semis depuis la v15, et c'est précisément le jour où cela
     compte. */
  { version: 30, tiroirs: [...STORES_SEMES] },
];

/**
 * Les tiroirs qu'une montée de version doit **vider** avant de les réécrire.
 *
 * Le rafraîchissement réécrit **par identifiant**. C'est ce qu'il faut tant
 * que les identifiants sont stables : la ligne du décor reprend sa valeur, et
 * ce qu'un service a créé à côté n'est pas touché. Mais quand une version
 * renomme les identifiants eux-mêmes, réécrire ne remplace rien — cela
 * **ajoute**, et l'ancien reste.
 *
 * La v30 en est le cas exact, et la base l'a montré : après la montée, six
 * cent trente-neuf entités semées et sept cents en base. Les soixante et une
 * de trop étaient les entités inventées que la lecture des arrêtés a
 * supprimées — un cabinet imaginaire, trois inspections qui n'existent pas,
 * une série de directions départementales sous le mauvais parent. Elles ne
 * gênaient pas seulement le compteur : un agent affecté à `ENT-DD-02` y était
 * encore rattaché, et l'écran continuait de le montrer sous une direction que
 * l'arrêté ne connaît pas.
 *
 * **Le prix, à dire en clair :** vider emporte aussi ce qu'un administrateur
 * aurait créé dans ces tiroirs — une direction ouverte depuis l'application,
 * par exemple. On l'assume ici parce qu'une telle entité pendait à un
 * identifiant qui n'existe plus : la garder n'aurait pas sauvé son
 * rattachement, seulement son orphelinat. Ce que quelqu'un a **écrit** —
 * brouillons, modèles de la maison, échanges — vit dans `STORES_UTILISATEUR`,
 * hors du semis, et n'est pas concerné.
 */
export const VIDER: { version: number; tiroirs: StoreName[]; motif: string }[] = [
  {
    version: 30,
    tiroirs: [...STORES_SEMES],
    motif:
      "Le référentiel des entités est rebâti sur les arrêtés n° 25564 à 25572 : "
      + "les identifiants changent, réécrire par identifiant ne remplacerait rien.",
  },
];
