"use client";

import { appliquerTransition, calculerEffets, entreeJournal } from "@/lib/actes";
import type { CodeTransition } from "@/lib/actes";
import { all, save } from "@/lib/db";
import { hydraterEntites } from "@/lib/referentiels";
import type { Acte, Affectation, Entite, EntreeJournal, Position, SituationCarriere, Utilisateur } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useActes, useEntites } from "./base";

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


/* ------------------------------------------------------------------ */
/* Arborescence vivante — §01                                          */
/* ------------------------------------------------------------------ */

/**
 * Recopie dans le référentiel l'arborescence de la base. Les fonctions de
 * périmètre (`descendantsDe`, `cheminDe`) sont synchrones et servent partout ;
 * les alimenter au démarrage évite d'avoir à les rendre asynchrones.
 */
export function useArbreVivant(): { pret: boolean; entites: Entite[] } {
  const { data: entites = [], isSuccess, isError } = useEntites();
  const charge = isSuccess && entites.length > 0;
  useMemo(() => { if (charge) hydraterEntites(entites); }, [entites, charge]);
  // `pret` inclut l'échec : mieux vaut une application dégradée qu'un écran
  // de chargement perpétuel si la base est inaccessible.
  return { pret: charge || isError, entites };
}
