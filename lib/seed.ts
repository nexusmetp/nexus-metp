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
  entiteById, enfantsDe, gradeById, categorieStatutaireDe, REGLES_CATEGORIE,
} from "@/lib/referentiels";
import type {
  Acte, Affectation, Agent, BesoinPersonnel, CategoriePersonnel, EntreeJournal,
  EtapeActe, Notification, Position, Poste, SituationCarriere, StatutActe, TypeActe,
  Utilisateur,
} from "@/lib/types";

/* ---------- PRNG déterministe ---------- */
let graine = 20260909;
const rnd = () => {
  graine = (graine * 1103515245 + 12345) & 0x7fffffff;
  return graine / 0x7fffffff;
};
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
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

  return {
    entites: ENTITES, corps: CORPS, grades: GRADES,
    postes, agents, situations, affectations, positions, actes, besoins,
    utilisateurs, journal, notifications,
  };
}
