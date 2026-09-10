/**
 * Tirage déterministe et viviers de noms.
 *
 * La graine est un état de module partagé : tous les constructeurs tirent
 * dans la même suite. C'est ce qui rend le jeu de données reproductible —
 * à condition d'appeler les constructeurs toujours dans le même ordre.
 */

import { DEPARTEMENTS } from "@/lib/referentiels";

/* ---------- PRNG déterministe ---------- */
let graine = 20260909;
export const rnd = () => {
  graine = (graine * 1103515245 + 12345) & 0x7fffffff;
  return graine / 0x7fffffff;
};
// `rnd()` peut rendre exactement 1 : sans borne, l'index sort du tableau
// et le tirage renvoie `undefined`, ce qui casse le semis très loin de là.
export const pick = <T,>(a: T[]): T => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
export const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
export const chance = (p: number) => rnd() < p;
export const pad = (n: number, l = 6) => String(n).padStart(l, "0");
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const dateEntre = (a: number, b: number) => iso(new Date(int(a, b), int(0, 11), int(1, 28)));
export const plusJours = (d: string, j: number) => iso(new Date(new Date(d).getTime() + j * 864e5));

export const NOMS = ["MABIALA","NGOMA","OKEMBA","BOUITY","MALONGA","TCHIKAYA","NGATSE","MOUKALA","BIKINDOU","SAMBA","LOEMBA","NKOUNKOU","MASSAMBA","ONDONGO","IBARA","BAKALA","MOUANDA","KIMBEMBE","NIANGA","OBAMBI","MPASSI","GANGA","BANZOUZI","MOUYABI","NKODIA","TSIBA","OKO","MABIKA","BOUNDA","MAKAYA","ELENGA","ONDZE","KOUMBA","BANTSIMBA","MILANDOU","NGOULOU","MAVOUNGOU","ITOUA","AKOUALA","DZON"];
export const PRENOMS_M = ["Jean-Baptiste","Serge","Alphonse","Rodrigue","Christian","Pascal","Gildas","Frédéric","Aurélien","Brice","Dieudonné","Emmanuel","Ghislain","Hervé","Jonas","Landry","Marcel","Noël","Olivier","Prosper","Sylvain","Thierry","Ulrich","Victor"];
export const PRENOMS_F = ["Clarisse","Ghislaine","Nadège","Sylvie","Berthe","Chanceline","Delphine","Edwige","Flore","Grace","Huguette","Inès","Josiane","Lydie","Mireille","Nathalie","Ornella","Patricia","Rachel","Sandrine","Thérèse","Yolande"];
export const VILLES = DEPARTEMENTS.map((d) => d.chefLieu);
export const ETABS = ["Université Marien Ngouabi","ENAM Brazzaville","Lycée technique 1er-Mai","Institut supérieur de gestion","ENS Brazzaville","Université Denis Sassou Nguesso"];
export const DIPLOMES = ["Licence en gestion des ressources humaines","Master en administration publique","BTS comptabilité","Ingénieur en génie civil","Master en droit public","DUT informatique","Baccalauréat technique","BEP industriel"];
export const COMPETENCES = ["Gestion de la paie","SIRH","Droit de la fonction publique","Archivage","Gestion de projet","Comptabilité publique","Ingénierie de formation","Rédaction administrative","Statistiques","Passation de marchés"];
export const LANGUES = ["Français","Lingala","Kituba","Anglais","Portugais"];
export const DISCIPLINES = ["Génie civil","Électrotechnique","Mécanique","Comptabilité","Secrétariat","Informatique","Froid et climatisation","Hôtellerie-restauration","Agriculture"];

/** Remet la suite à son point de départ : deux semis donnent le même jeu. */
export const reinitialiserGraine = (v = 20260909) => { graine = v; };

/** Le jour de référence du jeu de données. */
export const AUJOURDHUI = "2026-09-10";

/**
 * Une date des `jours` derniers jours, jamais postérieure à aujourd'hui.
 *
 * Tirer au hasard dans l'année entière place la moitié des enregistrements
 * dans le futur : le journal et les fils de discussion s'ouvrent alors sur
 * des lignes datées de décembre, et ce que l'utilisateur vient de faire
 * disparaît sous elles — il croit que rien n'a été enregistré.
 */
export const dateRecente = (jours = 120) =>
  iso(new Date(new Date(AUJOURDHUI).getTime() - int(0, jours) * 864e5));
