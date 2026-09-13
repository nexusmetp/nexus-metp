import type { CategoriePersonnel, NatureRemuneration, RemunerationContractuelle } from "@/lib/types";
import { REGLES_CATEGORIE } from "./statut";

/* ------------------------------------------------------------------ */
/* Rémunération — l'architecture est là, le chiffre ne l'est pas       */
/* ------------------------------------------------------------------ */

/**
 * La valeur du point indiciaire.
 *
 * **Elle n'est pas écrite ici, et elle ne le sera pas par l'outil.** C'est
 * une donnée réglementaire : l'inventer ferait apparaître une masse salariale
 * fausse dans un document qui porte le timbre de l'État, et personne, en la
 * lisant, ne saurait qu'elle a été devinée.
 *
 * Elle se renseigne dans Système → paramètres (`valeurPoint`), avec la date
 * d'effet et le texte qui la fonde. Tant qu'elle manque :
 *
 *  - les montants statutaires ne s'affichent pas — ils affichent « À vérifier » ;
 *  - la part contractuelle, elle, s'additionne normalement : ces montants
 *    viennent de contrats, pas d'une grille ;
 *  - aucun total général n'est présenté, parce qu'un total partiel présenté
 *    comme un total est un mensonge par omission.
 *
 * Le jour où elle est posée, tous les calculs de ce fichier s'activent sans
 * qu'une ligne d'écran change.
 */
export const VALEUR_DU_POINT = {
  valeur: null as number | null,
  provenance: "A_VERIFIER" as const,
  libelle: "À vérifier",
  note:
    "Valeur du point indiciaire de la fonction publique congolaise. À renseigner "
    + "dans Système, avec sa date d'effet et le texte qui la fixe.",
};

export const DEVISE = "FCFA";

export const NATURE_REMUNERATION_LABELS: Record<NatureRemuneration, string> = {
  MENSUELLE: "Mensuelle",
  HORAIRE: "Horaire",
  VACATION: "À la vacation",
  FORFAIT: "Forfaitaire",
  INDEMNITE: "Indemnité",
};

/** Une catégorie dont la rémunération ne se lit dans aucune grille. */
export const horsGrille = (c: CategoriePersonnel) => !REGLES_CATEGORIE[c].carriereStatutaire;

/** Les catégories concernées par l'enregistrement d'un montant contractuel. */
export const CATEGORIES_CONTRACTUELLES: CategoriePersonnel[] =
  (Object.keys(REGLES_CATEGORIE) as CategoriePersonnel[]).filter((c) => c !== "FONCTIONNAIRE");

/**
 * Le coût mensuel d'une rémunération contractuelle.
 *
 * Rendu `null` — et non zéro — dès que le montant manque ou que la quantité
 * nécessaire n'est pas connue. Un `null` se compte à part ; un zéro se
 * fondrait dans la somme et la rendrait fausse sans bruit.
 */
export function coutMensuelContractuel(r: RemunerationContractuelle): number | null {
  if (r.montant === null || r.montant === undefined) return null;
  switch (r.nature) {
    case "MENSUELLE":
    case "FORFAIT":
    case "INDEMNITE":
      return r.montant;
    case "HORAIRE":
    case "VACATION":
      return r.quantite ? r.montant * r.quantite : null;
  }
}

/** Le traitement indiciaire mensuel, si la valeur du point est connue. */
export function traitementIndiciaire(indice?: number, valeurPoint?: number | null): number | null {
  if (!indice || !valeurPoint) return null;
  return indice * valeurPoint;
}

export interface LigneCout {
  /** Ce qu'on sait additionner. */
  montant: number;
  /** Combien d'agents entrent dans ce montant. */
  agentsChiffres: number;
  /** Combien restent hors du chiffre, faute de donnée. */
  agentsNonChiffres: number;
}

export const ligneVide = (): LigneCout => ({ montant: 0, agentsChiffres: 0, agentsNonChiffres: 0 });

/**
 * Agrège un coût en gardant trace de ce qui n'a pas pu être chiffré.
 *
 * C'est tout l'objet de ce module : un agrégat n'est pas seulement une somme,
 * c'est une somme **et** l'aveu de ce qu'elle laisse dehors. Un écran qui
 * affiche « 12 directions, 480 millions » sans dire que 300 agents n'ont pas
 * de montant connu fait prendre une décision sur un chiffre incomplet.
 */
export function ajouter(l: LigneCout, montant: number | null): LigneCout {
  if (montant === null) return { ...l, agentsNonChiffres: l.agentsNonChiffres + 1 };
  return { ...l, montant: l.montant + montant, agentsChiffres: l.agentsChiffres + 1 };
}

/** Un agrégat est-il complet ? Sinon, il s'affiche avec sa réserve. */
export const estComplet = (l: LigneCout) => l.agentsNonChiffres === 0;

/** Montant formaté, ou la mention qui dit pourquoi il n'y en a pas. */
export function montantOuMention(montant: number | null): string {
  if (montant === null) return "Donnée non renseignée";
  return `${montant.toLocaleString("fr-FR")} ${DEVISE}`;
}
