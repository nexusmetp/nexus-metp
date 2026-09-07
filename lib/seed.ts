import { ENTITES, GRADES, DEPARTEMENTS, gradeById } from "@/lib/referentiels";
import type {
  Acte, Agent, Categorie, DemandeConge, Entite, JournalEntry, Notification, Poste, Utilisateur,
} from "@/lib/types";

/* ---------- PRNG déterministe (données fictives stables) ---------- */
let seed = 20260706;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pad = (n: number, l = 6) => String(n).padStart(l, "0");

const NOMS = ["MABIALA","NGOMA","OKEMBA","BOUITY","MALONGA","TCHIKAYA","NGATSE","MOUKALA","BIKINDOU","SAMBA","LOEMBA","NKOUNKOU","MASSAMBA","ONDONGO","IBARA","BAKALA","MOUANDA","KIMBEMBE","NIANGA","OBAMBI","MPASSI","GANGA","BANZOUZI","MOUYABI","NKODIA","TSIBA","OKO","MABIKA","BOUNDA","MAKAYA","ELENGA","ONDZE","KOUMBA","BANTSIMBA","MILANDOU","NGOULOU","MAVOUNGOU","ITOUA","AKOUALA","DZON"];
const PRENOMS_M = ["Jean-Baptiste","Serge","Alphonse","Rodrigue","Christian","Pascal","Gildas","Frédéric","Aurélien","Brice","Dieudonné","Emmanuel","Ghislain","Hervé","Jonas","Landry","Marcel","Noël","Olivier","Prosper","Sylvain","Thierry","Ulrich","Victor"];
const PRENOMS_F = ["Clarisse","Ghislaine","Nadège","Sylvie","Berthe","Chanceline","Delphine","Edwige","Flore","Grace","Huguette","Inès","Josiane","Lydie","Mireille","Nathalie","Ornella","Patricia","Rachel","Sandrine","Thérèse","Yolande"];
const COMPETENCES = ["Gestion de la paie","SIRH","Droit de la fonction publique","Excel avancé","Archivage","Gestion de projet","Comptabilité publique","Pilotage RH","Ingénierie de formation","Rédaction administrative","Statistiques","Passation de marchés"];
const LANGUES = ["Français","Lingala","Kituba","Anglais","Portugais"];
const ETABS = ["Université Marien Ngouabi","ENAM Brazzaville","Lycée Technique 1er Mai","Institut Supérieur de Gestion","ENS Brazzaville","Université Denis Sassou Nguesso"];
const DIPLOMES = ["Licence en GRH","Master en Administration Publique","BTS Comptabilité","Ingénieur en Génie Civil","Master en Droit Public","DUT Informatique","Baccalauréat Technique","BEP Industriel"];
const FORMATIONS = ["Dématérialisation des procédures RH","Statut Général de la Fonction Publique","Pilotage par les KPI","Cybersécurité des données RH","Management d'équipe","Gestion des marchés publics"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dateBetween = (y1: number, y2: number) => iso(new Date(int(y1, y2), int(0, 11), int(1, 28)));

/* ---------- Postes ---------- */
const POSTE_MODELES: { intitule: string; niveau: Poste["niveau"]; grade: string }[] = [
  { intitule: "Directeur Général", niveau: "Stratégique", grade: "GR-A3" },
  { intitule: "Directeur Central", niveau: "Stratégique", grade: "GR-A4" },
  { intitule: "Chef de Service Personnel", niveau: "Encadrement", grade: "GR-B1" },
  { intitule: "Chef de Service Administratif", niveau: "Encadrement", grade: "GR-B2" },
  { intitule: "Gestionnaire des Carrières", niveau: "Exécution", grade: "GR-C1" },
  { intitule: "Gestionnaire de la Paie", niveau: "Exécution", grade: "GR-C2" },
  { intitule: "Technicien Supérieur SI", niveau: "Exécution", grade: "GR-C3" },
  { intitule: "Secrétaire de Direction", niveau: "Support", grade: "GR-C4" },
  { intitule: "Agent Administratif", niveau: "Support", grade: "GR-D1" },
  { intitule: "Agent Technique", niveau: "Support", grade: "GR-D2" },
];

export function buildDataset() {
  seed = 20260706;
  const entites: Entite[] = ENTITES;
  const postes: Poste[] = [];
  const agents: Agent[] = [];

  let pc = 0;
  const cibles = entites.filter((e) => e.type !== "MINISTERE");
  cibles.forEach((ent) => {
    const nb = ent.type === "DIRECTION_GENERALE" ? 9 : ent.type === "DIRECTION_DEPARTEMENTALE" ? 7 : 5;
    for (let i = 0; i < nb; i++) {
      const m = i === 0 && ent.type === "DIRECTION_GENERALE" ? POSTE_MODELES[0] : POSTE_MODELES[Math.min(i + 1, POSTE_MODELES.length - 1)];
      pc++;
      postes.push({
        id: `PST-${pad(pc, 4)}`,
        code: `${ent.code}-${pad(i + 1, 3)}`,
        intitule: m.intitule,
        entiteId: ent.id,
        gradeRequisId: m.grade,
        niveau: m.niveau,
        statut: "Vacant",
        titulaireId: null,
        budgetise: rnd() > 0.08,
      });
    }
  });

  /* ---------- Agents ---------- */
  let ac = 0;
  const createAgent = (entiteId: string, gradeId: string, posteId: string | null): Agent => {
    ac++;
    const sexe = rnd() > 0.42 ? "M" : "F";
    const nom = pick(NOMS);
    const prenom = sexe === "M" ? pick(PRENOMS_M) : pick(PRENOMS_F);
    const g = gradeById(gradeId)!;
    const echelon = int(1, g.echelons);
    const indice = Math.round(g.indiceDebut + ((g.indiceFin - g.indiceDebut) * (echelon - 1)) / Math.max(1, g.echelons - 1));
    const statut = rnd() > 0.24 ? "Titulaire" : rnd() > 0.4 ? "Contractuel" : "Vacataire";
    const etatRnd = rnd();
    const etat = etatRnd > 0.94 ? "Détachement" : etatRnd > 0.9 ? "Disponibilité" : etatRnd > 0.885 ? "Suspendu" : "Actif";
    const dateRecrutement = dateBetween(1992, 2024);
    const ent = entites.find((e) => e.id === entiteId)!;
    const nbEval = int(1, 3);

    const evaluations = Array.from({ length: nbEval }, (_, k) => {
      const c = int(60, 98), r = int(55, 97), cp = int(60, 99), eq = int(60, 98), inn = int(45, 95);
      return {
        id: `EVA-${pad(ac, 5)}-${k}`,
        annee: 2025 - k,
        competences: c, resultats: r, comportement: cp, equipe: eq, innovation: inn,
        noteGlobale: Math.round(c * 0.3 + r * 0.25 + cp * 0.2 + eq * 0.15 + inn * 0.1),
        appreciation: pick(["Excellent élément, très impliqué", "Bon agent, résultats conformes", "Progression satisfaisante", "Doit renforcer la rigueur administrative"]),
        evaluateur: `${pick(NOMS)} ${pick(PRENOMS_M)}`,
      };
    });

    const carriere = [
      { id: `CAR-${pad(ac, 5)}-0`, date: dateRecrutement, type: "Recrutement" as const, libelle: `Intégration – ${g.libelle}`, reference: `ARR-${int(100, 999)}/METP/SG/DGARH` },
      { id: `CAR-${pad(ac, 5)}-1`, date: dateBetween(2015, 2021), type: "Affectation" as const, libelle: `Affectation – ${ent.sigle}`, reference: `ARR-${int(100, 999)}/METP/SG/DGARH` },
    ];
    if (echelon > 2) carriere.push({ id: `CAR-${pad(ac, 5)}-2`, date: dateBetween(2022, 2025), type: "Avancement" as const, libelle: `Avancement à l'échelon ${echelon}`, reference: `ARR-${int(100, 999)}/METP/SG/DGARH` });

    return {
      id: `AGT-${pad(ac, 5)}`,
      matricule: `METP-${pad(100000 + ac)}`,
      nom, prenom, sexe,
      dateNaissance: dateBetween(1966, 2000),
      lieuNaissance: pick(DEPARTEMENTS).chefLieu,
      nationalite: "Congolaise",
      situationFamiliale: pick(["Célibataire", "Marié(e)", "Marié(e)", "Divorcé(e)", "Veuf(ve)"]) as Agent["situationFamiliale"],
      enfants: int(0, 6),
      telephone: `+242 0${int(4, 6)} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`,
      email: `${prenom.toLowerCase().replace(/[^a-z]/g, "")}.${nom.toLowerCase()}@metp.gouv.cg`,
      adresse: `${int(1, 250)} rue ${pick(["Loutassi", "Mbochis", "Bacongo", "Moungali", "Poto-Poto"])}, ${ent.ville}`,
      statut: statut as Agent["statut"],
      etat: etat as Agent["etat"],
      gradeId, echelon, categorie: g.categorie as Categorie,
      entiteId, posteId,
      dateRecrutement,
      dateDernierAvancement: dateBetween(2022, 2025),
      indice,
      soldeConges: int(0, 30),
      tauxCompletude: int(62, 100),
      diplomes: Array.from({ length: int(1, 3) }, () => ({ intitule: pick(DIPLOMES), etablissement: pick(ETABS), annee: int(1995, 2023) })),
      competences: Array.from(new Set(Array.from({ length: int(2, 5) }, () => pick(COMPETENCES)))),
      langues: Array.from(new Set(["Français", pick(LANGUES)])),
      carriere,
      evaluations,
      documents: [
        { id: `DOC-${pad(ac, 5)}-1`, nom: "Arrêté d'intégration.pdf", categorie: "Carrière", date: dateRecrutement, taille: `${int(120, 900)} Ko` },
        { id: `DOC-${pad(ac, 5)}-2`, nom: "Acte de naissance.pdf", categorie: "Identité", date: dateBetween(2010, 2020), taille: `${int(80, 400)} Ko` },
        { id: `DOC-${pad(ac, 5)}-3`, nom: "Diplôme certifié.pdf", categorie: "Formation", date: dateBetween(2005, 2022), taille: `${int(200, 1500)} Ko` },
      ],
      sanctions: rnd() > 0.9 ? [{ id: `SAN-${pad(ac, 5)}`, date: dateBetween(2020, 2025), groupe: pick([1, 1, 2, 3]) as 1 | 2 | 3, nature: pick(["Avertissement", "Blâme", "Exclusion temporaire (5j)"]), motif: pick(["Absences répétées non justifiées", "Manquement aux obligations de service", "Retards chroniques"]) }] : [],
      formations: Array.from({ length: int(0, 3) }, (_, k) => ({ id: `FOR-${pad(ac, 5)}-${k}`, intitule: pick(FORMATIONS), type: pick(["Continue", "Spécialisée", "E-learning", "Diplomante"]), annee: int(2022, 2026), statut: pick(["Terminée", "En cours", "Planifiée"]) })),
    };
  };

  // 1 titulaire pour ~82% des postes
  postes.forEach((p) => {
    if (rnd() > 0.18) {
      const a = createAgent(p.entiteId, p.gradeRequisId, p.id);
      p.statut = "Occupé";
      p.titulaireId = a.id;
      agents.push(a);
    } else if (rnd() > 0.85) {
      p.statut = "Gelé";
    }
  });

  // Agents sans poste nommé (personnel d'appui, enseignants administratifs, etc.)
  cibles.forEach((ent) => {
    const extra =
      ent.type === "DIRECTION_DEPARTEMENTALE" ? int(70, 140)
      : ent.type === "DIRECTION_GENERALE" ? int(40, 70)
      : ent.type === "DIRECTION_CENTRALE" ? int(18, 38)
      : int(8, 20);
    for (let i = 0; i < extra; i++) {
      agents.push(createAgent(ent.id, pick(["GR-C1", "GR-C2", "GR-C3", "GR-C4", "GR-D1", "GR-D2", "GR-B4", "GR-B4", "GR-B2"]), null));
    }
  });

  /* ---------- Actes / Workflows ---------- */
  const TYPES: Acte["type"][] = ["Nomination", "Mutation", "Avancement", "Promotion", "Recrutement", "Sanction", "Retraite"];
  const STATUTS: Acte["statut"][] = ["Brouillon", "Soumis", "Validation SG", "Validation Ministre", "Signé", "Rejeté", "Publié"];
  const actes: Acte[] = Array.from({ length: 64 }, (_, i) => {
    const ag = pick(agents);
    const type = pick(TYPES);
    const statut = pick(STATUTS);
    const dateCreation = dateBetween(2025, 2026);
    const flow = ["Initiation Gestionnaire RH", "Contrôle DGARH", "Validation Secrétaire Général", "Signature Ministre", "Publication"];
    const idx = STATUTS.indexOf(statut);
    return {
      id: `ACT-${pad(i + 1, 4)}`,
      reference: `ARR-${pad(int(100, 999), 4)}/METP/SG/DGARH-${2026}`,
      type,
      objet: `${type} de ${ag.prenom} ${ag.nom}`,
      agentId: ag.id,
      entiteId: ag.entiteId,
      posteCibleId: pick(postes).id,
      statut,
      dateCreation,
      dateEcheance: iso(new Date(new Date(dateCreation).getTime() + 15 * 864e5)),
      initiateur: `${pick(PRENOMS_M)} ${pick(NOMS)}`,
      etapes: flow.map((libelle, k) => ({
        libelle,
        acteur: ["Gestionnaire RH", "DGARH", "Secrétaire Général", "Ministre", "DSIC"][k],
        statut: k < idx ? "Terminé" : k === idx ? "En cours" : "À venir",
        date: k <= idx ? iso(new Date(new Date(dateCreation).getTime() + k * 3 * 864e5)) : undefined,
      })),
    } as Acte;
  });

  /* ---------- Congés ---------- */
  const conges: DemandeConge[] = Array.from({ length: 48 }, (_, i) => {
    const ag = pick(agents);
    const debut = new Date(2026, int(0, 11), int(1, 25));
    const jours = int(2, 30);
    return {
      id: `CNG-${pad(i + 1, 4)}`,
      reference: `DC-${pad(i + 1, 4)}/2026`,
      agentId: ag.id,
      type: pick(["Annuel", "Annuel", "Maladie", "Maternité", "Paternité", "Exceptionnel", "Formation", "Sans solde"]) as DemandeConge["type"],
      dateDebut: iso(debut),
      dateFin: iso(new Date(debut.getTime() + jours * 864e5)),
      jours,
      motif: pick(["Congé annuel réglementaire", "Raisons de santé", "Événement familial", "Formation diplômante", "Convenance personnelle"]),
      statut: pick(["En attente", "En attente", "Approuvé", "Approuvé", "Refusé", "En cours"]) as DemandeConge["statut"],
      validateur: `${pick(PRENOMS_M)} ${pick(NOMS)}`,
    };
  });

  /* ---------- Utilisateurs ---------- */
  const dd = entites.find((e) => e.id === "ENT-DD-02")!;
  const utilisateurs: Utilisateur[] = [
    { id: "USR-001", email: "admin@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Jade MELACK", role: "SUPER_ADMIN", entiteId: "ENT-DGARH", fonction: "Directeur Général de l'Administration et des RH", actif: true, mfa: true, derniereConnexion: "2026-07-06" },
    { id: "USR-002", email: "ministre@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Gustave F. R. ADICOLLE GOUM", role: "MINISTRE", entiteId: "ENT-METP", fonction: "Ministre de l'Enseignement Technique et Professionnel", actif: true, mfa: true, derniereConnexion: "2026-07-05" },
    { id: "USR-003", email: "sg@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Alphonse NGATSE", role: "SECRETAIRE_GENERAL", entiteId: "ENT-SG", fonction: "Secrétaire Général", actif: true, mfa: false, derniereConnexion: "2026-07-04" },
    { id: "USR-004", email: "ig@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Berthe MOUKALA", role: "INSPECTEUR_GENERAL", entiteId: "ENT-IG", fonction: "Inspecteur Général", actif: true, mfa: true },
    { id: "USR-005", email: "dget@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Rodrigue OKEMBA", role: "DIRECTEUR_GENERAL", entiteId: "ENT-DGET", fonction: "Directeur Général de l'Enseignement Technique", actif: true, mfa: false },
    { id: "USR-006", email: "dd.brazzaville@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Sylvie LOEMBA", role: "DIRECTEUR_DEPARTEMENTAL", entiteId: dd.id, fonction: `Directeur Départemental – Brazzaville`, actif: true, mfa: false },
    { id: "USR-007", email: "rh@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Ghislain MABIALA", role: "GESTIONNAIRE_RH", entiteId: "ENT-DRH", fonction: "Gestionnaire RH – DRH", actif: true, mfa: false },
    { id: "USR-008", email: "agent@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: `${agents[0].prenom} ${agents[0].nom}`, role: "AGENT", entiteId: agents[0].entiteId, agentId: agents[0].id, fonction: "Agent – Portail libre-service", actif: true, mfa: false },
    { id: "USR-009", email: "cabinet@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Prosper BANZOUZI", role: "DIRECTEUR_CABINET", entiteId: "ENT-CAB", fonction: "Directeur de Cabinet", actif: true, mfa: true },
    { id: "USR-010", email: "dsic@metp.gouv.cg", motDePasse: "Nexus2026", nomComplet: "Ulrich TSIBA", role: "DIRECTEUR_CENTRAL", entiteId: "ENT-DSIC", fonction: "Directeur des Systèmes d'Information", actif: false, mfa: false },
  ];

  const journal: JournalEntry[] = Array.from({ length: 40 }, (_, i) => ({
    id: `LOG-${pad(i + 1, 4)}`,
    date: `2026-07-0${int(1, 6)} ${pad(int(7, 19), 2)}:${pad(int(0, 59), 2)}`,
    utilisateur: pick(utilisateurs).nomComplet,
    action: pick(["Connexion", "Création fiche agent", "Modification grade", "Validation acte", "Export CSV", "Suppression poste", "Consultation dossier"]),
    cible: pick(agents).matricule,
    ip: `41.7${int(0, 9)}.${int(1, 254)}.${int(1, 254)}`,
  }));

  const notifications: Notification[] = [
    { id: "NTF-1", titre: "12 actes en attente de signature", message: "Le Ministre doit signer 12 arrêtés de nomination avant le 15/07/2026.", date: "2026-07-06", type: "alerte", lu: false },
    { id: "NTF-2", titre: "Avancements automatiques générés", message: "148 avancements d'échelon ont été calculés pour le 3ème trimestre.", date: "2026-07-05", type: "info", lu: false },
    { id: "NTF-3", titre: "Synchronisation paie réussie", message: "Échange de données avec le système de paie (MFP) terminé sans erreur.", date: "2026-07-05", type: "succes", lu: true },
    { id: "NTF-4", titre: "Dossiers incomplets", message: "312 dossiers agents ont un taux de complétude inférieur à 80 %.", date: "2026-07-04", type: "alerte", lu: true },
  ];

  return { entites, grades: GRADES, postes, agents, actes, conges, utilisateurs, journal, notifications };
}

export type Dataset = ReturnType<typeof buildDataset>;
