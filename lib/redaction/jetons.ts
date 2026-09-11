/**
 * Jetons de fusion — ce qui fait qu'un modèle est un modèle.
 *
 * Sans eux, « enregistrer comme modèle » ne produirait qu'une copie : le
 * nom de l'agent d'hier resterait dans la pièce d'aujourd'hui, et c'est
 * exactement l'erreur qu'on trouve dans les dossiers quand les agents
 * dupliquent un fichier au lieu de repartir d'un modèle.
 *
 * Un jeton non résolu ne disparaît pas en silence : il devient une ligne
 * de pointillés, la forme qu'un imprimé administratif donne à un champ
 * qui reste à remplir à la main.
 */

import { dateLongue, type ContexteDocument } from "@/lib/documents";

/** La marque d'un champ resté vide, comme sur un imprimé. */
export const A_REMPLIR = "……………";

export interface Jeton {
  cle: string;
  libelle: string;
  groupe: "Agent" | "Structure" | "Acte" | "Signature" | "Date";
  resoudre: (c: ContexteDocument) => string | undefined;
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export const JETONS: Jeton[] = [
  { cle: "agent.nom", libelle: "Nom de l'agent", groupe: "Agent", resoudre: (c) => c.agent?.nom },
  { cle: "agent.prenom", libelle: "Prénom de l'agent", groupe: "Agent", resoudre: (c) => c.agent?.prenom },
  { cle: "agent.nomComplet", libelle: "Nom et prénom", groupe: "Agent", resoudre: (c) => c.agent && `${c.agent.prenom} ${c.agent.nom}` },
  { cle: "agent.matricule", libelle: "Matricule", groupe: "Agent", resoudre: (c) => c.agent?.matricule },
  { cle: "agent.fonction", libelle: "Fonction", groupe: "Agent", resoudre: (c) => c.agent?.fonction },
  { cle: "agent.dateNaissance", libelle: "Date de naissance", groupe: "Agent", resoudre: (c) => dateLongue(c.agent?.dateNaissance) },
  { cle: "agent.lieuNaissance", libelle: "Lieu de naissance", groupe: "Agent", resoudre: (c) => c.agent?.lieuNaissance },
  { cle: "agent.echelon", libelle: "Échelon", groupe: "Agent", resoudre: (c) => c.agent?.echelon?.toString() },
  { cle: "agent.indice", libelle: "Indice", groupe: "Agent", resoudre: (c) => c.agent?.indice?.toString() },

  { cle: "entite.nom", libelle: "Nom de la structure", groupe: "Structure", resoudre: (c) => c.entite?.nom },
  { cle: "entite.sigle", libelle: "Sigle", groupe: "Structure", resoudre: (c) => c.entite?.sigle },

  { cle: "acte.reference", libelle: "Référence de l'acte", groupe: "Acte", resoudre: (c) => c.acte?.reference },
  { cle: "acte.objet", libelle: "Objet de l'acte", groupe: "Acte", resoudre: (c) => c.acte?.objet },
  { cle: "acte.dateSignature", libelle: "Date de signature", groupe: "Acte", resoudre: (c) => dateLongue(c.acte?.dateSignature) },
  { cle: "acte.dateEffet", libelle: "Date d'effet", groupe: "Acte", resoudre: (c) => dateLongue(c.acte?.cible?.dateEffet) },

  { cle: "signataire.nom", libelle: "Nom du signataire", groupe: "Signature", resoudre: (c) => c.signataire?.nom },
  { cle: "signataire.qualite", libelle: "Qualité du signataire", groupe: "Signature", resoudre: (c) => c.signataire?.qualite },

  { cle: "date.jour", libelle: "Date du jour", groupe: "Date", resoudre: () => dateLongue(new Date().toISOString()) },
  { cle: "date.annee", libelle: "Année en cours", groupe: "Date", resoudre: () => String(new Date().getFullYear()) },
  { cle: "date.mois", libelle: "Mois en cours", groupe: "Date", resoudre: () => MOIS[new Date().getMonth()] },
];

const PAR_CLE = new Map(JETONS.map((j) => [j.cle, j]));

/** Écriture d'un jeton dans le corps du document. */
export const ecrireJeton = (cle: string) => `{{${cle}}}`;

const MOTIF = /\{\{\s*([a-zA-Z]+\.[a-zA-Z]+)\s*\}\}/g;

export interface Fusion {
  contenu: string;
  /** Jetons restés vides : ce que le rédacteur devra compléter à la main. */
  manquants: string[];
}

/** Remplace les jetons par les données du dossier ouvert. */
export function fusionner(html: string, contexte: ContexteDocument): Fusion {
  const manquants: string[] = [];
  const contenu = html.replace(MOTIF, (entier, cle: string) => {
    const jeton = PAR_CLE.get(cle);
    if (!jeton) return entier;
    const valeur = jeton.resoudre(contexte);
    if (!valeur || valeur === A_REMPLIR) {
      manquants.push(jeton.libelle);
      return A_REMPLIR;
    }
    return valeur;
  });
  return { contenu, manquants: [...new Set(manquants)] };
}

/** Les jetons présents dans un corps — pour dire ce qu'un modèle attend. */
export function jetonsDe(html: string): Jeton[] {
  const vus = new Set<string>();
  let m: RegExpExecArray | null;
  const motif = new RegExp(MOTIF.source, "g");
  while ((m = motif.exec(html))) vus.add(m[1]);
  return [...vus].map((c) => PAR_CLE.get(c)).filter((j): j is Jeton => !!j);
}
