"use client";

/**
 * Le point d'accès des écrans à l'assistant.
 *
 * Un seul crochet, qui répond d'abord à la question que toute l'interface
 * se pose : l'assistant est-il là ? Tant qu'il ne l'est pas, aucun bouton
 * ne s'affiche — plutôt qu'un bouton qui échoue une fois sur deux.
 */

import { useCallback, useMemo, useState } from "react";
import { useParametres } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { appelerIA, type MessageIA, type OptionsAppel } from "./client";
import { iaConfiguree } from "./reglages";
import { ErreurIA, CONSEIL } from "./erreurs";
import {
  inviteAssistant, inviteRedaction, inviteRetouche, inviteVisas, type ActionTexte,
} from "./invites";

/** Message d'échec prêt à afficher : ce qui s'est passé, puis quoi faire. */
export function messageErreur(e: unknown): string {
  if (e instanceof ErreurIA) return `${e.message} ${CONSEIL[e.code]}`;
  if (e instanceof Error && e.name === "AbortError") return "Demande interrompue.";
  return "L'assistant n'a pas pu répondre.";
}

export function useIA() {
  const { data: parametres } = useParametres();
  const user = useAuth((s) => s.user);
  const [occupe, setOccupe] = useState(false);

  const reglages = parametres?.ia;
  const prete = iaConfiguree(reglages);

  const appeler = useCallback(async (messages: MessageIA[], o: OptionsAppel = {}) => {
    if (!iaConfiguree(reglages)) {
      throw new ErreurIA("L'assistant n'est pas configuré.", "hors-service");
    }
    setOccupe(true);
    try {
      return await appelerIA(reglages, messages, o);
    } finally {
      setOccupe(false);
    }
  }, [reglages]);

  const outils = useMemo(() => ({
    /** Dialogue libre, situé sur l'écran d'où la question est posée. */
    dialoguer: (messages: MessageIA[], ecran?: string, signal?: AbortSignal) =>
      appeler(messages, { systeme: user ? inviteAssistant(user, ecran) : undefined, signal }),

    /** Projet de pièce entière, rendu en HTML simple. */
    rediger: (consigne: string, modele?: string, jetons?: string[], signal?: AbortSignal) =>
      appeler([{ role: "user", contenu: consigne }], {
        systeme: user ? inviteRedaction(user, modele, jetons) : undefined, signal, maxJetons: 2400,
      }),

    /** Retouche d'un passage : la réponse remplacera la sélection. */
    retoucher: (action: ActionTexte, passage: string, signal?: AbortSignal) =>
      appeler([{ role: "user", contenu: passage }], { systeme: inviteRetouche(action), signal }),

    /** Visas puisés dans le seul fonds réglementaire de la plateforme. */
    proposerVisas: (projet: string, fonds: string[], signal?: AbortSignal) =>
      appeler([{ role: "user", contenu: projet }], { systeme: inviteVisas(fonds), signal }),
  }), [appeler, user]);

  return { reglages, prete, occupe, ...outils };
}
