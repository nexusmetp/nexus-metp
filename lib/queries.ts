"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { all, one, remove, resetDB, save, type StoreName } from "@/lib/db";
import { projeterTous, type Historique } from "@/lib/carriere";
import { appliquerTransition, calculerEffets, entreeJournal, type CodeTransition } from "@/lib/actes";
import { hydraterEntites } from "@/lib/referentiels";
import type {
  Acte, Affectation, Agent, AgentProjete, Annonce, BesoinPersonnel, Conversation, Corps,
  EntreeJournal, Entite, Grade, Message, MessageTicket, Notification, ParametresSysteme,
  Position, Poste, Role, SituationCarriere, StatutTicket, Ticket, Utilisateur,
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
export const useTickets = () => liste<Ticket>("tickets");
export const useMessagesTicket = () => liste<MessageTicket>("messagesTicket");
export const useConversations = () => liste<Conversation>("conversations");
export const useMessages = () => liste<Message>("messages");
export const useAnnonces = () => liste<Annonce>("annonces");

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

/* ------------------------------------------------------------------ */
/* Journal — toute écriture d'administration laisse une trace. §12      */
/* ------------------------------------------------------------------ */

let compteurJournal = 0;

export async function journaliser(
  u: Pick<Utilisateur, "id" | "nomComplet">,
  action: EntreeJournal["action"],
  cibleType: string,
  cibleId: string,
  details: Partial<Pick<EntreeJournal, "champ" | "ancienneValeur" | "nouvelleValeur" | "justification" | "acteId">> = {}
): Promise<void> {
  compteurJournal++;
  await save<EntreeJournal>("journal", {
    id: `JRN-${cibleId}-${Date.now()}-${compteurJournal}`,
    horodatage: new Date().toISOString(),
    utilisateurId: u.id,
    utilisateur: u.nomComplet,
    adresseIp: "session locale",
    action,
    cibleType,
    cibleId,
    ...details,
  });
}

const nouvelId = (prefixe: string) =>
  `${prefixe}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/* Organisation — l'administrateur crée les directions                 */
/* ------------------------------------------------------------------ */

export function useEnregistrerEntite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entite, utilisateur, creation }: {
      entite: Entite; utilisateur: Utilisateur; creation: boolean;
    }) => {
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
      await journaliser(utilisateur, "CREATION", "Agent", agent.id, {
        acteId,
        nouvelleValeur: `${agent.prenom} ${agent.nom} — ${agent.matricule}`,
        justification: "Inscription au fichier du personnel.",
      });
      return agent;
    },
    onSuccess: () => {
      ["agents", "actes", "affectations", "positions", "situations", "journal"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    },
  });
}

/* ------------------------------------------------------------------ */
/* Tickets — la réclamation ne décide rien, elle ouvre un acte. §16     */
/* ------------------------------------------------------------------ */

export function useEnregistrerTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket, utilisateur, creation, message }: {
      ticket: Ticket; utilisateur: Utilisateur; creation: boolean; message?: string;
    }) => {
      await save<Ticket>("tickets", ticket);
      if (message) {
        await save<MessageTicket>("messagesTicket", {
          id: nouvelId("MTK"), ticketId: ticket.id, auteurId: utilisateur.id,
          auteur: utilisateur.nomComplet, corps: message,
          horodatage: new Date().toISOString(), interne: false,
        });
      }
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Ticket", ticket.id, {
        champ: creation ? undefined : "statut",
        nouvelleValeur: ticket.statut,
        acteId: ticket.acteId ?? undefined,
        justification: ticket.objet,
      });
      return ticket;
    },
    onSuccess: () => {
      ["tickets", "messagesTicket", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useRepondreTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket, corps, interne, utilisateur, statut }: {
      ticket: Ticket; corps: string; interne: boolean; utilisateur: Utilisateur; statut?: StatutTicket;
    }) => {
      await save<MessageTicket>("messagesTicket", {
        id: nouvelId("MTK"), ticketId: ticket.id, auteurId: utilisateur.id,
        auteur: utilisateur.nomComplet, corps, horodatage: new Date().toISOString(), interne,
      });
      if (statut && statut !== ticket.statut) {
        await save<Ticket>("tickets", {
          ...ticket, statut,
          dateCloture: statut === "RESOLU" || statut === "CLOS" ? new Date().toISOString() : ticket.dateCloture,
        });
      }
      return ticket;
    },
    onSuccess: () => {
      ["tickets", "messagesTicket"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Messagerie                                                          */
/* ------------------------------------------------------------------ */

export function useEnvoyerMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversation, corps, utilisateur }: {
      conversation: Conversation; corps: string; utilisateur: Utilisateur;
    }) => {
      const horodatage = new Date().toISOString();
      await save<Message>("messages", {
        id: nouvelId("MSG"), conversationId: conversation.id, auteurId: utilisateur.id,
        auteur: utilisateur.nomComplet, corps, horodatage, luPar: [utilisateur.id], acteId: null,
      });
      await save<Conversation>("conversations", {
        ...conversation, dernierMessage: corps, dateDernierMessage: horodatage,
      });
    },
    onSuccess: () => {
      ["messages", "conversations"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useCreerConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversation: Conversation) => {
      await save<Conversation>("conversations", conversation);
      return conversation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Annonces — l'accusé de lecture fait l'état de diffusion             */
/* ------------------------------------------------------------------ */

export function useEnregistrerAnnonce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ annonce, utilisateur, creation }: {
      annonce: Annonce; utilisateur: Utilisateur; creation: boolean;
    }) => {
      await save<Annonce>("annonces", annonce);
      await journaliser(utilisateur, creation ? "CREATION" : "MODIFICATION", "Annonce", annonce.id, {
        nouvelleValeur: annonce.titre,
        justification: `Diffusion « ${annonce.reference} ».`,
      });
      return annonce;
    },
    onSuccess: () => {
      ["annonces", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useAccuserLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ annonce, utilisateur }: { annonce: Annonce; utilisateur: Utilisateur }) => {
      if (annonce.accuses.some((a) => a.utilisateurId === utilisateur.id)) return annonce;
      const maj: Annonce = {
        ...annonce,
        accuses: [...annonce.accuses, { utilisateurId: utilisateur.id, date: new Date().toISOString() }],
      };
      await save<Annonce>("annonces", maj);
      return maj;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["annonces"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Paramétrage                                                         */
/* ------------------------------------------------------------------ */

export function useParametres() {
  return useQuery<ParametresSysteme | undefined>({
    queryKey: ["parametres"],
    queryFn: async () => (await all<ParametresSysteme>("parametres"))[0],
    staleTime: 60_000,
  });
}

export function useMajParametres() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parametres, utilisateur }: {
      parametres: ParametresSysteme; utilisateur: Utilisateur;
    }) => {
      const maj = { ...parametres, maj: new Date().toISOString() };
      await save<ParametresSysteme>("parametres", maj);
      await journaliser(utilisateur, "MODIFICATION", "Parametres", "PARAMETRES", {
        justification: "Paramétrage du système modifié.",
      });
      return maj;
    },
    onSuccess: () => {
      ["parametres", "journal"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
