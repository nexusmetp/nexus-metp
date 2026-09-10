import type { NaturePosition, StatutActe, TypeActe } from "@/lib/types";

/* Actes — cahier §08                                                  */
/* ------------------------------------------------------------------ */

export const TYPES_ACTE: {
  type: TypeActe; libelle: string; effet: string; bureauId: string;
}[] = [
  { type: "RECRUTEMENT", libelle: "Recrutement", effet: "Création du dossier, carrière initiale", bureauId: "ENT-SPC-BRM" },
  { type: "PRISE_DE_SERVICE", libelle: "Prise de service", effet: "Date effective, activation", bureauId: "ENT-SPC-BRM" },
  { type: "TITULARISATION", libelle: "Titularisation", effet: "Situation statutaire", bureauId: "ENT-SPC-BGC" },
  { type: "AFFECTATION", libelle: "Affectation", effet: "Entité, poste, fonction", bureauId: "ENT-SPC-BRM" },
  { type: "MUTATION", libelle: "Mutation", effet: "Entité, poste, département", bureauId: "ENT-SPC-BRM" },
  { type: "AVANCEMENT", libelle: "Avancement", effet: "Échelon, indice, date d'effet", bureauId: "ENT-SPC-BGC" },
  { type: "PROMOTION", libelle: "Promotion", effet: "Grade, classe, corps", bureauId: "ENT-SPC-BGC" },
  { type: "FORMATION", libelle: "Formation ou stage", effet: "Bloc formation, position si détachement", bureauId: "ENT-SF-BFPE" },
  { type: "CONGE", libelle: "Congé", effet: "Position administrative, solde", bureauId: "ENT-SPC-BGC" },
  { type: "POSITION", libelle: "Position administrative", effet: "Disponibilité, détachement, mise à disposition", bureauId: "ENT-SPC-BGC" },
  { type: "SANCTION", libelle: "Sanction", effet: "Situation administrative, historique disciplinaire", bureauId: "ENT-SPC-BCX" },
  { type: "CONTENTIEUX", libelle: "Contentieux", effet: "Dossier contentieux et suites", bureauId: "ENT-SPC-BCX" },
  { type: "INDEMNITE", libelle: "Indemnité ou prime", effet: "Bloc rémunération", bureauId: "ENT-SAA-BICA" },
  { type: "FIN_CARRIERE", libelle: "Fin de carrière", effet: "Clôture du dossier", bureauId: "ENT-SPC-BGC" },
];

const typeActeIndex = new Map(TYPES_ACTE.map((t) => [t.type, t]));
export const typeActeById = (t: TypeActe) => typeActeIndex.get(t);

/** Circuit d'instruction de référence — cahier §09. */
export const CIRCUIT_ACTE: { ordre: number; libelle: string; entiteId: string }[] = [
  { ordre: 1, libelle: "Réception et enregistrement", entiteId: "ENT-SEC-BCRPC" },
  { ordre: 2, libelle: "Instruction du dossier", entiteId: "ENT-SPC-BRM" },
  { ordre: 3, libelle: "Avis et propositions du service", entiteId: "ENT-DPCEF-SPC" },
  { ordre: 4, libelle: "Validation de la direction", entiteId: "ENT-DPCEF" },
  { ordre: 5, libelle: "Signature", entiteId: "ENT-DGARH" },
  { ordre: 6, libelle: "Notification et archivage", entiteId: "ENT-SAD-BA" },
];

export const STATUT_ACTE_LABELS: Record<StatutActe, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  EN_INSTRUCTION: "En instruction",
  VALIDE_SERVICE: "Validé service",
  VALIDE_DIRECTION: "Validé direction",
  SIGNE: "Signé",
  NOTIFIE: "Notifié",
  ARCHIVE: "Archivé",
  REJETE: "Rejeté",
  RETOURNE: "Retourné pour complément",
};

/** Statuts qui comptent comme « dossier en circulation ». */
export const STATUTS_EN_COURS: StatutActe[] =
  ["SOUMIS", "EN_INSTRUCTION", "VALIDE_SERVICE", "VALIDE_DIRECTION", "RETOURNE"];

export const POSITION_LABELS: Record<NaturePosition, string> = {
  ACTIVITE: "En activité",
  CONGE: "Congé",
  DISPONIBILITE: "Disponibilité",
  DETACHEMENT: "Détachement",
  MISE_A_DISPOSITION: "Mise à disposition",
  SUSPENSION: "Suspension",
  RETRAITE: "Retraité",
};

/* ------------------------------------------------------------------ */
