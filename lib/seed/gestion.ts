/**
 * Gestion courante : congés, délégations, recrutement, formation, cartes.
 *
 * Ces enregistrements n'ont pas vocation à remplacer les actes — ils tiennent
 * ce qu'un acte isolé ne dit pas : un solde, un planning, une campagne.
 */

import { DEPARTEMENTS, ENTITES, GRADES, entiteById, gradeById } from "@/lib/referentiels";
import { TEXTES_CORPUS } from "@/lib/textes-corpus";
import type {
  Acte, Affectation, Agent, BesoinPersonnel, CampagneRecrutement, Candidature, CarteProfessionnelle, Conge,
  Delegation, InscriptionFormation, NatureConge, NatureFormation, OffreFormation,
  StatutCarte, TexteReglementaire, Utilisateur,
} from "@/lib/types";
import {
  chance, dateEntre, DIPLOMES, int, iso, NOMS, pad, pick, plusJours,
  PRENOMS_F, PRENOMS_M, rnd,
} from "./aleatoire";

export interface Gestion {
  conges: Conge[];
  delegations: Delegation[];
  textes: TexteReglementaire[];
  campagnes: CampagneRecrutement[];
  candidatures: Candidature[];
  offresFormation: OffreFormation[];
  inscriptions: InscriptionFormation[];
  cartes: CarteProfessionnelle[];
}

export function construireGestion(
  { agents, actes, utilisateurs, besoins, affectations }:
  {
    agents: Agent[]; actes: Acte[]; utilisateurs: Utilisateur[];
    besoins: BesoinPersonnel[]; affectations: Affectation[];
  }
): Gestion {
  /* ---------- Congés — le solde ne se déduit pas d'un acte isolé ---------- */
  const DROIT_ANNUEL = 30;
  const conges: Conge[] = [];
  let nConge = 0;
  agents.forEach((a) => {
    if (!chance(0.55)) return;
    const nb = int(1, 3);
    for (let k = 0; k < nb; k++) {
      nConge++;
      const nature = pick<NatureConge>(["ANNUEL", "ANNUEL", "ANNUEL", "MALADIE", "MATERNITE", "EXCEPTIONNEL", "SANS_SOLDE"]);
      const debut = `2026-${pad(int(1, 11), 2)}-${pad(int(1, 25), 2)}`;
      const jours = nature === "ANNUEL" ? int(5, 20) : nature === "MATERNITE" ? 98 : int(2, 12);
      conges.push({
        id: `CNG-${pad(nConge, 5)}`,
        agentId: a.id,
        nature,
        dateDebut: debut,
        dateFin: plusJours(debut, jours),
        jours,
        exercice: 2026,
        statut: pick(["PRIS", "PRIS", "ACCORDE", "DEMANDE", "REFUSE"]) as Conge["statut"],
        acteId: chance(0.7) ? pick(actes).id : null,
        motif: nature === "EXCEPTIONNEL" ? pick(["Événement familial", "Mariage", "Deuil"]) : undefined,
      });
    }
  });

  /* ---------- Délégations de signature et intérims ---------- */
  const delegations: Delegation[] = [
    {
      id: "DEL-0001", reference: "DEC-014/METP/DGARH-2026", portee: "SIGNATURE",
      delegantId: "USR-002", delegantNom: "Alphonse NGATSE",
      delegataireId: "USR-003", delegataireNom: "Berthe MOUKALA",
      entiteId: "ENT-DGARH",
      typesActe: ["AFFECTATION", "MUTATION", "CONGE"],
      dateDebut: "2026-09-01", dateFin: "2026-12-31",
      motif: "Délégation permanente pour les actes de gestion courante.",
      acteId: null,
    },
    {
      id: "DEL-0002", reference: "DEC-015/METP/DGARH-2026", portee: "INTERIM",
      delegantId: "USR-003", delegantNom: "Berthe MOUKALA",
      delegataireId: "USR-005", delegataireNom: "Rodrigue OKEMBA",
      entiteId: "ENT-DPCEF", typesActe: [],
      dateDebut: "2026-09-15", dateFin: "2026-09-30",
      motif: "Mission à l'intérieur du pays — intérim de la direction.",
      acteId: null,
    },
    {
      id: "DEL-0003", reference: "DEC-009/METP/DGARH-2026", portee: "SIGNATURE",
      delegantId: "USR-002", delegantNom: "Alphonse NGATSE",
      delegataireId: "USR-005", delegataireNom: "Rodrigue OKEMBA",
      entiteId: "ENT-DPCEF-SPC", typesActe: ["CONGE", "FORMATION"],
      dateDebut: "2026-03-01", dateFin: "2026-08-31",
      motif: "Délégation venue à échéance, conservée pour mémoire.",
      acteId: null, revoquee: false,
    },
    {
      id: "DEL-0004", reference: "DEC-011/METP/DGARH-2026", portee: "SIGNATURE",
      delegantId: "USR-002", delegantNom: "Alphonse NGATSE",
      delegataireId: "USR-006", delegataireNom: "Ghislain MABIALA",
      entiteId: "ENT-SPC-BRM", typesActe: ["AFFECTATION"],
      dateDebut: "2026-05-01", dateFin: "2026-10-31",
      motif: "Délégation révoquée à la suite d'une réorganisation du bureau.",
      acteId: null, revoquee: true,
    },
  ];

  /* ---------- Fonds documentaire réglementaire (§14) ---------- */
  const textes: TexteReglementaire[] = TEXTES_CORPUS;

  /* ---------- Recrutement : campagnes et candidatures ---------- */
  const campagnes: CampagneRecrutement[] = [
    {
      id: "CMP-0001", reference: "CON-01/METP-2026",
      intitule: "Concours direct de recrutement de professeurs techniques adjoints",
      annee: 2026, categorie: "FONCTIONNAIRE", postesOuverts: 180,
      disciplines: ["Génie civil", "Électrotechnique", "Mécanique", "Informatique", "Comptabilité"],
      dateOuverture: "2026-06-01", dateCloture: "2026-07-15", dateEpreuves: "2026-09-20",
      statut: "CORRECTION", entiteId: "ENT-SPC-BRM",
      besoinIds: besoins.slice(0, 12).map((b) => b.id),
    },
    {
      id: "CMP-0002", reference: "CON-02/METP-2026",
      intitule: "Recrutement de vacataires pour l'année scolaire 2026-2027",
      annee: 2026, categorie: "VACATAIRE", postesOuverts: 240,
      disciplines: ["Froid et climatisation", "Hôtellerie-restauration", "Secrétariat", "Agriculture"],
      dateOuverture: "2026-08-10", dateCloture: "2026-09-30",
      statut: "OUVERTE", entiteId: "ENT-SPC-BRM",
      besoinIds: besoins.slice(12, 40).map((b) => b.id),
    },
    {
      id: "CMP-0003", reference: "CON-03/METP-2026",
      intitule: "Concours professionnel d'accès au corps des inspecteurs",
      annee: 2026, categorie: "FONCTIONNAIRE", postesOuverts: 24,
      disciplines: ["Inspection pédagogique", "Inspection administrative"],
      dateOuverture: "2026-04-02", dateCloture: "2026-05-20", dateEpreuves: "2026-06-28",
      statut: "PROCLAMEE", entiteId: "ENT-SPC-BRM", besoinIds: [],
    },
    {
      id: "CMP-0004", reference: "CON-04/METP-2027",
      intitule: "Concours direct de recrutement de personnel administratif",
      annee: 2027, categorie: "FONCTIONNAIRE", postesOuverts: 60,
      disciplines: ["Gestion administrative", "Comptabilité publique", "Archivage"],
      dateOuverture: "2027-01-15", dateCloture: "2027-03-01",
      statut: "PREPARATION", entiteId: "ENT-SPC-BRM", besoinIds: [],
    },
  ];

  const candidatures: Candidature[] = [];
  let nCand = 0;
  campagnes.forEach((c) => {
    if (c.statut === "PREPARATION") return;
    const nb = c.statut === "OUVERTE" ? int(60, 90) : int(100, 160);
    for (let k = 0; k < nb; k++) {
      nCand++;
      const sexe = chance(0.42) ? "F" : "M";
      const proclame = c.statut === "PROCLAMEE";
      const note = c.statut === "OUVERTE" ? null : Math.round((6 + rnd() * 13) * 10) / 10;
      candidatures.push({
        id: `CAND-${pad(nCand, 5)}`,
        campagneId: c.id,
        numero: `${c.reference.split("/")[0]}-${pad(k + 1, 4)}`,
        nom: pick(NOMS),
        prenom: sexe === "F" ? pick(PRENOMS_F) : pick(PRENOMS_M),
        sexe,
        dateNaissance: dateEntre(1988, 2003),
        diplome: pick(DIPLOMES),
        discipline: pick(c.disciplines),
        departement: pick(DEPARTEMENTS).nom,
        statut: c.statut === "OUVERTE"
          ? pick(["DEPOSEE", "DEPOSEE", "RECEVABLE", "IRRECEVABLE"]) as Candidature["statut"]
          : proclame
            ? (note! >= 12 ? "ADMIS" : note! >= 10 ? "ADMISSIBLE" : "NON_ADMIS")
            : pick(["RECEVABLE", "RECEVABLE", "ADMISSIBLE", "IRRECEVABLE"]) as Candidature["statut"],
        note,
        rang: null,
        agentId: null,
      });
    }
  });
  // Le rang ne se tire pas au sort : il découle de la note, par campagne.
  campagnes.forEach((c) => {
    candidatures
      .filter((x) => x.campagneId === c.id && typeof x.note === "number")
      .sort((a, b) => (b.note ?? 0) - (a.note ?? 0))
      .forEach((x, i) => { x.rang = i + 1; });
  });

  /* ---------- Formation : catalogue et inscriptions ---------- */
  const ORGANISMES = ["ENAM Brazzaville", "École nationale supérieure polytechnique",
    "Institut de formation des cadres", "AFD — programme d'appui", "UNESCO-UNEVOC",
    "Centre de perfectionnement des enseignants"];
  const INTITULES_FORMATION = [
    "Ingénierie de la formation professionnelle",
    "Rédaction des actes administratifs",
    "Gestion de la paie et des carrières",
    "Approche par compétences en enseignement technique",
    "Maintenance des équipements d'atelier",
    "Passation des marchés publics",
    "Encadrement et gestion d'équipe",
    "Numérique éducatif et plateformes d'apprentissage",
    "Comptabilité publique et exécution budgétaire",
    "Archivage et gestion documentaire",
  ];

  const offresFormation: OffreFormation[] = INTITULES_FORMATION.map((intitule, i) => {
    const debut = `2026-${pad(int(1, 11), 2)}-${pad(int(1, 25), 2)}`;
    const duree = int(3, 20);
    return {
      id: `FRM-${pad(i + 1, 4)}`,
      reference: `PF-${pad(i + 1, 3)}/METP-2026`,
      intitule,
      nature: pick<NatureFormation>(["CONTINUE", "CONTINUE", "PERFECTIONNEMENT", "CERTIFIANTE", "RECONVERSION"]),
      organisme: pick(ORGANISMES),
      lieu: pick(["Brazzaville", "Pointe-Noire", "Dolisie", "À distance"]),
      dureeJours: duree,
      places: int(12, 40),
      dateDebut: debut,
      dateFin: plusJours(debut, duree),
      coutUnitaire: int(120, 850) * 1000,
      publicVise: pick(["Enseignants techniques", "Personnel administratif", "Encadrement", "Chefs d'établissement"]),
      statut: pick(["REALISEE", "OUVERTE", "PROGRAMMEE", "COMPLETE"]) as OffreFormation["statut"],
      /* Le service de la formation de la DPCEF, tel que l'arrêté n° 25567 le
         nomme. L'identifiant portait `ENT-SPC-BFC`, un bureau qui n'existe
         dans aucun texte et que la réécriture du référentiel a fait
         disparaître : les offres de formation pendaient alors à une entité
         inconnue, sans que rien ne le signale. */
      entiteId: "ENT-DPCEF-SF",
    };
  });

  const inscriptions: InscriptionFormation[] = [];
  let nIns = 0;
  offresFormation.forEach((o) => {
    const nb = Math.min(o.places, int(6, 34));
    for (let k = 0; k < nb; k++) {
      nIns++;
      const suivie = o.statut === "REALISEE";
      inscriptions.push({
        id: `INS-${pad(nIns, 5)}`,
        offreId: o.id,
        agentId: pick(agents).id,
        dateInscription: o.dateDebut,
        statut: suivie
          ? pick(["SUIVIE", "SUIVIE", "SUIVIE", "ABANDONNEE"]) as InscriptionFormation["statut"]
          : pick(["PROPOSEE", "RETENUE", "RETENUE", "REFUSEE"]) as InscriptionFormation["statut"],
        acteId: chance(0.4) ? pick(actes).id : null,
        resultat: suivie ? pick(["ACQUIS", "ACQUIS", "PARTIEL", "NON_ACQUIS"]) as any : null,
      });
    }
  });

  /* ---------- Cartes professionnelles —
     Elles n'attribuent aucun droit : elles attestent ce que les actes ont
     établi. Toutes les cartes ne sont pas éditées, et c'est le sujet : le
     module sert d'abord à voir qui n'en a pas. ---------- */
  const cartes: CarteProfessionnelle[] = [];
  let nCarte = 0;
  agents.forEach((a) => {
    if (!chance(0.62)) return;
    nCarte++;
    const aff = affectations.find((x) => x.agentId === a.id && x.dateFin === null);
    const emission = dateEntre(2022, 2026);
    const expiration = `${new Date(emission).getFullYear() + 5}-${emission.slice(5)}`;
    const perimee = expiration < "2026-09-10";
    cartes.push({
      id: `CRT-${pad(nCarte, 5)}`,
      numero: `${new Date(emission).getFullYear()}-${pad(nCarte, 5)}`,
      agentId: a.id,
      entiteId: aff?.entiteId ?? "ENT-METP",
      fonction: aff?.fonction ?? "Agent",
      dateEmission: emission,
      dateExpiration: expiration,
      statut: perimee ? "EXPIREE" : pick<StatutCarte>(["REMISE", "REMISE", "REMISE", "EDITEE", "PERDUE"]),
      emisePar: "Bureau du personnel — DGARH",
      dateRemise: chance(0.85) ? plusJours(emission, int(3, 40)) : null,
    });
  });

  return {
    conges, delegations, textes, campagnes, candidatures,
    offresFormation, inscriptions, cartes,
  };
}
