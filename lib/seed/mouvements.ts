import type { Acte, Affectation, Agent, Entite, Poste } from "@/lib/types";
import { fabriquerActe } from "./regles";
import { AUJOURDHUI, chance, int, pad, pick, plusJours } from "./aleatoire";

/* ------------------------------------------------------------------ */
/* Mutations récentes — le mouvement, que le semis avait oublié        */
/* ------------------------------------------------------------------ */

/**
 * Ce que ce fichier ajoute, et ce que son absence cachait.
 *
 * Le semis donnait à chaque agent **une seule affectation**, datée de son
 * recrutement, et jamais close. Un ministère de deux mille quatre cents
 * agents dont personne n'a bougé depuis 1992 : le décor tenait tant qu'aucun
 * écran ne regardait le mouvement, et il s'est effondré dès que l'un d'eux
 * l'a fait — l'écran des arrivées affichait 2 421 installés et zéro attendu,
 * c'est-à-dire rien à décider.
 *
 * Les mutations posées ici sont donc du décor comme le reste, mais elles
 * rétablissent la forme réelle du problème : un flux continu de mouvements,
 * dont une partie n'a pas encore abouti sur le terrain. C'est cette partie
 * que la DGARH doit voir.
 *
 * Chaque mutation ferme l'affectation précédente et en ouvre une nouvelle,
 * rattachée à un acte — la règle du dépôt ne souffre pas d'exception : rien
 * ne change dans un dossier sans acte.
 */

/** Combien d'agents ont bougé sur les dix-huit derniers mois. */
const MOUVEMENTS = 180;

export function construireMouvements({ agents, affectations, postes, entites }: {
  agents: Agent[];
  affectations: Affectation[];
  postes: Poste[];
  entites: Entite[];
}): { actes: Acte[] } {
  const actes: Acte[] = [];

  /* Les entités qui accueillent réellement du personnel. Muter un agent vers
     une entité vide produirait un service d'une personne, ce qu'aucune
     réorganisation ne fait. */
  const effectifs = new Map<string, number>();
  affectations.filter((a) => !a.dateFin)
    .forEach((a) => effectifs.set(a.entiteId, (effectifs.get(a.entiteId) ?? 0) + 1));
  const accueillantes = entites.filter((e) => (effectifs.get(e.id) ?? 0) >= 3);
  if (accueillantes.length < 2) return { actes };

  const postesLibres = postes.filter((p) => p.statut === "VACANT");
  const parEntite = new Map<string, Poste[]>();
  postesLibres.forEach((p) => {
    const l = parEntite.get(p.entiteId) ?? [];
    l.push(p);
    parEntite.set(p.entiteId, l);
  });

  /* Un agent sur treize, pris régulièrement dans la liste : le tirage reste
     déterministe, donc le décor se rejoue à l'identique. */
  const candidats = affectations
    .filter((a) => !a.dateFin)
    .filter((_, i) => i % 13 === 0)
    .slice(0, MOUVEMENTS);

  candidats.forEach((ancienne, i) => {
    const agent = agents.find((a) => a.id === ancienne.agentId);
    if (!agent) return;

    const cible = pick(accueillantes.filter((e) => e.id !== ancienne.entiteId));
    if (!cible) return;

    /* Étalées sur dix-huit mois, avec une concentration sur les trois
       derniers : c'est la forme d'un flux vu depuis aujourd'hui — l'ancien
       est résolu, le récent ne l'est pas encore. */
    const dateEffet = chance(0.45)
      ? plusJours(AUJOURDHUI, -int(1, 90))
      : plusJours(AUJOURDHUI, -int(91, 540));

    // Une mutation ne peut pas précéder l'affectation qu'elle remplace.
    if (dateEffet <= ancienne.dateEffet) return;

    const nomComplet = `${agent.prenom} ${agent.nom}`;
    const type = ancienne.entiteId.slice(0, 7) === cible.id.slice(0, 7) ? "AFFECTATION" : "MUTATION";
    const acte = fabriquerActe(type, agent.id, nomComplet, "ENT-SPC-BRM", dateEffet, "NOTIFIE");
    actes.push(acte);

    /* L'ancienne se ferme la veille : deux affectations en vigueur le même
       jour feraient compter l'agent deux fois dans l'effectif. */
    ancienne.dateFin = plusJours(dateEffet, -1);

    const posteCible = (parEntite.get(cible.id) ?? []).pop() ?? null;
    if (posteCible) posteCible.statut = "OCCUPE";

    affectations.push({
      id: `AFF-M-${pad(i + 1, 5)}`,
      agentId: agent.id,
      entiteId: cible.id,
      posteId: posteCible?.id ?? null,
      fonction: posteCible?.intitule ?? ancienne.fonction,
      dateEffet,
      dateFin: null,
      acteId: acte.id,
    });
  });

  return { actes };
}
