import type { NiveauEntite, ParametresSysteme } from "@/lib/types";
import { NIVEAU_LABELS } from "./entites";

/* ------------------------------------------------------------------ */
/* Ce que le ministre approuve, et ce qu'il n'approuve pas             */
/* ------------------------------------------------------------------ */

/**
 * Faut-il que le ministre approuve tout ce que fait le directeur général ?
 *
 * Non — et la raison n'est pas la commodité, c'est qu'un contrôle qui porte
 * sur tout ne porte en réalité sur rien. Le directeur général administre
 * 2 422 agents, 151 entités et près de 4 000 actes. Soumettre chacun de ses
 * gestes à une signature produirait une file que personne ne vide, et l'on
 * connaît la suite : on cesse de passer par la plateforme, on régularise
 * après coup, et le registre — la seule chose qui donne au ministre une prise
 * réelle — devient faux. Une approbation qui ne s'exerce pas est pire
 * qu'aucune approbation, parce qu'elle laisse croire qu'un contrôle a eu lieu.
 *
 * Il faut donc distinguer deux choses que le mot « décision » recouvre :
 *
 *  - **l'exécution administrative** — inscrire un agent, ouvrir un bureau,
 *    enregistrer une arrivée. Le directeur général n'y décide rien : il met en
 *    œuvre ce qui a déjà été décidé ailleurs. C'est l'objet de sa délégation
 *    de signature, et la lui retirer reviendrait à supprimer la délégation ;
 *  - **ce qui engage le ministère** — nommer à la tête d'une direction, créer
 *    ou supprimer une structure. Là, l'autorité est bien celle du ministre, et
 *    elle doit s'exercer avant que l'effet se produise, non après.
 *
 * La plateforme sait déjà faire la seconde, et c'est pourquoi on n'ajoute
 * aucun mécanisme : **l'effet d'un acte s'applique à sa notification, jamais à
 * sa signature**. Une nomination soumise à approbation est donc un acte qui
 * attend, dont les effets — compte, habilitation, prise de fonction — ne se
 * produisent pas tant que le ministre n'a pas tranché. Le refus laisse une
 * trace au journal, comme l'accord.
 *
 * Le seuil ci-dessous est un **réglage**, pas une règle gravée. Un ministère
 * qui voudrait tout approuver n'a qu'à étendre la liste depuis l'écran
 * Système ; un autre qui voudrait n'approuver que les directions générales la
 * réduit. Ce que le code fixe, c'est le mécanisme, pas la politique.
 */
export const NIVEAUX_APPROBATION_PAR_DEFAUT: NiveauEntite[] = [
  "CABINET",
  "INSPECTION_GENERALE",
  "DIRECTION_GENERALE",
  "DIRECTION",
  "DIRECTION_DEPARTEMENTALE",
  "INSPECTION_INTERDEPARTEMENTALE",
];

/**
 * Les niveaux effectivement soumis à approbation.
 *
 * Le paramètre absent ne vaut pas « aucun » : une base montée avant ce
 * réglage n'a rien à dire sur la question, et le défaut doit alors être celui
 * qui protège. Une liste explicitement vide, elle, veut bien dire « aucune
 * approbation » — c'est un choix, il se lit comme tel.
 */
export function niveauxApprobation(parametres?: ParametresSysteme | null): NiveauEntite[] {
  return parametres?.niveauxSoumisApprobation ?? NIVEAUX_APPROBATION_PAR_DEFAUT;
}

/**
 * Cette nomination doit-elle attendre le ministre ?
 *
 * Le ministre lui-même en est dispensé : il n'a personne à qui demander, et
 * une règle qui lui opposerait sa propre signature bloquerait la plateforme
 * au premier geste. Le profil technique l'est aussi, parce qu'il amorce la
 * chaîne sur un organigramme où le ministre n'existe pas encore — c'est lui
 * qui ouvre ce compte-là.
 */
export function exigeApprobation(
  niveau: NiveauEntite,
  auteur: { role: string },
  parametres?: ParametresSysteme | null,
  dispenses: string[] = []
): boolean {
  if (dispenses.includes(auteur.role)) return false;
  return niveauxApprobation(parametres).includes(niveau);
}

/** Ce qu'on dit à l'écran, avant le geste, pour qu'il ne surprenne pas. */
export function mentionApprobation(niveau: NiveauEntite): string {
  return `Une nomination au niveau « ${NIVEAU_LABELS[niveau]} » engage le ministère : `
    + "l'acte part à la signature du ministre et ne produit ses effets qu'une fois "
    + "notifié. Le compte ne s'ouvre pas avant.";
}
