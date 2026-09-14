import type { CodeProfil, ProfilAcces, Role } from "@/lib/types";
import {
  CODES_LIVRES, DROITS, MODULE_LABELS, ROLE_LABELS, droitsLivres, type ModuleKey,
} from "./droits";
import {
  ADMINISTRATION_MINISTERIELLE, PORTEE_MINISTERIELLE, PROFILS_TECHNIQUES,
  PROFIL_DESCRIPTIONS,
  RANG_HIERARCHIQUE, ROLES_RESERVES_ADMIN,
} from "./habilitations";
import { descendantsDe } from "./entites";

/* ------------------------------------------------------------------ */
/* Le catalogue des profils — livrés en code, maison en base          */
/* ------------------------------------------------------------------ */

/**
 * Le profil que tout le monde porte, avant tout autre.
 *
 * Chacun est d'abord un agent du ministère : il consulte son dossier,
 * l'annuaire, ses congés, les notes de service. Un profil ne **remplace**
 * donc pas ce socle — il s'y **ajoute**. Un chef de service est un agent qui
 * dirige, pas quelqu'un d'autre.
 *
 * Le dire ainsi change deux choses, et les deux comptent. À l'écriture,
 * chaque profil n'exprime plus que ce qu'il apporte, au lieu de redéclarer
 * vingt lignes identiques — et une correction du socle profite à tous au
 * lieu d'être à reporter vingt fois. À la lecture, on ne peut plus retirer à
 * quelqu'un, par omission dans un profil, l'accès à son propre dossier.
 */
export const CODE_PROFIL_BASE = "AGENT";

/**
 * Les profils d'origine — ceux que la plateforme apporte à l'installation.
 *
 * Ils sont **projetés** depuis ce qui existe déjà : leurs libellés, leurs
 * droits et leurs rangs vivent dans `droits.ts` et `habilitations.ts`,
 * vérifiés par le compilateur. Les redéclarer ici en ferait une seconde
 * source de vérité, et les deux finiraient par diverger.
 *
 * Ils servent à **semer la table**, et rien d'autre. Une fois semés, ils y
 * vivent comme les autres : le ministère les règle depuis l'écran Système.
 * Il n'y a pas deux régimes — un ministre et un chargé du courrier sont
 * l'un et l'autre des profils d'accès, attachés à des agents selon leurs
 * responsabilités.
 */
export const PROFILS_ORIGINE: ProfilAcces[] = CODES_LIVRES.map((code) => ({
  id: code,
  code,
  libelle: ROLE_LABELS[code] ?? code,
  description: PROFIL_DESCRIPTIONS[code] ?? "",
  rang: RANG_HIERARCHIQUE[code] ?? 0,
  droits: propres(code),
  origine: "LIVRE" as const,
  reserveAdmin: ROLES_RESERVES_ADMIN.includes(code),
  actif: true,
  technique: PROFILS_TECHNIQUES.includes(code),
  portee: PORTEE_MINISTERIELLE.includes(code) ? "MINISTERE" : "PERIMETRE",
  administre: ADMINISTRATION_MINISTERIELLE.includes(code) ? "MINISTERE" : "PERIMETRE",
}));

/**
 * Ce qu'un profil livré **ajoute** au socle, le socle lui-même retiré.
 *
 * `droits.ts` déclare chaque matrice en entier, parce qu'un fichier qu'on
 * relit doit se lire seul. Mais recopier telle quelle dans la base une
 * matrice qui répète vingt fois le socle donnerait vingt copies à corriger
 * le jour où le socle bouge, et l'écran ne pourrait plus dire d'où vient un
 * droit. On sème donc la différence, et `hydraterProfils` refait la somme.
 */
function propres(code: Role): Record<string, "R" | "W"> {
  const socle = droitsLivres(CODE_PROFIL_BASE as Role) ?? {};
  const tout = (droitsLivres(code) ?? {}) as Record<string, "R" | "W">;
  /* Le socle ni pour lui-même, ni pour un profil technique qui n'en hérite
     pas : dans les deux cas, la matrice écrite est la matrice entière. */
  if (code === CODE_PROFIL_BASE || PROFILS_TECHNIQUES.includes(code)) return { ...tout };
  const out: Record<string, "R" | "W"> = {};
  Object.entries(tout).forEach(([mod, niveau]) => {
    const dessous = (socle as Record<string, "R" | "W">)[mod];
    if (dessous === niveau || dessous === "W") return;
    out[mod] = niveau;
  });
  return out;
}

/**
 * Le catalogue vivant : les livrés, plus ce que la maison a déposé.
 *
 * Même motif que `ENTITES` et `hydraterEntites` : un tableau exporté qu'on
 * remplace en place, de sorte que tous les appelants lisent la même chose
 * sans avoir à se passer le catalogue de main en main.
 */
export const PROFILS: ProfilAcces[] = [...PROFILS_ORIGINE];

let parCode = new Map(PROFILS.map((p) => [p.code, p]));

/**
 * Remplace le catalogue par celui de la base, et **réinjecte les trois
 * registres** que le reste de la plateforme interroge.
 *
 * C'est ce dernier point qui compte : sans lui, un profil réglé à l'écran
 * existerait dans une liste et nulle part ailleurs — `peut()` le dirait sans
 * droits, la barre latérale n'afficherait rien, et l'administrateur
 * conclurait à une panne. Les registres sont mutés en place plutôt que
 * remplacés, pour la même raison qu'ailleurs : les modules qui les ont
 * importés tiennent la référence, pas une copie.
 *
 * Une base vide laisse les profils d'origine en place. C'est le filet : une
 * plateforme qui n'aurait pas encore semé sa table ne doit pas s'ouvrir sans
 * aucun droit pour personne.
 */
export function hydraterProfils(catalogue: ProfilAcces[]): void {
  const tous = (catalogue ?? []).filter((p) => p?.code);
  if (tous.length === 0) return;

  PROFILS.splice(0, PROFILS.length, ...tous);
  parCode = new Map(PROFILS.map((p) => [p.code, p]));

  /* On vide d'abord les trois registres : sans ce nettoyage, un profil
     supprimé garderait ses droits jusqu'au rechargement de la page, et un
     profil renommé garderait son ancien libellé à côté du nouveau. */
  [DROITS, ROLE_LABELS, RANG_HIERARCHIQUE].forEach((registre) => {
    Object.keys(registre).forEach((k) => delete (registre as Record<string, unknown>)[k]);
  });
  ROLES_RESERVES_ADMIN.length = 0;
  ADMINISTRATION_MINISTERIELLE.length = 0;

  const socle = tous.find((p) => p.code === CODE_PROFIL_BASE);

  tous.forEach((p) => {
    /* Les droits posés dans le registre sont les droits **effectifs** : le
       socle d'agent plus ce que le profil ajoute. C'est eux que `peut()`
       interroge, et c'est donc ici, une fois, que la règle s'applique —
       plutôt qu'à chacun des trente-trois appels de la plateforme.
       Un profil fermé n'ouvre plus rien, sans disparaître des listes. */
    const effectifs = heriteDuSocle(p)
      ? fusionnerDroits(socle?.droits ?? {}, p.droits)
      : p.droits;
    DROITS[p.code] = p.actif ? (effectifs as Partial<Record<ModuleKey, "R" | "W">>) : {};
    ROLE_LABELS[p.code] = p.libelle;
    RANG_HIERARCHIQUE[p.code] = p.rang;
    if (p.reserveAdmin) ROLES_RESERVES_ADMIN.push(p.code);
    if (p.administre === "MINISTERE") ADMINISTRATION_MINISTERIELLE.push(p.code);
  });
}

/**
 * Le socle et ce qu'un profil y ajoute, fondus en une seule matrice.
 *
 * L'écriture l'emporte toujours sur la lecture, d'où qu'elle vienne : un
 * profil qui ouvre un module en écriture ne doit pas se le voir rabattre par
 * un socle qui ne l'ouvrait qu'en lecture, et l'inverse vaut aussi.
 */
export function fusionnerDroits(
  socle: Record<string, "R" | "W">,
  propre: Record<string, "R" | "W">
): Record<string, "R" | "W"> {
  const out: Record<string, "R" | "W"> = { ...socle };
  Object.entries(propre).forEach(([mod, niveau]) => {
    out[mod] = out[mod] === "W" || niveau === "W" ? "W" : "R";
  });
  return out;
}

/** Ce profil hérite-t-il du socle ? Non s'il **est** le socle, ni s'il est technique. */
export const heriteDuSocle = (p: Pick<ProfilAcces, "code" | "technique">) =>
  p.code !== CODE_PROFIL_BASE && !p.technique;

/** Le socle tel qu'il s'applique à ce profil — vide pour ceux qui n'en héritent pas. */
export function socleDe(profil: Pick<ProfilAcces, "code" | "technique">): Record<string, "R" | "W"> {
  if (!heriteDuSocle(profil)) return {};
  return { ...(parCode.get(CODE_PROFIL_BASE)?.droits ?? {}) };
}

/** Les droits réellement ouverts par un profil : le socle, plus les siens. */
export function droitsEffectifs(profil: ProfilAcces): Record<string, "R" | "W"> {
  return fusionnerDroits(socleDe(profil), profil.droits);
}

/** Ce module vient-il du socle plutôt que de ce profil ? */
export function vientDuSocle(profil: ProfilAcces, mod: string): boolean {
  return !!socleDe(profil)[mod];
}

export const profilParCode = (code?: CodeProfil | null) =>
  (code ? parCode.get(code) : undefined);

/** Le libellé d'un profil, livré ou non, sans jamais rendre « undefined ». */
export const libelleProfil = (code?: CodeProfil | null) =>
  (code ? ROLE_LABELS[code] ?? code : "—");

export const estLivre = (code?: CodeProfil | null) =>
  !!code && (CODES_LIVRES as string[]).includes(code);

/** Les profils attribuables : actifs, et non réservés à l'administrateur. */
export const profilsActifs = () => PROFILS.filter((p) => p.actif);

/* ------------------------------------------------------------------ */
/* Fabrication d'un profil de la maison                                */
/* ------------------------------------------------------------------ */

/**
 * Un code de profil se dérive du libellé, une fois, et ne bouge plus.
 *
 * Les comptes portent ce code : le changer les priverait tous de leurs
 * droits d'un coup. C'est pourquoi l'écran laisse renommer un profil mais
 * jamais recoder.
 */
export function codeDepuisLibelle(libelle: string, pris: Set<string>): string {
  const base = libelle
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")
    .slice(0, 32) || "PROFIL";
  if (!pris.has(base)) return base;
  for (let n = 2; n < 99; n++) {
    const essai = `${base}_${n}`;
    if (!pris.has(essai)) return essai;
  }
  return `${base}_${Date.now().toString(36).toUpperCase()}`;
}

/**
 * La seule modification qu'on refuse : **se fermer la porte à soi-même**.
 *
 * Tous les profils se règlent, ministre compris. Mais retirer le droit
 * `profils` au profil qu'on porte soi-même est sans retour : l'écran qui
 * permettrait de revenir en arrière est précisément celui qu'on vient de
 * fermer, et il n'existe aucun autre chemin. La plateforme se retrouverait
 * sans personne pour régler ses droits, et il faudrait rouvrir la base à la
 * main.
 *
 * Le même raisonnement vaut pour la fermeture d'un profil : fermer celui
 * qu'on porte revient au même résultat, par un autre geste.
 */
export function verdictModification(
  profil: ProfilAcces,
  auteur: { role: CodeProfil },
  droitsVoulus: Record<string, "R" | "W">,
  actif = true
): { ok: boolean; motif?: string } {
  if (profil.code !== auteur.role) return { ok: true };
  if (!actif) {
    return {
      ok: false,
      motif: "Vous ne pouvez pas fermer le profil que vous portez : plus personne ne pourrait rouvrir cet écran.",
    };
  }
  if (droitsVoulus.profils !== "W") {
    return {
      ok: false,
      motif:
        "Vous ne pouvez pas retirer l'écriture sur « Profils d'accès » au profil que vous portez : "
        + "c'est le seul chemin pour revenir en arrière.",
    };
  }
  return { ok: true };
}

/**
 * Un profil ne peut pas donner plus que ce que son auteur détient lui-même.
 *
 * Sans cette règle, l'écran des profils devient le chemin le plus court vers
 * l'élévation de privilège : on crée « Assistant » avec tous les droits et
 * un rang de 95, on se l'attribue, et la hiérarchie ne veut plus rien dire.
 * L'administrateur système en est excepté — c'est lui qui installe la
 * plateforme, et ses gestes sont tracés comme les autres.
 */
export function verdictRang(
  auteur: { role: CodeProfil },
  rang: number
): { ok: boolean; motif?: string } {
  if (auteur.role === "ADMIN_SYSTEME") return { ok: true };
  const sien = RANG_HIERARCHIQUE[auteur.role] ?? 0;
  if (rang >= sien) {
    return {
      ok: false,
      motif: `Vous ne pouvez pas créer un profil de rang ${rang} : le vôtre est ${sien}.`,
    };
  }
  return { ok: true };
}

/** Les modules, dans l'ordre où l'écran des profils les présente. */
export const MODULES_PROFIL = Object.keys(MODULE_LABELS) as ModuleKey[];

/**
 * Le nombre de droits **effectifs** d'un profil, pour le résumer d'un chiffre.
 *
 * On compte le socle avec : afficher les seuls droits propres ferait paraître
 * un secrétaire moins doté qu'un agent, ce qui est faux et déroutant.
 */
export const compterDroits = (p: ProfilAcces) => {
  const v = Object.values(droitsEffectifs(p));
  return { lecture: v.filter((d) => d === "R").length, ecriture: v.filter((d) => d === "W").length };
};

/** Les comptes qui portent ce profil — ce qu'on veut savoir avant d'y toucher. */
export const porteursDe = <T extends { role: CodeProfil }>(code: string, comptes: T[]) =>
  comptes.filter((c) => c.role === code);

/** Les treize codes livrés, exposés pour les écrans qui les listent. */
export const ROLES_LIVRES: Role[] = [...CODES_LIVRES];

/* ------------------------------------------------------------------ */
/* Ce que l'on a le droit de voir                                      */
/* ------------------------------------------------------------------ */

/**
 * Les entités dont on peut lire le personnel — `null` pour le ministère entier.
 *
 * Une seule fonction, appelée partout où une liste nominative s'affiche. La
 * dispersion était le vrai défaut : chaque écran déduisait son périmètre
 * lui-même, à partir d'un filtre que l'utilisateur choisissait, et « toutes
 * les entités » y était l'option par défaut. Une règle de confidentialité
 * écrite au niveau de l'affichage n'en est pas une — elle se contourne en
 * changeant un menu déroulant.
 *
 * `null` plutôt qu'un ensemble de cent cinquante identifiants : la vue
 * ministérielle est une absence de borne, et la traiter comme telle évite de
 * reconstruire l'arbre entier à chaque rendu pour cinq profils sur quinze.
 */
export function perimetreVisible(
  utilisateur: { role: CodeProfil; entiteId: string }
): Set<string> | null {
  const profil = parCode.get(utilisateur.role);
  if (!profil) return new Set([utilisateur.entiteId]);
  if (profil.technique || profil.portee === "MINISTERE") return null;
  return new Set(descendantsDe(utilisateur.entiteId).map((e) => e.id));
}

/**
 * Les entités où l'on peut **créer et désigner** — `null` pour tout le ministère.
 *
 * Le pendant de `perimetreVisible`, et il fallait qu'il soit distinct. Le
 * périmètre d'administration se déduisait jusqu'ici de l'entité de
 * rattachement, ce qui revenait à dire qu'on n'administre que là où l'on est
 * assis. C'est vrai d'un chef de service ; c'est faux du directeur général de
 * la DGARH, dont la direction a précisément pour objet la gestion
 * administrative de **toutes** les structures du ministère, cabinet compris.
 * Il siège dans une direction et administre le ministère.
 *
 * Le profil technique passe partout : c'est lui qui ouvre les deux premiers
 * comptes — le ministre et le directeur général — sur un organigramme où
 * personne n'est encore désigné.
 */
export function perimetreAdministrable(
  utilisateur: { role: CodeProfil; entiteId: string }
): Set<string> | null {
  const profil = parCode.get(utilisateur.role);
  if (!profil) return new Set([utilisateur.entiteId]);
  if (profil.technique || profil.administre === "MINISTERE") return null;
  return new Set(descendantsDe(utilisateur.entiteId).map((e) => e.id));
}

/** Puis-je créer ou désigner ici ? Sans entité désignée, non. */
export const peutAdministrer = (
  utilisateur: { role: CodeProfil; entiteId: string },
  entiteId?: string | null
) => {
  const p = perimetreAdministrable(utilisateur);
  return p === null ? !!entiteId : !!entiteId && p.has(entiteId);
};

/** Cet agent est-il dans ce que je peux voir ? Sans entité, il ne l'est pas. */
export const visible = (perimetre: Set<string> | null, entiteId?: string | null) =>
  perimetre === null ? true : !!entiteId && perimetre.has(entiteId);

/**
 * Le périmètre que l'on a **et** celui que l'on a choisi.
 *
 * Les écrans de liste portent tous un filtre d'entité. Il sert à regarder de
 * plus près, jamais plus loin : croiser les deux en un seul ensemble évite
 * d'avoir à se souvenir, à chaque `filter`, qu'il faut vérifier les deux — et
 * c'est précisément l'oubli qui laissait un chef de service lire le fichier
 * entier du ministère.
 *
 * `null` des deux côtés reste `null` : nulle borne, donc tout le ministère.
 */
export function bornerPerimetre(
  droit: Set<string> | null,
  choisi: Set<string> | null
): Set<string> | null {
  if (droit === null) return choisi;
  if (choisi === null) return droit;
  return new Set([...choisi].filter((id) => droit.has(id)));
}
