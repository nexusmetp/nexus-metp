"use client";

import { all, save } from "@/lib/db";
import { habilitationsEnVigueur, hydraterEntites } from "@/lib/referentiels";
import { motDePasseProvisoire } from "@/lib/acces/motdepasse";
import type {
  Affectation, Agent, Entite, Habilitation, Position, Utilisateur,
} from "@/lib/types";
import { journaliser, nouvelId } from "./audit";
import { courrielDe } from "./organisation";

/* ------------------------------------------------------------------ */
/* Les effets d'une nomination — écrits une fois                       */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi ce fichier existe.
 *
 * Une nomination produit ses effets à deux moments selon le niveau de
 * l'entité : **tout de suite** quand elle relève de la délégation du directeur
 * général, ou **à la notification** quand elle attend la signature du
 * ministre. Deux chemins, un seul jeu d'effets — et c'est exactement la
 * configuration où deux copies finissent par diverger sans que personne ne
 * s'en aperçoive, comme la projection « qui dirige quoi » l'avait fait en trois
 * exemplaires dont l'un était faux.
 *
 * Deux cas, et la différence compte :
 *
 *  - **un agent déjà en poste.** Le cas ordinaire : on nomme parmi le personnel
 *    du service. Rien n'est créé — le dossier, la carrière et le compte
 *    existent. On clôt son affectation courante et on en ouvre une à la
 *    nouvelle fonction, on promeut son compte, et **le mot de passe ne change
 *    pas** : il n'y a aucun accès nouveau à ouvrir, donc rien à transmettre ;
 *  - **une personne à inscrire.** Le cas de l'amorçage, quand l'entité vient de
 *    naître et que personne n'y sert encore. Dossier, compte et mot de passe
 *    provisoire s'ouvrent du même geste.
 */

export interface EffetsNomination {
  /** `null` seulement si le compte existait déjà : rien à transmettre. */
  provisoire: string | null;
  compte: Utilisateur;
  /** Vrai quand l'intéressé servait déjà dans cette entité. */
  promotionInterne: boolean;
}

export async function appliquerNomination({
  agent, entite, profil, fonction, dateEffet, motif, acteId, parQui, horodatage,
}: {
  agent: Agent;
  entite: Entite;
  profil: string;
  fonction: string;
  dateEffet: string;
  motif: string;
  acteId: string;
  parQui: Utilisateur;
  horodatage: string;
}): Promise<EffetsNomination> {
  const comptes = await all<Utilisateur>("utilisateurs");
  const affectations = await all<Affectation>("affectations");
  const habilitations = await all<Habilitation>("habilitations");

  const compteExistant = comptes.find((u) => u.agentId === agent.id) ?? null;
  const affectationEnCours = affectations.find((a) => a.agentId === agent.id && !a.dateFin) ?? null;
  const promotionInterne = !!affectationEnCours;

  /* ---------- L'affectation ---------- */
  if (affectationEnCours) {
    /* On ne superpose pas deux affectations ouvertes : on clôt, puis on ouvre.
       Le dépôt projette la carrière depuis ces bornes — deux affectations sans
       date de fin rendraient l'entité de l'agent indéterminée. */
    await save<Affectation>("affectations", { ...affectationEnCours, dateFin: dateEffet });
  }
  await save<Affectation>("affectations", {
    id: nouvelId("AFF"), agentId: agent.id, entiteId: entite.id, posteId: null,
    fonction, dateEffet, dateFin: null, acteId,
  } as unknown as Affectation);

  /* ---------- La position ---------- */
  const positions = await all<Position>("positions");
  const positionEnCours = positions.find((p) => p.agentId === agent.id && !p.dateFin);
  if (!positionEnCours) {
    /* Un agent déjà en activité le reste : rouvrir une position ferait croire
       à un mouvement statutaire là où il n'y a qu'un changement de fonction. */
    await save<Position>("positions", {
      id: nouvelId("POS"), agentId: agent.id, nature: "ACTIVITE",
      dateEffet, dateFin: null, acteId,
    } as unknown as Position);
  }

  /* ---------- Le compte ---------- */
  let compte: Utilisateur;
  let provisoire: string | null = null;
  if (compteExistant) {
    compte = { ...compteExistant, role: profil, entiteId: entite.id, fonction };
  } else {
    const pris = new Set(comptes.map((u) => u.email.split("@")[0]));
    provisoire = motDePasseProvisoire();
    compte = {
      id: nouvelId("USR"),
      /* L'adresse est l'identifiant de connexion : celle du dossier, ou celle
         qu'on dérive du nom comme pour tout agent. */
      email: (agent.email || courrielDe(agent, pris)).toLowerCase(),
      motDePasse: provisoire,
      motDePasseAChanger: true,
      nomComplet: `${agent.prenom} ${agent.nom.toUpperCase()}`,
      role: profil,
      entiteId: entite.id,
      agentId: agent.id,
      fonction,
      actif: true,
      dateCreation: horodatage,
      creePar: parQui.id,
    };
  }
  await save<Utilisateur>("utilisateurs", compte);

  /* ---------- L'habilitation ---------- */
  await save<Habilitation>("habilitations", {
    id: nouvelId("HAB"),
    utilisateurId: compte.id,
    role: profil,
    entiteId: entite.id,
    accordePar: parQui.id,
    accordeParNom: parQui.nomComplet,
    accordeLe: horodatage,
    dateDebut: dateEffet,
    dateFin: null,
    motif: motif.trim(),
    acteId,
  });

  /* ---------- La relève, s'il y en a une ---------- */
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const sortants = comptes.filter(
    (c) => c.actif && c.id !== compte.id && c.entiteId === entite.id && c.role !== "AGENT"
      && habilitationsEnVigueur(habilitations, c.id, aujourdhui).length > 0
  );
  for (const sortant of sortants) {
    /* On clôt avant d'ouvrir, jamais l'inverse. Une habilitation ne s'efface
       pas — elle se termine, et l'historique dit toujours qui tenait la
       direction en mars et de qui il le tenait. */
    for (const h of habilitationsEnVigueur(habilitations, sortant.id, aujourdhui)) {
      await save<Habilitation>("habilitations", {
        ...h,
        dateFin: dateEffet,
        revoqueePar: parQui.id,
        revoqueeParNom: parQui.nomComplet,
        revoqueeLe: horodatage,
        motifRevocation:
          `Relève à la tête de ${entite.sigle} par ${agent.prenom} ${agent.nom.toUpperCase()}. `
          + motif.trim(),
      });
    }
    await save<Utilisateur>("utilisateurs", { ...sortant, role: "AGENT" });
    await journaliser(parQui, "MODIFICATION", "Utilisateur", sortant.id, {
      champ: "role",
      ancienneValeur: sortant.role,
      nouvelleValeur: "AGENT",
      justification:
        `Fin de fonctions à la tête de ${entite.sigle}. Le compte reste ouvert au profil `
        + "d'agent : l'intéressé demeure agent du ministère.",
    });
  }

  /* ---------- La tête de l'entité ---------- */
  await save<Entite>("entites", { ...entite, responsableId: agent.id });
  hydraterEntites(await all<Entite>("entites"));

  return { compte, provisoire, promotionInterne };
}
