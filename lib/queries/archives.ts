"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { save } from "@/lib/db";
import type {
  ArticleArchive, CommunicationArchive, Utilisateur, Versement,
} from "@/lib/types";
import { journaliser, nouvelId } from "./audit";

/* ------------------------------------------------------------------ */
/* Archives — §14                                                       */
/* ------------------------------------------------------------------ */

/**
 * Écritures du service des archives.
 *
 * Toutes journalisées, sans exception : un article qui disparaît du rayon
 * sans trace de qui l'a sorti est un fonds qu'on ne peut plus certifier.
 */

export function useEnregistrerVersement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ versement, articles, utilisateur, creation }: {
      versement: Versement;
      articles?: ArticleArchive[];
      utilisateur: Utilisateur;
      creation: boolean;
    }) => {
      await save<Versement>("versements", versement);
      if (articles?.length) {
        await Promise.all(articles.map((a) => save<ArticleArchive>("articlesArchives", a)));
      }
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Versement", versement.id, {
        nouvelleValeur: versement.statut,
        justification: `${versement.reference} — ${versement.intitule}`,
      });
      return versement;
    },
    onSuccess: () => {
      ["versements", "articlesArchives", "journal"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}

export function useEnregistrerArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ article, utilisateur, creation }: {
      article: ArticleArchive; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<ArticleArchive>("articlesArchives", article);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Article d'archives", article.id, {
        nouvelleValeur: article.statut,
        justification: `${article.cote} — ${article.intitule}`,
      });
      return article;
    },
    onSuccess: () => {
      ["articlesArchives", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/**
 * Élimination.
 *
 * Le statut de l'article change, la fiche reste : on doit pouvoir prouver
 * plus tard ce qui a été détruit, quand, et sur quel visa. Un fonds où la
 * destruction efface aussi la mention de la destruction n'est pas auditable.
 */
export function useEliminerArticles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ articles, utilisateur, visa }: {
      articles: ArticleArchive[]; utilisateur: Utilisateur; visa: string;
    }) => {
      const elimines = articles.map((a) => ({ ...a, statut: "ELIMINE" as const, emplacement: undefined }));
      await Promise.all(elimines.map((a) => save<ArticleArchive>("articlesArchives", a)));
      await Promise.all(elimines.map((a) =>
        journaliser(utilisateur, "MODIFICATION", "Article d'archives", a.id, {
          ancienneValeur: "EN_RAYON", nouvelleValeur: "ELIMINE",
          justification: `Éliminé sur bordereau visé — ${visa}`,
        })
      ));
      return elimines;
    },
    onSuccess: () => {
      ["articlesArchives", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useCommuniquerArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ article, communication, utilisateur }: {
      article: ArticleArchive;
      communication: Omit<CommunicationArchive, "id"> & { id?: string };
      utilisateur: Utilisateur;
    }) => {
      const com: CommunicationArchive = { ...communication, id: communication.id ?? nouvelId("COM") };
      await save<CommunicationArchive>("communications", com);
      const suivant: ArticleArchive = {
        ...article,
        statut: com.statut === "RESTITUEE" ? "EN_RAYON" : "COMMUNIQUE",
      };
      await save<ArticleArchive>("articlesArchives", suivant);
      await journaliser(utilisateur, "CONSULTATION", "Article d'archives", article.id, {
        nouvelleValeur: com.statut,
        justification: `${article.cote} — ${com.motif}`,
      });
      return com;
    },
    onSuccess: () => {
      ["communications", "articlesArchives", "journal"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}
