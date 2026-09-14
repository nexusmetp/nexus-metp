import type {
  Affectation, Agent, Entite, PointAccueil, PriseDeService, RegistreJour, Utilisateur,
} from "@/lib/types";
import { doitTenirUnPoint, idPoint, idRegistre } from "@/lib/referentiels/accueil";
import { estOuvre } from "@/lib/referentiels/presence";
import { AUJOURDHUI, chance, int, iso, pad, pick, plusJours } from "./aleatoire";

/* ------------------------------------------------------------------ */
/* Points d'accueil, arrivées, cahiers — décor de démonstration        */
/* ------------------------------------------------------------------ */

/**
 * Ce que ce semis représente, et pourquoi il ne représente pas un ministère
 * parfait.
 *
 * Le **lieu existe partout** : chaque direction, chaque service, chaque
 * établissement a son secrétariat — c'est ainsi que l'administration est
 * faite, et ce n'est pas à l'outil d'en douter. Ce qui varie, et ce que le
 * décor met en scène, ce sont les deux choses qui varient réellement sur le
 * terrain :
 *
 *  1. **le responsable est-il désigné ?** Un cahier sans titulaire nommé est
 *     un cahier que personne n'ouvre le jour où le chef est en mission ;
 *  2. **le cahier est-il tenu ?** C'est la vraie question, et elle est
 *     d'organisation, pas de discipline. Un service qui n'ouvre pas son
 *     registre ne compte pas des absents : il ne compte rien du tout.
 *
 * Le décor laisse donc une part des points sans responsable et une part des
 * journées sans cahier — non pour noircir le tableau, mais parce qu'un décor
 * où tout serait tenu ferait croire le déploiement achevé et rendrait
 * l'écran inutile : il n'y aurait plus rien à décider.
 */

const LIBELLES_POINT: Partial<Record<Entite["niveau"], string>> = {
  MINISTERE: "Secrétariat du ministère",
  CABINET: "Secrétariat du cabinet",
  INSPECTION_GENERALE: "Secrétariat de l'inspection générale",
  DIRECTION_GENERALE: "Secrétariat de la direction générale",
  SECRETARIAT: "Bureau du personnel",
  DIRECTION: "Secrétariat de direction",
  SERVICE: "Bureau du personnel du service",
  DIRECTION_DEPARTEMENTALE: "Secrétariat de la direction départementale",
  INSPECTION_INTERDEPARTEMENTALE: "Secrétariat de l'inspection",
  ETABLISSEMENT: "Bureau du surveillant général",
};

const LOCALISATIONS = [
  "Bâtiment principal, rez-de-chaussée",
  "Bâtiment principal, 1er étage",
  "Bâtiment administratif, 2e étage",
  "Aile est, rez-de-chaussée",
  "Aile ouest, 1er étage",
  "Annexe, rez-de-chaussée",
];

export function construireAccueil({ agents, affectations, entites, utilisateurs }: {
  agents: Agent[];
  affectations: Affectation[];
  entites: Entite[];
  utilisateurs: Utilisateur[];
}): {
  pointsAccueil: PointAccueil[];
  prisesService: PriseDeService[];
  registres: RegistreJour[];
} {
  const enPoste = affectations.filter((a) => !a.dateFin);
  /* Les agents d'une entité, pour y choisir celui qui tient le cahier : on ne
     nomme pas responsable quelqu'un qui n'y sert pas. */
  const agentsDe = new Map<string, string[]>();
  enPoste.forEach((a) => {
    const l = agentsDe.get(a.entiteId) ?? [];
    l.push(a.agentId);
    agentsDe.set(a.entiteId, l);
  });

  /* ---------------- Les points d'accueil ---------------- */
  const pointsAccueil: PointAccueil[] = [];
  entites.filter(doitTenirUnPoint).forEach((e) => {
    const surPlace = agentsDe.get(e.id) ?? [];
    /* Un point sur cinq n'a pas de responsable désigné dans la plateforme.
       Ce n'est pas que le poste n'existe pas — c'est que le chef du service
       ne l'a pas encore désigné ici, et l'écran doit le dire plutôt que
       d'afficher un blanc. La désignation est son geste, pas celui du
       semis : elle se fait depuis /equipe, et elle donne lieu à une
       habilitation de secrétaire qui porte son auteur. */
    const designe = surPlace.length > 0 && !chance(0.2);
    pointsAccueil.push({
      id: idPoint(e.id),
      entiteId: e.id,
      libelle: LIBELLES_POINT[e.niveau] ?? "Point d'accueil du personnel",
      localisation: chance(0.62) ? pick(LOCALISATIONS) : null,
      responsableId: designe ? pick(surPlace) : null,
      suppleantId: designe && surPlace.length > 3 && chance(0.45) ? pick(surPlace) : null,
      /* Les heures ne sont volontairement renseignées nulle part : aucune
         décision ne nous a fixé l'horaire d'ouverture des services, et
         l'inventer ferait calculer des retards sur une heure imaginaire. */
      heureOuverture: null,
      heureFermeture: null,
      modeReleve: chance(0.42) ? "SAISIE_DIRECTE"
        : chance(0.5) ? "REGISTRE_PAPIER"
        : chance(0.4) ? "MIXTE" : "NON_RENSEIGNE",
      rattacheA: null,
      actif: true,
      provenance: "A_VERIFIER",
      observations: designe ? undefined : "Responsable du registre non désigné.",
    });
  });

  /* ---------------- Les prises de service ---------------- */
  const parAgent = new Map(agents.map((a) => [a.id, a]));
  const accueillant = new Map(
    pointsAccueil.map((p) => [p.entiteId, p.responsableId] as const)
  );
  const nomDe = (id?: string | null) => {
    const a = id ? parAgent.get(id) : undefined;
    return a ? `${a.prenom} ${a.nom.toUpperCase()}` : null;
  };

  const prisesService: PriseDeService[] = [];
  enPoste.forEach((aff, i) => {
    const recent = aff.dateEffet >= plusJours(AUJOURDHUI, -120);
    const recuPar = accueillant.get(aff.entiteId) ?? null;

    /* Une affectation ancienne a forcément donné lieu à une installation :
       l'agent y sert depuis des années. Seules les affectations récentes
       peuvent être encore en cours d'exécution. */
    let dateArrivee: string | null = null;
    let dateInstallation: string | null = null;
    let statut: PriseDeService["statut"] = "INSTALLEE";

    if (!recent) {
      dateArrivee = plusJours(aff.dateEffet, int(0, 5));
      dateInstallation = plusJours(dateArrivee, int(0, 8));
    } else if (chance(0.58)) {
      dateArrivee = plusJours(aff.dateEffet, int(0, 6));
      dateInstallation = plusJours(dateArrivee, int(1, 12));
      if (dateInstallation > AUJOURDHUI) dateInstallation = null;
      statut = dateInstallation ? "INSTALLEE" : "ENREGISTREE";
    } else if (chance(0.45)) {
      dateArrivee = plusJours(aff.dateEffet, int(0, 9));
      if (dateArrivee > AUJOURDHUI) dateArrivee = null;
      statut = dateArrivee ? "ENREGISTREE" : "ATTENDUE";
    } else {
      // L'agent est attendu et ne s'est pas présenté. Aucun jugement : le
      // dossier est ouvert, et c'est le service qui dira pourquoi.
      statut = "ATTENDUE";
    }

    prisesService.push({
      id: `PDS-${pad(i + 1, 5)}`,
      agentId: aff.agentId,
      affectationId: aff.id,
      entiteId: aff.entiteId,
      pointAccueilId: idPoint(aff.entiteId),
      dateAttendue: aff.dateEffet,
      dateArrivee,
      dateInstallation,
      statut,
      recuPar: dateArrivee ? recuPar : null,
      recuParNom: dateArrivee ? nomDe(recuPar) : null,
      referencePV: dateInstallation
        ? `PV n° ${pad(int(1, 999), 3)}/METP-DGARH/${new Date(dateInstallation).getFullYear()}`
        : null,
      acteId: aff.acteId,
      observations: statut === "ATTENDUE" && chance(0.35)
        ? pick([
          "En attente de titre de transport.",
          "Agent joint par téléphone, arrivée annoncée.",
          "Aucune nouvelle du service d'origine.",
        ])
        : undefined,
      enregistreLe: dateArrivee ? `${dateArrivee}T09:00:00.000Z` : undefined,
    });
  });

  /* ---------------- Les cahiers ---------------- */
  const jours: string[] = [];
  {
    const d = new Date(AUJOURDHUI + "T12:00:00");
    while (jours.length < 20) {
      const j = iso(d);
      if (estOuvre(j)) jours.unshift(j);
      d.setDate(d.getDate() - 1);
    }
  }

  const compteurs = new Map<string, Utilisateur>();
  utilisateurs.forEach((u) => { if (u.entiteId) compteurs.set(u.entiteId, u); });
  const parDefaut = utilisateurs.find((u) => u.role === "CHEF_BUREAU") ?? utilisateurs[0];

  const registres: RegistreJour[] = [];
  pointsAccueil.forEach((p) => {
    const effectif = (agentsDe.get(p.entiteId) ?? []).length;
    if (effectif === 0) return;
    /* La régularité d'un service se tire au sort une fois, pas chaque jour :
       un service tient son cahier ou ne le tient pas, il n'alterne pas au
       hasard. Ceux qui le tiennent en sautent malgré tout quelques-uns. */
    const tenu = p.responsableId ? !chance(0.28) : chance(0.25);
    if (!tenu) return;
    const assidu = chance(0.7);
    const ouvreur = compteurs.get(p.entiteId) ?? parDefaut;

    jours.forEach((jour) => {
      if (!assidu && chance(0.35)) return;
      const emarges = Math.max(0, effectif - int(0, Math.max(1, Math.round(effectif * 0.22))));
      /* Le cahier du jour même n'est pas encore clos : il l'est le soir. */
      const clos = jour < AUJOURDHUI && !chance(0.12);
      registres.push({
        id: idRegistre(p.entiteId, jour),
        entiteId: p.entiteId,
        pointAccueilId: p.id,
        date: jour,
        ouvertPar: ouvreur.id,
        ouvertParNom: ouvreur.nomComplet,
        ouvertLe: `${jour}T07:30:00.000Z`,
        closPar: clos ? ouvreur.id : null,
        closParNom: clos ? ouvreur.nomComplet : null,
        closLe: clos ? `${jour}T17:00:00.000Z` : null,
        attendus: clos ? effectif : null,
        emarges: clos ? emarges : null,
      });
    });
  });

  return { pointsAccueil, prisesService, registres };
}
