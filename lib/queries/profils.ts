"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { all, remove, save } from "@/lib/db";
import type { ProfilAcces, Utilisateur } from "@/lib/types";
import {
  hydraterProfils, porteursDe, verdictModification, verdictRang,
} from "@/lib/referentiels";
import { journaliser, nouvelId } from "./audit";

/* ------------------------------------------------------------------ */
/* Régler les profils d'accès                                          */
/* ------------------------------------------------------------------ */

/**
 * Après toute écriture, on réhydrate les registres depuis la base.
 *
 * Invalider les requêtes ne suffirait pas : `peut()`, `ROLE_LABELS` et les
 * rangs sont des objets synchrones, lus partout et jamais réactifs. Sans
 * cette reprise, un profil réglé à l'écran resterait sans effet jusqu'au
 * rechargement de la page — le genre de latence qu'un administrateur prend
 * pour une panne.
 */
async function reposer(qc: ReturnType<typeof useQueryClient>) {
  hydraterProfils(await all<ProfilAcces>("profils"));
  ["profils", "utilisateurs", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/**
 * Enregistre un profil — création ou correction, ministre compris.
 *
 * Deux refus, et un seul principe derrière eux : **on ne se donne pas plus de
 * pouvoir qu'on n'en a, et on ne se ferme pas la porte**. Nul ne crée un
 * profil d'un rang supérieur ou égal au sien, faute de quoi cet écran
 * deviendrait le chemin le plus court vers l'élévation de privilège — on se
 * fabrique « Assistant » avec tous les droits, on se l'attribue, et la
 * hiérarchie ne veut plus rien dire. Et nul ne retire à son propre profil
 * l'écriture sur cet écran, qui est le seul chemin du retour.
 */
export function useEnregistrerProfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profil, utilisateur, creation }: {
      profil: ProfilAcces; utilisateur: Utilisateur; creation: boolean;
    }) => {
      const garde = verdictModification(profil, utilisateur, profil.droits, profil.actif);
      if (!garde.ok) throw new Error(garde.motif ?? "Modification refusée.");
      const rang = verdictRang(utilisateur, profil.rang);
      if (!rang.ok) throw new Error(rang.motif ?? "Rang refusé.");
      if (!profil.libelle.trim()) throw new Error("Un profil sans nom ne s'attribue pas.");

      const ligne: ProfilAcces = {
        ...profil,
        id: profil.id || nouvelId("PRF"),
        libelle: profil.libelle.trim(),
        description: profil.description.trim(),
        ...(creation
          ? { creePar: utilisateur.id, dateCreation: new Date().toISOString() }
          : { modifiePar: utilisateur.id, dateModification: new Date().toISOString() }),
      };
      await save<ProfilAcces>("profils", ligne);

      const ouverts = Object.entries(ligne.droits)
        .map(([m, d]) => `${m}:${d}`).sort().join(" ");
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "ProfilAcces", ligne.id, {
        champ: "droits",
        nouvelleValeur: ouverts || "aucun droit",
        justification: `${ligne.libelle} — rang ${ligne.rang}${ligne.deriveDe ? `, repris de ${ligne.deriveDe}` : ""}`,
      });
      return ligne;
    },
    onSuccess: () => reposer(qc),
  });
}

/**
 * Active ou désactive un profil.
 *
 * Désactiver ferme les droits sans effacer le profil : les comptes qui le
 * portent restent lisibles, et l'historique dit toujours qui détenait quoi.
 * C'est le geste qu'on veut quand un profil cesse d'être employé — supprimer
 * est réservé à celui que personne n'a jamais porté.
 */
export function useBasculerProfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profil, actif, utilisateur, motif }: {
      profil: ProfilAcces; actif: boolean; utilisateur: Utilisateur; motif: string;
    }) => {
      const garde = verdictModification(profil, utilisateur, profil.droits, actif);
      if (!garde.ok) throw new Error(garde.motif ?? "Fermeture refusée.");
      if (!motif.trim()) throw new Error("Fermer ou rouvrir un profil demande un motif écrit.");
      const ligne: ProfilAcces = {
        ...profil, actif,
        modifiePar: utilisateur.id, dateModification: new Date().toISOString(),
      };
      await save<ProfilAcces>("profils", ligne);
      await journaliser(utilisateur, "MODIFICATION", "ProfilAcces", ligne.id, {
        champ: "actif",
        ancienneValeur: String(profil.actif),
        nouvelleValeur: String(actif),
        justification: motif.trim(),
      });
      return ligne;
    },
    onSuccess: () => reposer(qc),
  });
}

/**
 * Supprime un profil de la maison — et seulement s'il ne sert à personne.
 *
 * Le refus n'est pas une précaution de forme : supprimer un profil porté par
 * quarante comptes les laisserait tous sans droits, d'un seul geste et sans
 * que rien ne le signale à l'écran. Le compte a le nom du profil, pas ses
 * droits. On désactive dans ce cas, ce qui est visible et réversible.
 */
export function useSupprimerProfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ profil, comptes, utilisateur }: {
      profil: ProfilAcces; comptes: Utilisateur[]; utilisateur: Utilisateur;
    }) => {
      if (profil.code === utilisateur.role) {
        throw new Error("Vous ne pouvez pas supprimer le profil que vous portez.");
      }
      const porteurs = porteursDe(profil.code, comptes);
      if (porteurs.length > 0) {
        throw new Error(
          `${porteurs.length} compte(s) portent ce profil. Désactivez-le plutôt que de le supprimer : `
          + "le retirer les priverait tous de leurs droits sans le dire."
        );
      }
      await remove("profils", profil.id);
      await journaliser(utilisateur, "SUPPRESSION", "ProfilAcces", profil.id, {
        justification: `${profil.libelle} — profil supprimé, aucun compte ne le portait.`,
      });
      return profil.id;
    },
    onSuccess: () => reposer(qc),
  });
}
