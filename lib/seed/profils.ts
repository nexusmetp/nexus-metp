import type { ProfilAcces, Utilisateur } from "@/lib/types";
import { PROFILS_ORIGINE } from "@/lib/referentiels/profils";
import { AUJOURDHUI, plusJours } from "./aleatoire";

/* ------------------------------------------------------------------ */
/* Le catalogue des profils, semé en table                             */
/* ------------------------------------------------------------------ */

/**
 * Tous les profils vont en base, ministre compris.
 *
 * C'était le dernier endroit où la plateforme gardait deux régimes : treize
 * rôles gravés dans le code, et au-dessus un étage « de la maison » où le
 * ministère pouvait créer ce qu'il voulait. Autrement dit, on pouvait
 * inventer « chargé du courrier » mais pas corriger « directeur général » —
 * alors que ce sont deux profils d'accès, ni plus ni moins, attachés à des
 * agents selon leurs responsabilités.
 *
 * Les définitions restent écrites en code (`droits.ts`, `habilitations.ts`)
 * parce que c'est là que le compilateur les vérifie ; mais elles ne servent
 * qu'à **semer**. Une fois en table, un profil se règle depuis l'écran
 * Système, quel que soit son rang.
 *
 * `origine` ne dit donc plus « modifiable ou non » — tout l'est. Elle dit
 * d'où vient le profil : livré à l'installation, ou créé par le ministère.
 * C'est une information de provenance, comme partout ailleurs dans ce dépôt.
 */
export function construireProfils({ utilisateurs }: {
  utilisateurs: Utilisateur[];
}): { profils: ProfilAcces[] } {
  const admin = utilisateurs.find((u) => u.role === "ADMIN_SYSTEME");
  const installation = `${plusJours(AUJOURDHUI, -365)}T08:00:00.000Z`;

  const profils: ProfilAcces[] = PROFILS_ORIGINE.map((p) => ({
    ...p,
    droits: { ...p.droits },
    dateCreation: installation,
  }));

  /* Un profil créé par le ministère, pour montrer ce que l'étage permet :
     « Secrétaire de direction » reprend « Secrétaire » en y ajoutant la
     tenue du courrier. Plusieurs agents d'une même direction le portent —
     un profil est un type, pas un poste. */
  const secretaire = profils.find((p) => p.code === "SECRETAIRE");
  if (admin && secretaire) {
    profils.push({
      id: "PRF-SEC-DIR",
      code: "SECRETAIRE_DIRECTION",
      libelle: "Secrétaire de direction",
      description:
        "Tient le secrétariat d'une direction : reçoit le personnel affecté, "
        + "pointe les présences et enregistre le courrier. Plusieurs agents d'une "
        + "même direction peuvent le porter.",
      rang: secretaire.rang,
      droits: { ...secretaire.droits, documents: "W" },
      origine: "MAISON",
      deriveDe: "SECRETAIRE",
      reserveAdmin: false,
      /* Explicite plutôt que par défaut : un profil de la maison dont la
         portée n'est pas écrite laisse au lecteur le soin de la deviner. */
      portee: "PERIMETRE",
      actif: true,
      creePar: admin.id,
      dateCreation: `${plusJours(AUJOURDHUI, -60)}T10:00:00.000Z`,
    });
  }

  return { profils };
}
