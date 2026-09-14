"use client";

/**
 * Ce que la carte porte : une implantation par entité localisable.
 *
 * Une entité sans agent n'est pas une implantation — c'est une case
 * d'organigramme. On ne la pose pas sur la carte : un marqueur vide donne à
 * croire à une présence qui n'existe pas.
 */

import { useMemo } from "react";
import { useBesoins, useEntites } from "@/lib/queries";
import {
  ENTITES, NIVEAU_LABELS, coordonneesDe, departementDe, perimetreVisible, visible,
} from "@/lib/referentiels";
import { useAuth } from "@/lib/store";
import { FAMILLES, etatDominant, familleDe, type Etat, type Famille } from "@/lib/carte/symboles";
import type { PointCarte } from "@/components/nexus/carte";
import type { Entite } from "@/lib/types";
import { LIBELLE_CATEGORIE, lignesSituation, useSituations, type Situation } from "./situation";

export interface Implantation {
  id: string;
  sigle: string;
  nom: string;
  niveau: Entite["niveau"];
  ville: string;
  departement?: string;
  famille: Famille;
  etat: Etat;
  lat: number;
  lon: number;
  besoins: number;
  situation: Situation;
}

export function useImplantations(): Implantation[] {
  const user = useAuth((s) => s.user);
  const { data: entitesDb = [] } = useEntites();
  const { data: besoins = [] } = useBesoins();
  const situationDe = useSituations();

  /* La carte portait toutes les implantations du ministère, avec pour chacune
     l'effectif, les congés, les vacances de poste et le nom du responsable.
     Elle est ouverte en lecture au directeur central, au directeur
     départemental et à l'inspecteur : autant de lecteurs à qui la situation
     du voisin ne regarde pas. Elle ne montre plus que le périmètre — ce qui,
     pour la DGARH, reste le pays entier. */
  const perimetre = useMemo(
    () => (user ? perimetreVisible(user) : new Set<string>()), [user]);

  return useMemo(() => {
    const parEntite = new Map<string, number>();
    besoins.forEach((b) => {
      const cle = b.etablissementId;
      if (cle) parEntite.set(cle, (parEntite.get(cle) ?? 0) + 1);
    });

    return ENTITES.flatMap((e) => {
      if (e.actif === false || !visible(perimetre, e.id)) return [];
      const c = coordonneesDe(e);
      if (!c) return [];
      const situation = situationDe(e.id);
      if (!situation.effectif) return [];
      return [{
        id: e.id, sigle: e.sigle, nom: e.nom, niveau: e.niveau, ville: e.ville ?? "",
        departement: departementDe(e.id)?.nom,
        famille: familleDe(e.niveau),
        etat: etatDominant(situation),
        lat: c.lat, lon: c.lon,
        besoins: parEntite.get(e.id) ?? 0,
        situation,
      }];
    });
    // `entitesDb` n'est pas lu : il déclenche le recalcul quand une entité est
    // créée ou déplacée depuis le pilotage.
  }, [entitesDb, besoins, situationDe, perimetre]);
}

/** La traduction vers le vocabulaire de la carte, et rien d'autre. */
export function pointCarte(i: Implantation): PointCarte {
  const s = i.situation;
  return {
    id: i.id,
    nom: `${i.sigle} — ${i.nom}`,
    sousTitre: `${NIVEAU_LABELS[i.niveau]}${i.ville ? " · " + i.ville : ""}`,
    lat: i.lat, lon: i.lon,
    effectif: s.effectif,
    famille: i.famille,
    etat: i.etat,
    activite: s.activite,
    conge: s.conge + s.horsService,
    vacants: s.vacants,
    mouvements: s.mouvements,
    detail: lignesSituation(s),
    responsable: s.responsable ? `${s.responsable.fonction} : ${s.responsable.nom}` : undefined,
    recherche: [i.sigle, i.ville, i.departement, FAMILLES[i.famille].libelle,
                ...s.parCategorie.map((c) => LIBELLE_CATEGORIE[c.categorie])].filter(Boolean).join(" "),
  };
}
