/**
 * Moteur du circuit d'instruction — cahier §08, §09, §11, §12.
 *
 * Trois règles y sont codées, pas seulement documentées :
 *   1. Un acte ne change d'état que par une transition autorisée.
 *   2. Personne ne valide ce qu'il a instruit (§11).
 *   3. Le dossier ne bouge qu'à la dernière étape, et chaque transition
 *      écrit au journal (§09 étape 10, §12).
 */

import type {
  Acte, Affectation, EntreeJournal, Position, SituationCarriere, StatutActe, Utilisateur,
} from "@/lib/types";
import { CIRCUIT_ACTE, peut } from "@/lib/referentiels";

export type CodeTransition =
  | "soumettre" | "enregistrer" | "instruire" | "retourner"
  | "valider_service" | "valider_direction" | "signer"
  | "notifier" | "archiver" | "rejeter";

export interface Transition {
  code: CodeTransition;
  libelle: string;
  vers: StatutActe;
  /** Style du bouton dans l'interface. */
  ton: "principal" | "neutre" | "danger";
  /** Motif obligatoire (retour, rejet). */
  motifRequis?: boolean;
}

const T: Record<CodeTransition, Omit<Transition, "code">> = {
  soumettre:        { libelle: "Soumettre",              vers: "SOUMIS",           ton: "principal" },
  enregistrer:      { libelle: "Enregistrer",            vers: "EN_INSTRUCTION",   ton: "principal" },
  instruire:        { libelle: "Transmettre au service", vers: "VALIDE_SERVICE",   ton: "principal" },
  retourner:        { libelle: "Retourner pour complément", vers: "RETOURNE",      ton: "neutre", motifRequis: true },
  valider_service:  { libelle: "Valider (service)",      vers: "VALIDE_SERVICE",   ton: "principal" },
  valider_direction:{ libelle: "Valider (direction)",    vers: "VALIDE_DIRECTION", ton: "principal" },
  signer:           { libelle: "Signer",                 vers: "SIGNE",            ton: "principal" },
  notifier:         { libelle: "Notifier et appliquer",  vers: "NOTIFIE",          ton: "principal" },
  archiver:         { libelle: "Archiver",               vers: "ARCHIVE",          ton: "neutre" },
  rejeter:          { libelle: "Rejeter",                vers: "REJETE",           ton: "danger", motifRequis: true },
};

const VALIDEURS = ["CHEF_SERVICE", "DIRECTEUR_CENTRAL", "DIRECTEUR_GENERAL"];

/** Motif de blocage d'une transition, ou null si elle est ouverte. */
export function blocage(acte: Acte, u: Utilisateur, code: CodeTransition): string | null {
  if (!peut(u.role, "actes", "W")) return "Votre rôle ne permet pas d'agir sur les actes.";

  if (code === "valider_service" || code === "valider_direction" || code === "signer") {
    // Règle §11 : personne ne valide ce qu'il a instruit.
    if (acte.instruitPar && acte.instruitPar === u.id) {
      return "Vous avez instruit ce dossier : sa validation revient à un autre agent.";
    }
    if (!VALIDEURS.includes(u.role)) return "Seul un chef de service, un directeur central ou le directeur général valide.";
  }
  if (code === "signer" && u.role !== "DIRECTEUR_GENERAL") {
    return "La signature relève du directeur général.";
  }
  return null;
}

/** Transitions ouvertes depuis l'état courant, indépendamment du rôle. */
export function transitionsDepuis(statut: StatutActe): CodeTransition[] {
  switch (statut) {
    case "BROUILLON":        return ["soumettre"];
    case "SOUMIS":           return ["enregistrer", "rejeter"];
    case "EN_INSTRUCTION":   return ["instruire", "retourner", "rejeter"];
    case "RETOURNE":         return ["enregistrer", "rejeter"];
    case "VALIDE_SERVICE":   return ["valider_direction", "retourner", "rejeter"];
    case "VALIDE_DIRECTION": return ["signer", "retourner", "rejeter"];
    case "SIGNE":            return ["notifier"];
    case "NOTIFIE":          return ["archiver"];
    default:                 return [];
  }
}

export const transitionsPour = (acte: Acte, u: Utilisateur) =>
  transitionsDepuis(acte.statut).map((code) => ({
    ...T[code], code, blocage: blocage(acte, u, code),
  }));

/** Index d'étape du circuit correspondant à un statut. */
export function etapeCourante(statut: StatutActe): number {
  switch (statut) {
    case "BROUILLON": return 0;
    case "SOUMIS": return 0;
    case "EN_INSTRUCTION":
    case "RETOURNE": return 1;
    case "VALIDE_SERVICE": return 2;
    case "VALIDE_DIRECTION": return 3;
    case "SIGNE": return 4;
    case "NOTIFIE": return 5;
    case "ARCHIVE": return CIRCUIT_ACTE.length;
    default: return CIRCUIT_ACTE.length;
  }
}

export interface Effets {
  affectationsFermees: Affectation[];
  affectationsCreees: Affectation[];
  situationsFermees: SituationCarriere[];
  situationsCreees: SituationCarriere[];
  positionsFermees: Position[];
  positionsCreees: Position[];
}

const vide = (): Effets => ({
  affectationsFermees: [], affectationsCreees: [],
  situationsFermees: [], situationsCreees: [],
  positionsFermees: [], positionsCreees: [],
});

/**
 * Report de l'acte dans le dossier — étape 10 du §09, uniquement à la
 * notification. Un acte signé mais non notifié laisse le dossier inchangé,
 * ce qui est le comportement administratif réel.
 */
export function calculerEffets(
  acte: Acte,
  courantes: { affectations: Affectation[]; situations: SituationCarriere[]; positions: Position[] }
): Effets {
  const out = vide();
  const cible = acte.cible;
  if (!cible) return out;
  const dateEffet = cible.dateEffet ?? acte.dateSignature ?? acte.dateCreation;
  const ouverte = <T extends { agentId: string; dateFin: string | null }>(rows: T[]) =>
    rows.find((r) => r.agentId === acte.agentId && r.dateFin === null);

  if (acte.type === "MUTATION" || acte.type === "AFFECTATION") {
    if (!cible.entiteId) return out;
    const actuelle = ouverte(courantes.affectations);
    if (actuelle) out.affectationsFermees.push({ ...actuelle, dateFin: dateEffet });
    out.affectationsCreees.push({
      id: `AFF-${acte.id}`,
      agentId: acte.agentId,
      entiteId: cible.entiteId,
      posteId: cible.posteId ?? null,
      fonction: cible.fonction ?? "Agent",
      dateEffet,
      dateFin: null,
      acteId: acte.id,
    });
  }

  if (acte.type === "AVANCEMENT" || acte.type === "PROMOTION") {
    const actuelle = ouverte(courantes.situations);
    if (!actuelle) return out;
    out.situationsFermees.push({ ...actuelle, dateFin: dateEffet });
    out.situationsCreees.push({
      ...actuelle,
      id: `SIT-${acte.id}`,
      gradeId: cible.gradeId ?? actuelle.gradeId,
      classe: cible.classe ?? actuelle.classe,
      echelon: cible.echelon ?? actuelle.echelon,
      dateEffet,
      dateFin: null,
      acteId: acte.id,
    });
  }

  if (acte.type === "CONGE" || acte.type === "POSITION") {
    const actuelle = ouverte(courantes.positions);
    if (actuelle) out.positionsFermees.push({ ...actuelle, dateFin: dateEffet });
    out.positionsCreees.push({
      id: `POS-${acte.id}`,
      agentId: acte.agentId,
      nature: cible.nature ?? "CONGE",
      motif: cible.motif,
      dateEffet,
      dateFin: null,
      acteId: acte.id,
    });
  }

  return out;
}

export const effetsVides = (e: Effets) =>
  !e.affectationsCreees.length && !e.situationsCreees.length && !e.positionsCreees.length;

/** Acte après transition. Ne touche jamais au dossier : cf. calculerEffets. */
export function appliquerTransition(
  acte: Acte, code: CodeTransition, u: Utilisateur, motif?: string
): Acte {
  const t = T[code];
  const maintenant = new Date().toISOString();
  const jour = maintenant.slice(0, 10);
  const idxAvant = etapeCourante(acte.statut);
  const idxApres = etapeCourante(t.vers);

  const etapes = acte.etapes.map((e, k) => {
    if (k < idxApres) {
      return {
        ...e,
        statut: "TERMINEE" as const,
        dateEntree: e.dateEntree ?? jour,
        dateSortie: e.dateSortie ?? jour,
        utilisateur: e.utilisateur ?? u.nomComplet,
      };
    }
    if (k === idxApres) {
      return {
        ...e,
        statut: "EN_COURS" as const,
        dateEntree: jour,
        dateSortie: undefined,
        utilisateur: u.nomComplet,
        commentaire: code === "retourner" || code === "rejeter" ? motif : undefined,
      };
    }
    return { ...e, statut: "A_VENIR" as const, dateEntree: undefined, dateSortie: undefined, utilisateur: undefined };
  });

  return {
    ...acte,
    statut: t.vers,
    etapes,
    // L'instructeur est celui qui transmet : c'est lui qui ne pourra pas valider.
    instruitPar: code === "instruire" ? u.id : acte.instruitPar,
    assigneA: code === "enregistrer" ? u.id : acte.assigneA,
    dateSignature: code === "signer" ? jour : acte.dateSignature,
    effetsAppliques: code === "notifier" ? true : acte.effetsAppliques,
  };
}

/** Entrée de journal — en ajout seul, toujours rattachée à l'acte (§12). */
export function entreeJournal(
  acte: Acte, code: CodeTransition, u: Utilisateur, avant: StatutActe, motif?: string
): EntreeJournal {
  const action: EntreeJournal["action"] =
    code === "signer" ? "SIGNATURE"
    : code === "rejeter" ? "REJET"
    : code.startsWith("valider") ? "VALIDATION"
    : code === "soumettre" ? "CREATION"
    : "MODIFICATION";
  return {
    id: `JRN-${acte.id}-${Date.now()}`,
    horodatage: new Date().toISOString(),
    utilisateurId: u.id,
    utilisateur: u.nomComplet,
    adresseIp: "session locale",
    action,
    cibleType: "Acte",
    cibleId: acte.id,
    champ: "statut",
    ancienneValeur: avant,
    nouvelleValeur: T[code].vers,
    acteId: acte.id,
    justification: motif ?? T[code].libelle,
  };
}
