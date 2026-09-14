"use client";

import { all, save } from "@/lib/db";
import {
  ADMINISTRATION_MINISTERIELLE, PROFILS_TECHNIQUES, creeUnCycle, dansPerimetre,
  descendantsDe, habilitationsEnVigueur, hydraterEntites, libelleProfil,
  niveauxApprobation, peutHabiliter, verdictRattachement,
} from "@/lib/referentiels";
import type {
  Acte, Affectation, Agent, Entite, Habilitation, ParametresSysteme, Position,
  SituationCarriere, Utilisateur,
} from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motDePasseProvisoire, verdictMotDePasse } from "@/lib/acces/motdepasse";
import { journaliser, nouvelId } from "./audit";

/* Organisation — l'administrateur crée les directions                 */
/* ------------------------------------------------------------------ */

/**
 * L'adresse d'un agent, unique dans tout le ministère.
 *
 * Les homonymes sont nombreux dans un fichier de deux mille agents. On
 * désambiguïse par le matricule, comme le fait une messagerie
 * administrative : un numéro d'ordre ne dirait rien à personne, et une
 * adresse en double empêcherait purement et simplement quelqu'un d'entrer.
 */
export function courrielDe(agent: Agent, pris: Set<string>): string {
  const net = (s: string) => s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  const base = `${net(agent.prenom)}.${net(agent.nom)}`;
  const cle = pris.has(base) ? `${base}.${agent.matricule.replace(/\D/g, "")}` : base;
  return `${cle}@metp.gouv.cg`;
}

/**
 * L'organisation n'est plus le domaine réservé de deux profils.
 *
 * Chaque chef crée et réorganise **dans son périmètre** : c'est ce qui permet
 * à la chaîne de descendre jusqu'au bureau, sans que l'administrateur système
 * ait à connaître le découpage de chaque service. Mais le périmètre doit alors
 * être vérifié ici, à l'écriture — une liste déroulante restreinte n'est pas
 * une règle, c'est une commodité d'affichage, et une adresse tapée à la main
 * la contourne.
 *
 * Deux vérifications, et elles sont distinctes. **L'entité elle-même** doit
 * relever de l'auteur — sans quoi un chef de service modifierait une direction
 * voisine. Et **son rattachement** doit y relever aussi : accrocher son propre
 * service directement au ministère élargirait son périmètre d'un seul geste,
 * ce qui est l'élévation de privilège par le plus court chemin.
 */
export function useEnregistrerEntite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entite, utilisateur, creation }: {
      entite: Entite; utilisateur: Utilisateur; creation: boolean;
    }) => {
      /* La grammaire de l'organigramme s'applique à tout le monde, profil
         technique compris. Ce n'est pas un privilège qu'on pourrait lever :
         c'est le texte d'organisation du ministère. Un administrateur qui
         poserait une direction générale sous un bureau ne se donnerait aucun
         pouvoir — il fausserait seulement tous les périmètres calculés en
         dessous, sans que rien à l'écran ne le dise. */
      const verdict = verdictRattachement(entite.niveau, entite.parentId);
      if (!verdict.ok) throw new Error(verdict.motif ?? "Rattachement non conforme.");

      /* Le texte qui fonde, obligatoire pour les structures que le ministre
         approuve par ailleurs.
         C'est le pendant de l'approbation des nominations, et c'est un
         contrôle plus sûr qu'une file d'attente : une direction ne naît pas
         d'une décision de service, elle naît d'un décret ou d'un arrêté. En
         exiger la référence à la création évite d'avoir à démêler, six mois
         plus tard, lesquelles des cent cinquante et une entités reposent sur
         un texte et lesquelles sur une saisie. Au-dessous du seuil — service,
         bureau, secrétariat — l'organisation interne relève du chef, et la
         provenance reste « recommandation » sans que cela bloque rien. */
      const parametresOrg = (await all<ParametresSysteme>("parametres"))[0];
      if (niveauxApprobation(parametresOrg).includes(entite.niveau)
        && !entite.reference?.trim()) {
        throw new Error(
          `Créer une entité de niveau « ${entite.niveau} » demande le texte qui la fonde : `
          + "décret, arrêté ou décision d'organisation, avec son numéro et sa date. "
          + "Un service ou un bureau s'ouvre sans cela ; une direction, non."
        );
      }
      if (!creation && creeUnCycle(entite.id, entite.parentId)) {
        throw new Error("Une entité ne peut pas être rattachée à l'une de celles qu'elle contient.");
      }

      /* Le périmètre d'administration, non l'entité de rattachement : le
         directeur général de la DGARH crée partout dans le ministère, et
         c'est l'objet même de sa direction. Tous les autres restent chez
         eux. La liste déroulante en tient déjà compte ; ici, c'est la règle,
         et une adresse tapée à la main ne la contourne pas. */
      const partout = PROFILS_TECHNIQUES.includes(utilisateur.role)
        || ADMINISTRATION_MINISTERIELLE.includes(utilisateur.role);

      if (!partout) {
        const racine = utilisateur.entiteId;
        const cible = creation ? entite.parentId : entite.id;
        if (!cible || !dansPerimetre(racine, cible)) {
          throw new Error(
            creation
              ? "Vous ne pouvez créer une entité que sous une entité de votre périmètre."
              : "Cette entité est hors de votre périmètre."
          );
        }
        if (!creation && entite.parentId && !dansPerimetre(racine, entite.parentId)) {
          throw new Error("Vous ne pouvez pas rattacher cette entité hors de votre périmètre.");
        }
      }

      await save<Entite>("entites", entite);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Entite", entite.id, {
        champ: creation ? undefined : "entite",
        nouvelleValeur: `${entite.sigle} — ${entite.nom}`,
        justification: creation
          ? `Création de l'entité ${entite.sigle} au niveau ${entite.niveau}.`
          : `Modification de l'entité ${entite.sigle}.`,
      });
      hydraterEntites(await all<Entite>("entites"));
      return entite;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entites"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Comptes — l'administrateur ouvre l'accès, il n'instruit pas. §11     */
/* ------------------------------------------------------------------ */

export function useEnregistrerCompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ compte, utilisateur, creation }: {
      compte: Utilisateur; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Utilisateur>("utilisateurs", compte);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Utilisateur", compte.id, {
        champ: creation ? undefined : "compte",
        nouvelleValeur: `${compte.nomComplet} — ${compte.role}`,
        justification: creation
          ? `Ouverture du compte ${compte.email} avec le rôle ${compte.role}.`
          : `Modification du compte ${compte.email}.`,
      });
      return compte;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Personnel — le directeur inscrit ses agents                         */
/* ------------------------------------------------------------------ */

/**
 * Inscrit un agent. Rien n'entre dans un dossier sans acte (§05) : la
 * création ouvre donc un acte de recrutement déjà notifié, auquel se
 * rattachent l'affectation et la position initiales.
 */
export function useInscrireAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agent, entiteId, fonction, dateEffet, gradeId, utilisateur }: {
      agent: Agent; entiteId: string; fonction: string; dateEffet: string;
      gradeId?: string | null; utilisateur: Utilisateur;
    }) => {
      /* Le périmètre se vérifie ici, et pas seulement dans la liste
         déroulante de l'écran : un chef de service ne peut inscrire du
         personnel que dans sa direction et ce qu'elle contient. La règle
         écrite au seul niveau de l'affichage n'en est pas une. */
      if (utilisateur.role !== "ADMIN_SYSTEME" && !dansPerimetre(utilisateur.entiteId, entiteId)) {
        throw new Error("Cette entité est hors de votre périmètre : l'agent ne peut pas y être inscrit.");
      }

      /* Les adresses déjà prises : un homonyme ne doit pas recevoir celle
         d'un collègue, ce qui l'empêcherait purement et simplement d'entrer. */
      const existants = new Set(
        (await all<Utilisateur>("utilisateurs")).map((u) => u.email.split("@")[0])
      );

      const acteId = nouvelId("ACT");
      const horodatage = new Date().toISOString();
      const acte: Acte = {
        id: acteId,
        reference: `ARR-${String(Math.floor(Math.random() * 9000) + 1000)}/METP/DGARH-${new Date().getFullYear()}`,
        type: "RECRUTEMENT",
        objet: `Recrutement et prise de service — ${agent.prenom} ${agent.nom}`,
        agentId: agent.id,
        statut: "NOTIFIE",
        entiteInstructriceId: entiteId,
        dateCreation: horodatage,
        dateEcheance: dateEffet,
        dateSignature: horodatage,
        initiateur: utilisateur.nomComplet,
        instruitPar: utilisateur.id,
        effetsAppliques: true,
        cible: { entiteId, fonction, gradeId: gradeId ?? undefined, dateEffet, motif: `Inscription au fichier du personnel par ${utilisateur.nomComplet}.` },
        etapes: [],
        pieces: [],
      };

      await save<Agent>("agents", agent);
      await save<Acte>("actes", acte);
      await save<Affectation>("affectations", {
        id: nouvelId("AFF"), agentId: agent.id, entiteId, posteId: null as any,
        fonction, dateEffet, dateFin: null, acteId,
      } as Affectation);
      await save<Position>("positions", {
        id: nouvelId("POS"), agentId: agent.id, nature: "ACTIVITE",
        dateEffet, dateFin: null, acteId,
      } as Position);
      if (gradeId) {
        await save<SituationCarriere>("situations", {
          id: nouvelId("SIT"), agentId: agent.id, gradeId, classe: 1, echelon: 1,
          indice: 0, dateEffet, dateFin: null, acteId,
        } as SituationCarriere);
      }
      /* L'accès de base s'ouvre du même geste que l'inscription.
         Les séparer produirait ce qu'on observe dans la plupart des
         déploiements : un fichier du personnel complet, et une plateforme
         que seul l'encadrement sait ouvrir. Le profil Agent ne donne rien
         d'autre que la consultation de son propre dossier, de l'annuaire et
         des notes de service — il lit, il ne décide pas. */
      const compteId = nouvelId("USR");
      const provisoire = motDePasseProvisoire();
      const compte: Utilisateur = {
        id: compteId,
        email: courrielDe(agent, existants),
        /* Propre à ce compte, et bon pour une seule connexion : il est rendu
           à l'appelant, qui doit le transmettre à l'intéressé — la plateforme
           ne le réaffichera jamais. */
        motDePasse: provisoire,
        motDePasseAChanger: true,
        nomComplet: `${agent.prenom} ${agent.nom.toUpperCase()}`,
        role: "AGENT",
        entiteId,
        agentId: agent.id,
        fonction: fonction || "Agent",
        actif: true,
        dateCreation: horodatage,
        creePar: utilisateur.id,
      };
      await save<Utilisateur>("utilisateurs", compte);
      await save<Habilitation>("habilitations", {
        id: nouvelId("HAB"),
        utilisateurId: compteId,
        role: "AGENT",
        entiteId,
        accordePar: utilisateur.id,
        accordeParNom: utilisateur.nomComplet,
        accordeLe: horodatage,
        dateDebut: dateEffet,
        dateFin: null,
        motif: "Accès de base ouvert à l'inscription au fichier du personnel.",
        acteId,
      });

      await journaliser(utilisateur, "CREATION", "Agent", agent.id, {
        acteId,
        nouvelleValeur: `${agent.prenom} ${agent.nom} — ${agent.matricule}`,
        justification: `Inscription au fichier du personnel, accès de base ouvert (${compte.email}).`,
      });
      return { agent, compte, provisoire };
    },
    onSuccess: () => {
      ["agents", "actes", "affectations", "positions", "situations",
        "utilisateurs", "habilitations", "journal"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}

/* ------------------------------------------------------------------ */
