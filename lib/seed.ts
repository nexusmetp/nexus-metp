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
  ENTITES, ETABLISSEMENTS, DEPARTEMENTS, GRADES, CORPS, CIRCUIT_ACTE, TYPES_ACTE,
  entiteById, enfantsDe, descendantsDe, gradeById, categorieStatutaireDe, REGLES_CATEGORIE,
} from "@/lib/referentiels";
import type {
  Acte, Affectation, Agent, Annonce, BesoinPersonnel, CategoriePersonnel, CategorieTicket,
  Conversation, EntreeJournal, EtapeActe, Message, MessageTicket, Notification,
  ParametresSysteme, Position, Poste, PrioriteTicket, SituationCarriere, StatutActe,
  StatutTicket, Ticket, TypeActe, Utilisateur,
} from "@/lib/types";

/* ---------- PRNG déterministe ---------- */
let graine = 20260909;
const rnd = () => {
  graine = (graine * 1103515245 + 12345) & 0x7fffffff;
  return graine / 0x7fffffff;
};
// `rnd()` peut rendre exactement 1 : sans borne, l'index sort du tableau
// et le tirage renvoie `undefined`, ce qui casse le semis très loin de là.
const pick = <T,>(a: T[]): T => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;
const pad = (n: number, l = 6) => String(n).padStart(l, "0");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dateEntre = (a: number, b: number) => iso(new Date(int(a, b), int(0, 11), int(1, 28)));
const plusJours = (d: string, j: number) => iso(new Date(new Date(d).getTime() + j * 864e5));

const NOMS = ["MABIALA","NGOMA","OKEMBA","BOUITY","MALONGA","TCHIKAYA","NGATSE","MOUKALA","BIKINDOU","SAMBA","LOEMBA","NKOUNKOU","MASSAMBA","ONDONGO","IBARA","BAKALA","MOUANDA","KIMBEMBE","NIANGA","OBAMBI","MPASSI","GANGA","BANZOUZI","MOUYABI","NKODIA","TSIBA","OKO","MABIKA","BOUNDA","MAKAYA","ELENGA","ONDZE","KOUMBA","BANTSIMBA","MILANDOU","NGOULOU","MAVOUNGOU","ITOUA","AKOUALA","DZON"];
const PRENOMS_M = ["Jean-Baptiste","Serge","Alphonse","Rodrigue","Christian","Pascal","Gildas","Frédéric","Aurélien","Brice","Dieudonné","Emmanuel","Ghislain","Hervé","Jonas","Landry","Marcel","Noël","Olivier","Prosper","Sylvain","Thierry","Ulrich","Victor"];
const PRENOMS_F = ["Clarisse","Ghislaine","Nadège","Sylvie","Berthe","Chanceline","Delphine","Edwige","Flore","Grace","Huguette","Inès","Josiane","Lydie","Mireille","Nathalie","Ornella","Patricia","Rachel","Sandrine","Thérèse","Yolande"];
const VILLES = DEPARTEMENTS.map((d) => d.chefLieu);
const ETABS = ["Université Marien Ngouabi","ENAM Brazzaville","Lycée technique 1er-Mai","Institut supérieur de gestion","ENS Brazzaville","Université Denis Sassou Nguesso"];
const DIPLOMES = ["Licence en gestion des ressources humaines","Master en administration publique","BTS comptabilité","Ingénieur en génie civil","Master en droit public","DUT informatique","Baccalauréat technique","BEP industriel"];
const COMPETENCES = ["Gestion de la paie","SIRH","Droit de la fonction publique","Archivage","Gestion de projet","Comptabilité publique","Ingénierie de formation","Rédaction administrative","Statistiques","Passation de marchés"];
const LANGUES = ["Français","Lingala","Kituba","Anglais","Portugais"];
const DISCIPLINES = ["Génie civil","Électrotechnique","Mécanique","Comptabilité","Secrétariat","Informatique","Froid et climatisation","Hôtellerie-restauration","Agriculture"];

/* ---------- Répartition des effectifs ---------- */

const effectifDe = (niveau: string) => {
  switch (niveau) {
    case "CABINET": return int(2, 4);
    case "ANTENNE_DEPARTEMENTALE": return int(4, 9);
    case "BUREAU": return int(4, 11);
    case "SERVICE": return int(2, 4);
    case "DIRECTION": return int(2, 4);
    case "SECRETARIAT": return int(1, 3);
    case "DIRECTION_GENERALE": return int(3, 6);
    case "INSPECTION_GENERALE": return int(8, 14);
    case "INSPECTION_INTERDEPARTEMENTALE": return int(10, 18);
    case "DIRECTION_DEPARTEMENTALE": return int(14, 26);
    case "ETABLISSEMENT": return int(22, 48);
    default: return 0;
  }
};

/** Grades plausibles selon le niveau d'entité. */
const gradesPour = (niveau: string, enseignant: boolean): string[] => {
  if (enseignant) return ["GR-ENS-PT", "GR-ENS-PTC", "GR-ENS-PTC"];
  switch (niveau) {
    case "DIRECTION_GENERALE": return ["GR-DIR-DG", "GR-ADM-1"];
    case "INSPECTION_GENERALE": return ["GR-INSP-1", "GR-INSP-2"];
    case "DIRECTION": return ["GR-DIR-DC", "GR-ADM-1"];
    case "SERVICE": return ["GR-ENC-CS1", "GR-ENC-CS2"];
    case "BUREAU": return ["GR-GEST-1", "GR-GEST-2", "GR-GEST-3", "GR-TECH-1", "GR-SERV-1"];
    case "DIRECTION_DEPARTEMENTALE": return ["GR-GEST-1", "GR-TECH-1", "GR-SERV-1", "GR-ENC-CS2"];
    case "ETABLISSEMENT": return ["GR-ENS-PTC", "GR-ENS-PT", "GR-SERV-1", "GR-GEST-3"];
    default: return ["GR-GEST-1", "GR-SERV-1"];
  }
};

const tirerCategorie = (niveau: string): CategoriePersonnel => {
  if (niveau !== "DIRECTION_DEPARTEMENTALE" && niveau !== "ETABLISSEMENT") {
    return chance(0.82) ? "FONCTIONNAIRE" : "CONTRACTUEL";
  }
  const r = rnd();
  if (r < 0.5) return "FONCTIONNAIRE";
  if (r < 0.66) return "CONTRACTUEL";
  if (r < 0.79) return "PRESTATAIRE";
  if (r < 0.88) return "VOLONTAIRE";
  return "VACATAIRE";
};

/* ---------- Fabrique d'actes ---------- */

let compteurActe = 0;

function fabriquerActe(
  type: TypeActe, agentId: string, agentNom: string, entiteInstructriceId: string,
  dateCreation: string, statut: StatutActe
): Acte {
  compteurActe++;
  const modele = TYPES_ACTE.find((t) => t.type === type)!;
  const idxCourant =
    statut === "BROUILLON" ? 0
    : statut === "SOUMIS" ? 1
    : statut === "EN_INSTRUCTION" ? 1
    : statut === "RETOURNE" ? 1
    : statut === "VALIDE_SERVICE" ? 2
    : statut === "VALIDE_DIRECTION" ? 3
    : statut === "REJETE" ? 3
    : CIRCUIT_ACTE.length;

  const etapes: EtapeActe[] = CIRCUIT_ACTE.map((s, k) => ({
    id: `ETP-${pad(compteurActe, 5)}-${k}`,
    ordre: s.ordre,
    libelle: s.libelle,
    entiteId: s.entiteId,
    statut: k < idxCourant ? "TERMINEE" : k === idxCourant ? "EN_COURS" : "A_VENIR",
    dateEntree: k <= idxCourant ? plusJours(dateCreation, k * 3) : undefined,
    dateSortie: k < idxCourant ? plusJours(dateCreation, k * 3 + 2) : undefined,
    utilisateur: k <= idxCourant ? `${pick(PRENOMS_M)} ${pick(NOMS)}` : undefined,
    commentaire: statut === "RETOURNE" && k === idxCourant ? "Pièce justificative manquante" : undefined,
  }));

  const signe = ["SIGNE", "NOTIFIE", "ARCHIVE"].includes(statut);
  return {
    id: `ACT-${pad(compteurActe, 5)}`,
    reference: `ARR-${pad(int(100, 9999), 4)}/METP/DGARH-${new Date(dateCreation).getFullYear()}`,
    type,
    objet: `${modele.libelle} — ${agentNom}`,
    agentId,
    entiteInstructriceId,
    statut,
    dateCreation,
    dateEcheance: plusJours(dateCreation, 15),
    dateSignature: signe ? plusJours(dateCreation, int(8, 40)) : undefined,
    initiateur: `${pick(PRENOMS_M)} ${pick(NOMS)}`,
    etapes,
    pieces: [
      { id: `PC-${pad(compteurActe, 5)}-1`, nom: "Demande signée.pdf", categorie: "Demande", date: dateCreation, taille: `${int(80, 900)} Ko` },
      { id: `PC-${pad(compteurActe, 5)}-2`, nom: "Situation administrative.pdf", categorie: "Justificatif", date: dateCreation, taille: `${int(80, 600)} Ko` },
    ],
  };
}

/* ---------- Construction ---------- */

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
}

export function buildDataset(): Dataset {
  graine = 20260909;
  compteurActe = 0;

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
      fabriquerActe(modele.type, a.id, `${a.prenom} ${a.nom}`, modele.bureauId, dateEntre(2026, 2026), pick(enCours))
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
      horodatage: `${dateEntre(2026, 2026)}T${pad(int(7, 18), 2)}:${pad(int(0, 59), 2)}:00`,
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
    const dateOuverture = `${dateEntre(2026, 2026)}T${pad(int(7, 17), 2)}:${pad(int(0, 59), 2)}:00`;
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
    let horodatage = new Date(`${dateEntre(2026, 2026)}T08:00:00`).getTime();
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
  ouvrirFil("CNV-006", "ENTITE", "Directions départementales", ["USR-002", "USR-008", "USR-009"], "ENT-DD-02", 6);
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

  return {
    entites: ENTITES, corps: CORPS, grades: GRADES,
    postes, agents, situations, affectations, positions, actes, besoins,
    utilisateurs, journal, notifications,
    tickets, messagesTicket, conversations, messages, annonces, parametres,
  };
}
