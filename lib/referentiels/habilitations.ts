import type { CodeProfil, Habilitation, Role, Utilisateur, VerdictHabilitation } from "@/lib/types";
import { dansPerimetre } from "./droits";

/* ------------------------------------------------------------------ */
/* Qui habilite qui — l'administration déléguée                        */
/* ------------------------------------------------------------------ */

/**
 * Le principe, et pourquoi il ne se devine pas.
 *
 * L'administrateur système crée les directions et les services : c'est la
 * **structure**, et elle relève d'un texte d'organisation, pas d'une décision
 * de service. En revanche, **le personnel d'une direction s'inscrit depuis la
 * direction**, et c'est son chef qui décide des profils d'accès de ses
 * agents — secrétaire, chef de bureau, agent instructeur. Personne au sommet
 * ne sait qui tient réellement le secrétariat de la DEP ; son directeur, si.
 *
 * Déléguer ainsi suppose deux garde-fous, et ils ne tiennent qu'écrits :
 *
 *  1. **on n'accorde jamais un profil supérieur ou égal au sien.** Sans cette
 *     règle, un chef de bureau se nomme directeur général en trois clics. Le
 *     rang ci-dessous n'est donc pas un ornement : il est la règle ;
 *  2. **on n'habilite que dans son propre périmètre.** Un chef de service de
 *     la DEP n'a rien à décider sur le personnel de la DAF, même à un rang
 *     inférieur au sien.
 */

/**
 * Le rang hiérarchique d'un rôle — la seule chose qui autorise à habiliter.
 *
 * `0` signifie « hors de la chaîne hiérarchique » : le cabinet conseille,
 * l'inspecteur contrôle, l'agent exécute. Aucun des trois ne commande de
 * personnel, donc aucun n'ouvre d'accès. Ce n'est pas un déclassement — c'est
 * la séparation entre décider, contrôler et administrer.
 */
const RANGS_LIVRES: Record<Role, number> = {
  MINISTRE: 100,
  SECRETAIRE_GENERAL: 90,
  DIRECTEUR_GENERAL: 80,
  DIRECTEUR_CENTRAL: 70,
  DIRECTEUR_DEPARTEMENTAL: 70,
  CHEF_ETABLISSEMENT: 60,
  CHEF_SERVICE: 50,
  CHEF_BUREAU: 40,
  AGENT_INSTRUCTEUR: 30,
  SECRETAIRE: 25,
  AGENT: 10,
  /* Hors chaîne : ils n'ont personne sous leur autorité. */
  /* Le directeur de cabinet tient sa maison — les services du cabinet, son
     secrétariat particulier, la direction de cabinet — et rien au-delà.
     Il avait été porté à 95, au-dessus du directeur général, à l'époque où
     l'on croyait que le cabinet ouvrait les comptes au nom du ministre. Ce
     n'est pas ainsi que ce ministère fonctionne : **l'administration du
     personnel de toutes les structures, cabinet compris, relève de la
     DGARH**. Le rang 95 avait alors une conséquence qu'on ne voyait pas — le
     directeur général, qui administre le cabinet, ne pouvait pas en désigner
     le chef, puisqu'on n'accorde qu'un rang strictement inférieur au sien.
     À 75, le DG (80) le désigne, et lui-même désigne ses directions (70) et
     ses services (50). Le protocole place le directeur de cabinet plus haut ;
     ce rang-ci ne dit pas le protocole, il dit qui administre qui. */
  CABINET: 75,
  /* L'inspecteur général dirige l'inspection générale — trois services, un
     secrétariat, et les inspections interdépartementales avec leurs antennes.
     Le laisser à zéro le rendait incapable de désigner le moindre chef dans
     sa propre inspection : la chaîne s'arrêtait net à cette branche de
     l'organigramme, et personne ne pouvait la reprendre sans l'administrateur.
     La séparation entre contrôler et instruire tient à ses **droits** — il
     n'écrit aucun acte de carrière — et non à un rang nul, qui ne séparait
     rien et cassait tout. */
  INSPECTEUR: 70,
  /* L'administrateur n'est pas au sommet de la hiérarchie : il en est à
     côté. Il ouvre les comptes que le droit lui réserve, sans commander
     aucun service. Son pouvoir est traité à part, pas par le rang. */
  ADMIN_SYSTEME: 0,
};

/**
 * Le registre des rangs, ouvert aux profils de la maison.
 *
 * `hydraterProfils` y dépose le rang de chaque profil réglé depuis l'écran
 * Système. Sans cela, un profil de la maison serait de rang indéfini, donc
 * de rang zéro, donc attribuable par personne — et invisible dans la liste
 * de tous les chefs.
 */
export const RANG_HIERARCHIQUE: Record<string, number> = { ...RANGS_LIVRES };

/**
 * Les profils que seul l'administrateur système ouvre.
 *
 * Ces fonctions-là ne se délèguent pas depuis un service : elles procèdent
 * d'un décret ou d'un arrêté de nomination, et leur titulaire est désigné
 * hors de la plateforme. Un directeur général qui pourrait nommer un
 * secrétaire général inverserait l'ordre des choses.
 */
/**
 * Les deux seuls profils que nul, dans le ministère, ne peut accorder.
 *
 * La liste en comptait six, au motif que ces fonctions procèdent d'un acte de
 * nomination pris hors de la plateforme. C'était vrai — et c'est vrai de
 * toutes, y compris d'un chef de bureau. Depuis que la désignation exige l'acte
 * qui la fonde et l'inscrit au journal, la plateforme ne prétend plus nommer
 * qui que ce soit : elle enregistre. Réserver davantage ne protégeait rien et
 * cassait la chaîne, puisque le ministre ne pouvait pas désigner ses propres
 * directeurs généraux.
 *
 * Restent donc les deux cas où il n'existe personne au-dessus pour accorder :
 * le profil **technique**, que nul n'a qualité pour donner, et le **ministre**,
 * nommé par décret du Président de la République et non par un agent du
 * ministère. Tout le reste est gouverné par le rang et le périmètre, qui sont
 * une règle plus forte parce qu'elle ne s'oublie pas.
 */
const RESERVES_ORIGINE: Role[] = ["ADMIN_SYSTEME", "MINISTRE"];

/**
 * Le registre des profils réservés, ouvert comme les trois autres.
 *
 * La liste ci-dessus ne sert plus qu'à **semer** : « réservé à
 * l'administrateur » est une propriété du profil, réglable depuis l'écran
 * Système, et non une liste gravée dans le code. Un ministère qui déciderait
 * qu'un directeur général peut nommer ses directeurs centraux n'a pas à
 * demander une nouvelle version de la plateforme.
 *
 * `hydraterProfils` y dépose ce que dit la table.
 */
/**
 * Les profils dont le porteur n'est pas un agent du ministère.
 *
 * Un seul à ce jour, et ce n'est pas un oubli : l'administrateur système fait
 * vivre la plateforme — il crée les directions, les profils et veille à la
 * sécurité — sans servir dans aucune d'elles. Il n'a donc ni dossier, ni
 * carrière, ni congés, et le socle d'agent ne lui vaut rien.
 */
export const PROFILS_TECHNIQUES: string[] = ["ADMIN_SYSTEME"];

/**
 * Les profils qui voient le ministère entier, et non leur seul périmètre.
 *
 * Cinq, et chacun pour une raison qu'on peut écrire. Le **ministre** et son
 * **cabinet** décident à l'échelle du ministère : leur refuser la vue
 * d'ensemble reviendrait à leur demander de décider à l'aveugle. Le
 * **secrétaire général** et le **directeur général** de la DGARH gèrent le
 * personnel de toutes les directions — c'est l'objet même de leur direction.
 * L'**inspection** ne contrôlerait rien si son objet pouvait se soustraire à
 * elle.
 *
 * Tous les autres — directeurs centraux, chefs de service, secrétaires — ne
 * voient que leur entité et ce qu'elle contient. Ce n'est pas une défiance :
 * c'est qu'ils n'ont aucune raison de lire le dossier d'un agent dont ils ne
 * répondent pas, et qu'un accès sans raison est la définition de la fuite.
 */
export const PORTEE_MINISTERIELLE: string[] = [
  "MINISTRE", "CABINET", "SECRETAIRE_GENERAL", "DIRECTEUR_GENERAL", "INSPECTEUR",
];

/**
 * Les profils qui **administrent** le ministère entier — et ils sont deux.
 *
 * Tout, dans ce ministère, est géré par la DGARH : elle tient le fichier du
 * personnel de toutes les structures, cabinet compris. Le **directeur
 * général** en répond, et le **secrétaire général** tient la chaîne
 * administrative à la même échelle. Ce sont eux qui créent les directions,
 * les services et les bureaux, et qui en désignent les responsables — après
 * quoi chaque responsable délègue à son tour dans son propre périmètre.
 *
 * Le ministre n'y figure pas, et ce n'est pas un oubli. Il relève du cabinet,
 * dont le personnel est lui-même géré par la DGARH ; son profil est
 * particulier en ceci qu'il **voit tout et n'administre rien**. Un ministre
 * n'ouvre pas de comptes : il lit ce que l'administration lui remonte et
 * décide. L'administrateur système ouvre son compte et celui du directeur
 * général — deux comptes — puis se retire de la chaîne.
 *
 * Le cabinet et l'inspection n'y figurent pas davantage : le premier est
 * administré par la DGARH, la seconde contrôle et ne commande pas. L'un et
 * l'autre gardent la main sur leur propre maison, ce qui relève du périmètre
 * ordinaire.
 */
const ADMINISTRATION_ORIGINE: string[] = ["DIRECTEUR_GENERAL", "SECRETAIRE_GENERAL"];

/**
 * Le registre, ouvert aux profils de la maison comme les quatre autres.
 *
 * La liste ci-dessus ne sert qu'à **semer** : « administre le ministère » est
 * une propriété du profil, réglable depuis l'écran Système. Un ministère qui
 * déciderait que son secrétaire général n'administre que le secrétariat n'a
 * pas à demander une nouvelle version de la plateforme. `hydraterProfils` y
 * dépose ce que dit la table.
 */
export const ADMINISTRATION_MINISTERIELLE: string[] = [...ADMINISTRATION_ORIGINE];

export const ROLES_RESERVES_ADMIN: string[] = [...RESERVES_ORIGINE];

/**
 * Ce que chaque profil recouvre, dit en une phrase au chef qui l'attribue.
 *
 * Aucune ne doit manquer : cette phrase est tout ce dont dispose un chef de
 * service au moment de choisir, et un profil sans description le laisse
 * décider au jugé — ce qui produit exactement les accès qu'on passe ensuite
 * des mois à reprendre.
 */
export const PROFIL_DESCRIPTIONS: Record<Role, string> = {
  MINISTRE:
    "Lit tout ce qui sert à décider et n'écrit aucun acte : décider n'est pas "
    + "instruire. Profil particulier à un titre — il voit le ministère entier et "
    + "n'y administre rien, l'administration relevant de la DGARH.",
  CABINET: "Prépare et relance pour le ministre ; porte les notes et circulaires.",
  SECRETAIRE_GENERAL:
    "Tient la chaîne administrative à l'échelle du ministère : instruit, valide et "
    + "administre les structures, sans le pouvoir de signature du directeur général.",
  INSPECTEUR: "Contrôle dans son périmètre et consigne ses constats. N'instruit aucun dossier de carrière — contrôler ce qu'on a instruit n'est pas un contrôle.",
  ADMIN_SYSTEME:
    "Installe la plateforme, définit les profils d'accès et veille à la sécurité. Il "
    + "ouvre deux comptes et se retire : celui du ministre et celui du directeur général "
    + "de la DGARH, qui n'ont personne au-dessus d'eux pour les leur accorder. Tout le "
    + "reste — directions, services, bureaux et leurs responsables — est créé par la "
    + "DGARH. Il n'est pas agent du ministère et n'accède ni aux dossiers, ni aux actes, "
    + "ni aux documents.",
  DIRECTEUR_GENERAL:
    "Dirige l'administration et les ressources humaines de tout le ministère, cabinet "
    + "compris, et signe les actes. Il crée les directions, services et bureaux à tous "
    + "les niveaux et en désigne les responsables, qui délèguent ensuite chez eux.",
  DIRECTEUR_CENTRAL: "Dirige une direction centrale et son personnel.",
  DIRECTEUR_DEPARTEMENTAL: "Dirige une direction départementale et son personnel.",
  CHEF_ETABLISSEMENT: "Dirige un établissement et son personnel.",
  CHEF_SERVICE: "Dirige un service : inscrit son personnel et pointe ses présences.",
  CHEF_BUREAU: "Dirige un bureau : instruit les dossiers et pointe ses agents.",
  AGENT_INSTRUCTEUR: "Instruit les dossiers de carrière sans les valider.",
  SECRETAIRE: "Tient le point d'accueil : reçoit les arrivants et le cahier d'émargement.",
  AGENT: "Consulte son propre dossier et les informations du ministère.",
};

/**
 * Un chef peut-il accorder ce profil, sur cette entité ?
 *
 * Renvoie le motif du refus, jamais un simple « non » : un bouton grisé sans
 * explication fait appeler l'administrateur pour une règle qui aurait tenu en
 * une ligne à l'écran.
 */
export function peutHabiliter(
  accordeur: Pick<Utilisateur, "role" | "entiteId">,
  role: string,
  entiteId: string
): VerdictHabilitation {
  /* Un profil **technique** ouvre tout : c'est lui qui installe la plateforme
     et désigne les premières têtes, y compris celles qu'aucun chef ne pourrait
     désigner — il n'y a personne au-dessus du ministre pour le nommer dans
     l'outil. Son geste est tracé comme les autres.

     La condition porte sur la nature du profil et non sur son code : écrire
     `=== "ADMIN_SYSTEME"` rendait la règle inapplicable à un second profil
     technique, et surtout muette si l'on renommait celui-là. */
  if (PROFILS_TECHNIQUES.includes(accordeur.role)) return { ok: true };

  if (ROLES_RESERVES_ADMIN.includes(role)) {
    return {
      ok: false,
      motif: "Ce profil procède d'un acte de nomination : seul l'administrateur système l'ouvre.",
    };
  }

  const rangAccordeur = RANG_HIERARCHIQUE[accordeur.role] ?? 0;
  if (rangAccordeur === 0) {
    return {
      ok: false,
      motif: "Votre rôle ne commande aucun personnel : il ne donne pas d'accès.",
    };
  }

  if ((RANG_HIERARCHIQUE[role] ?? 0) >= rangAccordeur) {
    return {
      ok: false,
      motif: "On n'accorde qu'un profil strictement inférieur au sien.",
    };
  }

  /* Le périmètre d'administration, et non l'entité de rattachement. Les deux
     coïncident pour presque tous les profils ; ils divergent pour celui dont
     la direction a précisément pour objet d'administrer les autres. */
  if (!ADMINISTRATION_MINISTERIELLE.includes(accordeur.role)
    && !dansPerimetre(accordeur.entiteId, entiteId)) {
    return {
      ok: false,
      motif: "Cette entité est hors de votre périmètre.",
    };
  }

  return { ok: true };
}

/** Les profils qu'un chef peut réellement accorder sur une entité donnée. */
export function profilsAccordables(
  accordeur: Pick<Utilisateur, "role" | "entiteId">,
  entiteId: string
): string[] {
  return Object.keys(RANG_HIERARCHIQUE)
    .filter((r) => peutHabiliter(accordeur, r, entiteId).ok)
    .sort((a, b) => (RANG_HIERARCHIQUE[b] ?? 0) - (RANG_HIERARCHIQUE[a] ?? 0));
}

/* ------------------------------------------------------------------ */
/* Projection : le droit en vigueur se calcule, il ne se stocke pas    */
/* ------------------------------------------------------------------ */

/** Cette habilitation produit-elle effet à cette date ? */
export const enVigueur = (h: Habilitation, date: string) =>
  !h.revoqueeLe
  && h.dateDebut <= date
  && (h.dateFin === null || h.dateFin >= date);

/**
 * Qui dirige quoi — la projection, écrite une fois.
 *
 * Elle l'avait été trois fois, et l'une des trois était fausse : le tableau de
 * bord de l'administrateur tenait une entité pour « pourvue » dès qu'un compte
 * y était rattaché. Depuis que **chaque agent a un compte**, cela rendait
 * toutes les entités pourvues, et l'écran annonçait « toutes pourvues » là où
 * soixante-seize directions, services et établissements n'avaient personne à
 * leur tête. C'est l'erreur la plus coûteuse qu'un tableau de bord puisse
 * commettre : rassurer faussement sur ce qu'il est seul à pouvoir signaler.
 *
 * Est responsable celui dont le profil **commande** — rang strictement
 * supérieur à celui d'un agent — et dont l'habilitation est **en vigueur** à
 * la date considérée. À égalité de lieu, le rang le plus élevé l'emporte :
 * un directeur et son chef de service rattachés à la même entité ne laissent
 * aucun doute sur lequel la dirige.
 */
export function chefsParEntite(
  comptes: Utilisateur[],
  habilitations: Habilitation[],
  date: string
): Map<string, Utilisateur> {
  const socle = RANG_HIERARCHIQUE.AGENT ?? 10;
  const m = new Map<string, Utilisateur>();
  comptes
    .filter((c) => c.actif && (RANG_HIERARCHIQUE[c.role] ?? 0) > socle)
    .filter((c) => habilitationsEnVigueur(habilitations, c.id, date).length > 0)
    .forEach((c) => {
      const tenant = m.get(c.entiteId);
      if (!tenant || (RANG_HIERARCHIQUE[c.role] ?? 0) > (RANG_HIERARCHIQUE[tenant.role] ?? 0)) {
        m.set(c.entiteId, c);
      }
    });
  return m;
}

/**
 * Les habilitations d'un compte en vigueur à une date, la plus forte d'abord.
 *
 * Un agent peut en cumuler : chef de bureau à demeure, et secrétaire du point
 * d'accueil par ailleurs. On ne garde pas « la dernière posée » — on trie par
 * rang, parce que c'est le rang qui décide de ce qu'il peut faire.
 */
export function habilitationsEnVigueur(
  habilitations: Habilitation[],
  utilisateurId: string,
  date: string
): Habilitation[] {
  return habilitations
    .filter((h) => h.utilisateurId === utilisateurId && enVigueur(h, date))
    .sort((a, b) => (RANG_HIERARCHIQUE[b.role] ?? 0) - (RANG_HIERARCHIQUE[a.role] ?? 0));
}

/**
 * Le rôle et le périmètre en vigueur, projetés depuis les habilitations.
 *
 * `null` quand aucune n'est en vigueur : le compte existe mais n'ouvre plus
 * rien. C'est un état légitime — un intérim qui s'achève, une habilitation
 * révoquée — et il vaut mieux l'afficher que de laisser en place un droit
 * que plus personne n'a accordé.
 */
export function roleProjete(
  habilitations: Habilitation[],
  utilisateurId: string,
  date: string
): { role: CodeProfil; entiteId: string; source: Habilitation } | null {
  const [premiere] = habilitationsEnVigueur(habilitations, utilisateurId, date);
  return premiere
    ? { role: premiere.role, entiteId: premiere.entiteId, source: premiere }
    : null;
}

/**
 * Les comptes qu'un chef administre : ceux de son périmètre, sous son rang.
 *
 * Lui-même en est exclu. Un chef qui figurerait dans sa propre liste pourrait
 * s'y retirer son habilitation par mégarde et fermer la porte derrière lui —
 * et il n'y a personne, dans un service, pour la rouvrir.
 */
export function comptesAdministrables(
  chef: Pick<Utilisateur, "id" | "role" | "entiteId">,
  comptes: Utilisateur[]
): Utilisateur[] {
  const rangChef = RANG_HIERARCHIQUE[chef.role] ?? 0;
  if (chef.role === "ADMIN_SYSTEME") return comptes.filter((c) => c.id !== chef.id);
  if (rangChef === 0) return [];
  return comptes.filter((c) =>
    c.id !== chef.id
    && (RANG_HIERARCHIQUE[c.role] ?? 0) < rangChef
    && dansPerimetre(chef.entiteId, c.entiteId));
}
