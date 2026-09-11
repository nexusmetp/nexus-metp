"use client";

import { all, save } from "@/lib/db";
import { hydraterEntites } from "@/lib/referentiels";
import type { Acte, Affectation, Agent, Entite, Position, SituationCarriere, Utilisateur } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { journaliser, nouvelId } from "./audit";

/* Organisation — l'administrateur crée les directions                 */
/* ------------------------------------------------------------------ */

export function useEnregistrerEntite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entite, utilisateur, creation }: {
      entite: Entite; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Entite>("entites", entite);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Entite", entite.id, {
        champ: creation ? undefined : "entite",
        nouvelleValeur: `${entite.sigle} — ${entite.nom}`,
        justification: creation
          ? `Création de l'entité ${entite.sigle} au niveau ${entite.niveau}.`
          : `Modification de l'entité ${entite.sigle}.`,
      });
      hydraterEntites(await all<Entite>("entites"));
      return entite;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entites"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Comptes — l'administrateur ouvre l'accès, il n'instruit pas. §11     */
/* ------------------------------------------------------------------ */

export function useEnregistrerCompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ compte, utilisateur, creation }: {
      compte: Utilisateur; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Utilisateur>("utilisateurs", compte);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Utilisateur", compte.id, {
        champ: creation ? undefined : "compte",
        nouvelleValeur: `${compte.nomComplet} — ${compte.role}`,
        justification: creation
          ? `Ouverture du compte ${compte.email} avec le rôle ${compte.role}.`
          : `Modification du compte ${compte.email}.`,
      });
      return compte;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Personnel — le directeur inscrit ses agents                         */
/* ------------------------------------------------------------------ */

/**
 * Inscrit un agent. Rien n'entre dans un dossier sans acte (§05) : la
 * création ouvre donc un acte de recrutement déjà notifié, auquel se
 * rattachent l'affectation et la position initiales.
 */
export function useInscrireAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agent, entiteId, fonction, dateEffet, gradeId, utilisateur }: {
      agent: Agent; entiteId: string; fonction: string; dateEffet: string;
      gradeId?: string | null; utilisateur: Utilisateur;
    }) => {
      const acteId = nouvelId("ACT");
      const horodatage = new Date().toISOString();
      const acte: Acte = {
        id: acteId,
        reference: `ARR-${String(Math.floor(Math.random() * 9000) + 1000)}/METP/DGARH-${new Date().getFullYear()}`,
        type: "RECRUTEMENT",
        objet: `Recrutement et prise de service — ${agent.prenom} ${agent.nom}`,
        agentId: agent.id,
        statut: "NOTIFIE",
        entiteInstructriceId: entiteId,
        dateCreation: horodatage,
        dateEcheance: dateEffet,
        dateSignature: horodatage,
        initiateur: utilisateur.nomComplet,
        instruitPar: utilisateur.id,
        effetsAppliques: true,
        cible: { entiteId, fonction, gradeId: gradeId ?? undefined, dateEffet, motif: `Inscription au fichier du personnel par ${utilisateur.nomComplet}.` },
        etapes: [],
        pieces: [],
      };

      await save<Agent>("agents", agent);
      await save<Acte>("actes", acte);
      await save<Affectation>("affectations", {
        id: nouvelId("AFF"), agentId: agent.id, entiteId, posteId: null as any,
        fonction, dateEffet, dateFin: null, acteId,
      } as Affectation);
      await save<Position>("positions", {
        id: nouvelId("POS"), agentId: agent.id, nature: "ACTIVITE",
        dateEffet, dateFin: null, acteId,
      } as Position);
      if (gradeId) {
        await save<SituationCarriere>("situations", {
          id: nouvelId("SIT"), agentId: agent.id, gradeId, classe: 1, echelon: 1,
          indice: 0, dateEffet, dateFin: null, acteId,
        } as SituationCarriere);
      }
      await journaliser(utilisateur, "CREATION", "Agent", agent.id, {
        acteId,
        nouvelleValeur: `${agent.prenom} ${agent.nom} — ${agent.matricule}`,
        justification: "Inscription au fichier du personnel.",
      });
      return agent;
    },
    onSuccess: () => {
      ["agents", "actes", "affectations", "positions", "situations", "journal"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}

/* ------------------------------------------------------------------ */
