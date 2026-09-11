"use client";

import type { Etat, Famille } from "@/lib/carte/symboles";

/** Une implantation telle que la carte la reçoit : déjà projetée, jamais brute. */
export interface PointCarte {
  id: string;
  nom: string;
  sousTitre?: string;
  lat: number;
  lon: number;
  /** L'effectif : il détermine la taille du halo. */
  effectif: number;
  famille: Famille;
  /** L'état dominant : il détermine la couleur du halo. */
  etat: Etat;
  /** Les chiffres bruts, pour que les amas les additionnent sans les relire. */
  activite: number;
  conge: number;
  vacants: number;
  mouvements: number;
  /** Le détail chiffré, tel qu'il s'écrit dans la fiche. */
  detail?: { libelle: string; valeur: string; ton?: string }[];
  /** Qui dirige : la première question qu'on pose devant une implantation. */
  responsable?: string;
  /** Ce qu'on tape pour la retrouver : sigle, ville, département. */
  recherche?: string;
}
