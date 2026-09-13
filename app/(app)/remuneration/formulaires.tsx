"use client";

import {
  CATEGORIES_CONTRACTUELLES, DEVISE, NATURE_REMUNERATION_LABELS, REGLES_CATEGORIE,
} from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { ChampSelect, ChampTexte, ChampZone, DialogueFormulaire } from "@/components/nexus/module";
import type { AgentProjete, NatureRemuneration } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Les deux saisies du module, sorties de la page                      */
/*                                                                     */
/* La page passait 459 lignes ; ces deux formulaires en occupaient      */
/* quatre-vingts sans rien apprendre sur l'agrégation. Ils vivent       */
/* maintenant à côté, et la page se relit d'un bout à l'autre.          */
/* ------------------------------------------------------------------ */

export interface SaisieRemu {
  agentId: string;
  nature: NatureRemuneration;
  montant: string;
  quantite: string;
  dateDebut: string;
  reference: string;
  observations: string;
}

export function FormulaireRemuneration({
  valeurs, surChangement, surFermeture, surValidation, enCours, nonStatutaires,
}: {
  valeurs: SaisieRemu | null;
  surChangement: (v: SaisieRemu) => void;
  surFermeture: () => void;
  surValidation: () => void;
  enCours: boolean;
  nonStatutaires: AgentProjete[];
}) {
  return (
    <DialogueFormulaire
      ouvert={!!valeurs}
      surFermeture={surFermeture}
      titre="Rémunération contractuelle"
      description="Laissez le montant vide s'il n'est pas connu : c'est une réponse, et elle vaut mieux qu'un chiffre inventé."
      surValidation={surValidation}
      validationPossible={!enCours}
      large
    >
      {valeurs && (
        <>
          <ChampSelect
            label="Agent" obligatoire valeur={valeurs.agentId}
            surChangement={(v) => surChangement({ ...valeurs, agentId: v })}
            options={nonStatutaires.slice(0, 400).map((a) => ({
              valeur: a.id,
              libelle: `${a.matricule} — ${a.prenom} ${a.nom} (${REGLES_CATEGORIE[a.categorie].libelle})`,
            }))}
            aide={`${fmtNum(nonStatutaires.length)} agents hors grille. Catégories concernées : ${CATEGORIES_CONTRACTUELLES.map((c) => REGLES_CATEGORIE[c].libelle).join(", ")}.`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampSelect
              label="Nature" valeur={valeurs.nature}
              surChangement={(v) => surChangement({ ...valeurs, nature: v as NatureRemuneration })}
              options={(Object.keys(NATURE_REMUNERATION_LABELS) as NatureRemuneration[])
                .map((n) => ({ valeur: n, libelle: NATURE_REMUNERATION_LABELS[n] }))}
            />
            <ChampTexte
              label={`Montant (${DEVISE})`} type="number" valeur={valeurs.montant}
              surChangement={(v) => surChangement({ ...valeurs, montant: v })}
              aide="Vide = donnée non renseignée"
            />
          </div>
          {(valeurs.nature === "HORAIRE" || valeurs.nature === "VACATION") && (
            <ChampTexte
              label="Quantité (heures ou vacations par mois)" type="number" valeur={valeurs.quantite}
              surChangement={(v) => surChangement({ ...valeurs, quantite: v })}
              aide="Sans quantité, un taux horaire ne donne aucun coût mensuel."
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampTexte label="Date d'effet" type="date" valeur={valeurs.dateDebut}
              surChangement={(v) => surChangement({ ...valeurs, dateDebut: v })} />
            <ChampTexte label="Référence du contrat" valeur={valeurs.reference}
              surChangement={(v) => surChangement({ ...valeurs, reference: v })}
              placeholder="Contrat n° 042/METP-DGARH/2026" />
          </div>
          <ChampZone label="Observations" lignes={2} valeur={valeurs.observations}
            surChangement={(v) => surChangement({ ...valeurs, observations: v })} />
        </>
      )}
    </DialogueFormulaire>
  );
}

export interface SaisiePoint {
  valeur: string;
  reference: string;
  dateEffet: string;
}

/**
 * La saisie de la valeur du point.
 *
 * La référence du texte y est **obligatoire**, et ce n'est pas une politesse :
 * une valeur du point sans texte qui la fonde se comporterait exactement comme
 * une valeur inventée — elle produirait des montants qui ont l'air justes.
 */
export function FormulaireValeurPoint({
  valeurs, surChangement, surFermeture, surValidation, enCours,
}: {
  valeurs: SaisiePoint | null;
  surChangement: (v: SaisiePoint) => void;
  surFermeture: () => void;
  surValidation: () => void;
  enCours: boolean;
}) {
  return (
    <DialogueFormulaire
      ouvert={!!valeurs}
      surFermeture={surFermeture}
      titre="Valeur du point indiciaire"
      description="Elle commande tous les montants statutaires de la plateforme."
      surValidation={surValidation}
      validationPossible={!enCours}
    >
      {valeurs && (
        <>
          <ChampTexte label={`Valeur du point (${DEVISE})`} type="number" obligatoire
            valeur={valeurs.valeur}
            surChangement={(v) => surChangement({ ...valeurs, valeur: v })} />
          <ChampTexte label="Date d'effet" type="date" valeur={valeurs.dateEffet}
            surChangement={(v) => surChangement({ ...valeurs, dateEffet: v })} />
          <ChampTexte label="Texte qui la fixe" obligatoire valeur={valeurs.reference}
            surChangement={(v) => surChangement({ ...valeurs, reference: v })}
            placeholder="Décret n° … du … portant revalorisation du point indiciaire"
            aide="Journal officiel, décret ou arrêté. C'est ce qui distingue une donnée d'une supposition." />
        </>
      )}
    </DialogueFormulaire>
  );
}
