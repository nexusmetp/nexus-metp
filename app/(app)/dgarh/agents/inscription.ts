import type { Entite, Utilisateur } from "@/lib/types";
import { PROFILS, entiteById, libelleProfil } from "@/lib/referentiels";

/* ------------------------------------------------------------------ */
/* Peut-on inscrire un agent ici, et sinon pourquoi                    */
/* ------------------------------------------------------------------ */

/**
 * Un bouton absent sans explication se lit comme une panne.
 *
 * C'est le reproche le plus juste qu'on puisse faire à un écran de ce genre :
 * on cherche « où ajoute-t-on un agent ? » alors que la réponse est « ici,
 * mais pas sous ce profil ». Tant que l'écran ne le dit pas, chacun conclut
 * que la fonctionnalité manque — et la cherche ailleurs, où elle n'est pas.
 *
 * Les profils cités sont lus au **catalogue vivant**. Une liste écrite en dur
 * ici vieillirait dès qu'on règle un profil depuis l'écran Système, et
 * l'écran se mettrait à nommer des gens qui n'ont plus le droit.
 */
export type VerdictInscription =
  | { ok: true }
  | { ok: false; titre: string; motif: string };

export function verdictInscription({ user, redacteur, entitesOuvertes }: {
  user: Utilisateur;
  /** Le profil porte-t-il l'écriture sur le module « Agents » ? */
  redacteur: boolean;
  /** Les entités de son périmètre capables de recevoir du personnel. */
  entitesOuvertes: Entite[];
}): VerdictInscription {
  if (redacteur && entitesOuvertes.length > 0) return { ok: true };

  if (!redacteur) {
    const autorises = PROFILS
      .filter((p) => p.actif && p.droits.agents === "W")
      .sort((a, b) => b.rang - a.rang)
      .map((p) => p.libelle);
    return {
      ok: false,
      titre: `Votre profil — ${libelleProfil(user.role)} — lit le fichier du personnel sans y inscrire.`,
      motif:
        "Ce n'est pas une limite technique : inscrire quelqu'un ouvre un acte de recrutement et "
        + "engage celui qui le prend. Dans une direction, ce geste revient à "
        + autorises.slice(0, 4).join(", ")
        + (autorises.length > 4 ? ", et aux autres profils qui portent ce droit" : "")
        + ". Vous pouvez en attribuer un depuis le dossier de l'agent concerné.",
    };
  }

  return {
    ok: false,
    titre: "Aucune entité de votre périmètre ne peut recevoir du personnel.",
    motif:
      `Votre habilitation porte sur ${entiteById(user.entiteId)?.sigle ?? "une entité"}, qui ne `
      + "contient aucune direction, service, bureau ou établissement où affecter quelqu'un. "
      + "Créez l'entité voulue depuis Organisation, ou faites étendre votre périmètre.",
  };
}
