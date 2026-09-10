"use client";

/**
 * Séries du tableau de bord.
 *
 * Sorties du composant : la page dit ce qu'elle montre, ce fichier dit
 * comment on l'obtient. Chaque série est projetée depuis les actes, jamais
 * lue telle quelle — c'est ce qui garantit qu'un chiffre affiché ici et un
 * dossier ouvert ailleurs racontent la même chose.
 */

import { useMemo } from "react";
import {
  CABINET_ID, DGARH_ID, ENTITES, METP_ID, POSITION_LABELS, REGLES_CATEGORIE, STATUTS_EN_COURS,
  cheminDe, descendantsDe, enfantsDe, entiteById, typeActeById,
} from "@/lib/referentiels";
import { joursDepuis } from "@/lib/format";
import { useActes, useAgentsProjetes, useTickets, useUtilisateurs } from "@/lib/queries";
import type { Acte, AgentProjete } from "@/lib/types";

export function useTableauDeBord() {
  const { data: agents, pret } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: tickets = [] } = useTickets();
  const { data: comptes = [] } = useUtilisateurs();

const effectif = useMemo(() => {
    const direct = new Map<string, number>();
    agents.forEach((a) => a.entiteId && direct.set(a.entiteId, (direct.get(a.entiteId) ?? 0) + 1));
    const total = (id: string) => descendantsDe(id).reduce((s, e) => s + (direct.get(e.id) ?? 0), 0);
    return { direct, total };
  }, [agents]);

  const stats = useMemo(() => {
    const ouverts = actes.filter((a) => STATUTS_EN_COURS.includes(a.statut));
    const clos = actes.filter((a) => a.dateSignature);
    return {
      ministere: agents.length,
      dgarh: effectif.total(DGARH_ID),
      cabinet: effectif.total(CABINET_ID),
      enseignants: agents.filter((a) => a.enseignant).length,
      ouverts: ouverts.length,
      horsDelai: ouverts.filter((a) => joursDepuis(a.dateCreation) > 15).length,
      delaiMoyen: clos.length
        ? Math.round(clos.reduce((s, a) =>
            s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5, 0) / clos.length)
        : 0,
      reclamations: tickets.filter((t) => !["RESOLU", "CLOS"].includes(t.statut)).length,
      completude: agents.length
        ? Math.round(agents.reduce((s, a) => s + a.tauxCompletude, 0) / agents.length)
        : 0,
      incomplets: agents.filter((a) => a.tauxCompletude < 60).length,
    };
  }, [agents, actes, tickets, effectif]);

  /* La structure du ministère : ce qui pend directement au ministère. */
  const structure = useMemo(() => enfantsDe(METP_ID)
    .map((e) => ({
      entite: e,
      effectif: effectif.total(e.id),
      entites: descendantsDe(e.id).length,
      responsable: comptes.find((c) => c.entiteId === e.id)?.nomComplet,
      ouverts: actes.filter((a) =>
        descendantsDe(e.id).some((x) => x.id === a.entiteInstructriceId)
        && STATUTS_EN_COURS.includes(a.statut)).length,
    }))
    .sort((a, b) => b.effectif - a.effectif), [effectif, comptes, actes]);

  /* Effectifs par direction — le chiffre que le directeur général réclame. */
  const parDirection = useMemo(() => ENTITES
    .filter((e) => ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "INSPECTION_GENERALE", "SECRETARIAT"].includes(e.niveau))
    .filter((e) => e.actif !== false && cheminDe(e.id).length <= 3)
    .map((e) => ({ id: e.id, nom: e.sigle, intitule: e.nom, effectif: effectif.total(e.id) }))
    .filter((d) => d.effectif > 0)
    .sort((a, b) => b.effectif - a.effectif)
    .slice(0, 10), [effectif]);

  const parDepartement = useMemo(() => ENTITES
    .filter((e) => e.niveau === "DIRECTION_DEPARTEMENTALE" && e.actif !== false)
    .map((e) => ({ id: e.id, nom: e.ville ?? e.sigle, effectif: effectif.total(e.id) }))
    .filter((d) => d.effectif > 0)
    .sort((a, b) => b.effectif - a.effectif), [effectif]);

  const parCategorie = useMemo(() => {
    const m = new Map<string, number>();
    agents.forEach((a) => m.set(a.categorie, (m.get(a.categorie) ?? 0) + 1));
    return [...m.entries()]
      .map(([k, v]) => ({ nom: REGLES_CATEGORIE[k as keyof typeof REGLES_CATEGORIE]?.libelle ?? k, valeur: v, cle: k }))
      .sort((a, b) => b.valeur - a.valeur);
  }, [agents]);

  const parPosition = useMemo(() => {
    const m = new Map<string, number>();
    agents.forEach((a) => m.set(a.nature, (m.get(a.nature) ?? 0) + 1));
    return [...m.entries()]
      .map(([k, v]) => ({ cle: k, nom: POSITION_LABELS[k as keyof typeof POSITION_LABELS] ?? k, valeur: v }))
      .sort((a, b) => b.valeur - a.valeur);
  }, [agents]);

  /* Pyramide des âges — ce qui dit si le ministère prépare sa relève. */
  const pyramide = useMemo(() => {
    const tranches = [
      { nom: "moins de 30", min: 0, max: 29 },
      { nom: "30 à 39", min: 30, max: 39 },
      { nom: "40 à 49", min: 40, max: 49 },
      { nom: "50 à 54", min: 50, max: 54 },
      { nom: "55 à 59", min: 55, max: 59 },
      { nom: "60 et plus", min: 60, max: 200 },
    ];
    return tranches.map((t) => ({
      nom: t.nom,
      hommes: agents.filter((a) => a.sexe === "M" && a.age >= t.min && a.age <= t.max).length,
      femmes: agents.filter((a) => a.sexe === "F" && a.age >= t.min && a.age <= t.max).length,
    }));
  }, [agents]);

  const parTypeActe = useMemo(() => {
    const m = new Map<string, number>();
    actes.filter((a) => STATUTS_EN_COURS.includes(a.statut))
      .forEach((a) => m.set(a.type, (m.get(a.type) ?? 0) + 1));
    return [...m.entries()]
      .map(([k, v]) => ({ nom: typeActeById(k as any)?.libelle ?? k, valeur: v }))
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, 8);
  }, [actes]);

  /* Départs à la retraite prévisibles : 60 ans, borne usuelle de la fonction publique. */
  const departsProches = useMemo(() => agents.filter((a) => a.age >= 58 && a.age < 60).length, [agents]);

  return {
    pret, agents, actes, tickets, comptes,
    effectif, stats, structure, parDirection, parDepartement,
    parCategorie, parPosition, pyramide, parTypeActe, departsProches,
  };
}
