import type {
  Affectation, Agent, Conge, Pointage, RemunerationContractuelle, SortieTerritoire, Utilisateur,
} from "@/lib/types";
import { REGLES_CATEGORIE } from "@/lib/referentiels/statut";
import { estOuvre } from "@/lib/referentiels/presence";
import { AUJOURDHUI, chance, int, iso, pad, pick, plusJours } from "./aleatoire";

/* ------------------------------------------------------------------ */
/* Présences, sorties et rémunérations — décor de démonstration        */
/* ------------------------------------------------------------------ */

/**
 * Ce que ce semis fabrique, et ce qu'il se refuse à fabriquer.
 *
 * Il pose des pointages plausibles sur les vingt derniers jours ouvrés, des
 * autorisations de sortie, et des rémunérations pour les personnels hors
 * grille. Rien de tout cela n'est réel : ce sont des données fictives, comme
 * le reste du décor, et l'application le dit à l'écran.
 *
 * Une exception assumée : **un tiers des montants de rémunération est laissé
 * à `null`**. Ce n'est pas une lacune du semis, c'est le cas le plus fréquent
 * dans un ministère qui n'a pas encore centralisé ses contrats — et les
 * écrans doivent savoir l'afficher sans tricher. Un décor où tout est
 * renseigné donnerait à croire que l'agrégat est toujours complet.
 */

const DESTINATIONS: [string, string][] = [
  ["Paris", "France"], ["Bruxelles", "Belgique"], ["Rabat", "Maroc"],
  ["Dakar", "Sénégal"], ["Abidjan", "Côte d'Ivoire"], ["Libreville", "Gabon"],
  ["Kinshasa", "République démocratique du Congo"], ["Yaoundé", "Cameroun"],
  ["Genève", "Suisse"], ["Pékin", "Chine"], ["Tunis", "Tunisie"],
];

const MOTIFS_SORTIE: [SortieTerritoire["nature"], string, string][] = [
  ["MISSION", "Réunion des ministres de l'enseignement technique", "Ordre de mission"],
  ["MISSION", "Négociation d'une convention de partenariat", "Ordre de mission"],
  ["FORMATION", "Séminaire de perfectionnement en ingénierie de formation", "Autorisation d'absence"],
  ["FORMATION", "Master en administration publique", "Arrêté de mise en stage"],
  ["CONGE", "Congé annuel passé hors du territoire", "Autorisation de sortie du territoire"],
  ["SANTE", "Évacuation sanitaire", "Autorisation de sortie du territoire"],
  ["PERSONNEL", "Motif familial", "Autorisation de sortie du territoire"],
];

const SIGNATAIRES = [
  "Le Ministre de l'enseignement technique et professionnel",
  "Le Directeur général de l'administration et des ressources humaines",
  "Le Secrétaire général",
];

/** Les vingt derniers jours ouvrés, du plus ancien au plus récent. */
function derniersJoursOuvres(n: number): string[] {
  const out: string[] = [];
  const d = new Date(AUJOURDHUI + "T12:00:00");
  while (out.length < n) {
    const j = iso(d);
    if (estOuvre(j)) out.unshift(j);
    d.setDate(d.getDate() - 1);
  }
  return out;
}

export function construirePresence({ agents, affectations, conges, utilisateurs }: {
  agents: Agent[];
  affectations: Affectation[];
  conges: Conge[];
  utilisateurs: Utilisateur[];
}): {
  pointages: Pointage[];
  sorties: SortieTerritoire[];
  remunerations: RemunerationContractuelle[];
} {
  const entiteDe = new Map<string, string>();
  affectations
    .filter((a) => !a.dateFin)
    .forEach((a) => entiteDe.set(a.agentId, a.entiteId));

  const saisisseur = utilisateurs.find((u) => u.role === "CHEF_BUREAU") ?? utilisateurs[0];
  const jours = derniersJoursOuvres(20);

  /* ---------------- Sorties du territoire ---------------- */
  const sorties: SortieTerritoire[] = [];
  const candidatsSortie = agents.filter((_, i) => i % 23 === 0).slice(0, 34);
  candidatsSortie.forEach((a, i) => {
    const [ville, pays] = pick(DESTINATIONS);
    const [nature, motif, typeActe] = pick(MOTIFS_SORTIE);
    /* Réparties autour d'aujourd'hui : certaines à venir, une bonne part en
       cours, quelques-unes rentrées, et deux ou trois en retard de retour —
       c'est le cas que le ministère doit voir en premier. */
    const decalage = int(-90, 30);
    const dateDepart = plusJours(AUJOURDHUI, decalage);
    const duree = int(4, 28);
    const dateRetourPrevue = plusJours(dateDepart, duree);
    const rentre = dateRetourPrevue < AUJOURDHUI && chance(0.72);
    sorties.push({
      id: `SRT-${pad(i + 1, 4)}`,
      agentId: a.id,
      entiteId: entiteDe.get(a.id),
      destination: ville,
      pays,
      motif,
      nature,
      dateDepart,
      dateRetourPrevue,
      dateRetourReelle: rentre ? plusJours(dateRetourPrevue, int(-2, 3)) : null,
      statut: dateDepart > AUJOURDHUI ? "AUTORISEE" : rentre ? "RENTREE" : "EN_COURS",
      typeActe,
      referenceActe: `${pad(int(1, 480), 4)}/METP-CAB/${new Date(dateDepart).getFullYear()}`,
      autoriteSignataire: pick(SIGNATAIRES),
      priseEnCharge: nature === "MISSION" ? "ETAT" : nature === "FORMATION" ? pick(["ETAT", "PARTENAIRE"]) : null,
    });
  });

  /* Qui est dehors quel jour : sert à accorder les pointages aux sorties. */
  const sortieDuJour = (agentId: string, jour: string) =>
    sorties.find((s) =>
      s.agentId === agentId
      && s.statut !== "REFUSEE" && s.statut !== "ANNULEE"
      && jour >= s.dateDepart
      && jour <= (s.dateRetourReelle ?? s.dateRetourPrevue));

  const congeDuJour = (agentId: string, jour: string) =>
    conges.find((c) =>
      c.agentId === agentId
      && (c.statut === "ACCORDE" || c.statut === "PRIS")
      && jour >= c.dateDebut && jour <= c.dateFin);

  /* ---------------- Pointages ---------------- */
  const pointages: Pointage[] = [];
  /* Un sous-ensemble d'agents : un ministère ne pointe pas encore partout, et
     un décor qui pointerait 100 % des agents ferait croire le déploiement
     achevé. Ceux-là relèvent des services qui ont commencé. */
  const pointes = agents.filter((_, i) => i % 3 === 0);

  /* Quelques agents en absence continue, pour que la détection d'absence
     prolongée ait de quoi mordre. */
  const enAbsenceLongue = new Set(pointes.filter((_, i) => i % 47 === 0).map((a) => a.id));

  pointes.forEach((a) => {
    jours.forEach((jour) => {
      const sortie = sortieDuJour(a.id, jour);
      const conge = congeDuJour(a.id, jour);
      let etat: Pointage["etat"];
      let heureArrivee: string | null = null;
      let heureDepart: string | null = null;

      if (sortie) etat = sortie.nature === "MISSION" ? "MISSION" : "SORTIE_TERRITOIRE";
      else if (conge) etat = "CONGE";
      else if (enAbsenceLongue.has(a.id) && jour >= plusJours(AUJOURDHUI, -12)) etat = "ABSENT_NON_JUSTIFIE";
      else if (chance(0.055)) etat = "ABSENT_JUSTIFIE";
      else if (chance(0.022)) etat = "ABSENT_NON_JUSTIFIE";
      else if (chance(0.09)) etat = "RETARD";
      else if (chance(0.02)) etat = "DEPART_ANTICIPE";
      else etat = "PRESENT";

      if (etat === "PRESENT" || etat === "RETARD" || etat === "DEPART_ANTICIPE") {
        const h = etat === "RETARD" ? int(8, 10) : int(7, 8);
        heureArrivee = `${pad(h, 2)}:${pad(int(0, 59), 2)}`;
        heureDepart = etat === "DEPART_ANTICIPE"
          ? `${pad(int(12, 14), 2)}:${pad(int(0, 59), 2)}`
          : `${pad(int(15, 17), 2)}:${pad(int(0, 59), 2)}`;
      }

      pointages.push({
        id: `PTG-${a.id}-${jour}`,
        agentId: a.id,
        date: jour,
        etat,
        heureArrivee,
        heureDepart,
        /* Aucune minute de retard n'est posée : l'heure d'ouverture n'est pas
           renseignée, donc rien ne peut être calculé. Le retard est un
           constat, pas un chiffre. */
        minutesRetard: null,
        congeId: conge?.id ?? null,
        sortieId: sortie?.id ?? null,
        entiteId: entiteDe.get(a.id),
        saisiPar: saisisseur.id,
        saisiParNom: saisisseur.nomComplet,
        saisiLe: `${jour}T17:30:00.000Z`,
      });
    });
  });

  /* ---------------- Rémunérations hors grille ---------------- */
  const remunerations: RemunerationContractuelle[] = [];
  const horsGrille = agents.filter((a) => !REGLES_CATEGORIE[a.categorie].carriereStatutaire);
  horsGrille.forEach((a, i) => {
    const nature = a.categorie === "VACATAIRE" ? "VACATION"
      : a.categorie === "PRESTATAIRE" ? pick<RemunerationContractuelle["nature"]>(["MENSUELLE", "FORFAIT"])
      : "MENSUELLE";
    /* Un tiers sans montant : c'est la réalité d'un ministère qui n'a pas
       centralisé ses contrats, et les agrégats doivent le dire. */
    const connu = !chance(0.33);
    remunerations.push({
      id: `REM-${pad(i + 1, 4)}`,
      agentId: a.id,
      nature,
      montant: connu ? int(12, 55) * 5000 : null,
      quantite: nature === "VACATION" ? (connu ? int(40, 120) : null) : null,
      dateDebut: a.dateRecrutement,
      dateFin: null,
      reference: connu ? `Contrat n° ${pad(int(1, 999), 3)}/METP-DGARH/${new Date(a.dateRecrutement).getFullYear()}` : undefined,
      /* Le montant vient d'un contrat que personne n'a versé au dossier : il
         est donc à vérifier, jamais présenté comme établi. */
      provenance: "A_VERIFIER",
      observations: connu ? undefined : "Montant non communiqué par le service gestionnaire.",
    });
  });

  return { pointages, sorties, remunerations };
}
