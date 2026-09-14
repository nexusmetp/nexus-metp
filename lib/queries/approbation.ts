"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { all, remove, save } from "@/lib/db";
import { entiteById, hydraterEntites, libelleProfil } from "@/lib/referentiels";
import type { Acte, Agent, Entite, Utilisateur } from "@/lib/types";
import { journaliser } from "./audit";
import { appliquerNomination } from "./nomination";

/* ------------------------------------------------------------------ */
/* Les nominations qui attendent le ministre                           */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi il n'y a pas de « file d'approbation » dans cette plateforme.
 *
 * Il aurait été facile d'ajouter une table de demandes, un statut et deux
 * boutons. Ç'aurait été un deuxième mécanisme pour une idée que le dépôt porte
 * déjà : **un effet s'applique à la notification d'un acte, jamais à sa
 * signature**. Une nomination qui attend le ministre n'est donc rien d'autre
 * qu'un acte au statut « soumis », et l'approuver n'est rien d'autre que le
 * notifier. On garde ainsi un seul registre, un seul historique, et le
 * ministre approuve dans la langue de l'administration — il signe un acte — et
 * non dans celle du logiciel.
 */

/** Les actes de nomination en attente de la décision du ministre. */
export function useNominationsEnAttente() {
  return useQuery<Acte[]>({
    queryKey: ["actes", "nominations-en-attente"],
    queryFn: async () => (await all<Acte>("actes"))
      .filter((a) => a.type === "AFFECTATION" && a.statut === "SOUMIS" && !a.effetsAppliques)
      .filter((a) => !!a.cible?.profil)
      .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)),
    staleTime: 10_000,
  });
}

/**
 * Approuve ou refuse une nomination.
 *
 * **Approuver** applique tout ce que la désignation avait mis de côté :
 * l'affectation, la position, le compte et son mot de passe provisoire,
 * l'habilitation, et la tête de l'entité. Le mot de passe est engendré ici et
 * non à l'établissement de l'acte — un secret qui attendrait plusieurs jours
 * dans la base sans servir est un secret de moins.
 *
 * **Refuser** retire le dossier ouvert pour l'intéressé : le ministère ne tient
 * pas de dossier de personnel pour quelqu'un qu'il n'a pas nommé. L'acte reste,
 * au statut rejeté, avec le motif ; c'est lui qui porte la trace, et le journal
 * la double.
 */
export function useDeciderNomination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ acte, decision, motif, utilisateur }: {
      acte: Acte;
      decision: "APPROUVER" | "REFUSER";
      motif: string;
      utilisateur: Utilisateur;
    }) => {
      if (acte.effetsAppliques || acte.statut !== "SOUMIS") {
        throw new Error("Cette nomination a déjà été tranchée.");
      }
      if (!motif.trim()) {
        throw new Error("Approuver ou refuser une nomination demande un motif écrit.");
      }

      const horodatage = new Date().toISOString();
      const profil = acte.cible?.profil;
      const entiteId = acte.cible?.entiteId;
      const fonction = acte.cible?.fonction ?? "Responsable";
      const dateEffet = acte.cible?.dateEffet ?? horodatage.slice(0, 10);

      const agents = await all<Agent>("agents");
      const agent = agents.find((a) => a.id === acte.agentId);
      if (!agent) throw new Error("Le dossier de l'intéressé est introuvable.");

      /* Le journal se lit par des humains : un identifiant technique y rend
         l'entrée inutilisable six mois plus tard. */
      const ouSigle = entiteById(entiteId)?.sigle ?? entiteId ?? "—";

      /* ---------------- Le refus ---------------- */
      if (decision === "REFUSER") {
        await save<Acte>("actes", {
          ...acte,
          statut: "REJETE",
          cible: { ...acte.cible, motif: `${acte.cible?.motif ?? ""} — Refusé : ${motif.trim()}` },
        });
        await remove("agents", agent.id);
        await journaliser(utilisateur, "MODIFICATION", "Acte", acte.id, {
          acteId: acte.id,
          ancienneValeur: "SOUMIS",
          nouvelleValeur: "REJETE",
          justification:
            `Nomination refusée : ${agent.prenom} ${agent.nom.toUpperCase()} à la tête de `
            + `${ouSigle}. ${motif.trim()} Aucun compte n'avait été ouvert ; le dossier `
            + "provisoire est retiré.",
        });
        return { decision, compte: null, provisoire: null, agent };
      }

      /* ---------------- L'approbation ---------------- */
      const entites = await all<Entite>("entites");
      const entite = entites.find((e) => e.id === entiteId);
      if (!entite || !profil) {
        throw new Error("L'acte ne porte plus l'entité ou le profil : il ne peut pas être notifié.");
      }

      /* Les effets sont ceux de toute nomination : ils vivent en un seul
         endroit, appelé ici comme sur le chemin direct. Un agent déjà en poste
         garde son compte et son mot de passe ; seul un nouveau venu en reçoit
         un provisoire. */
      const { compte, provisoire, promotionInterne } = await appliquerNomination({
        agent, entite, profil, fonction, dateEffet,
        motif: `${acte.cible?.motif ?? ""} Approuvée : ${motif.trim()}`.trim(),
        acteId: acte.id, parQui: utilisateur, horodatage,
      });

      await save<Acte>("actes", {
        ...acte,
        statut: "NOTIFIE",
        dateSignature: horodatage,
        effetsAppliques: true,
      });

      await journaliser(utilisateur, "MODIFICATION", "Acte", acte.id, {
        acteId: acte.id,
        ancienneValeur: "SOUMIS",
        nouvelleValeur: "NOTIFIE",
        justification:
          `Nomination approuvée : ${agent.prenom} ${agent.nom.toUpperCase()} — `
          + `${libelleProfil(profil)} — ${entite.sigle}. ${motif.trim()} `
          + (promotionInterne
            ? `Le compte (${compte.email}) passe au profil à la notification ; son mot de passe ne change pas.`
            : `Dossier, compte (${compte.email}) et habilitation ouverts à la notification.`),
      });

      return { decision, compte, provisoire, agent };
    },
    onSuccess: () => {
      ["actes", "agents", "affectations", "positions", "entites",
        "utilisateurs", "habilitations", "journal"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}
