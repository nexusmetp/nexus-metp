"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { all, save } from "@/lib/db";
import {
  PROFILS_TECHNIQUES, exigeApprobation, habilitationsEnVigueur, hydraterEntites,
  libelleProfil, peutHabiliter,
} from "@/lib/referentiels";
import { motDePasseProvisoire, verdictMotDePasse } from "@/lib/acces/motdepasse";
import type {
  Acte, Affectation, Agent, Entite, Habilitation, ParametresSysteme, Position,
  Utilisateur,
} from "@/lib/types";
import { journaliser, nouvelId } from "./audit";
import { courrielDe } from "./organisation";

/* ------------------------------------------------------------------ */
/* La tête d'une entité — le seul agent que l'administrateur inscrit   */
/* ------------------------------------------------------------------ */

/**
 * Désigne le premier responsable d'une entité, et lui ouvre tout d'un geste.
 *
 * C'est le point d'amorçage de toute la chaîne, et il n'en existe pas d'autre.
 * L'administrateur système crée une direction ; il y désigne **une** personne,
 * celle qui la dirige ; cette personne inscrit ensuite son secrétariat et son
 * personnel depuis son propre espace, et leur attribue les profils prédéfinis.
 * L'administrateur n'intervient plus. C'est ainsi que le ministère se peuple
 * lui-même, du ministre vers le bas, au lieu d'être saisi par un tiers qui ne
 * connaît ni les gens ni les fonctions.
 *
 * Trois choses s'ouvrent donc ensemble, et jamais séparément : le **dossier
 * d'agent** — car un responsable est d'abord un agent du ministère, avec une
 * carrière et un dossier —, le **compte**, et l'**habilitation** qui dit de
 * qui il tient son profil. Les séparer, c'est produire un chef sans dossier,
 * ou un compte dont personne n'a accordé les droits.
 */
export function useDesignerResponsable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entite, identite, profil, fonction, dateEffet, motif, utilisateur,
    }: {
      entite: Entite;
      identite: Pick<Agent, "nom" | "prenom" | "sexe" | "dateNaissance" | "telephone" | "email">
        & { categorie: Agent["categorie"] };
      profil: string;
      fonction: string;
      dateEffet: string;
      motif: string;
      utilisateur: Utilisateur;
    }) => {
      /* Une entité déjà pourvue ne se pourvoit pas deux fois — sauf par la
         porte de secours.

         La règle ordinaire : remplacer un chef est un acte de carrière qui se
         prend dans son dossier, et désigner par-dessus lui produirait deux
         responsables sans moyen de dire lequel est en fonction.

         L'exception : le compte perdu. Si le ministre ne peut plus entrer, la
         chaîne est coupée au-dessus des directeurs généraux et **personne** ne
         peut la réparer, puisque nul n'a qualité pour le désigner. Un système
         d'habilitations sans porte de secours finit ouvert à la main dans la
         base, ce qui est pire que tout — sans acte, sans auteur, sans trace.
         Le profil technique force donc le passage ; et parce qu'il le force,
         l'habilitation sortante est **close le même jour** et le compte revient
         au profil d'agent. Le sortant reste agent du ministère : il l'était
         avant d'être chef, il l'est après. */
      const comptes = await all<Utilisateur>("utilisateurs");
      const habilitations = await all<Habilitation>("habilitations");
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const enPlace = comptes.filter(
        (c) => c.actif && c.entiteId === entite.id && c.role !== "AGENT"
          && habilitationsEnVigueur(habilitations, c.id, aujourdhui).length > 0
      );
      const forcePassage = PROFILS_TECHNIQUES.includes(utilisateur.role);
      if (enPlace.length > 0 && !forcePassage) {
        throw new Error(
          `${entite.sigle} a déjà un responsable en fonction. Le remplacer se fait depuis son `
          + "dossier — c'est un acte de carrière, avec sa date et son motif."
        );
      }
      if (!motif.trim()) {
        throw new Error("Désigner un responsable demande un motif écrit : l'acte qui le nomme.");
      }

      /* Rang et périmètre, comme pour toute attribution de profil. Sans cet
         appel, cet écran était une porte dérobée : on n'y désigne qu'une tête,
         mais rien n'empêchait un directeur de s'en désigner une d'un rang
         supérieur au sien, dans une direction qui n'est pas la sienne. La
         règle ne vaut que si elle est vérifiée là où l'écriture a lieu. */
      const verdict = peutHabiliter(utilisateur, profil, entite.id);
      if (!verdict.ok) throw new Error(verdict.motif ?? "Désignation refusée.");

      /* Ce que le ministre approuve. Une nomination à la tête d'une direction
         engage le ministère : l'acte part alors à sa signature et **rien ne
         s'applique** — ni compte, ni habilitation, ni prise de fonction —
         jusqu'à la notification. C'est la règle du dépôt, pas une exception
         inventée ici : un effet se produit à la notification d'un acte, jamais
         à son établissement. Au-dessous du seuil, le directeur général exécute
         sa délégation sans demander la permission, et le journal en garde la
         trace. */
      const parametres = (await all<ParametresSysteme>("parametres"))[0];
      const attendLeMinistre = exigeApprobation(
        entite.niveau, utilisateur, parametres,
        /* Le ministre ne s'approuve pas lui-même, et l'administrateur amorce
           la chaîne sur un organigramme où le ministre n'existe pas encore. */
        ["MINISTRE", ...PROFILS_TECHNIQUES]
      );

      const horodatage = new Date().toISOString();
      const agent: Agent = {
        id: nouvelId("AGT"),
        matricule: `${identite.categorie.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
        nom: identite.nom.trim().toUpperCase(),
        prenom: identite.prenom.trim(),
        sexe: identite.sexe,
        dateNaissance: identite.dateNaissance,
        /* Ce que le formulaire ne demande pas, il ne l'invente pas : le
           dossier s'ouvre incomplet et le dit, et son taux de complétude le
           signalera au responsable lui-même dès sa première connexion. */
        lieuNaissance: "Donnée non renseignée",
        nationalite: "Donnée non renseignée",
        situationFamiliale: "Célibataire",
        enfants: 0,
        telephone: identite.telephone.trim(),
        email: identite.email.trim(),
        adresse: "",
        categorie: identite.categorie,
        enseignant: false,
        dateRecrutement: dateEffet,
        datePriseService: dateEffet,
        diplomes: [],
        competences: [],
        langues: [],
      };

      const acteId = nouvelId("ACT");
      const acte: Acte = {
        id: acteId,
        reference: `ARR-${String(Math.floor(Math.random() * 9000) + 1000)}/METP/DGARH-${new Date().getFullYear()}`,
        /* AFFECTATION et non RECRUTEMENT : un ministre ou un directeur général
           n'est pas « recruté », il est nommé et affecté à une fonction. Le
           type existe déjà et sa cible porte exactement les trois champs
           qu'une nomination met en jeu — l'entité, la fonction, la date. */
        type: "AFFECTATION",
        objet: `Nomination à la tête de ${entite.sigle} — ${agent.prenom} ${agent.nom}`,
        agentId: agent.id,
        statut: attendLeMinistre ? "SOUMIS" : "NOTIFIE",
        entiteInstructriceId: entite.id,
        dateCreation: horodatage,
        dateEcheance: dateEffet,
        dateSignature: attendLeMinistre ? undefined : horodatage,
        initiateur: utilisateur.nomComplet,
        instruitPar: utilisateur.id,
        effetsAppliques: !attendLeMinistre,
        /* Le profil proposé voyage dans l'acte : c'est lui qu'on appliquera à
           la notification, et le relire dans l'acte évite de le redemander au
           ministre, qui approuve une nomination et non un formulaire. */
        cible: { entiteId: entite.id, fonction, dateEffet, motif: motif.trim(), profil },
        etapes: [],
        pieces: [],
      };

      await save<Agent>("agents", agent);
      await save<Acte>("actes", acte);

      if (attendLeMinistre) {
        /* Le dossier de l'intéressé existe — c'est la pièce de la nomination —
           mais il n'a ni affectation ni compte : il ne compte donc dans aucun
           effectif et n'ouvre aucun accès. Si le ministre refuse, ce dossier
           est retiré et le journal garde seul la trace de la demande. */
        await journaliser(utilisateur, "CREATION", "Acte", acte.id, {
          acteId: acte.id,
          nouvelleValeur: `${agent.prenom} ${agent.nom} — ${libelleProfil(profil)} — ${entite.sigle}`,
          justification:
            `Nomination soumise à l'approbation du ministre : ${entite.sigle} est une entité de `
            + `niveau « ${entite.niveau} ». ${motif.trim()} Aucun effet n'est appliqué avant `
            + "notification — ni compte, ni habilitation, ni prise de fonction.",
        });
        return { agent, compte: null, provisoire: null, acte, enAttente: true as const };
      }

      await save<Affectation>("affectations", {
        id: nouvelId("AFF"), agentId: agent.id, entiteId: entite.id, posteId: null as any,
        fonction, dateEffet, dateFin: null, acteId,
      } as Affectation);
      await save<Position>("positions", {
        id: nouvelId("POS"), agentId: agent.id, nature: "ACTIVITE",
        dateEffet, dateFin: null, acteId,
      } as Position);

      const pris = new Set(comptes.map((u) => u.email.split("@")[0]));
      const compteId = nouvelId("USR");
      const provisoire = motDePasseProvisoire();
      const compte: Utilisateur = {
        id: compteId,
        /* L'adresse est l'identifiant de connexion : celle que le formulaire
           a saisie, ou celle qu'on dérive du nom comme pour tout agent. */
        email: (agent.email || courrielDe(agent, pris)).toLowerCase(),
        motDePasse: provisoire,
        motDePasseAChanger: true,
        nomComplet: `${agent.prenom} ${agent.nom.toUpperCase()}`,
        role: profil,
        entiteId: entite.id,
        agentId: agent.id,
        fonction,
        actif: true,
        dateCreation: horodatage,
        creePar: utilisateur.id,
      };
      await save<Utilisateur>("utilisateurs", compte);
      await save<Habilitation>("habilitations", {
        id: nouvelId("HAB"),
        utilisateurId: compteId,
        role: profil,
        entiteId: entite.id,
        accordePar: utilisateur.id,
        accordeParNom: utilisateur.nomComplet,
        accordeLe: horodatage,
        dateDebut: dateEffet,
        dateFin: null,
        motif: motif.trim(),
        acteId,
      });
      /* La relève, s'il y en a une : on clôt avant d'ouvrir, jamais l'inverse.
         Une habilitation ne s'efface pas — elle se termine, et l'historique dit
         toujours qui tenait la direction en mars et de qui il le tenait. */
      for (const sortant of enPlace) {
        for (const h of habilitationsEnVigueur(habilitations, sortant.id, aujourdhui)) {
          await save<Habilitation>("habilitations", {
            ...h,
            dateFin: dateEffet,
            revoqueePar: utilisateur.id,
            revoqueeParNom: utilisateur.nomComplet,
            revoqueeLe: horodatage,
            motifRevocation:
              `Relève à la tête de ${entite.sigle} par ${agent.prenom} ${agent.nom.toUpperCase()}. `
              + motif.trim(),
          });
        }
        await save<Utilisateur>("utilisateurs", { ...sortant, role: "AGENT" });
        await journaliser(utilisateur, "MODIFICATION", "Utilisateur", sortant.id, {
          champ: "role",
          ancienneValeur: sortant.role,
          nouvelleValeur: "AGENT",
          justification:
            `Fin de fonctions à la tête de ${entite.sigle}. Le compte reste ouvert au profil `
            + "d'agent : l'intéressé demeure agent du ministère.",
        });
      }

      await save<Entite>("entites", { ...entite, responsableId: agent.id });
      hydraterEntites(await all<Entite>("entites"));

      await journaliser(utilisateur, "CREATION", "Agent", agent.id, {
        acteId,
        nouvelleValeur: `${agent.prenom} ${agent.nom} — ${libelleProfil(profil)} — ${entite.sigle}`,
        justification:
          `Désignation du responsable de ${entite.sigle}. ${motif.trim()} `
          + `Dossier, compte (${compte.email}) et habilitation ouverts du même geste.`,
      });
      return { agent, compte, provisoire, acte, enAttente: false as const };
    },
    onSuccess: () => {
      ["agents", "actes", "affectations", "positions", "entites",
        "utilisateurs", "habilitations", "journal"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}

/* ------------------------------------------------------------------ */
/* Changer son propre mot de passe                                     */
/* ------------------------------------------------------------------ */

/**
 * On ne change que le sien, et on prouve qu'on connaît l'ancien.
 *
 * Les deux conditions vont ensemble. Sans la première, cet appel deviendrait
 * le moyen le plus court de prendre le compte d'un collègue. Sans la seconde,
 * un poste laissé ouvert quelques minutes suffirait à verrouiller son
 * titulaire hors de son propre compte.
 *
 * Le journal enregistre le geste et **jamais la valeur** : ni l'ancienne, ni
 * la nouvelle. Un journal d'audit qui consigne des mots de passe est un
 * registre de mots de passe.
 */
export function useChangerMotDePasse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ compte, ancien, nouveau }: {
      compte: Utilisateur; ancien: string; nouveau: string;
    }) => {
      const enBase = (await all<Utilisateur>("utilisateurs")).find((u) => u.id === compte.id);
      if (!enBase) throw new Error("Ce compte n'existe plus.");
      if (enBase.motDePasse !== ancien) {
        throw new Error("Le mot de passe actuel ne correspond pas.");
      }
      const verdict = verdictMotDePasse(nouveau, {
        ancien, identifiant: enBase.email,
      });
      if (!verdict.ok) throw new Error(verdict.motif ?? "Mot de passe refusé.");

      const ligne: Utilisateur = {
        ...enBase,
        motDePasse: nouveau.trim(),
        motDePasseAChanger: false,
      };
      await save<Utilisateur>("utilisateurs", ligne);
      await journaliser(ligne, "MODIFICATION", "Utilisateur", ligne.id, {
        champ: "motDePasse",
        justification: "Changement de mot de passe par le titulaire du compte.",
      });
      return ligne;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}
