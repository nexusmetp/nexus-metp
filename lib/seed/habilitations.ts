import type {
  Affectation, Agent, Habilitation, PointAccueil, Utilisateur,
} from "@/lib/types";
import { AUJOURDHUI, pad, plusJours } from "./aleatoire";

/* ------------------------------------------------------------------ */
/* Comptes et habilitations — d'où chaque accès tient son autorité     */
/* ------------------------------------------------------------------ */

/**
 * Trois générations de comptes, et la distinction compte.
 *
 * **Les comptes d'installation** — ceux livrés avec la plateforme — portent
 * `accordePar: null`. Ce n'est pas une lacune : personne, dans le ministère,
 * ne les a accordés. Ils viennent de l'installation, et l'écran doit pouvoir
 * le dire plutôt que d'inventer un signataire.
 *
 * **Les agents** ont tous un compte, avec le profil `AGENT`, sur l'entité où
 * ils servent. C'est la règle de base et elle ne se discute pas : un agent du
 * ministère doit pouvoir consulter son propre dossier, l'annuaire, les notes
 * de service et ses congés. Lui refuser l'accès reviendrait à faire de la
 * plateforme un outil réservé à l'encadrement, alors qu'elle tient le dossier
 * de chacun. Le profil Agent n'ouvre rien d'autre que cela — il lit, il ne
 * décide pas.
 *
 * **Les secrétaires** sont désignés **par le chef de leur entité**. C'est la
 * chaîne normale, celle que la plateforme doit rendre possible : le directeur
 * décide qui tient son secrétariat, et la plateforme en garde l'auteur, la
 * date et le motif.
 */

/** Combien de points d'accueil reçoivent un secrétaire réellement habilité. */
const SECRETAIRES_HABILITES = 14;

/** Adresse de courriel d'un agent, unique dans tout le ministère. */
function adresse(agent: Agent, prises: Set<string>): string {
  const net = (s: string) => s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  const base = `${net(agent.prenom)}.${net(agent.nom)}`;
  /* Les homonymes sont nombreux dans un fichier de deux mille agents : on
     désambiguïse par le matricule, comme le fait une messagerie
     administrative, plutôt que par un numéro d'ordre qui ne dirait rien. */
  const cle = prises.has(base) ? `${base}.${agent.matricule.replace(/\D/g, "")}` : base;
  prises.add(cle);
  return `${cle}@metp.gouv.cg`;
}

export function construireHabilitations({ utilisateurs, pointsAccueil, agents, affectations }: {
  utilisateurs: Utilisateur[];
  pointsAccueil: PointAccueil[];
  agents: Agent[];
  affectations: Affectation[];
}): {
  habilitations: Habilitation[];
  comptesSecretaires: Utilisateur[];
  comptesAgents: Utilisateur[];
} {
  const habilitations: Habilitation[] = [];
  let n = 0;
  const installation = `${plusJours(AUJOURDHUI, -365)}T08:00:00.000Z`;

  const poser = (u: Pick<Utilisateur, "id" | "role" | "entiteId">, source: {
    par: string | null; parNom: string; le: string; debut: string; motif: string;
  }) => {
    habilitations.push({
      id: `HAB-${pad(++n, 5)}`,
      utilisateurId: u.id,
      role: u.role,
      entiteId: u.entiteId,
      accordePar: source.par,
      accordeParNom: source.parNom,
      accordeLe: source.le,
      dateDebut: source.debut,
      dateFin: null,
      motif: source.motif,
    });
  };

  /* ---------- 1. Les comptes d'installation ---------- */
  utilisateurs.forEach((u) => poser(u, {
    par: null,
    parNom: "Installation de la plateforme",
    le: installation,
    debut: plusJours(AUJOURDHUI, -365),
    motif: "Compte ouvert à l'installation de la plateforme.",
  }));

  /* ---------- 2. Tout le personnel, au profil Agent ---------- */
  const entiteDe = new Map<string, string>();
  affectations.filter((a) => !a.dateFin).forEach((a) => entiteDe.set(a.agentId, a.entiteId));

  const dejaCompte = new Set(utilisateurs.map((u) => u.agentId).filter(Boolean) as string[]);
  const adressesPrises = new Set(utilisateurs.map((u) => u.email.split("@")[0]));

  const comptesAgents: Utilisateur[] = [];
  agents.forEach((agent, i) => {
    if (dejaCompte.has(agent.id)) return;
    const entiteId = entiteDe.get(agent.id);
    // Un agent sans affectation en vigueur n'a pas de périmètre : pas de compte.
    if (!entiteId) return;

    const compte: Utilisateur = {
      id: `USR-A${pad(i + 1, 5)}`,
      email: adresse(agent, adressesPrises),
      motDePasse: "Nexus2026",
      /* Les comptes du semis sont un décor : ils partagent un mot de passe
         annoncé sur l'écran de connexion, pour qu'on puisse entrer dans la
         maquette sous n'importe quel profil. Ils ne portent donc pas
         `motDePasseAChanger` — sinon le drapeau ne voudrait plus rien dire.
         Un compte réellement ouvert par quelqu'un, lui, reçoit un mot de passe
         provisoire qui n'appartient qu'à lui, et la plateforme en exige le
         changement à la première connexion. */
      motDePasseAChanger: false,
      nomComplet: `${agent.prenom} ${agent.nom.toUpperCase()}`,
      role: "AGENT",
      entiteId,
      agentId: agent.id,
      fonction: "Agent",
      actif: true,
      dateCreation: installation,
    };
    comptesAgents.push(compte);
    poser(compte, {
      par: null,
      parNom: "Installation de la plateforme",
      le: installation,
      debut: plusJours(AUJOURDHUI, -365),
      motif: "Accès de base ouvert à tout agent du ministère, sur son entité d'affectation.",
    });
  });

  /* ---------- 3. Les secrétaires, désignés par leur chef ---------- */
  const parAgent = new Map(agents.map((a) => [a.id, a]));
  const chefDe = new Map<string, Utilisateur>();
  utilisateurs.forEach((u) => { if (!chefDe.has(u.entiteId)) chefDe.set(u.entiteId, u); });
  const parDefaut = utilisateurs.find((u) => u.role === "DIRECTEUR_GENERAL") ?? utilisateurs[0];

  const comptesSecretaires: Utilisateur[] = [];
  pointsAccueil
    .filter((p) => p.responsableId)
    .slice(0, SECRETAIRES_HABILITES)
    .forEach((p, i) => {
      const agent = parAgent.get(p.responsableId!);
      if (!agent) return;
      const chef = chefDe.get(p.entiteId) ?? parDefaut;
      const le = `${plusJours(AUJOURDHUI, -200 + i)}T09:00:00.000Z`;

      /* Le secrétaire a déjà un compte d'agent : on ne lui en ouvre pas un
         second, on lui pose une habilitation plus forte. Deux comptes pour
         une même personne, ce serait deux historiques et aucun des deux
         complet. */
      const existant = comptesAgents.find((c) => c.agentId === agent.id);
      if (existant) {
        existant.role = "SECRETAIRE";
        existant.fonction = p.libelle;
        poser({ id: existant.id, role: "SECRETAIRE", entiteId: p.entiteId }, {
          par: chef.id,
          parNom: chef.nomComplet,
          le,
          debut: plusJours(AUJOURDHUI, -200 + i),
          motif: `Désignation pour tenir ${p.libelle} et recevoir le personnel affecté.`,
        });
        comptesSecretaires.push(existant);
      }
    });

  return { habilitations, comptesSecretaires, comptesAgents };
}
