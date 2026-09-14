/**
 * Les règles du semis : qui peuple quoi, avec quel grade, sous quel acte.
 *
 * Ces choix ne sont pas décoratifs. Un établissement compte plus d'agents
 * qu'un secrétariat, un enseignant ne porte pas un grade d'encadrement, et une
 * direction départementale emploie plus de contractuels qu'une direction
 * centrale : le décor doit ressembler au ministère, sans quoi les écrans
 * mentent sur ce qu'ils sauront montrer.
 */

import { CIRCUIT_ACTE, TYPES_ACTE } from "@/lib/referentiels";
import { NOMS, PRENOMS_M, chance, int, pad, pick, plusJours, rnd } from "./aleatoire";
import type {
  Acte, CategoriePersonnel, EtapeActe, StatutActe, TypeActe,
} from "@/lib/types";


/* ---------- Répartition des effectifs ---------- */

export const effectifDe = (niveau: string) => {
  switch (niveau) {
    case "CABINET": return int(2, 4);
    case "ANTENNE_DEPARTEMENTALE": return int(2, 5);
    case "BUREAU": return int(4, 11);
    case "SERVICE": return int(2, 4);
    /* La division et la section sont les mailles de l'inspection : peu de
       monde, et du monde qui contrôle plutôt qu'il n'administre. */
    case "DIVISION": return int(2, 5);
    case "SECTION": return int(1, 3);
    case "DIRECTION": return int(2, 4);
    case "SECRETARIAT": return int(1, 3);
    case "DIRECTION_GENERALE": return int(3, 6);
    case "INSPECTION_GENERALE": return int(8, 14);
    /* Ces trois échelons portaient tout leur personnel en propre, faute
       d'avoir les services que leur donnent les arrêtés. Maintenant qu'ils les
       ont, ce chiffre ne compte plus que l'entourage immédiat du chef :
       l'effectif de la structure est la somme de son sous-arbre, et l'y
       ajouter une seconde fois le doublait. */
    case "INSPECTION_INTERDEPARTEMENTALE": return int(3, 6);
    case "DIRECTION_DEPARTEMENTALE": return int(3, 6);
    case "ETABLISSEMENT": return int(22, 48);
    default: return 0;
  }
};

/** Grades plausibles selon le niveau d'entité. */
export const gradesPour = (niveau: string, enseignant: boolean): string[] => {
  if (enseignant) return ["GR-ENS-PT", "GR-ENS-PTC", "GR-ENS-PTC"];
  switch (niveau) {
    case "DIRECTION_GENERALE": return ["GR-DIR-DG", "GR-ADM-1"];
    case "INSPECTION_GENERALE": return ["GR-INSP-1", "GR-INSP-2"];
    case "DIRECTION": return ["GR-DIR-DC", "GR-ADM-1"];
    case "SERVICE": return ["GR-ENC-CS1", "GR-ENC-CS2"];
    /* La division relève du contrôle : on y trouve des inspecteurs et de
       l'encadrement, pas des gestionnaires de dossiers. */
    case "DIVISION": return ["GR-INSP-2", "GR-ENC-CS2"];
    case "SECTION": return ["GR-INSP-2", "GR-TECH-1"];
    case "BUREAU": return ["GR-GEST-1", "GR-GEST-2", "GR-GEST-3", "GR-TECH-1", "GR-SERV-1"];
    case "DIRECTION_DEPARTEMENTALE": return ["GR-GEST-1", "GR-TECH-1", "GR-SERV-1", "GR-ENC-CS2"];
    case "ETABLISSEMENT": return ["GR-ENS-PTC", "GR-ENS-PT", "GR-SERV-1", "GR-GEST-3"];
    default: return ["GR-GEST-1", "GR-SERV-1"];
  }
};

export const tirerCategorie = (niveau: string): CategoriePersonnel => {
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

/** Le semis se rejoue à l'identique : le compteur repart de zéro avec lui. */
export const reinitialiserCompteurActe = () => { compteurActe = 0; };

export function fabriquerActe(
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
