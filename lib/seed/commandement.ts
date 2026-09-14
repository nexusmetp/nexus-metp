import {
  NIVEAUX_DE_COMMANDEMENT, RANG_COMMANDEMENT, RANG_HIERARCHIQUE, ROLE_ATTENDU,
  TITRE_DU_CHEF, entiteById,
} from "@/lib/referentiels";
import type { Affectation, Agent, Entite, Habilitation, Utilisateur } from "@/lib/types";
import { AUJOURDHUI, pad, plusJours } from "./aleatoire";

/* ------------------------------------------------------------------ */
/* Qui dirige quoi — le semis pourvoit les entités qu'il peuple        */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi ce fichier existe : soixante-seize services sans chef.
 *
 * Le semis dressait l'organigramme et y affectait deux mille quatre cents
 * agents, mais ne désignait de responsable que pour les quinze entités
 * portant un compte de démonstration. Les autres — directions
 * départementales, services, lycées techniques — arrivaient **peuplées et
 * acéphales**. Ce n'est pas une lacune de données, c'est une faute de
 * modèle : une administration n'a pas de service sans chef de service. Le
 * tableau de bord de l'administrateur le signalait comme une anomalie du
 * ministère alors que l'anomalie était dans le décor.
 *
 * **Ce que ce fichier n'invente pas.** Aucune personne n'est créée : le chef
 * est pris **parmi les agents déjà affectés à l'entité**, le plus ancien en
 * service, comme le ferait un intérim à la prise de fonction. Aucune
 * référence d'arrêté n'est fabriquée non plus — le motif de l'habilitation
 * dit que l'acte reste à verser au dossier, plutôt que d'afficher un numéro
 * qui n'existe nulle part. Une entité qui n'a personne en poste reste sans
 * chef, et l'écran continue de le dire.
 *
 * **De qui chacun le tient.** Les entités sont pourvues de haut en bas :
 * quand on désigne le chef d'un service, le directeur dont il relève est
 * déjà nommé, et c'est lui qui figure comme ayant accordé l'habilitation. La
 * chaîne se lit donc de bout en bout à l'écran « Qui dirige quoi », au lieu
 * de remonter toute entière à l'installation.
 */

/** Profondeur d'une entité dans l'arbre — pour pourvoir les parents d'abord. */
function profondeur(entite: Entite): number {
  let n = 0;
  let courant: Entite | undefined = entite;
  while (courant?.parentId) {
    courant = entiteById(courant.parentId);
    n += 1;
    if (n > 12) break; // garde-fou : un cycle ne doit pas boucler ici
  }
  return n;
}

export function construireCommandement({
  entites, agents, affectations, utilisateurs, habilitations,
}: {
  entites: Entite[];
  agents: Agent[];
  affectations: Affectation[];
  utilisateurs: Utilisateur[];
  habilitations: Habilitation[];
}): { entites: Entite[]; designes: number; sansPersonne: string[] } {
  const parAgent = new Map(agents.map((a) => [a.id, a]));
  const compteDe = new Map(
    utilisateurs.filter((u) => u.agentId).map((u) => [u.agentId!, u])
  );

  /* Les entités déjà tenues, au sens de commandées. Les comptes de
     démonstration en font partie et on ne les déplace pas — ce sont les
     portes d'entrée de la maquette. */
  const commande = (u: Utilisateur) =>
    u.actif !== false && (RANG_HIERARCHIQUE[u.role] ?? 0) >= RANG_COMMANDEMENT;
  const tenues = new Map<string, Utilisateur>();
  utilisateurs.filter(commande).forEach((u) => {
    if (!tenues.has(u.entiteId)) tenues.set(u.entiteId, u);
  });

  /* Ceux qui portent déjà un profil autre que l'agent — secrétaires et
     instructeurs — ne sont pas candidats : les promouvoir chef leur retirerait
     la fonction qu'ils exercent, et le secrétariat resterait vide. */
  const dejaEnFonction = new Set(
    utilisateurs.filter((u) => u.role !== "AGENT" && u.agentId).map((u) => u.agentId!)
  );

  /* Le personnel en poste, entité par entité. On ne retient que les
     affectations en vigueur : un agent parti ailleurs ne dirige plus rien. */
  const surPlace = new Map<string, Agent[]>();
  affectations.filter((a) => !a.dateFin).forEach((a) => {
    const agent = parAgent.get(a.agentId);
    if (!agent) return;
    const liste = surPlace.get(a.entiteId);
    if (liste) liste.push(agent);
    else surPlace.set(a.entiteId, [agent]);
  });

  const affectationOuverte = new Map<string, Affectation>();
  affectations.filter((a) => !a.dateFin).forEach((a) => {
    if (!affectationOuverte.has(a.agentId)) affectationOuverte.set(a.agentId, a);
  });

  const dg = utilisateurs.find((u) => u.role === "DIRECTEUR_GENERAL");
  const installation = `${plusJours(AUJOURDHUI, -365)}T08:00:00.000Z`;
  let n = habilitations.length;

  const responsables = new Map<string, string>();
  const sansPersonne: string[] = [];
  let designes = 0;

  /* Les entités déjà tenues par un compte de démonstration n'avaient pas non
     plus de `responsableId` : le chef s'y lisait par son habilitation, et pas
     par l'entité. Les écrans qui posent la question à l'entité — la fiche, la
     carte, l'annuaire — répondaient donc « aucun » pour la direction générale
     elle-même. On le pose ici, sans rien changer à leur habilitation. */
  tenues.forEach((compte, entiteId) => {
    if (compte.agentId) responsables.set(entiteId, compte.agentId);
  });

  const aPourvoir = entites
    .filter((e) => e.actif !== false && NIVEAUX_DE_COMMANDEMENT.includes(e.niveau))
    .filter((e) => !tenues.has(e.id))
    .sort((a, b) => profondeur(a) - profondeur(b) || a.id.localeCompare(b.id));

  for (const entite of aPourvoir) {
    const candidats = (surPlace.get(entite.id) ?? [])
      .filter((a) => compteDe.has(a.id) && !dejaEnFonction.has(a.id))
      /* Le plus ancien en service : c'est le critère qu'emploie
         l'administration pour un intérim, et il est déterministe — deux
         semis identiques donnent les mêmes chefs. */
      .sort((a, b) =>
        (a.datePriseService ?? a.dateRecrutement ?? "9999").localeCompare(
          b.datePriseService ?? b.dateRecrutement ?? "9999"
        ) || a.matricule.localeCompare(b.matricule));

    const chef = candidats[0];
    if (!chef) {
      /* Personne en poste : on n'invente pas quelqu'un pour faire tomber un
         compteur. L'entité reste à pourvoir, et c'est vrai. */
      sansPersonne.push(entite.sigle);
      continue;
    }

    const compte = compteDe.get(chef.id)!;
    const profil = ROLE_ATTENDU[entite.niveau] ?? "CHEF_SERVICE";
    const titre = `${TITRE_DU_CHEF[entite.niveau] ?? "Responsable"} — ${entite.sigle}`;

    compte.role = profil;
    compte.fonction = titre;
    const aff = affectationOuverte.get(chef.id);
    if (aff) aff.fonction = titre;

    /* De qui il le tient : le chef de l'entité de rattachement, déjà désigné
       puisqu'on descend l'arbre. On remonte tant qu'on n'en trouve pas — une
       entité intermédiaire sans personne en poste ne doit pas renvoyer toute
       sa branche à l'installation. À défaut, le directeur général : c'est lui
       qui administre le ministère entier. */
    let ancetre = entite.parentId ? entiteById(entite.parentId) : undefined;
    let superieur: Utilisateur | undefined;
    for (let saut = 0; ancetre && saut < 12; saut += 1) {
      superieur = tenues.get(ancetre.id);
      if (superieur) break;
      ancetre = ancetre.parentId ? entiteById(ancetre.parentId) : undefined;
    }
    const accordeur = superieur ?? dg ?? null;

    habilitations.push({
      id: `HAB-${pad(++n, 5)}`,
      utilisateurId: compte.id,
      role: profil,
      entiteId: entite.id,
      accordePar: accordeur?.id ?? null,
      accordeParNom: accordeur?.nomComplet ?? "Installation de la plateforme",
      accordeLe: installation,
      dateDebut: plusJours(AUJOURDHUI, -365),
      dateFin: null,
      /* Aucun numéro d'arrêté n'est fabriqué ici : l'acte manque, et l'écrire
         est plus utile que de le simuler. */
      motif: `Désignation à la tête de ${entite.sigle}. Acte de nomination : à verser au dossier.`,
    });

    tenues.set(entite.id, compte);
    responsables.set(entite.id, chef.id);
    designes += 1;
  }

  return {
    entites: entites.map((e) =>
      responsables.has(e.id) ? { ...e, responsableId: responsables.get(e.id)! } : e),
    designes,
    sansPersonne,
  };
}
