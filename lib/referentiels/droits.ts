import type { Role } from "@/lib/types";
import { descendantsDe } from "./entites";

/* Rôles, modules et permissions — cahier §11                          */
/* ------------------------------------------------------------------ */

export type ModuleKey =
  | "dgarh" | "national" | "organigramme" | "organisation" | "pilotage" | "agents" | "actes"
  | "carrieres" | "conges" | "formations" | "contentieux" | "besoins"
  | "referentiels" | "documents" | "textes" | "rapports" | "journal" | "administration"
  | "postes" | "recrutement" | "delegations" | "annuaire" | "retraite" | "aide" | "cartes"
  | "messagerie" | "tickets" | "annonces" | "mon-dossier";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dgarh: "Tableau de bord",
  national: "Vue nationale",
  organigramme: "Organigramme",
  organisation: "Organisation",
  pilotage: "Pilotage des directions",
  agents: "Agents",
  actes: "Actes",
  carrieres: "Carrières",
  conges: "Congés et positions",
  formations: "Formation",
  contentieux: "Contentieux",
  besoins: "États de besoins",
  referentiels: "Référentiels",
  documents: "Archives et GED",
  textes: "Fonds réglementaire",
  postes: "Tableau des emplois",
  recrutement: "Recrutement et concours",
  delegations: "Délégations et intérims",
  annuaire: "Annuaire",
  cartes: "Cartes professionnelles",
  retraite: "Départs à la retraite",
  aide: "Aide",
  rapports: "Rapports",
  journal: "Journal d'audit",
  administration: "Système",
  messagerie: "Messagerie",
  tickets: "Réclamations",
  annonces: "Notes et circulaires",
  "mon-dossier": "Mon dossier",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN_SYSTEME: "Administrateur système",
  DIRECTEUR_GENERAL: "Directeur général",
  DIRECTEUR_CENTRAL: "Directeur central",
  CHEF_SERVICE: "Chef de service",
  CHEF_BUREAU: "Chef de bureau",
  AGENT_INSTRUCTEUR: "Agent instructeur",
  DIRECTEUR_DEPARTEMENTAL: "Directeur départemental",
  CHEF_ETABLISSEMENT: "Chef d'établissement",
  AGENT: "Agent",
};

/** R = lecture, W = écriture (inclut la lecture), absent = aucun accès. */
export const DROITS: Record<Role, Partial<Record<ModuleKey, "R" | "W">>> = {
  ADMIN_SYSTEME: {
    organigramme: "R", referentiels: "W", administration: "W", journal: "W",
    national: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    textes: "W", annuaire: "R", aide: "R",
    cartes: "R",
  },
  DIRECTEUR_GENERAL: {
    dgarh: "W", organigramme: "W", organisation: "W", pilotage: "W", agents: "W",
    national: "R",
    actes: "W", carrieres: "R", conges: "R", formations: "R", contentieux: "R",
    besoins: "R", referentiels: "R", documents: "R", rapports: "W", journal: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    postes: "W", recrutement: "W", delegations: "W", textes: "W",
    annuaire: "R", retraite: "W", aide: "R",
    cartes: "W",
  },
  DIRECTEUR_CENTRAL: {
    dgarh: "R", organigramme: "R", pilotage: "R", agents: "W", actes: "W",
    national: "R",
    carrieres: "R", conges: "R", formations: "R", contentieux: "R", besoins: "R",
    referentiels: "R", documents: "R", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    postes: "W", recrutement: "W", delegations: "R", textes: "R",
    annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  CHEF_SERVICE: {
    dgarh: "R", organigramme: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    formations: "R", contentieux: "R", besoins: "R", documents: "R", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", delegations: "R", textes: "R",
    annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  CHEF_BUREAU: {
    dgarh: "R", organigramme: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    formations: "R", contentieux: "R", besoins: "R", documents: "W",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "W", textes: "R", annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  AGENT_INSTRUCTEUR: {
    organigramme: "R", agents: "R", actes: "W", carrieres: "R", conges: "R", documents: "W",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", textes: "R", annuaire: "R", aide: "R",
    cartes: "R",
  },
  DIRECTEUR_DEPARTEMENTAL: {
    organigramme: "R", agents: "W", actes: "R", conges: "R", besoins: "W", documents: "R",
    national: "R",
    rapports: "R", messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", textes: "R", annuaire: "R", retraite: "R", aide: "R",
    cartes: "R",
  },
  CHEF_ETABLISSEMENT: {
    organigramme: "R", agents: "W", besoins: "W", documents: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", textes: "R", annuaire: "R", aide: "R",
    cartes: "R",
  },
  AGENT: {
    "mon-dossier": "W", conges: "R", formations: "R", documents: "R", organigramme: "R",
    messagerie: "W", tickets: "W", annonces: "R",
    annuaire: "R", textes: "R", aide: "R",
    cartes: "R",
  },
};

export const peut = (role: Role, mod: ModuleKey, mode: "R" | "W" = "R") => {
  const d = DROITS[role]?.[mod];
  if (!d) return false;
  return mode === "R" ? true : d === "W";
};

/**
 * Périmètre : ce que voit un utilisateur se déduit de son rattachement.
 * Cf. §11 — sinon chaque réorganisation devient un chantier de droits.
 */
export function perimetreDe(entiteId: string): Set<string> {
  return new Set(descendantsDe(entiteId).map((x) => x.id));
}

export const dansPerimetre = (entiteId: string, cible?: string | null) =>
  !!cible && perimetreDe(entiteId).has(cible);

/**
 * Règle de séparation : personne ne valide ce qu'il a instruit. §11
 * Renvoie vrai si `utilisateurId` peut valider l'étape courante de l'acte.
 */
export const peutValider = (utilisateurId: string, instruitPar?: string) =>
  !!instruitPar && instruitPar !== utilisateurId;

/** Où atterrit un utilisateur après connexion, selon ce que son rôle ouvre. */
export const pageAccueil = (role: Role) =>
  peut(role, "dgarh") ? "/dgarh"
  : peut(role, "administration") ? "/administration"
  : peut(role, "agents") ? "/dgarh/agents"
  : peut(role, "mon-dossier") ? "/mon-dossier"
  : "/dgarh/organigramme";

/** Module couvrant une route, pour le contrôle d'accès du layout. */
export function moduleDeRoute(pathname: string): ModuleKey | null {
  const routes: [string, ModuleKey][] = [
    ["/dgarh/national", "national"],
    ["/dgarh/organigramme", "organigramme"],
    ["/dgarh/organisation", "organisation"],
    ["/dgarh/pilotage", "pilotage"],
    ["/dgarh/agents", "agents"],
    ["/dgarh/bannette", "actes"],
    ["/dgarh/actes", "actes"],
    ["/dgarh", "dgarh"],
    ["/mon-dossier", "mon-dossier"],
    ["/carrieres", "carrieres"],
    ["/conges", "conges"],
    ["/formations", "formations"],
    ["/contentieux", "contentieux"],
    ["/besoins", "besoins"],
    ["/referentiels", "referentiels"],
    ["/documents", "documents"],
    ["/textes", "textes"],
    ["/postes", "postes"],
    ["/recrutement", "recrutement"],
    ["/delegations", "delegations"],
    ["/annuaire", "annuaire"],
    ["/cartes", "cartes"],
    ["/retraite", "retraite"],
    ["/aide", "aide"],
    ["/rapports", "rapports"],
    ["/journal", "journal"],
    ["/administration", "administration"],
    ["/messagerie", "messagerie"],
    ["/tickets", "tickets"],
    ["/annonces", "annonces"],
  ];
  return routes.find(([r]) => pathname === r || pathname.startsWith(r + "/"))?.[1] ?? null;
}
