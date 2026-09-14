"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { save } from "@/lib/db";
import type { CodeProfil, Habilitation, Utilisateur } from "@/lib/types";
import { habilitationsEnVigueur, peutHabiliter } from "@/lib/referentiels";
import { liste } from "./base";
import { journaliser, nouvelId } from "./audit";

/* ------------------------------------------------------------------ */
/* Accorder et retirer un accès                                        */
/* ------------------------------------------------------------------ */

export const useHabilitations = () => liste<Habilitation>("habilitations");

const invalider = (qc: ReturnType<typeof useQueryClient>) =>
  ["habilitations", "utilisateurs", "journal"]
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

/**
 * Accorde un profil d'accès à un compte, sur une entité.
 *
 * **La règle est vérifiée ici, pas seulement à l'écran.** Un bouton grisé
 * protège l'utilisateur distrait ; il ne protège de rien d'autre. Tant que la
 * plateforme tourne dans le navigateur, la seule barrière qui vaille est
 * celle qu'on franchit au moment d'écrire — et le jour où le serveur
 * arrivera, c'est cette fonction qui deviendra l'appel d'API, avec sa règle
 * déjà écrite.
 *
 * Le compte est mis à jour dans la foulée : `Utilisateur.role` est la
 * projection de l'habilitation en vigueur, et une projection qui ne suit pas
 * son événement ne sert à rien.
 */
export function useAccorderHabilitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ compte, role, entiteId, motif, dateDebut, dateFin, accordeur, acteId }: {
      compte: Utilisateur;
      role: CodeProfil;
      entiteId: string;
      motif: string;
      dateDebut: string;
      dateFin?: string | null;
      accordeur: Utilisateur;
      acteId?: string | null;
    }) => {
      const verdict = peutHabiliter(accordeur, role, entiteId);
      if (!verdict.ok) throw new Error(verdict.motif ?? "Habilitation refusée.");
      if (!motif.trim()) {
        throw new Error("Un accès ne s'accorde pas sans motif écrit.");
      }
      if (compte.id === accordeur.id) {
        /* Se donner un droit à soi-même vide la règle de son sens : c'est le
           chemin par lequel toute élévation de privilège passe. */
        throw new Error("On ne s'accorde pas un accès à soi-même.");
      }

      const ligne: Habilitation = {
        id: nouvelId("HAB"),
        utilisateurId: compte.id,
        role,
        entiteId,
        accordePar: accordeur.id,
        accordeParNom: accordeur.nomComplet,
        accordeLe: new Date().toISOString(),
        dateDebut,
        dateFin: dateFin ?? null,
        motif: motif.trim(),
        acteId: acteId ?? null,
      };
      await save<Habilitation>("habilitations", ligne);

      /* La projection suit, mais seulement si l'habilitation produit effet
         aujourd'hui : une habilitation préparée pour le mois prochain ne doit
         pas ouvrir la porte ce matin. */
      const aujourdhui = new Date().toISOString().slice(0, 10);
      if (dateDebut <= aujourdhui && (!dateFin || dateFin >= aujourdhui)) {
        await save<Utilisateur>("utilisateurs", { ...compte, role, entiteId });
      }

      await journaliser(accordeur, "VALIDATION", "Habilitation", ligne.id, {
        champ: "role",
        ancienneValeur: compte.role,
        nouvelleValeur: role,
        acteId: acteId ?? undefined,
        justification: motif.trim(),
      });
      return ligne;
    },
    onSuccess: () => invalider(qc),
  });
}

/**
 * Retire un accès avant son terme.
 *
 * On ne supprime pas la ligne : on la révoque. Supprimer effacerait la
 * question à laquelle un contrôle voudra répondre — *qui avait ce droit en
 * mars, et de qui le tenait-il ?* Le motif est obligatoire pour la même
 * raison qu'à l'octroi.
 *
 * Après retrait, le compte retombe sur l'habilitation suivante en vigueur.
 * S'il n'en reste aucune, il devient `AGENT` sur son entité : un compte sans
 * habilitation ne doit jamais garder ses droits d'hier, et le désactiver
 * d'office priverait l'intéressé de son propre dossier.
 */
export function useRevoquerHabilitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habilitation, compte, motif, revocateur, toutes }: {
      habilitation: Habilitation;
      compte: Utilisateur;
      motif: string;
      revocateur: Utilisateur;
      /** Les autres habilitations du compte, pour recalculer la projection. */
      toutes: Habilitation[];
    }) => {
      const verdict = peutHabiliter(revocateur, habilitation.role, habilitation.entiteId);
      if (!verdict.ok) throw new Error(verdict.motif ?? "Retrait refusé.");
      if (!motif.trim()) {
        throw new Error("Un accès ne se retire pas sans motif écrit.");
      }

      const ligne: Habilitation = {
        ...habilitation,
        revoqueePar: revocateur.id,
        revoqueeParNom: revocateur.nomComplet,
        revoqueeLe: new Date().toISOString(),
        motifRevocation: motif.trim(),
      };
      await save<Habilitation>("habilitations", ligne);

      const aujourdhui = new Date().toISOString().slice(0, 10);
      const restantes = habilitationsEnVigueur(
        toutes.map((h) => (h.id === ligne.id ? ligne : h)),
        compte.id,
        aujourdhui
      );
      const [suivante] = restantes;
      await save<Utilisateur>("utilisateurs", {
        ...compte,
        role: suivante?.role ?? "AGENT",
        entiteId: suivante?.entiteId ?? compte.entiteId,
      });

      await journaliser(revocateur, "SUPPRESSION", "Habilitation", ligne.id, {
        champ: "role",
        ancienneValeur: habilitation.role,
        nouvelleValeur: suivante?.role ?? "AGENT",
        justification: motif.trim(),
      });
      return ligne;
    },
    onSuccess: () => invalider(qc),
  });
}

/**
 * Ouvre un accès à un agent qui n'en avait pas, et l'habilite du même geste.
 *
 * C'est le geste réel d'un chef de service : il n'« ouvre pas un compte »
 * puis « accorde un profil » — il donne accès à quelqu'un, pour une fonction.
 * Les séparer en deux écrans produit exactement ce que la plateforme doit
 * éviter : des comptes ouverts que personne n'a habilités, qui traînent et
 * dont plus personne ne sait ce qu'ils autorisent.
 *
 * Le mot de passe est provisoire et le compte est marqué à changer dès la
 * première connexion : celui qui ouvre l'accès ne doit pas connaître
 * durablement le mot de passe de celui à qui il l'ouvre.
 */
export function useOuvrirAcces() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agent, email, role, entiteId, fonction, motif, dateDebut, dateFin, accordeur }: {
      agent: { id: string; nom: string; prenom: string };
      email: string;
      role: CodeProfil;
      entiteId: string;
      fonction: string;
      motif: string;
      dateDebut: string;
      dateFin?: string | null;
      accordeur: Utilisateur;
    }) => {
      const verdict = peutHabiliter(accordeur, role, entiteId);
      if (!verdict.ok) throw new Error(verdict.motif ?? "Habilitation refusée.");
      if (!motif.trim()) throw new Error("Un accès ne s'accorde pas sans motif écrit.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new Error("Adresse de courriel invalide.");
      }

      const compte: Utilisateur = {
        id: nouvelId("USR"),
        email: email.trim().toLowerCase(),
        /* Provisoire, et le compte le sait : `motDePasseAChanger` force le
           renouvellement à la première connexion. */
        motDePasse: "Nexus2026",
        motDePasseAChanger: true,
        nomComplet: `${agent.prenom} ${agent.nom.toUpperCase()}`,
        role,
        entiteId,
        agentId: agent.id,
        fonction,
        actif: true,
        dateCreation: new Date().toISOString(),
        creePar: accordeur.id,
      };
      await save<Utilisateur>("utilisateurs", compte);

      const ligne: Habilitation = {
        id: nouvelId("HAB"),
        utilisateurId: compte.id,
        role,
        entiteId,
        accordePar: accordeur.id,
        accordeParNom: accordeur.nomComplet,
        accordeLe: new Date().toISOString(),
        dateDebut,
        dateFin: dateFin ?? null,
        motif: motif.trim(),
      };
      await save<Habilitation>("habilitations", ligne);

      await journaliser(accordeur, "CREATION", "Utilisateur", compte.id, {
        champ: "role",
        nouvelleValeur: role,
        justification: `Ouverture d'accès pour ${compte.nomComplet} — ${motif.trim()}`,
      });
      return { compte, habilitation: ligne };
    },
    onSuccess: () => invalider(qc),
  });
}
