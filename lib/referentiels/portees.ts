import { TEXTES } from "./textes";

/* ------------------------------------------------------------------ */
/* Les portées — jusqu'où une entité voit, et jusqu'où elle administre */
/* ------------------------------------------------------------------ */

/**
 * La portée ministérielle appartient à **l'entité**, pas au profil.
 *
 * Le défaut, et il est le même que celui des attributions. `DIRECTEUR_GENERAL`
 * est une seule ligne de matrice, et elle portait la mention « voit et
 * administre le ministère entier ». Tant que la DGARH était la seule direction
 * générale, c'était juste : le directeur général de la DGARH gère le personnel
 * de tout le ministère, l'arrêté n° 25567 le dit.
 *
 * La lecture des arrêtés en a ajouté trois — enseignement technique,
 * enseignement professionnel, équipement et patrimoine. Elles ont hérité de la
 * ligne, et donc de la portée : mesuré avant correction, le directeur général
 * de l'enseignement technique **voyait et administrait la DGARH**. Il pouvait
 * y créer des directions et en désigner les chefs. Aucun texte ne lui donne
 * cela, et le bon sens administratif encore moins.
 *
 * **La règle : les deux doivent concorder.** Le profil doit porter la portée
 * ministérielle *et* l'entité doit la déclarer. Une entité non déclarée n'ouvre
 * rien au-delà de sa propre branche — ce qui fait de l'absence de déclaration
 * le cas **fermé**, et non le cas ouvert. Une direction créée demain depuis
 * l'écran Système est donc cloisonnée d'office, ce qui est le bon défaut : on
 * ouvre un périmètre par un texte, on ne l'ouvre pas par omission.
 *
 * **Voir et administrer ne vont pas ensemble.** L'inspection générale voit le
 * ministère entier — c'est la définition même du contrôle — et n'administre
 * rien au-dehors : instruire un dossier puis le contrôler n'est pas un
 * contrôle. Le ministre est dans le même cas, pour une autre raison : il
 * décide, il n'ouvre pas de comptes.
 */

export type Portee = "MINISTERE" | "BRANCHE";

export interface PorteeDeclaree {
  /** Le personnel et les dossiers que l'on peut **lire** au-delà de sa branche. */
  voit: Portee;
  /** Les entités où l'on peut **créer et désigner** au-delà de sa branche. */
  administre: Portee;
  /** Le texte qui fonde cette portée. Jamais une déduction sur un intitulé. */
  reference: string;
  /** Ce que ce texte donne, en une phrase, pour l'écrire à l'écran. */
  motif: string;
}

const BRANCHE: Pick<PorteeDeclaree, "voit" | "administre"> = {
  voit: "BRANCHE", administre: "BRANCHE",
};

export const PORTEES_DECLAREES: Record<string, PorteeDeclaree> = {
  /* Le sommet. Le ministre voit tout et n'administre rien — c'est son profil
     qui le borne, pas cette déclaration. Le secrétaire général, assis à la
     même entité, tient la chaîne administrative à l'échelle du ministère :
     lui administre. Une entité peut donc ouvrir les deux portées sans que
     tous ceux qui y siègent les franchissent. */
  "ENT-METP": {
    voit: "MINISTERE", administre: "MINISTERE",
    reference: TEXTES.DECRET_ORG,
    motif: "Le ministère dans son ensemble : c'est l'échelon dont tout procède.",
  },

  /* « La direction générale de l'administration et des ressources humaines
     est chargée de la gestion du personnel… du ministère » — c'est ce qui la
     distingue des trois autres directions générales, et la seule raison pour
     laquelle sa portée dépasse sa branche. */
  "ENT-DGARH": {
    voit: "MINISTERE", administre: "MINISTERE",
    reference: TEXTES.ARR_25567,
    motif: "Elle gère le personnel de toutes les structures du ministère, cabinet compris.",
  },

  /* Le contrôle porte sur le ministère entier, et s'arrête au contrôle. */
  "ENT-IG": {
    voit: "MINISTERE", administre: "BRANCHE",
    reference: TEXTES.ARR_25569,
    motif: "L'inspection générale contrôle toutes les structures, et n'en administre aucune.",
  },

  /* Le cabinet parle pour le ministre : il suit l'ensemble des structures et
     n'en administre aucune — leur personnel est tenu par la DGARH. */
  "ENT-CAB": {
    voit: "MINISTERE", administre: "BRANCHE",
    reference: TEXTES.ARR_25564,
    motif: "Le cabinet suit l'ensemble des structures pour le compte du ministre.",
  },
};

/**
 * La portée d'une entité. Sans déclaration, la branche — et rien de plus.
 *
 * On ne remonte **pas** l'arbre, à la différence des attributions. Un bureau
 * de la DGARH n'hérite pas de la portée ministérielle de sa direction
 * générale : l'arrêté la donne à la direction générale, et un chef de bureau
 * n'est pas le directeur général. Hériter ici ouvrirait le ministère entier à
 * cent dix-neuf bureaux d'un trait.
 */
export function porteeDe(entiteId?: string | null): PorteeDeclaree {
  return (entiteId && PORTEES_DECLAREES[entiteId])
    || { ...BRANCHE, reference: "", motif: "" };
}

/** Cette entité porte-t-elle une portée qui dépasse sa branche ? */
export const aPorteeMinisterielle = (entiteId?: string | null) => {
  const p = porteeDe(entiteId);
  return p.voit === "MINISTERE" || p.administre === "MINISTERE";
};
