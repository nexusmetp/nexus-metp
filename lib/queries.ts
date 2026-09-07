"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { all, one, remove, resetDB, save } from "@/lib/db";
import type { Acte, Agent, DemandeConge, Entite, Grade, JournalEntry, Notification, Poste, Utilisateur } from "@/lib/types";

const q = <T,>(key: string, store: any) =>
  useQuery<T[]>({ queryKey: [key], queryFn: () => all<T>(store), staleTime: 60_000 });

export const useAgents = () => q<Agent>("agents", "agents");
export const usePostes = () => q<Poste>("postes", "postes");
export const useActes = () => q<Acte>("actes", "actes");
export const useConges = () => q<DemandeConge>("conges", "conges");
export const useUtilisateurs = () => q<Utilisateur>("utilisateurs", "utilisateurs");
export const useEntites = () => q<Entite>("entites", "entites");
export const useGrades = () => q<Grade>("grades", "grades");
export const useJournal = () => q<JournalEntry>("journal", "journal");
export const useNotifications = () => q<Notification>("notifications", "notifications");

export const useAgent = (id: string) =>
  useQuery<Agent | undefined>({ queryKey: ["agents", id], queryFn: () => one<Agent>("agents", id), enabled: !!id });

export function useSaveRow<T extends { id: string }>(store: string, key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: T) => save<T>(store as any, row),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useDeleteRow(store: string, key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => remove(store as any, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

export function useResetData() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => resetDB(), onSuccess: () => qc.invalidateQueries() });
}
