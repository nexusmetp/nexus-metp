"use client";

/**
 * Brouillons et échanges avec l'assistant.
 *
 * Le journal d'audit ne reçoit que deux gestes : l'ouverture d'un brouillon
 * et son arrêt. Y consigner chaque frappe noierait les traces qui comptent —
 * celles qui touchent au dossier d'un agent — sous le bruit d'un traitement
 * de texte.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { all, remove, save } from "@/lib/db";
import { journaliser } from "./audit";
import { assainir, porterMention, titreDeduit } from "@/lib/redaction";
import type {
  Brouillon, ConversationIA, EchangeIA, ModeleMaison, Utilisateur, VersionBrouillon,
  VersionModele,
} from "@/lib/types";

const MAX_VERSIONS = 10;

export const useBrouillons = () =>
  useQuery<Brouillon[]>({
    queryKey: ["brouillons"],
    queryFn: async () => (await all<Brouillon>("brouillons"))
      .sort((a, b) => b.dateMaj.localeCompare(a.dateMaj)),
    staleTime: 5_000,
  });

export function useEnregistrerBrouillon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ brouillon, utilisateur, version, creation }: {
      brouillon: Brouillon;
      utilisateur: Utilisateur;
      /** Étape à retenir dans l'historique. Absente : simple sauvegarde. */
      version?: Pick<VersionBrouillon, "origine" | "resume">;
      creation?: boolean;
    }) => {
      const contenu = assainir(brouillon.contenu);
      const maj: Brouillon = {
        ...brouillon,
        contenu,
        titre: brouillon.titre.trim() || titreDeduit(contenu),
        dateMaj: new Date().toISOString(),
        versions: version
          ? [{
            horodatage: new Date().toISOString(),
            auteur: utilisateur.nomComplet,
            origine: version.origine,
            resume: version.resume,
            contenu,
          }, ...brouillon.versions].slice(0, MAX_VERSIONS)
          : brouillon.versions,
      };
      await save<Brouillon>("brouillons", maj);
      if (creation) {
        await journaliser(utilisateur, "CREATION", "Brouillon", maj.id, {
          justification: `Ouverture du brouillon « ${maj.titre} ».`,
        });
      }
      return maj;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["brouillons"] });
      if (v.creation) qc.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

/**
 * Arrêter un brouillon : le rédacteur déclare le texte abouti.
 *
 * C'est le seul geste du module qui laisse une trace nominative, parce que
 * c'est le seul qui engage — la pièce peut désormais partir à la signature.
 */
export function useArreterBrouillon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ brouillon, utilisateur }: { brouillon: Brouillon; utilisateur: Utilisateur }) => {
      const maj: Brouillon = {
        ...brouillon,
        contenu: porterMention(assainir(brouillon.contenu), brouillon.assiste),
        statut: "ARRETE",
        dateMaj: new Date().toISOString(),
      };
      await save<Brouillon>("brouillons", maj);
      await journaliser(utilisateur, "VALIDATION", "Brouillon", maj.id, {
        justification: `Brouillon arrêté : « ${maj.titre} »`
          + (maj.assiste ? " — rédigé avec l'assistance d'un modèle de langage." : "."),
      });
      return maj;
    },
    onSuccess: () => {
      ["brouillons", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useSupprimerBrouillon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await remove("brouillons", id); return id; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brouillons"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Échanges avec l'assistant                                           */
/* ------------------------------------------------------------------ */

export const useConversationsIA = () =>
  useQuery<ConversationIA[]>({
    queryKey: ["conversationsIA"],
    queryFn: async () => (await all<ConversationIA>("conversationsIA"))
      .sort((a, b) => b.dateMaj.localeCompare(a.dateMaj)),
    staleTime: 5_000,
  });

export const useEchangesIA = () =>
  useQuery<EchangeIA[]>({
    queryKey: ["echangesIA"],
    queryFn: async () => (await all<EchangeIA>("echangesIA"))
      .sort((a, b) => a.horodatage.localeCompare(b.horodatage)),
    staleTime: 2_000,
  });

export function useConsignerEchange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ echange, conversation }: {
      echange: EchangeIA; conversation: ConversationIA;
    }) => {
      await save<ConversationIA>("conversationsIA", { ...conversation, dateMaj: echange.horodatage });
      await save<EchangeIA>("echangesIA", echange);
      return echange;
    },
    onSuccess: () => {
      ["echangesIA", "conversationsIA"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/** Effacer un fil : un échange avec l'assistant n'est pas une archive. */
export function useEffacerConversationIA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const echanges = await all<EchangeIA>("echangesIA");
      await Promise.all(echanges
        .filter((e) => e.conversationId === conversationId)
        .map((e) => remove("echangesIA", e.id)));
      await remove("conversationsIA", conversationId);
      return conversationId;
    },
    onSuccess: () => {
      ["echangesIA", "conversationsIA"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Modèles écrits par la maison                                        */
/* ------------------------------------------------------------------ */

export const useModelesMaison = () =>
  useQuery<ModeleMaison[]>({
    queryKey: ["modelesMaison"],
    queryFn: async () => (await all<ModeleMaison>("modelesMaison"))
      .sort((a, b) => a.libelle.localeCompare(b.libelle)),
    staleTime: 5_000,
  });

/**
 * Déposer un modèle dans la bibliothèque.
 *
 * Le geste est journalisé, contrairement à l'enregistrement d'un brouillon :
 * un modèle partagé sert à toute la DGARH, et une forme fautive se répand
 * alors sur toutes les pièces établies après lui.
 */
export function useEnregistrerModeleMaison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ modele, utilisateur, creation, resume }: {
      modele: ModeleMaison; utilisateur: Utilisateur; creation: boolean;
      /** Ce qui a changé — porté à l'historique du modèle. */
      resume?: string;
    }) => {
      const contenu = assainir(modele.contenu);
      const version: VersionModele = {
        horodatage: new Date().toISOString(),
        auteur: utilisateur.nomComplet,
        resume: resume ?? (creation ? "Modèle déposé." : "Modèle repris."),
        contenu,
        libelle: modele.libelle,
      };
      const maj: ModeleMaison = {
        ...modele,
        contenu,
        dateMaj: version.horodatage,
        versions: [version, ...(modele.versions ?? [])].slice(0, MAX_VERSIONS),
      };
      await save<ModeleMaison>("modelesMaison", maj);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "ModeleMaison", maj.id, {
        justification: `Modèle « ${maj.libelle} » ${creation ? "déposé" : "modifié"}`
          + `${maj.partage ? " — ouvert à tout le ministère." : " — réservé à son auteur."}`,
      });
      return maj;
    },
    onSuccess: () => {
      ["modelesMaison", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useSupprimerModeleMaison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ modele, utilisateur }: { modele: ModeleMaison; utilisateur: Utilisateur }) => {
      await remove("modelesMaison", modele.id);
      await journaliser(utilisateur, "MODIFICATION", "ModeleMaison", modele.id, {
        justification: `Modèle « ${modele.libelle} » retiré de la bibliothèque.`,
      });
      return modele.id;
    },
    onSuccess: () => {
      ["modelesMaison", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
