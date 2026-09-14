/**
 * Ce qui circule autour de l'acte — cahier §16.
 *
 * Tickets, messagerie et annonces. Rien ici ne décide : une réclamation
 * fondée débouche sur un acte, elle ne modifie pas un dossier.
 */

import { ENTITES, entiteById } from "@/lib/referentiels";
import type {
  Acte, Agent, Annonce, CategorieTicket, Conversation, Message, MessageTicket,
  PrioriteTicket, StatutTicket, Ticket, Utilisateur,
} from "@/lib/types";
import { chance, dateEntre, dateRecente, int, pad, pick, plusJours } from "./aleatoire";

export interface Collaboration {
  tickets: Ticket[];
  messagesTicket: MessageTicket[];
  conversations: Conversation[];
  messages: Message[];
  annonces: Annonce[];
}

export function construireCollaboration(
  { agents, actes, utilisateurs }:
  { agents: Agent[]; actes: Acte[]; utilisateurs: Utilisateur[] }
): Collaboration {
  /* ---------- Tickets — réclamations et assistance (§16) ---------- */
  const OBJETS_TICKET: Record<CategorieTicket, string[]> = {
    RECLAMATION: [
      "Avancement non pris en compte depuis 2024",
      "Indice erroné sur le dernier bulletin",
      "Affectation non conforme à l'acte notifié",
      "Congé annuel décompté deux fois",
      "Ancienneté mal calculée à la titularisation",
    ],
    ASSISTANCE: [
      "Impossible de téléverser un diplôme",
      "Mot de passe à réinitialiser",
      "Le dossier de mon agent n'apparaît pas",
      "Comment ouvrir un acte de mutation ?",
    ],
    INCIDENT: [
      "Le registre des actes ne se charge plus",
      "Écart entre l'effectif affiché et l'état de besoins",
      "Doublon de matricule constaté",
    ],
    DEMANDE_PIECE: [
      "Acte de naissance manquant au dossier",
      "Copie du diplôme non lisible",
      "Certificat de prise de service à fournir",
    ],
    SUGGESTION: [
      "Ajouter l'export des états par département",
      "Notifier les chefs d'établissement des mutations",
    ],
  };
  const REPONSES = [
    "Dossier reçu. Nous vérifions la situation auprès du bureau de la gestion de carrière.",
    "La pièce manquante a été demandée au demandeur ; le dossier reste en attente.",
    "Vérification faite : l'écart provient d'un acte non encore notifié. Régularisation en cours.",
    "Un acte a été ouvert pour donner suite à cette réclamation.",
    "Traitement terminé, la situation est rétablie dans le dossier de l'agent.",
  ];
  const HEURES_PRIORITE: Record<PrioriteTicket, number> = { CRITIQUE: 4, HAUTE: 24, NORMALE: 72, BASSE: 168 };
  const bureauxTraitants = ENTITES.filter((e) => e.niveau === "BUREAU").map((e) => e.id);

  const tickets: Ticket[] = [];
  const messagesTicket: MessageTicket[] = [];
  for (let i = 1; i <= 46; i++) {
    const categorie = pick(Object.keys(OBJETS_TICKET) as CategorieTicket[]);
    const priorite = pick<PrioriteTicket>(["BASSE", "NORMALE", "NORMALE", "HAUTE", "CRITIQUE"]);
    const statut = pick<StatutTicket>([
      "OUVERT", "OUVERT", "PRIS_EN_CHARGE", "PRIS_EN_CHARGE",
      "EN_ATTENTE_DEMANDEUR", "RESOLU", "RESOLU", "CLOS",
    ]);
    const agent = pick(agents);
    const ouvertPar = pick(utilisateurs);
    const dateOuverture = `${dateRecente(120)}T${pad(int(7, 17), 2)}:${pad(int(0, 59), 2)}:00`;
    const clos = statut === "RESOLU" || statut === "CLOS";
    const t: Ticket = {
      id: `TCK-${pad(i, 4)}`,
      reference: `REC-${pad(i, 4)}/2026`,
      objet: pick(OBJETS_TICKET[categorie]),
      description:
        "Le demandeur expose sa situation et sollicite l'examen du bureau compétent. " +
        "Les pièces disponibles sont jointes au dossier de l'agent.",
      categorie,
      priorite,
      statut,
      ouvertPar: ouvertPar.id,
      ouvertParNom: ouvertPar.nomComplet,
      agentId: categorie === "ASSISTANCE" || categorie === "SUGGESTION" ? null : agent.id,
      entiteId: pick(bureauxTraitants),
      assigneA: statut === "OUVERT" ? null : pick(utilisateurs).id,
      dateOuverture,
      echeance: new Date(new Date(dateOuverture).getTime() + HEURES_PRIORITE[priorite] * 36e5).toISOString(),
      dateCloture: clos ? plusJours(dateOuverture.slice(0, 10), int(1, 20)) : null,
      acteId: chance(0.22) ? pick(actes).id : null,
      satisfaction: clos && chance(0.6) ? int(3, 5) : null,
    };
    tickets.push(t);

    messagesTicket.push({
      id: `MTK-${pad(i, 4)}-1`,
      ticketId: t.id,
      auteurId: t.ouvertPar,
      auteur: t.ouvertParNom,
      corps: t.description,
      horodatage: t.dateOuverture,
      interne: false,
    });
    if (t.statut !== "OUVERT") {
      const n = int(1, 3);
      for (let m = 0; m < n; m++) {
        const u = pick(utilisateurs);
        messagesTicket.push({
          id: `MTK-${pad(i, 4)}-${m + 2}`,
          ticketId: t.id,
          auteurId: u.id,
          auteur: u.nomComplet,
          corps: pick(REPONSES),
          horodatage: new Date(new Date(t.dateOuverture).getTime() + (m + 1) * int(3, 40) * 36e5).toISOString(),
          interne: chance(0.3),
        });
      }
    }
  }

  /* ---------- Messagerie — fils d'entité, groupes et échanges directs ---------- */
  const CORPS_MESSAGES = [
    "Le dossier est prêt pour la signature du directeur général.",
    "Merci de vérifier la pièce jointe avant transmission au service.",
    "Les états de besoins du département sont remontés ce matin.",
    "Attention, ce dossier dépasse le délai cible de quinze jours.",
    "Bien reçu, je regarde cela dans la journée.",
    "La commission de titularisation se tient jeudi à neuf heures.",
    "Pouvez-vous me confirmer le matricule de l'agent concerné ?",
    "L'arrêté a été notifié, les effets sont reportés au dossier.",
    "Il manque le certificat de prise de service pour boucler l'instruction.",
    "Le point sur les mutations est reporté à la semaine prochaine.",
  ];
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  let nMsg = 0;

  const ouvrirFil = (
    id: string, type: Conversation["type"], titre: string,
    participants: string[], entiteId: string | null, nombre: number
  ) => {
    let horodatage = new Date(`${dateRecente(90)}T08:00:00`).getTime();
    let dernier = "";
    for (let m = 0; m < nombre; m++) {
      horodatage += int(20, 600) * 6e4;
      // Le tirage se fait une fois : appelé dans le prédicat, il changerait
      // à chaque élément parcouru et ne désignerait personne.
      const auteurId = pick(participants);
      const auteur = utilisateurs.find((u) => u.id === auteurId) ?? utilisateurs[0];
      dernier = pick(CORPS_MESSAGES);
      nMsg++;
      messages.push({
        id: `MSG-${pad(nMsg, 5)}`,
        conversationId: id,
        auteurId: auteur.id,
        auteur: auteur.nomComplet,
        corps: dernier,
        horodatage: new Date(horodatage).toISOString(),
        luPar: participants.filter(() => chance(0.6)),
        acteId: chance(0.15) ? pick(actes).id : null,
      });
    }
    conversations.push({
      id, type, titre, participants, entiteId,
      dateCreation: new Date(horodatage - nombre * 6e5).toISOString(),
      dernierMessage: dernier,
      dateDernierMessage: new Date(horodatage).toISOString(),
    });
  };

  const tousComptes = utilisateurs.map((u) => u.id);
  ouvrirFil("CNV-001", "ENTITE", "Direction générale — fil de service", tousComptes, "ENT-DGARH", 9);
  ouvrirFil("CNV-002", "GROUPE", "Cellule mutations 2026", ["USR-002", "USR-005", "USR-006", "USR-007"], "ENT-SPC-BRM", 7);
  ouvrirFil("CNV-003", "GROUPE", "Commission de titularisation", ["USR-002", "USR-003", "USR-005"], "ENT-DPCEF", 5);
  ouvrirFil("CNV-004", "DIRECT", "Alphonse NGATSE", ["USR-002", "USR-006"], null, 6);
  ouvrirFil("CNV-005", "DIRECT", "Berthe MOUKALA", ["USR-003", "USR-006"], null, 4);
  ouvrirFil("CNV-006", "ENTITE", "Directions départementales", ["USR-002", "USR-008", "USR-009"], "ENT-DDET-02", 6);
  ouvrirFil("CNV-007", "DIRECT", "Assistance technique", ["USR-001", "USR-006"], null, 3);

  /* ---------- Annonces et circulaires ---------- */
  const annonces: Annonce[] = [
    {
      id: "ANN-001", reference: "NS-012/METP/DGARH-2026",
      titre: "Ouverture de la campagne d'avancement 2026",
      corps:
        "Les chefs de service sont invités à transmettre au bureau de la gestion de carrière, avant le 30 septembre, "
        + "la liste des agents remplissant les conditions d'avancement d'échelon. Toute proposition non appuyée d'un "
        + "état de services certifié sera retournée.",
      auteurId: "USR-002", auteur: "Alphonse NGATSE", portee: "MINISTERE", entiteId: "ENT-DGARH",
      dateEmission: "2026-09-02", accuseRequis: true,
      accuses: ["USR-003", "USR-005", "USR-006"].map((u) => ({ utilisateurId: u, date: "2026-09-03" })),
      epingle: true,
    },
    {
      id: "ANN-002", reference: "NS-011/METP/DGARH-2026",
      titre: "Rappel — délai d'instruction des actes",
      corps:
        "Le délai cible d'instruction est fixé à quinze jours. Les dossiers qui le dépassent font l'objet d'un "
        + "signalement automatique dans la bannette du chef de service concerné.",
      auteurId: "USR-002", auteur: "Alphonse NGATSE", portee: "MINISTERE", entiteId: "ENT-DGARH",
      dateEmission: "2026-08-24", accuseRequis: true,
      accuses: ["USR-005", "USR-006", "USR-007"].map((u) => ({ utilisateurId: u, date: "2026-08-25" })),
      epingle: false,
    },
    {
      id: "ANN-003", reference: "CIR-004/METP/DGARH-2026",
      titre: "Régularisation des dossiers physiques incomplets",
      corps:
        "Un tiers des dossiers présente au moins une pièce manquante. Les bureaux gestionnaires disposent de "
        + "soixante jours pour réclamer les pièces aux agents et consigner la demande dans l'outil.",
      auteurId: "USR-003", auteur: "Berthe MOUKALA", portee: "ENTITE", entiteId: "ENT-DPCEF",
      dateEmission: "2026-08-11", accuseRequis: true,
      accuses: [{ utilisateurId: "USR-006", date: "2026-08-12" }],
      epingle: false,
    },
    {
      id: "ANN-004", reference: "NS-009/METP/DGARH-2026",
      titre: "Remontée des états de besoins 2026-2027",
      corps:
        "Les directions départementales et les chefs d'établissement transmettent leurs états de besoins en "
        + "personnel enseignant selon le canevas en vigueur, discipline par discipline.",
      auteurId: "USR-002", auteur: "Alphonse NGATSE", portee: "MINISTERE", entiteId: "ENT-DGARH",
      dateEmission: "2026-07-28", accuseRequis: false, accuses: [], epingle: false,
    },
    {
      id: "ANN-005", reference: "AVI-002/METP/DGARH-2026",
      titre: "Maintenance du système — samedi 14 septembre",
      corps:
        "Une interruption de service est prévue de 8h à 12h pour la reprise des référentiels. "
        + "Aucune saisie ne sera possible durant cette plage.",
      auteurId: "USR-001", auteur: "Jade MELACK", portee: "MINISTERE", entiteId: "ENT-DGARH",
      dateEmission: "2026-09-06", accuseRequis: false, accuses: [], epingle: true,
    },
  ];


  return { tickets, messagesTicket, conversations, messages, annonces };
}
