"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { all, one, remove, resetDB, save, type StoreName } from "@/lib/db";
import { projeterTous, type Historique } from "@/lib/carriere";
import { appliquerTransition, calculerEffets, entreeJournal, type CodeTransition } from "@/lib/actes";
import type {
  Acte, Affectation, Agent, AgentProjete, BesoinPersonnel, Corps, EntreeJournal,
  Entite, Grade, Notification, Position, Poste, SituationCarriere, Utilisateur,
} from "@/lib/types";

const liste = <T,>(store: StoreName) =>
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
export const useJournal = () => liste<EntreeJournal>("journal");
export const useNotifications = () => liste<Notification>("notifications");

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
/* Écriture — cahier §09, §12                                          */
/* ------------------------------------------------------------------ */


/**
 * Fait franchir une étape à un acte.
 *
 * Écrit dans cet ordre : l'acte, le journal, puis — uniquement à la
 * notification — les effets dans le dossier. Rien d'autre dans
 * l'application ne modifie une affectation, une situation ou une position.
 */
export function useTransitionActe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      acte, code, utilisateur, motif,
    }: { acte: Acte; code: CodeTransition; utilisateur: Utilisateur; motif?: string }) => {
      const avant = acte.statut;
      const suivant = appliquerTransition(acte, code, utilisateur, motif);

      await save<Acte>("actes", suivant);
      await save("journal", entreeJournal(suivant, code, utilisateur, avant, motif) as any);

      if (code === "notifier") {
        const [affectations, situations, positions] = await Promise.all([
          all<Affectation>("affectations"),
          all<SituationCarriere>("situations"),
          all<Position>("positions"),
        ]);
        const effets = calculerEffets(suivant, { affectations, situations, positions });
        await Promise.all([
          ...effets.affectationsFermees.map((r) => save("affectations", r)),
          ...effets.affectationsCreees.map((r) => save("affectations", r)),
          ...effets.situationsFermees.map((r) => save("situations", r)),
          ...effets.situationsCreees.map((r) => save("situations", r)),
          ...effets.positionsFermees.map((r) => save("positions", r)),
          ...effets.positionsCreees.map((r) => save("positions", r)),
        ]);
      }
      return suivant;
    },
    onSuccess: () => {
      ["actes", "journal", "affectations", "situations", "positions"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}

/** Dépose un acte neuf en brouillon. */
export function useCreerActe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (acte: Acte) => {
      await save<Acte>("actes", acte);
      return acte;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["actes"] }),
  });
}

/** Les dossiers d'un agent, du plus récent au plus ancien. */
export function useActesDeLAgent(agentId?: string) {
  const { data: actes = [], isLoading } = useActes();
  const data = useMemo(
    () => (agentId ? actes.filter((a) => a.agentId === agentId).sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)) : []),
    [actes, agentId]
  );
  return { data, isLoading };
}
