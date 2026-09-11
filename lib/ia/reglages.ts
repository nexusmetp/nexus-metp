/**
 * Réglages de l'assistant — ce que l'administrateur pose, une fois.
 *
 * Aucune valeur par défaut ne nomme un modèle : les catalogues des
 * fournisseurs changent plus vite qu'un dépôt de code, et un nom écrit en
 * dur ici finirait par désigner un modèle retiré. La liste se demande au
 * fournisseur avec la clé du ministère — elle dit alors exactement ce à
 * quoi ce compte a droit.
 */

import type { FournisseurIA, ReglagesIA } from "@/lib/types";

export const REGLAGES_IA_VIDES: ReglagesIA = {
  actif: false,
  fournisseur: "anthropic",
  cle: "",
  modele: "",
  maxJetons: 1600,
  contexteAutorise: true,
};

export interface DescripteurFournisseur {
  valeur: FournisseurIA;
  libelle: string;
  /** Point d'entrée par défaut, sans barre finale. */
  urlBase: string;
  /** Où l'administration va chercher une clé. */
  console: string;
  /** À quoi ressemble une clé, pour repérer un copier-coller de travers. */
  prefixe: string;
}

export const FOURNISSEURS: DescripteurFournisseur[] = [
  {
    valeur: "anthropic",
    libelle: "Anthropic (Claude)",
    urlBase: "https://api.anthropic.com",
    console: "https://console.anthropic.com",
    prefixe: "sk-ant-",
  },
  {
    valeur: "openai",
    libelle: "OpenAI ou service compatible",
    urlBase: "https://api.openai.com",
    console: "https://platform.openai.com/api-keys",
    prefixe: "sk-",
  },
];

export const fournisseurParCle = (v: FournisseurIA) =>
  FOURNISSEURS.find((f) => f.valeur === v) ?? FOURNISSEURS[0];

/** Point d'entrée retenu : celui de l'administrateur, sinon celui du fournisseur. */
export const pointEntree = (r: ReglagesIA) =>
  (r.urlBase?.trim() || fournisseurParCle(r.fournisseur).urlBase).replace(/\/+$/, "");

/**
 * L'assistant est-il utilisable ?
 *
 * Trois conditions, et pas une de moins : l'administrateur l'a allumé, une
 * clé est posée, un modèle est nommé. Le reste de l'application ne doit
 * jamais supposer que l'assistant répondra.
 */
export const iaConfiguree = (r?: ReglagesIA | null): r is ReglagesIA =>
  !!r && r.actif && r.cle.trim().length > 8 && r.modele.trim().length > 0;

/** Une clé ne se réaffiche pas : on n'en montre que les extrémités. */
export function masquer(cle: string): string {
  const c = cle.trim();
  if (c.length < 12) return "•".repeat(Math.max(c.length, 6));
  return `${c.slice(0, 7)}…${c.slice(-4)}`;
}
