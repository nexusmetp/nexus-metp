/**
 * Jeu de données de démonstration.
 *
 * Construit selon le principe du cahier §08 : rien n'existe dans un dossier
 * qui ne résulte d'un acte. Chaque situation de carrière, chaque affectation
 * et chaque position porte l'identifiant de l'acte qui l'a produite.
 *
 * Données fictives. Les personnes, matricules et références d'actes sont
 * générés ; seule l'organisation reflète le référentiel.
 */

import {
  ENTITES, ETABLISSEMENTS, GRADES, CORPS, TYPES_ACTE,
  descendantsDe, gradeById, REGLES_CATEGORIE,
} from "@/lib/referentiels";
import {
  COMPETENCES, DIPLOMES, DISCIPLINES, ETABS, LANGUES, NOMS, PRENOMS_F, PRENOMS_M, VILLES,
  chance, dateEntre, dateRecente, int, pad, pick, plusJours, reinitialiserGraine,
} from "./aleatoire";
import {
  effectifDe, fabriquerActe, gradesPour, reinitialiserCompteurActe, tirerCategorie,
} from "./regles";
import { construireCollaboration } from "./collaboration";
import { construireGestion } from "./gestion";
import { construireArchives } from "./archives";
import { construirePresence } from "./presence";
import { construireAccueil } from "./accueil";
import { construireCommandement } from "./commandement";
import { construireHabilitations } from "./habilitations";
import { construireMouvements } from "./mouvements";
import { construireProfils } from "./profils";
import type {
  Acte, Affectation, Agent, Annonce, BesoinPersonnel, CampagneRecrutement, Candidature,
  CategoriePersonnel, Conge, Conversation, Delegation, EntreeJournal,
  InscriptionFormation, Message, MessageTicket, Notification, OffreFormation,
  ParametresSysteme, Position, Poste, SituationCarriere, StatutActe, TexteReglementaire,
  CarteProfessionnelle, Ticket, Utilisateur, Versement, ArticleArchive, CommunicationArchive,
  Pointage, SortieTerritoire, RemunerationContractuelle,
  PointAccueil, PriseDeService, RegistreJour, Habilitation, ProfilAcces,
} from "@/lib/types";
export interface Dataset {
  entites: typeof ENTITES;
  corps: typeof CORPS;
  grades: typeof GRADES;
  postes: Poste[];
  agents: Agent[];
  situations: SituationCarriere[];
  affectations: Affectation[];
  positions: Position[];
  actes: Acte[];
  besoins: BesoinPersonnel[];
  utilisateurs: Utilisateur[];
  journal: EntreeJournal[];
  notifications: Notification[];
  tickets: Ticket[];
  messagesTicket: MessageTicket[];
  conversations: Conversation[];
  messages: Message[];
  annonces: Annonce[];
  parametres: ParametresSysteme;
  conges: Conge[];
  delegations: Delegation[];
  textes: TexteReglementaire[];
  campagnes: CampagneRecrutement[];
  candidatures: Candidature[];
  offresFormation: OffreFormation[];
  inscriptions: InscriptionFormation[];
  cartes: CarteProfessionnelle[];
  versements: Versement[];
  articlesArchives: ArticleArchive[];
  communications: CommunicationArchive[];
  pointages: Pointage[];
  sorties: SortieTerritoire[];
  remunerations: RemunerationContractuelle[];
  pointsAccueil: PointAccueil[];
  prisesService: PriseDeService[];
  registres: RegistreJour[];
  habilitations: Habilitation[];
  profils: ProfilAcces[];
}

export function buildDataset(): Dataset {
  reinitialiserGraine();
  reinitialiserCompteurActe();

  const agents: Agent[] = [];
  const situations: SituationCarriere[] = [];
  const affectations: Affectation[] = [];
  const positions: Position[] = [];
  const actes: Acte[] = [];
  const postes: Poste[] = [];

  let nAgent = 0;
  let nPoste = 0;

  const cibles = ENTITES.filter((x) => effectifDe(x.niveau) > 0);

  cibles.forEach((ent) => {
    const nb = effectifDe(ent.niveau);
    const departemental = ent.niveau === "DIRECTION_DEPARTEMENTALE" || ent.niveau === "ETABLISSEMENT";

    for (let i = 0; i < nb; i++) {
      nAgent++;
      const categorie = tirerCategorie(ent.niveau);
      const regle = REGLES_CATEGORIE[categorie];
      const enseignant = ent.niveau === "ETABLISSEMENT" ? chance(0.78) : false;
      const sexe = chance(0.42) ? "F" : "M";
      const prenom = sexe === "F" ? pick(PRENOMS_F) : pick(PRENOMS_M);
      const nom = pick(NOMS);
      const id = `AGT-${pad(nAgent, 5)}`;
      const nomComplet = `${prenom} ${nom}`;

      const dateRecrutement = dateEntre(1992, 2025);
      const datePriseService = chance(0.93) ? plusJours(dateRecrutement, int(5, 90)) : undefined;
      const dateTitularisation =
        regle.titularisation && datePriseService && chance(0.85)
          ? plusJours(datePriseService, int(365, 900))
          : undefined;

      agents.push({
        id,
        matricule: `${int(10, 99)}-${pad(nAgent, 5)}-${int(1, 9)}`,
        nom, prenom, sexe,
        dateNaissance: dateEntre(1962, 2001),
        lieuNaissance: pick(VILLES),
        nationalite: "Congolaise",
        situationFamiliale: pick(["Célibataire", "Marié(e)", "Marié(e)", "Divorcé(e)", "Veuf(ve)"]) as Agent["situationFamiliale"],
        enfants: int(0, 6),
        telephone: `+242 0${int(4, 6)} ${int(100, 999)} ${int(1000, 9999)}`,
        email: `${prenom.toLowerCase().replace(/[^a-z]/g, "")}.${nom.toLowerCase()}@metp.gouv.cg`,
        adresse: `${int(1, 220)}, rue ${pick(NOMS).toLowerCase()}, ${pick(VILLES)}`,
        categorie,
        enseignant,
        dateRecrutement,
        datePriseService,
        dateTitularisation,
        diplomes: Array.from({ length: int(1, 3) }, () => ({
          intitule: pick(DIPLOMES), etablissement: pick(ETABS), annee: int(1990, 2024),
        })),
        competences: Array.from(new Set(Array.from({ length: int(2, 5) }, () => pick(COMPETENCES)))),
        langues: Array.from(new Set(["Français", ...Array.from({ length: int(1, 2) }, () => pick(LANGUES))])),
      });

      /* --- Acte de recrutement : origine de tout le dossier --- */
      const acteRec = fabriquerActe("RECRUTEMENT", id, nomComplet, "ENT-SPC-BRM", dateRecrutement, "ARCHIVE");
      actes.push(acteRec);

      /* Situation de carrière initiale — seulement si la catégorie en a une */
      let situationCourante: SituationCarriere | undefined;
      if (regle.carriereStatutaire) {
        const gradeId = pick(gradesPour(ent.niveau, enseignant));
        const g = gradeById(gradeId)!;
        situationCourante = {
          id: `SIT-${pad(nAgent, 5)}-1`,
          agentId: id,
          gradeId,
          classe: 1,
          echelon: 1,
          indice: g.indiceDebut,
          dateEffet: dateRecrutement,
          dateFin: null,
          acteId: acteRec.id,
        };
        situations.push(situationCourante);
      }

      /* Poste et affectation initiale */
      nPoste++;
      const gradeRequis = situationCourante?.gradeId ?? pick(gradesPour(ent.niveau, enseignant));
      const poste: Poste = {
        id: `PST-${pad(nPoste, 5)}`,
        code: `${ent.sigle}-${pad(i + 1, 3)}`,
        intitule: enseignant ? `Enseignant — ${pick(DISCIPLINES)}` : `Agent — ${ent.sigle}`,
        entiteId: ent.id,
        gradeRequisId: gradeRequis,
        statut: "OCCUPE",
        budgetise: regle.carriereStatutaire,
      };
      postes.push(poste);

      affectations.push({
        id: `AFF-${pad(nAgent, 5)}-1`,
        agentId: id,
        entiteId: ent.id,
        posteId: poste.id,
        fonction: poste.intitule,
        dateEffet: datePriseService ?? dateRecrutement,
        dateFin: null,
        acteId: acteRec.id,
      });

      positions.push({
        id: `POS-${pad(nAgent, 5)}-1`,
        agentId: id,
        nature: "ACTIVITE",
        dateEffet: datePriseService ?? dateRecrutement,
        dateFin: null,
        acteId: acteRec.id,
      });

      /* --- Avancement : ferme la situation précédente, en ouvre une nouvelle --- */
      if (situationCourante && regle.avancement && chance(0.55)) {
        const dateAv = dateEntre(Math.max(1996, new Date(dateRecrutement).getFullYear() + 2), 2026);
        if (dateAv > dateRecrutement) {
          const acteAv = fabriquerActe("AVANCEMENT", id, nomComplet, "ENT-SPC-BGC", dateAv, "ARCHIVE");
          actes.push(acteAv);
          const g = gradeById(situationCourante.gradeId)!;
          const echelon = Math.min(g.echelons, situationCourante.echelon + int(1, 4));
          situationCourante.dateFin = dateAv;
          situations.push({
            id: `SIT-${pad(nAgent, 5)}-2`,
            agentId: id,
            gradeId: situationCourante.gradeId,
            classe: situationCourante.classe,
            echelon,
            indice: Math.round(g.indiceDebut + ((g.indiceFin - g.indiceDebut) * (echelon - 1)) / Math.max(1, g.echelons - 1)),
            dateEffet: dateAv,
            dateFin: null,
            acteId: acteAv.id,
          });
        }
      }

      /* --- Position non ordinaire pour une minorité --- */
      if (chance(0.09)) {
        const dateP = dateEntre(2024, 2026);
        const nature = pick(["CONGE", "CONGE", "DISPONIBILITE", "DETACHEMENT", "MISE_A_DISPOSITION", "SUSPENSION"]) as Position["nature"];
        const acteP = fabriquerActe(nature === "CONGE" ? "CONGE" : "POSITION", id, nomComplet, "ENT-SPC-BGC", dateP, "SIGNE");
        actes.push(acteP);
        positions[positions.length - 1].dateFin = dateP;
        positions.push({
          id: `POS-${pad(nAgent, 5)}-2`,
          agentId: id,
          nature,
          motif: pick(["Congé annuel réglementaire", "Raisons de santé", "Événement familial", "Formation diplômante", "Convenance personnelle"]),
          dateEffet: dateP,
          dateFin: null,
          acteId: acteP.id,
        });
      }
    }
  });

  /* ---------- Actes en circulation : la charge réelle des bureaux ---------- */
  const enCours: StatutActe[] = ["SOUMIS", "EN_INSTRUCTION", "EN_INSTRUCTION", "VALIDE_SERVICE", "VALIDE_DIRECTION", "RETOURNE"];
  for (let i = 0; i < 140; i++) {
    const a = pick(agents);
    const modele = pick(TYPES_ACTE.filter((t) => t.type !== "RECRUTEMENT"));
    actes.push(
      fabriquerActe(modele.type, a.id, `${a.prenom} ${a.nom}`, modele.bureauId, dateRecente(150), pick(enCours))
    );
  }

  /* ---------- Besoins ascendants — cahier §04, §10 ---------- */
  const besoins: BesoinPersonnel[] = Array.from({ length: 86 }, (_, i) => {
    const etb = pick(ETABLISSEMENTS);
    return {
      id: `BSN-${pad(i + 1, 4)}`,
      reference: `BE-${pad(i + 1, 4)}/2026`,
      etablissementId: etb.id,
      departementId: etb.parentId!,
      categorie: pick(["PRESTATAIRE", "VOLONTAIRE", "VACATAIRE"]) as CategoriePersonnel,
      discipline: pick(DISCIPLINES),
      effectifDemande: int(1, 9),
      effectifRetenu: chance(0.5) ? int(0, 5) : undefined,
      anneeScolaire: "2026-2027",
      statut: pick(["EXPRIME", "TRANSMIS", "TRANSMIS", "INSTRUIT", "ARBITRE"]) as BesoinPersonnel["statut"],
    };
  });

  /* ---------- Comptes — un par rôle, rattachés à une vraie entité ---------- */
  const utilisateurs: Utilisateur[] = [
    /* Le sommet de l'État. Ces quatre comptes manquaient : la plateforme
       nommait le ministre partout dans ses écrans sans lui donner de porte
       d'entrée. Ils lisent et ne signent rien ici — la signature reste au
       directeur général, dans le circuit de l'acte. */
    { id: "USR-000", email: "ministre@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Le Ministre", role: "MINISTRE", entiteId: "ENT-METP", fonction: "Ministre de l'enseignement technique et professionnel", actif: true },
    { id: "USR-0C1", email: "cabinet@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Chancelvie OBAMBI", role: "CABINET", entiteId: "ENT-CAB", fonction: "Directrice de cabinet", actif: true },
    { id: "USR-0SG", email: "sg@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Marcel ITOUA", role: "SECRETAIRE_GENERAL", entiteId: "ENT-METP", fonction: "Secrétaire général du ministère", actif: true },
    { id: "USR-0IG", email: "inspection@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Edwige NKODIA", role: "INSPECTEUR", entiteId: "ENT-IG", fonction: "Inspectrice — Inspection générale", actif: true },
    { id: "USR-001", email: "admin@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Jade MELACK", role: "ADMIN_SYSTEME", entiteId: "ENT-DGARH", fonction: "Administrateur du système", actif: true },
    { id: "USR-002", email: "dgarh@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Alphonse NGATSE", role: "DIRECTEUR_GENERAL", entiteId: "ENT-DGARH", fonction: "Directeur général de l'administration et des ressources humaines", actif: true },
    { id: "USR-003", email: "dpcef@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Berthe MOUKALA", role: "DIRECTEUR_CENTRAL", entiteId: "ENT-DPCEF", fonction: "Directrice du personnel, de la condition enseignante et de la formation", actif: true },
    { id: "USR-004", email: "dafm@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Ulrich TSIBA", role: "DIRECTEUR_CENTRAL", entiteId: "ENT-DAFM", fonction: "Directeur de l'administration, des finances et du matériel", actif: true },
    { id: "USR-005", email: "spc@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Rodrigue OKEMBA", role: "CHEF_SERVICE", entiteId: "ENT-DPCEF-SPC", fonction: "Chef du service du personnel et du contentieux", actif: true },
    { id: "USR-006", email: "brm@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Ghislain MABIALA", role: "CHEF_BUREAU", entiteId: "ENT-SPC-BRM", fonction: "Chef du bureau du recrutement et des mouvements", actif: true },
    { id: "USR-007", email: "bgc@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Nadège BIKINDOU", role: "AGENT_INSTRUCTEUR", entiteId: "ENT-SPC-BGC", fonction: "Instructrice — bureau de la gestion de carrière", actif: true },
    { id: "USR-008", email: "dd.brazzaville@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Sylvie LOEMBA", role: "DIRECTEUR_DEPARTEMENTAL", entiteId: "ENT-DD-02", fonction: "Directrice départementale — Brazzaville", actif: true },
    { id: "USR-009", email: "etablissement@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Prosper BANZOUZI", role: "CHEF_ETABLISSEMENT", entiteId: "ENT-DD-02", fonction: "Proviseur — lycée technique", actif: true },
    { id: "USR-010", email: "agent@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: `${agents[0].prenom} ${agents[0].nom}`, role: "AGENT", entiteId: "ENT-SPC-BRM", agentId: agents[0].id, fonction: "Agent — portail libre-service", actif: true },
  ];

  /* Un compte est d'abord un agent du ministère : son dossier personnel existe
     quel que soit son rôle (§07). On rattache chaque utilisateur à un agent en
     poste dans son périmètre, que l'on renomme pour que le dossier soit le sien. */
  const dejaPris = new Set(utilisateurs.map((u) => u.agentId).filter(Boolean) as string[]);
  for (const u of utilisateurs) {
    if (u.agentId) continue;
    const perimetre = new Set(descendantsDe(u.entiteId).map((e) => e.id));
    const libre = (a: Affectation) => a.dateFin === null && !dejaPris.has(a.agentId);
    const aff =
      affectations.find((a) => libre(a) && perimetre.has(a.entiteId)) ??
      affectations.find(libre);
    if (!aff) continue;
    const agent = agents.find((a) => a.id === aff.agentId);
    if (!agent) continue;
    const [prenom, ...patronyme] = u.nomComplet.split(" ");
    agent.prenom = prenom;
    agent.nom = patronyme.join(" ") || agent.nom;
    aff.fonction = u.fonction;
    u.agentId = agent.id;
    dejaPris.add(agent.id);
  }

  /* ---------- Journal d'audit : en ajout seul, rattaché aux actes ---------- */
  const journal: EntreeJournal[] = Array.from({ length: 90 }, (_, i) => {
    const acte = pick(actes);
    const u = pick(utilisateurs);
    return {
      id: `JRN-${pad(i + 1, 5)}`,
      horodatage: `${dateRecente(120)}T${pad(int(7, 18), 2)}:${pad(int(0, 59), 2)}:00`,
      utilisateurId: u.id,
      utilisateur: u.nomComplet,
      adresseIp: `10.${int(0, 40)}.${int(0, 255)}.${int(2, 254)}`,
      action: pick(["CREATION", "MODIFICATION", "CONSULTATION", "VALIDATION", "SIGNATURE"]) as EntreeJournal["action"],
      cibleType: "Acte",
      cibleId: acte.id,
      acteId: acte.id,
      justification: pick(["Instruction du dossier", "Complément de pièces", "Contrôle de régularité", "Validation hiérarchique"]),
    };
  });

  const notifications: Notification[] = [
    { id: "NTF-1", titre: "Dossiers en attente de signature", message: "Des actes ont dépassé le délai cible de 15 jours au bureau de la gestion de carrière.", date: "2026-09-08", type: "alerte", lu: false },
    { id: "NTF-2", titre: "Besoins 2026-2027 transmis", message: "Les directions départementales ont transmis leurs états de besoins en prestataires et vacataires.", date: "2026-09-05", type: "info", lu: false },
    { id: "NTF-3", titre: "Référentiel incomplet", message: "Le détail des services et bureaux reste à confirmer sur l'arrêté n° 25567.", date: "2026-09-01", type: "alerte", lu: true },
  ];

  /* ---------- Paramétrage système ---------- */
  const parametres: ParametresSysteme = {
    id: "PARAMETRES",
    nomInstitution: "Ministère de l'Enseignement technique et professionnel",
    exercice: 2026,
    delaiCibleActe: 15,
    delaiTicket: { CRITIQUE: 4, HAUTE: 24, NORMALE: 72, BASSE: 168 },
    droitsSurcharges: {},
    messagerieActive: true,
    ticketsActifs: true,
    annoncesActives: true,
    maj: "2026-09-09T08:00:00.000Z",
  };

  /* ---------- Emplois vacants et gelés —
     Un tableau des emplois où tout est occupé ne sert à rien : ce sont les
     postes vides qui appellent un recrutement, et les postes gelés qui
     expliquent qu'un besoin reste sans suite. §03 ---------- */
  ENTITES.filter((x) => effectifDe(x.niveau) > 0).forEach((ent) => {
    const enseignant = ent.niveau === "ETABLISSEMENT";
    const nb = int(0, ent.niveau === "ETABLISSEMENT" ? 6 : 3);
    for (let k = 0; k < nb; k++) {
      nPoste++;
      const gele = chance(0.28);
      postes.push({
        id: `PST-${pad(nPoste, 5)}`,
        code: `${ent.sigle}-V${pad(k + 1, 2)}`,
        intitule: enseignant ? `Enseignant — ${pick(DISCIPLINES)}` : `Agent — ${ent.sigle}`,
        entiteId: ent.id,
        gradeRequisId: pick(gradesPour(ent.niveau, enseignant)),
        statut: gele ? "GELE" : "VACANT",
        budgetise: !gele,
      });
    }
  });

  /* Les mutations viennent juste après les postes vacants, et avant tout le
     reste : elles ferment des affectations et en ouvrent d'autres, donc tout
     ce qui lit les affectations doit les voir. */
  const { actes: actesMouvement } = construireMouvements({ agents, affectations, postes, entites: ENTITES });
  actes.push(...actesMouvement);

  const { tickets, messagesTicket, conversations, messages, annonces } =
    construireCollaboration({ agents, actes, utilisateurs });

  const {
    conges, delegations, textes, campagnes, candidatures,
    offresFormation, inscriptions, cartes,
  } = construireGestion({ agents, actes, utilisateurs, besoins, affectations });

  const { versements, articles: articlesArchives, communications } =
    construireArchives({ actes, agents, utilisateurs, entites: ENTITES });

  /* La présence vient en dernier : elle s'accorde aux congés et aux sorties,
     donc elle a besoin que la gestion ait déjà produit les siens. */
  const { pointages, sorties, remunerations } =
    construirePresence({ agents, affectations, conges, utilisateurs });

  /* Le lieu, l'arrivée et le cahier : ils ont besoin des affectations pour
     savoir qui sert où, et des agents pour désigner qui tient le registre. */
  const { pointsAccueil, prisesService, registres } =
    construireAccueil({ agents, affectations, entites: ENTITES, utilisateurs });

  /* Les habilitations viennent en dernier : elles ont besoin des points
     d'accueil pour savoir quels secrétaires un chef a eu à désigner. Les
     comptes qu'elles créent rejoignent la liste des utilisateurs. */
  const { habilitations, comptesAgents } =
    construireHabilitations({ utilisateurs, pointsAccueil, agents, affectations });
  /* Les secrétaires ne sont pas ajoutés séparément : ce sont des comptes
     d'agent dont l'habilitation a été élevée par leur chef. Une personne,
     un compte, un historique. */
  utilisateurs.push(...comptesAgents);

  /* Qui dirige quoi. Après les habilitations, parce qu'il faut que chaque
     agent ait son compte pour qu'on puisse en promouvoir un ; et avant les
     profils, qui comptent les porteurs de chaque rôle. */
  const { entites: entitesPourvues } = construireCommandement({
    entites: ENTITES, agents, affectations, utilisateurs, habilitations,
  });

  const { profils } = construireProfils({ utilisateurs });


  return {
    entites: entitesPourvues, corps: CORPS, grades: GRADES,
    postes, agents, situations, affectations, positions, actes, besoins,
    utilisateurs, journal, notifications,
    tickets, messagesTicket, conversations, messages, annonces, parametres,
    conges, delegations, textes, campagnes, candidatures, offresFormation, inscriptions,
    cartes,
    versements, articlesArchives, communications,
    pointages, sorties, remunerations,
    pointsAccueil, prisesService, registres, habilitations, profils,
  };
}
