import type { CodeProfil, Role } from "@/lib/types";
import { descendantsDe } from "./entites";

/* Rôles, modules et permissions — cahier §11                          */
/* ------------------------------------------------------------------ */
export type ModuleKey =
  | "dgarh" | "national" | "organigramme" | "organisation" | "pilotage" | "agents" | "actes"
  | "carrieres" | "conges" | "formations" | "contentieux" | "besoins"
  | "referentiels" | "documents" | "redaction" | "textes" | "rapports" | "journal" | "administration"
  | "postes" | "recrutement" | "delegations" | "annuaire" | "retraite" | "aide" | "cartes"
  | "messagerie" | "tickets" | "annonces" | "mon-dossier" | "archives"
  | "ministre" | "presences" | "sorties" | "remuneration"
  | "profils";
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
  ministre: "Pilotage du ministère",
  presences: "Présences et pointages",
  sorties: "Sorties du territoire",
  remuneration: "Rémunération et masse salariale",
  profils: "Profils d'accès",
};

/**
 * Les treize profils livrés — vérifiés par le compilateur.
 *
 * `Record<Role, …>` oblige à remplir chaque rôle : ajouter un rôle sans lui
 * donner de libellé ni de droits ne compile pas. C'est cette exhaustivité
 * qu'on veut garder, et c'est pourquoi les livrés sont déclarés à part des
 * registres qui les accueillent.
 */
const LIBELLES_LIVRES: Record<Role, string> = {
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
  SECRETAIRE: "Secrétaire",
  AGENT: "Agent",
};

/**
 * Le registre des libellés, ouvert aux profils de la maison.
 *
 * Mutable et indexé par chaîne, pour que `hydraterProfils` y pose les
 * profils créés depuis l'écran — exactement comme `hydraterEntites` remplace
 * l'arborescence semée par celle de la base. Les appelants continuent
 * d'écrire `ROLE_LABELS[user.role]` sans rien savoir de tout cela.
 */
export const ROLE_LABELS: Record<string, string> = { ...LIBELLES_LIVRES };

/** R = lecture, W = écriture (inclut la lecture), absent = aucun accès. */
const DROITS_LIVRES: Record<Role, Partial<Record<ModuleKey, "R" | "W">>> = {
  /* Le ministre lit tout ce qui sert à décider et n'écrit rien : ni acte, ni
     dossier, ni pointage. Un ministre qui saisirait lui-même une donnée
     confondrait la décision et l'instruction — et engagerait sa signature
     sans le circuit qui la prépare.

     Le module `ministre` — « Pilotage du ministère » — n'est pas une pièce
     privée attachée à une personne : c'est un module comme les trente-cinq
     autres, ouvert par une ligne de matrice et fermé par la même. Le profil
     Ministre l'ouvre parce que c'est lui qui décide à cette échelle ; rien
     dans le code n'interdit à l'administrateur de l'ouvrir au cabinet ou au
     secrétaire général le jour où le ministère le veut, et rien n'exige de
     toucher au code pour cela. C'était l'inverse auparavant, et c'était une
     faute : un espace réservé par le code à un rôle nommé fait du logiciel
     l'auteur de l'organigramme. */
  MINISTRE: {
    /* Il ne crée ni entité ni compte, et c'est le point qui distingue ce
       profil de tous les autres. Tout, dans ce ministère, est administré par
       la DGARH — le cabinet dont relève le ministre y compris. Lui donner
       l'écriture sur l'organisation revenait à dessiner un circuit que
       personne n'emprunte : un ministre n'ouvre pas de comptes, il lit ce que
       l'administration lui remonte et décide. L'administrateur système ouvre
       son compte et celui du directeur général ; le directeur général fait le
       reste. */
    ministre: "R", dgarh: "R", pilotage: "R", national: "R", organigramme: "R",
    organisation: "R",
    agents: "R", actes: "R", postes: "R", retraite: "R", presences: "R",
    sorties: "R", remuneration: "R", contentieux: "R", besoins: "R",
    rapports: "R", journal: "R", textes: "R", annuaire: "R",
    annonces: "W", messagerie: "W", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  /* Le cabinet prépare et relance : il voit la même chose, et peut porter une
     note ou une circulaire. Il **désigne et inscrit** aussi, parce qu'un
     ministre ne s'assied pas devant un écran pour ouvrir des comptes : le
     secrétariat particulier et la direction de cabinet le font en son nom, et
     c'est ainsi dans tous les ministères. */
  CABINET: {
    organisation: "W", agents: "W",
    dgarh: "R", pilotage: "R", national: "R", organigramme: "R",
    actes: "R", postes: "R", retraite: "R", presences: "R",
    sorties: "R", remuneration: "R", contentieux: "R", besoins: "R",
    rapports: "R", textes: "R", annuaire: "R", documents: "R", redaction: "W",
    annonces: "W", messagerie: "W", tickets: "W", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  /* Le secrétaire général tient la chaîne administrative : il instruit et
     valide, sans le pouvoir de signature du directeur général. */
  SECRETAIRE_GENERAL: {
    profils: "R",
    dgarh: "R", pilotage: "R", national: "R", organigramme: "R",
    organisation: "W", agents: "W", actes: "W", carrieres: "R", conges: "R",
    presences: "W", sorties: "W", remuneration: "R", postes: "W", besoins: "R",
    contentieux: "R", retraite: "R", formations: "R", recrutement: "R",
    delegations: "W", documents: "R", redaction: "W", archives: "R",
    rapports: "W", journal: "R", textes: "W", annuaire: "R",
    annonces: "W", messagerie: "W", tickets: "W", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  /* L'inspecteur contrôle : il lit partout dans son périmètre et consigne ses
     constats. Il n'instruit aucun dossier de carrière — contrôler ce qu'on a
     soi-même instruit n'est pas un contrôle. */
  /* L'inspecteur général dirige une maison : l'inspection générale, ses
     services, son secrétariat et les inspections interdépartementales avec
     leurs antennes. Il lui manquait l'écriture sur l'organisation, si bien
     qu'il ne pouvait désigner personne chez lui — pas même le chef de service
     qui tient son secrétariat — alors que tous les autres chefs d'entité le
     peuvent. Cela ne lui donne rien sur les autres directions : sa portée
     d'administration reste son périmètre.

     Un ministère qui voudrait des inspecteurs sans commandement — contrôler
     sans diriger — n'a pas à demander une version de la plateforme : il crée
     un profil de la maison sans rang ni organisation, depuis l'écran Système. */
  INSPECTEUR: {
    organisation: "W",
    national: "R", organigramme: "R", agents: "R", actes: "R", postes: "R",
    presences: "R", sorties: "R", conges: "R", besoins: "R", contentieux: "R",
    retraite: "R", rapports: "R", journal: "R", textes: "R", annuaire: "R",
    documents: "R", redaction: "W", archives: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W", aide: "R", cartes: "R",
  },
  /* L'administrateur système fait vivre la plateforme ; il ne sert dans aucune
     direction. Son métier tient en quatre gestes : il **crée les entités**,
     il **définit les profils d'accès**, il **veille à la sécurité** par le
     journal, et il **désigne le premier responsable** d'une entité qui vient
     de naître — après quoi il se retire, et la chaîne descend sans lui.

     D'où ce qu'il n'a pas, et qui est le point : ni personnel, ni dossiers,
     ni actes, ni documents. Ce ne sont pas ses affaires, et un administrateur
     qui peut tout lire finit par tout lire. C'est aussi pourquoi ce profil est
     déclaré **technique** : il n'hérite pas du socle d'agent, faute d'être un
     agent. */
  ADMIN_SYSTEME: {
    organisation: "W", organigramme: "R",
    profils: "W", administration: "W", referentiels: "W", journal: "W",
    messagerie: "W", tickets: "W", annonces: "W", aide: "R",
  },
  DIRECTEUR_GENERAL: {
    profils: "R", 
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
  /* Une ligne, trois métiers — et c'est pourquoi elle est large.
     Les directeurs de la DPCEF, de la DOBAS et de la DAFM portent le même
     profil et n'exercent pas le même métier. Cette ligne dit ce qu'un
     directeur central **peut** faire ; ce qu'il fait **réellement** est
     découpé par les attributions de sa direction (`attributions.ts`) : le
     directeur des finances écrit sur la rémunération et les archives, celui
     du personnel sur les actes et les carrières, et aucun des deux sur le
     registre de l'autre. Élargir ici sans l'axe des attributions donnerait
     tout à tout le monde : les deux vont ensemble. */
  DIRECTEUR_CENTRAL: {
    profils: "R", organisation: "W", 
    presences: "W", sorties: "W", remuneration: "W",
    dgarh: "R", organigramme: "R", pilotage: "R", agents: "W", actes: "W",
    national: "R",
    carrieres: "W", conges: "R", formations: "W", contentieux: "W", besoins: "W",
    referentiels: "R", documents: "R", redaction: "W", archives: "W", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "W", "mon-dossier": "W",
    postes: "W", recrutement: "W", delegations: "W", textes: "R",
    annuaire: "R", retraite: "W", aide: "R",
    cartes: "W",
  },
  CHEF_SERVICE: {
    profils: "R", organisation: "W", 
    presences: "W", sorties: "R",
    dgarh: "R", organigramme: "R", agents: "W", actes: "W", carrieres: "R", conges: "R",
    formations: "R", contentieux: "R", besoins: "R", documents: "R", redaction: "W", archives: "W", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", delegations: "R", textes: "R",
    annuaire: "R", retraite: "R", aide: "R",
    cartes: "W",
  },
  CHEF_BUREAU: {
    profils: "R", 
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
    profils: "R", organisation: "W", 
    presences: "W", sorties: "R",
    organigramme: "R", agents: "W", actes: "R", conges: "R", besoins: "W", documents: "R", redaction: "W", archives: "R",
    national: "R",
    rapports: "R", messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", recrutement: "R", textes: "R", annuaire: "R", retraite: "R", aide: "R",
    cartes: "R",
  },
  /* Le chef d'établissement dirige un lycée ou un collège technique : du
     personnel affecté, des absences à constater, des départs à préparer. Il
     lui manquait de quoi lire la situation de ses propres agents — congés,
     carrières, sorties, retraites — ce qui l'obligeait à téléphoner à la
     direction départementale pour savoir qui serait là lundi. Il lit ; il
     n'instruit toujours aucun acte, qui se prend au niveau départemental. */
  CHEF_ETABLISSEMENT: {
    profils: "R", organisation: "W",
    presences: "W", sorties: "R",
    organigramme: "R", agents: "W", besoins: "W", documents: "R", redaction: "W",
    conges: "R", carrieres: "R", formations: "R", retraite: "R", rapports: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W",
    postes: "R", textes: "R", annuaire: "R", aide: "R",
    cartes: "R",
  },
  /* Le secrétariat. C'est le poste qui reçoit l'agent muté, tient le cahier
     d'émargement et enregistre les arrivées : il écrit donc sur l'accueil,
     les arrivées et les présences de son entité. Il ne touche à aucun
     dossier de carrière — recevoir quelqu'un n'est pas l'instruire. */
  SECRETAIRE: {
    presences: "W", sorties: "R",
    /* Il inscrit le personnel de son entité. C'est le poste qui tient le
       fichier dans une direction, et prétendre le contraire obligerait le
       directeur à saisir lui-même chaque arrivée. Son rang — 25 — borne la
       portée du geste : il n'ouvre que le profil Agent, et ne promeut
       personne. */
    organigramme: "R", agents: "W", annuaire: "R", conges: "R",
    documents: "R", redaction: "W", textes: "R",
    messagerie: "W", tickets: "W", annonces: "R", "mon-dossier": "W", aide: "R",
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

/**
 * Le registre des droits, ouvert aux profils de la maison.
 *
 * Même raison que pour les libellés : `hydraterProfils` y dépose les profils
 * réglés depuis l'écran Système, et les trente-trois appels à `peut` de la
 * plateforme continuent de fonctionner sans une ligne de changement.
 */
export const DROITS: Record<string, Partial<Record<ModuleKey, "R" | "W">>> = { ...DROITS_LIVRES };

/** Les droits d'un profil livré, à l'abri de toute hydratation. */
export const droitsLivres = (role: Role) => DROITS_LIVRES[role];

/** Les treize codes livrés, dans l'ordre de déclaration. */
export const CODES_LIVRES = Object.keys(DROITS_LIVRES) as Role[];

/**
 * Ce profil peut-il ce module, et dans quel mode ?
 *
 * Le paramètre est un **code de profil**, pas seulement l'un des treize
 * rôles livrés : un compte peut porter un profil de la maison, et il doit
 * être interrogé de la même façon.
 */
export const peut = (profil: CodeProfil, mod: ModuleKey, mode: "R" | "W" = "R") => {
  const d = DROITS[profil]?.[mod];
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
/**
 * Où l'on atterrit après la connexion.
 *
 * L'ordre suit celui de la barre latérale, et doit continuer de le suivre :
 * arriver ailleurs que sur la première entrée de son propre menu donne le
 * sentiment d'avoir été mal dirigé. Le tableau de bord passe donc devant
 * « Pilotage du ministère » — même pour le ministre, qui veut d'abord ses
 * chiffres.
 */
export const pageAccueil = (role: CodeProfil) =>
  peut(role, "dgarh") ? "/dgarh"
  : peut(role, "ministre") ? "/ministre"
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
    ["/profils", "profils"],
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
