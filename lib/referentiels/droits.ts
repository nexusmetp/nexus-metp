import type { Role } from "@/lib/types";
import { descendantsDe } from "./entites";

/* Rôles, modules et permissions — cahier §11                          */
/* ------------------------------------------------------------------ */

export type ModuleKey =
  | "dgarh" | "national" | "organigramme" | "organisation" | "pilotage" | "agents" | "actes"
  | "carrieres" | "conges" | "formations" | "contentieux" | "besoins"
  | "referentiels" | "documents" | "redaction" | "textes" | "rapports" | "journal" | "administration"
  | "postes" | "recrutement" | "delegations" | "annuaire" | "retraite" | "aide" | "cartes"
  | "messagerie" | "tickets" | "annonces" | "mon-dossier" | "archives"
  | "ministre" | "presences" | "sorties" | "remuneration";

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
  documents: "Documents et GED",
  redaction: "Rédaction",
  archives: "Archives",
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
  ministre: "Espace du ministre",
  presences: "Présences et pointages",
  sorties: "Sorties du territoire",
  remuneration: "Rémunération et masse salariale",
};

export const ROLE_LABELS: Record<Role, string> = {
  MINISTRE: "Ministre",
  CABINET: "Cabinet du ministre",
  SECRETAIRE_GENERAL: "Secrétaire général",
  INSPECTEUR: "Inspecteur",
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
  /* Le ministre lit tout ce qui sert à décider et n'écrit rien : ni acte, ni
     dossier, ni pointage. Un ministre qui saisirait lui-même une donnée
     confondrait la décision et l'instruction — et engagerait sa signature
     sans le circuit qui la prépare.

     Le module `ministre` n'est donné qu'à lui, et à personne d'autre. C'est
     son espace : l'ouvrir au cabinet ou au directeur général en ferait un
     tableau de bord de plus, et l'écran perdrait ce qui le rend utile — être
     le seul endroit où les quatre questions sont posées telles que le
     ministre les pose. Les autres rôles ont /dgarh et /dgarh/pilotage, qui
     répondent à leurs questions à eux. */
  MINISTRE: {
    ministre: "R", dgarh: "R", pilotage: "R", national: "R", organigramme: "R",
    agents: "R", actes: "R", postes: "R", retraite: "R", presences: "R",
    sorties: "R", remuneration: "R", contentieux: "R", besoins: "R",
    rapports: "R", journal: "R", textes: "R", annuaire: "R",
    annonces: "W", messagerie: "W", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  /* Le cabinet prépare et relance : il voit la même chose, et peut porter une
     note ou une circulaire. */
  CABINET: {
    dgarh: "R", pilotage: "R", national: "R", organigramme: "R",
    agents: "R", actes: "R", postes: "R", retraite: "R", presences: "R",
    sorties: "R", remuneration: "R", contentieux: "R", besoins: "R",
    rapports: "R", textes: "R", annuaire: "R", documents: "R", redaction: "W",
    annonces: "W", messagerie: "W", tickets: "W", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  /* Le secrétaire général tient la chaîne administrative : il instruit et
     valide, sans le pouvoir de signature du directeur général. */
  SECRETAIRE_GENERAL: {
    dgarh: "R", pilotage: "R", national: "R", organigramme: "R",
    organisation: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    presences: "W", sorties: "W", remuneration: "R", postes: "W", besoins: "R",
    contentieux: "R", retraite: "R", formations: "R", recrutement: "R",
    delegations: "W", documents: "R", redaction: "W", archives: "R",
    rapports: "W", journal: "R", textes: "W", annuaire: "R",
    annonces: "W", messagerie: "W", tickets: "W", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  /* L'inspecteur contrôle : il lit partout dans son périmètre et consigne ses
     constats. Il n'instruit aucun dossier de carrière — contrôler ce qu'on a
     soi-même instruit n'est pas un contrôle. */
  INSPECTEUR: {
    national: "R", organigramme: "R", agents: "R", actes: "R", postes: "R",
    presences: "R", sorties: "R", conges: "R", besoins: "R", contentieux: "R",
    retraite: "R", rapports: "R", journal: "R", textes: "R", annuaire: "R",
    documents: "R", redaction: "W", archives: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  ADMIN_SYSTEME: {
    organigramme: "R", referentiels: "W", administration: "W", journal: "W",
    national: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    textes: "W", annuaire: "R", aide: "R",
    cartes: "R",
  },
  DIRECTEUR_GENERAL: {
    presences: "W", sorties: "W", remuneration: "W",
    dgarh: "W", organigramme: "W", organisation: "W", pilotage: "W", agents: "W",
    national: "R",
    actes: "W", carrieres: "R", conges: "R", formations: "R", contentieux: "R",
    besoins: "R", referentiels: "R", documents: "R", redaction: "W", archives: "R", rapports: "W", journal: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    postes: "W", recrutement: "W", delegations: "W", textes: "W",
    annuaire: "R", retraite: "W", aide: "R",
    cartes: "W",
  },
  DIRECTEUR_CENTRAL: {
    presences: "W", sorties: "W", remuneration: "R",
    dgarh: "R", organigramme: "R", pilotage: "R", agents: "W", actes: "W",
    national: "R",
    carrieres: "R", conges: "R", formations: "R", contentieux: "R", besoins: "R",
    referentiels: "R", documents: "R", redaction: "W", archives: "R", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    postes: "W", recrutement: "W", delegations: "R", textes: "R",
    annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  CHEF_SERVICE: {
    presences: "W", sorties: "R",
    dgarh: "R", organigramme: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    formations: "R", contentieux: "R", besoins: "R", documents: "R", redaction: "W", archives: "W", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", delegations: "R", textes: "R",
    annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  CHEF_BUREAU: {
    presences: "W", sorties: "R",
    dgarh: "R", organigramme: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    formations: "R", contentieux: "R", besoins: "R", documents: "W", redaction: "W", archives: "W",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "W", textes: "R", annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  AGENT_INSTRUCTEUR: {
    presences: "R", sorties: "R",
    organigramme: "R", agents: "R", actes: "W", carrieres: "R", conges: "R", documents: "W", redaction: "W", archives: "W",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", textes: "R", annuaire: "R", aide: "R",
    cartes: "R",
  },
  DIRECTEUR_DEPARTEMENTAL: {
    presences: "W", sorties: "R",
    organigramme: "R", agents: "W", actes: "R", conges: "R", besoins: "W", documents: "R", redaction: "W", archives: "R",
    national: "R",
    rapports: "R", messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", textes: "R", annuaire: "R", retraite: "R", aide: "R",
    cartes: "R",
  },
  CHEF_ETABLISSEMENT: {
    presences: "W",
    organigramme: "R", agents: "W", besoins: "W", documents: "R", redaction: "W",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", textes: "R", annuaire: "R", aide: "R",
    cartes: "R",
  },
  AGENT: {
    presences: "R", sorties: "R",
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
  peut(role, "ministre") ? "/ministre"
  : peut(role, "dgarh") ? "/dgarh"
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
    ["/ministre", "ministre"],
    ["/presences", "presences"],
    ["/sorties", "sorties"],
    ["/remuneration", "remuneration"],
    ["/mon-dossier", "mon-dossier"],
    ["/carrieres", "carrieres"],
    ["/conges", "conges"],
    ["/formations", "formations"],
    ["/contentieux", "contentieux"],
    ["/besoins", "besoins"],
    ["/referentiels", "referentiels"],
    ["/archives", "archives"],
    ["/documents", "documents"],
    ["/redaction", "redaction"],
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
