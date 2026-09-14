/* ------------------------------------------------------------------ */
/* Le mot de passe provisoire, et son changement                       */
/* ------------------------------------------------------------------ */

/**
 * Ce que cette maquette fait, et ce qu'un serveur devra faire.
 *
 * Ici, le mot de passe est comparé en clair dans le navigateur, parce que la
 * plateforme n'a pas encore de serveur (`CLAUDE.md`, « Ce qui reste à faire »).
 * Le jour où il y en aura un, **rien de ce fichier ne survit tel quel** : le
 * mot de passe s'y hache (argon2id ou bcrypt), la comparaison se fait côté
 * serveur, et le provisoire s'envoie par un canal que le navigateur ne voit
 * pas. C'est écrit ici pour que personne ne prenne le raccourci de la maquette
 * pour un choix d'architecture.
 *
 * Ce qui, en revanche, est un vrai choix et doit être conservé : **un mot de
 * passe provisoire est propre à chaque compte**. Un mot de passe commun —
 * « Nexus2026 » posé sur deux mille comptes — n'est pas un mot de passe : il
 * est connu de tout le ministère le lendemain de sa distribution, et il ouvre
 * chacun des comptes dont on connaît l'adresse.
 */

/* Pas de I, l, 1, O, 0 : ces cinq caractères se confondent sur un imprimé et
   au téléphone, et le provisoire se transmet souvent ainsi. */
const CONSONNES = "BCDFGHJKMNPQRSTVWXZ";
const VOYELLES = "AEUY";
const CHIFFRES = "23456789";

const tire = (source: string, n: number) => {
  const octets = new Uint32Array(n);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => source[o % source.length]).join("");
};

/**
 * Un mot de passe provisoire lisible à voix haute et transmissible.
 *
 * Trois syllabes et quatre chiffres : assez pour n'être pas deviné, assez
 * simple pour être dicté au téléphone sans être épelé lettre par lettre — ce
 * que l'agent qui le reçoit fera de toute façon, et qui, avec une suite de
 * caractères illisible, finit sur un papier collé à l'écran.
 *
 * Il n'a pas à résister longtemps : il ne sert qu'une fois, et la plateforme
 * exige d'en changer à la première connexion.
 */
export function motDePasseProvisoire(): string {
  const syllabe = () => tire(CONSONNES, 1) + tire(VOYELLES, 1);
  return `${syllabe()}${syllabe()}${syllabe()}-${tire(CHIFFRES, 4)}`;
}

/** Longueur minimale d'un mot de passe choisi par l'agent lui-même. */
export const LONGUEUR_MINIMALE = 10;

/**
 * Ce qui vaut pour un mot de passe choisi, et ce qui ne vaut pas.
 *
 * On refuse trois choses, et rien de plus. Une longueur insuffisante, parce
 * qu'elle est le seul critère qui compte vraiment. Le mot de passe provisoire
 * lui-même, sans quoi « changer » ne veut rien dire. Et l'adresse de connexion,
 * parce qu'elle est écrite juste au-dessus, sur le même écran.
 *
 * Pas de règle de majuscule, de chiffre et de caractère spécial : elles
 * produisent « Motdepasse1! » partout, et l'agent qui doit les satisfaire
 * écrit son mot de passe quelque part. La longueur, elle, ne se contourne pas.
 */
export function verdictMotDePasse(
  choisi: string,
  { ancien, identifiant }: { ancien: string; identifiant: string }
): { ok: boolean; motif?: string } {
  const v = choisi.trim();
  if (v.length < LONGUEUR_MINIMALE) {
    return { ok: false, motif: `Au moins ${LONGUEUR_MINIMALE} caractères. C'est la seule règle, et elle n'est pas négociable.` };
  }
  if (v === ancien) {
    return { ok: false, motif: "C'est le mot de passe actuel. En changer suppose d'en prendre un autre." };
  }
  if (v.toLowerCase() === identifiant.toLowerCase()
    || v.toLowerCase() === identifiant.split("@")[0].toLowerCase()) {
    return { ok: false, motif: "C'est votre adresse de connexion, écrite sur le même écran." };
  }
  return { ok: true };
}
