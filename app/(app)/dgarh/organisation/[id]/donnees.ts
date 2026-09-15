"use client";

/**
 * Ce qu'il faut savoir d'une structure, rassemblé une fois.
 *
 * La page dit ce qu'elle montre, ce fichier dit comment on l'obtient. Tout se
 * calcule sur la **branche** — l'entité et ce qui en dépend — parce que c'est
 * ainsi qu'un directeur pense sa maison : il ne distingue pas son bureau de
 * ses bureaux quand on lui demande son effectif.
 *
 * Le périmètre du lecteur borne l'accès à la fiche elle-même, pas les calculs
 * qu'elle contient : on ouvre la fiche d'une structure qu'on a le droit de
 * voir, et on y voit alors tout ce qui la concerne.
 */

import { useMemo } from "react";
import {
  NIVEAUX_DE_COMMANDEMENT, STATUTS_EN_COURS, cheminDe, descendantsDe, enfantsDe,
  entiteById,
} from "@/lib/referentiels";
import { joursDepuis } from "@/lib/format";
import {
  useActes, useAgentsProjetes, useConges, usePostes, useTickets, useUtilisateurs,
} from "@/lib/queries";
import type { AgentProjete, Entite } from "@/lib/types";

/** Un point qui appelle une décision, avec ce qu'on peut en faire. */
export interface PointAttention {
  cle: string;
  gravite: "alerte" | "veille";
  titre: string;
  detail: string;
  lien?: string;
}

const HORS_SERVICE = ["DISPONIBILITE", "DETACHEMENT", "MISE_A_DISPOSITION", "SUSPENSION"];

export function useFicheStructure(entite: Entite | null) {
  const { data: agents, pret } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: postes = [] } = usePostes();
  const { data: conges = [] } = useConges();
  const { data: tickets = [] } = useTickets();
  const { data: comptes = [] } = useUtilisateurs();

  return useMemo(() => {
    if (!entite) return null;

    const branche = descendantsDe(entite.id);
    const ids = new Set(branche.map((e) => e.id));
    const population = agents.filter((a) => a.entiteId && ids.has(a.entiteId));
    const enPropre = agents.filter((a) => a.entiteId === entite.id);

    const compter = <T,>(liste: T[], cle: (x: T) => string) => {
      const m = new Map<string, number>();
      liste.forEach((x) => m.set(cle(x), (m.get(cle(x)) ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    const postesBranche = postes.filter((p) => ids.has(p.entiteId));
    const vacants = postesBranche.filter((p) => p.statut === "VACANT");
    const dossiers = actes.filter((a) => ids.has(a.entiteInstructriceId));
    const ouverts = dossiers.filter((a) => STATUTS_EN_COURS.includes(a.statut));
    const horsDelai = ouverts.filter((a) => joursDepuis(a.dateCreation) > 15);
    const clos = dossiers.filter((a) => a.dateSignature);
    const reclamations = tickets.filter(
      (t) => ids.has(t.entiteId) && !["RESOLU", "CLOS"].includes(t.statut));

    /* « En congé » se lit au présent. Compter tous les congés accordés depuis
       l'ouverture du registre donnait quarante absents sur cinquante-neuf
       agents dont cinquante-cinq en activité : un chiffre que rien ne soutient.
       On ne retient que ceux qui couvrent aujourd'hui. */
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const agentsBranche = new Set(population.map((a) => a.id));
    const congesEnCours = conges.filter(
      (c) => agentsBranche.has(c.agentId)
        && (c.statut === "ACCORDE" || c.statut === "PRIS")
        && c.dateDebut <= aujourdhui && c.dateFin >= aujourdhui);

    /* Les chefs, et les entités qui n'en ont pas. Le commandement se lit dans
       le compte en vigueur, jamais dans un champ « chef » stocké à part. */
    const chefDe = new Map<string, typeof comptes[number]>();
    comptes.filter((c) => c.actif !== false).forEach((c) => {
      if (ids.has(c.entiteId) && c.role !== "AGENT" && !chefDe.has(c.entiteId)) {
        chefDe.set(c.entiteId, c);
      }
    });

    const enfants = enfantsDe(entite.id).map((e) => {
      const sous = new Set(descendantsDe(e.id).map((d) => d.id));
      const pop = agents.filter((a) => a.entiteId && sous.has(a.entiteId));
      return {
        entite: e,
        effectif: pop.length,
        entites: sous.size,
        chef: chefDe.get(e.id)?.nomComplet,
        vacants: postes.filter((p) => sous.has(p.entiteId) && p.statut === "VACANT").length,
        ouverts: actes.filter((a) =>
          sous.has(a.entiteInstructriceId) && STATUTS_EN_COURS.includes(a.statut)).length,
      };
    }).sort((a, b) => b.effectif - a.effectif);

    const completude = population.length
      ? Math.round(population.reduce((s, a) => s + a.tauxCompletude, 0) / population.length)
      : null;

    /* Ce qui appelle une décision, et rien d'autre. Un tableau qui liste tout
       ne se lit plus : on ne retient que ce dont le chiffre n'est pas zéro. */
    const attention: PointAttention[] = [];
    if (horsDelai.length) attention.push({
      cle: "delai", gravite: "alerte",
      titre: `${horsDelai.length} dossier${horsDelai.length > 1 ? "s" : ""} au-delà du délai cible`,
      detail: "Au-delà de quinze jours, c'est un agent qui attend un acte.",
      lien: "/dgarh/bannette",
    });
    if (vacants.length) attention.push({
      cle: "vacants", gravite: "alerte",
      titre: `${vacants.length} poste${vacants.length > 1 ? "s" : ""} vacant${vacants.length > 1 ? "s" : ""}`,
      detail: "Un poste vacant se pourvoit par un état de besoins, puis par un acte.",
      lien: `/postes?entite=${entite.id}&statut=VACANT`,
    });
    /* Le bureau est la maille terminale : son chef relève du service, et
       l'inscrire ici noierait le signal — même règle qu'au tableau de bord,
       et la liste qui la porte est dans `grammaire.ts`. */
    const sansChef = branche.filter((e) =>
      !chefDe.has(e.id) && e.id !== entite.id
      && NIVEAUX_DE_COMMANDEMENT.includes(e.niveau));
    if (sansChef.length) attention.push({
      cle: "chefs", gravite: "veille",
      titre: `${sansChef.length} entité${sansChef.length > 1 ? "s" : ""} sans responsable désigné`,
      detail: sansChef.slice(0, 6).map((e) => e.sigle).join(", ")
        + (sansChef.length > 6 ? `, et ${sansChef.length - 6} autres.` : "."),
      lien: "/dgarh/organisation",
    });
    if (reclamations.length) attention.push({
      cle: "reclamations", gravite: "veille",
      titre: `${reclamations.length} réclamation${reclamations.length > 1 ? "s" : ""} ouverte${reclamations.length > 1 ? "s" : ""}`,
      detail: "Une réclamation non traitée revient en contentieux.",
      lien: "/tickets",
    });
    const incomplets = population.filter((a) => a.tauxCompletude < 60);
    if (incomplets.length) attention.push({
      cle: "dossiers", gravite: "veille",
      titre: `${incomplets.length} dossier${incomplets.length > 1 ? "s" : ""} sous 60 % de pièces`,
      detail: "Un dossier sans pièce se bloque au premier contrôle.",
      lien: `/dgarh/agents?entite=${entite.id}`,
    });

    return {
      pret,
      chaine: cheminDe(entite.id),
      parent: entite.parentId ? entiteById(entite.parentId) : undefined,
      branche,
      enfants,
      chef: chefDe.get(entite.id),
      population,
      effectif: population.length,
      enPropre: enPropre.length,
      parCategorie: compter(population, (a: AgentProjete) => a.categorie),
      parPosition: compter(population, (a: AgentProjete) => a.nature),
      enActivite: population.filter((a) => a.nature === "ACTIVITE").length,
      horsService: population.filter((a) => HORS_SERVICE.includes(a.nature)).length,
      enConge: congesEnCours.length,
      enseignants: population.filter((a) => a.enseignant).length,
      femmes: population.filter((a) => a.sexe === "F").length,
      /* `null` et non zéro : « âge moyen 0 an » se lit comme une mesure, alors
         qu'il n'y a rien à mesurer. L'écran doit pouvoir dire lequel des deux. */
      ageMoyen: population.length
        ? Math.round(population.reduce((s, a) => s + a.age, 0) / population.length)
        : null,
      departsProches: population.filter((a) => a.age >= 58).length,
      postes: postesBranche.length,
      vacants: vacants.length,
      ouverts: ouverts.length,
      horsDelai: horsDelai.length,
      /* Aucun dossier signé dans la branche : le délai moyen n'existe pas, il
         ne vaut pas zéro. Afficher « 0 j » ferait croire à une instruction
         immédiate là où rien n'a encore été instruit. */
      delaiMoyen: clos.length
        ? Math.round(clos.reduce((s, a) =>
          s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5, 0) / clos.length)
        : null,
      clos: clos.length,
      completude,
      attention,
    };
  }, [entite, agents, actes, postes, conges, tickets, comptes, pret]);
}

export type FicheStructure = NonNullable<ReturnType<typeof useFicheStructure>>;
