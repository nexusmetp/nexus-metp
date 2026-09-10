"use client";

import { useMemo } from "react";
import { useActes, useAgentsProjetes, useConges } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { DGARH_ID, descendantsDe, entiteById } from "@/lib/referentiels";
import type { ContexteDocument } from "@/lib/documents";

/**
 * Un sujet d'exemple par source de modèle.
 *
 * Un modèle se juge sur ce qu'il produit, pas sur sa description : la
 * bibliothèque comme le traitement de texte l'ouvrent donc sur un dossier
 * réel — celui de l'utilisateur quand il en a un — plutôt que sur une page
 * de champs vides.
 */
export function useContexteExemple(): ContexteDocument {
  const user = useAuth((s) => s.user);
  const { data: agents = [] } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: conges = [] } = useConges();

  return useMemo<ContexteDocument>(() => {
    const agent = agents.find((a) => a.id === user?.agentId) ?? agents[0];
    const acte = actes.find((a) => a.statut === "SIGNE" || a.statut === "NOTIFIE") ?? actes[0];
    const entite = entiteById(user?.entiteId ?? DGARH_ID) ?? entiteById(DGARH_ID) ?? undefined;
    const conge = conges.find((c) => c.statut === "ACCORDE") ?? conges[0];
    const effectifs = entite
      ? descendantsDe(entite.id)
        .filter((e) => e.parentId === entite.id)
        .map((e) => {
          const branche = descendantsDe(e.id).map((d) => d.id);
          const direct = agents.filter((a) => a.entiteId === e.id).length;
          const total = agents.filter((a) => a.entiteId && branche.includes(a.entiteId)).length;
          return { entite: e, direct, total };
        })
      : [];
    return {
      agent, acte, entite, conge, effectifs,
      saisie: {
        objet: "Objet à préciser",
        corps: "Corps de la note à rédiger.",
        destinataire: "Tous services",
      },
      signataire: { nom: user?.nomComplet },
    };
  }, [agents, actes, conges, user]);
}
