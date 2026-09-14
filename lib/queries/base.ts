"use client";

import { projeterTous } from "@/lib/carriere";
import type { Historique } from "@/lib/carriere";
import { all, one, remove, resetDB, save } from "@/lib/db";
import type { StoreName } from "@/lib/db";
import type { Acte, Affectation, Agent, AgentProjete, Annonce, BesoinPersonnel, CampagneRecrutement, Candidature, CarteProfessionnelle, Conge, Conversation, Corps, Delegation, DocumentEmis, Entite, EntreeJournal, Grade, InscriptionFormation, Message, MessageTicket, Notification, OffreFormation, Position, Poste, SituationCarriere, TexteReglementaire, Ticket, Utilisateur, Versement, ArticleArchive, CommunicationArchive, ProfilAcces } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

/** Lecture d'un tiroir entier. Partagée par les modules de requêtes. */
export const liste = <T,>(store: StoreName) =>
  useQuery<T[]>({ queryKey: [store], queryFn: () => all<T>(store), staleTime: 60_000 });

export const useEntites = () => liste<Entite>("entites");
export const useCorps = () => liste<Corps>("corps");
export const useGrades = () => liste<Grade>("grades");
export const usePostes = () => liste<Poste>("postes");
export const useAgents = () => liste<Agent>("agents");
export const useSituations = () => liste<SituationCarriere>("situations");
export const useAffectations = () => liste<Affectation>("affectations");
export const usePositions = () => liste<Position>("positions");
export const useActes = () => liste<Acte>("actes");
export const useBesoins = () => liste<BesoinPersonnel>("besoins");
export const useUtilisateurs = () => liste<Utilisateur>("utilisateurs");
export const useProfils = () => liste<ProfilAcces>("profils");
export const useJournal = () => liste<EntreeJournal>("journal");
export const useNotifications = () => liste<Notification>("notifications");
export const useTickets = () => liste<Ticket>("tickets");
export const useMessagesTicket = () => liste<MessageTicket>("messagesTicket");
export const useConversations = () => liste<Conversation>("conversations");
export const useMessages = () => liste<Message>("messages");
export const useAnnonces = () => liste<Annonce>("annonces");
export const useConges = () => liste<Conge>("conges");
export const useDelegations = () => liste<Delegation>("delegations");
export const useTextes = () => liste<TexteReglementaire>("textes");
export const useCampagnes = () => liste<CampagneRecrutement>("campagnes");
export const useCandidatures = () => liste<Candidature>("candidatures");
export const useOffresFormation = () => liste<OffreFormation>("offresFormation");
export const useInscriptions = () => liste<InscriptionFormation>("inscriptions");
export const useCartes = () => liste<CarteProfessionnelle>("cartes");
export const useDocumentsEmis = () => liste<DocumentEmis>("documents");
export const useVersements = () => liste<Versement>("versements");
export const useArticlesArchives = () => liste<ArticleArchive>("articlesArchives");
export const useCommunications = () => liste<CommunicationArchive>("communications");

export const useAgent = (id: string) =>
  useQuery<Agent | undefined>({ queryKey: ["agents", id], queryFn: () => one<Agent>("agents", id), enabled: !!id });

/**
 * Population projetée à une date. L'état courant est calculé, jamais lu. §15
 * `pret` distingue « aucun agent » de « pas encore chargé ».
 */
export function useAgentsProjetes(date?: string) {
  const agents = useAgents();
  const situations = useSituations();
  const affectations = useAffectations();
  const positions = usePositions();

  const pret = !agents.isLoading && !situations.isLoading && !affectations.isLoading && !positions.isLoading;

  const data = useMemo<AgentProjete[]>(() => {
    if (!pret) return [];
    const h: Historique = {
      situations: situations.data ?? [],
      affectations: affectations.data ?? [],
      positions: positions.data ?? [],
    };
    return projeterTous(agents.data ?? [], h, date);
  }, [pret, agents.data, situations.data, affectations.data, positions.data, date]);

  return { data, pret, isLoading: !pret };
}

export function useHistorique(): { data: Historique; pret: boolean } {
  const situations = useSituations();
  const affectations = useAffectations();
  const positions = usePositions();
  const pret = !situations.isLoading && !affectations.isLoading && !positions.isLoading;
  return {
    pret,
    data: {
      situations: situations.data ?? [],
      affectations: affectations.data ?? [],
      positions: positions.data ?? [],
    },
  };
}

export function useSaveRow<T extends { id: string }>(store: StoreName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: T) => save<T>(store, row),
    onSuccess: () => qc.invalidateQueries({ queryKey: [store] }),
  });
}

export function useDeleteRow(store: StoreName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => remove(store, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [store] }),
  });
}

export function useResetData() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => resetDB(), onSuccess: () => qc.invalidateQueries() });
}

/* ------------------------------------------------------------------ */
