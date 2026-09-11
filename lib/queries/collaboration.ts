"use client";

import { all, save } from "@/lib/db";
import type { Annonce, Conversation, Message, MessageTicket, ParametresSysteme, StatutTicket, Ticket, Utilisateur } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { journaliser, nouvelId } from "./audit";

/* Tickets — la réclamation ne décide rien, elle ouvre un acte. §16     */
/* ------------------------------------------------------------------ */

export function useEnregistrerTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket, utilisateur, creation, message }: {
      ticket: Ticket; utilisateur: Utilisateur; creation: boolean; message?: string;
    }) => {
      await save<Ticket>("tickets", ticket);
      if (message) {
        await save<MessageTicket>("messagesTicket", {
          id: nouvelId("MTK"), ticketId: ticket.id, auteurId: utilisateur.id,
          auteur: utilisateur.nomComplet, corps: message,
          horodatage: new Date().toISOString(), interne: false,
        });
      }
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Ticket", ticket.id, {
        champ: creation ? undefined : "statut",
        nouvelleValeur: ticket.statut,
        acteId: ticket.acteId ?? undefined,
        justification: ticket.objet,
      });
      return ticket;
    },
    onSuccess: () => {
      ["tickets", "messagesTicket", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useRepondreTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket, corps, interne, utilisateur, statut }: {
      ticket: Ticket; corps: string; interne: boolean; utilisateur: Utilisateur; statut?: StatutTicket;
    }) => {
      await save<MessageTicket>("messagesTicket", {
        id: nouvelId("MTK"), ticketId: ticket.id, auteurId: utilisateur.id,
        auteur: utilisateur.nomComplet, corps, horodatage: new Date().toISOString(), interne,
      });
      if (statut && statut !== ticket.statut) {
        await save<Ticket>("tickets", {
          ...ticket, statut,
          dateCloture: statut === "RESOLU" || statut === "CLOS" ? new Date().toISOString() : ticket.dateCloture,
        });
      }
      return ticket;
    },
    onSuccess: () => {
      ["tickets", "messagesTicket"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Messagerie                                                          */
/* ------------------------------------------------------------------ */

export function useEnvoyerMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversation, corps, utilisateur }: {
      conversation: Conversation; corps: string; utilisateur: Utilisateur;
    }) => {
      const horodatage = new Date().toISOString();
      await save<Message>("messages", {
        id: nouvelId("MSG"), conversationId: conversation.id, auteurId: utilisateur.id,
        auteur: utilisateur.nomComplet, corps, horodatage, luPar: [utilisateur.id], acteId: null,
      });
      await save<Conversation>("conversations", {
        ...conversation, dernierMessage: corps, dateDernierMessage: horodatage,
      });
    },
    onSuccess: () => {
      ["messages", "conversations"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useCreerConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversation: Conversation) => {
      await save<Conversation>("conversations", conversation);
      return conversation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Annonces — l'accusé de lecture fait l'état de diffusion             */
/* ------------------------------------------------------------------ */

export function useEnregistrerAnnonce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ annonce, utilisateur, creation }: {
      annonce: Annonce; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Annonce>("annonces", annonce);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Annonce", annonce.id, {
        nouvelleValeur: annonce.titre,
        justification: `Diffusion « ${annonce.reference} ».`,
      });
      return annonce;
    },
    onSuccess: () => {
      ["annonces", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useAccuserLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ annonce, utilisateur }: { annonce: Annonce; utilisateur: Utilisateur }) => {
      if (annonce.accuses.some((a) => a.utilisateurId === utilisateur.id)) return annonce;
      const maj: Annonce = {
        ...annonce,
        accuses: [...annonce.accuses, { utilisateurId: utilisateur.id, date: new Date().toISOString() }],
      };
      await save<Annonce>("annonces", maj);
      return maj;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["annonces"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Paramétrage                                                         */
/* ------------------------------------------------------------------ */

export function useParametres() {
  return useQuery<ParametresSysteme | undefined>({
    queryKey: ["parametres"],
    queryFn: async () => (await all<ParametresSysteme>("parametres"))[0],
    staleTime: 60_000,
  });
}

export function useMajParametres() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parametres, utilisateur }: {
      parametres: ParametresSysteme; utilisateur: Utilisateur;
    }) => {
      const maj = { ...parametres, maj: new Date().toISOString() };
      await save<ParametresSysteme>("parametres", maj);
      await journaliser(utilisateur, "MODIFICATION", "Parametres", "PARAMETRES", {
        justification: "Paramétrage du système modifié.",
      });
      return maj;
    },
    onSuccess: () => {
      ["parametres", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}


/* ------------------------------------------------------------------ */
