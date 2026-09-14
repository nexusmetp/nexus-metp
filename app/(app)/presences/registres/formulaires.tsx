"use client";

import { useEffect, useState } from "react";
import type { AgentProjete, ModeReleve, PointAccueil } from "@/lib/types";
import { MODE_RELEVE_LABELS, idPoint } from "@/lib/referentiels";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire,
} from "@/components/nexus/module";
import type { LigneService } from "./calculs";

/* ------------------------------------------------------------------ */
/* Déclarer le point d'accueil d'un service, et clore son cahier        */
/* ------------------------------------------------------------------ */

const MODES = Object.entries(MODE_RELEVE_LABELS)
  .map(([valeur, libelle]) => ({ valeur, libelle }));

const NON_DESIGNE = "__aucun";

/**
 * Déclaration ou correction du point d'accueil.
 *
 * Les heures d'ouverture sont saisissables mais **jamais préremplies** : une
 * heure due se fixe par décision de service, et la proposer reviendrait à
 * faire calculer des retards sur un horaire que personne n'a arrêté.
 */
export function DialoguePoint({
  ouvert, ligne, agents, surFermeture, surValidation,
}: {
  ouvert: boolean;
  ligne: LigneService | null;
  agents: AgentProjete[];
  surFermeture: () => void;
  surValidation: (point: PointAccueil, creation: boolean) => void;
}) {
  const [libelle, setLibelle] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [responsable, setResponsable] = useState(NON_DESIGNE);
  const [suppleant, setSuppleant] = useState(NON_DESIGNE);
  const [mode, setMode] = useState<ModeReleve>("NON_RENSEIGNE");
  const [ouverture, setOuverture] = useState("");
  const [fermeture, setFermeture] = useState("");
  const [observations, setObservations] = useState("");

  /* Le formulaire se recharge à chaque ouverture : garder la saisie
     précédente ferait déclarer le responsable d'une direction dans une
     autre, et l'erreur ne se verrait qu'au registre suivant. */
  useEffect(() => {
    if (!ouvert || !ligne) return;
    const p = ligne.point;
    setLibelle(p?.libelle ?? "Secrétariat de direction");
    setLocalisation(p?.localisation ?? "");
    setResponsable(p?.responsableId ?? NON_DESIGNE);
    setSuppleant(p?.suppleantId ?? NON_DESIGNE);
    setMode(p?.modeReleve ?? "NON_RENSEIGNE");
    setOuverture(p?.heureOuverture ?? "");
    setFermeture(p?.heureFermeture ?? "");
    setObservations(p?.observations ?? "");
  }, [ouvert, ligne]);

  if (!ligne) return null;

  const surPlace = agents
    .filter((a) => a.entiteId === ligne.entite.id)
    .map((a) => ({ valeur: a.id, libelle: `${a.prenom} ${a.nom.toUpperCase()} — ${a.matricule}` }));

  const optionsAgents = [
    { valeur: NON_DESIGNE, libelle: "Non désigné" },
    ...surPlace,
  ];

  const valider = () => {
    surValidation({
      id: ligne.point?.id ?? idPoint(ligne.entite.id),
      entiteId: ligne.entite.id,
      libelle: libelle.trim() || "Point d'accueil du personnel",
      localisation: localisation.trim() || null,
      responsableId: responsable === NON_DESIGNE ? null : responsable,
      suppleantId: suppleant === NON_DESIGNE ? null : suppleant,
      heureOuverture: ouverture || null,
      heureFermeture: fermeture || null,
      modeReleve: mode,
      rattacheA: ligne.point?.rattacheA ?? null,
      actif: true,
      /* Ce que déclare un service sur lui-même est à vérifier, pas établi :
         aucun texte n'est venu fonder ce point, c'est une déclaration. */
      provenance: "A_VERIFIER",
      creePar: ligne.point?.creePar,
      dateCreation: ligne.point?.dateCreation ?? new Date().toISOString(),
      observations: observations.trim() || undefined,
    }, !ligne.point);
  };

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre={ligne.point ? "Corriger le point d'accueil" : "Déclarer le point d'accueil"}
      description={`${ligne.entite.sigle} — ${ligne.entite.nom}`}
      surValidation={valider}
      libelleValidation={ligne.point ? "Enregistrer" : "Déclarer"}
      large
    >
      <ChampTexte
        label="Intitulé du point" valeur={libelle} surChangement={setLibelle} obligatoire
        aide="Le nom sous lequel les agents le connaissent : secrétariat, bureau du personnel…"
      />
      <ChampTexte
        label="Où se trouve-t-il" valeur={localisation} surChangement={setLocalisation}
        placeholder="Bâtiment, étage, numéro de bureau"
        aide="Un agent muté doit savoir où se présenter le premier matin."
      />
      <ChampSelect
        label="Responsable du registre" valeur={responsable} surChangement={setResponsable}
        options={optionsAgents}
        aide="Celui qui reçoit les arrivants et répond du cahier. Laisser « non désigné » est possible — l'écran le signalera."
      />
      <ChampSelect
        label="Suppléant" valeur={suppleant} surChangement={setSuppleant} options={optionsAgents}
        aide="Sans suppléant, le cahier ferme quand son titulaire est en mission."
      />
      <ChampSelect
        label="Mode de relevé" valeur={mode} surChangement={(v) => setMode(v as ModeReleve)}
        options={MODES}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampTexte
          label="Heure d'ouverture" valeur={ouverture} surChangement={setOuverture} type="time"
          aide="Laissée vide, aucun retard n'est calculé : un retard suppose une heure due."
        />
        <ChampTexte
          label="Heure de fermeture" valeur={fermeture} surChangement={setFermeture} type="time"
        />
      </div>
      <ChampZone
        label="Observations" valeur={observations} surChangement={setObservations} lignes={3}
      />
    </DialogueFormulaire>
  );
}

/**
 * Clôture du cahier du jour.
 *
 * Deux chiffres sont demandés et non déduits : l'effectif attendu et le
 * nombre d'émargements. Les déduire du pointage reviendrait à faire attester
 * au cahier ce que la plateforme croit déjà savoir, et ôterait au registre
 * la seule chose qui en fait une pièce — quelqu'un l'a compté, et signe.
 */
export function DialogueCloture({
  ouvert, ligne, surFermeture, surValidation,
}: {
  ouvert: boolean;
  ligne: LigneService | null;
  surFermeture: () => void;
  surValidation: (attendus: number, emarges: number, observations: string) => void;
}) {
  const [attendus, setAttendus] = useState("");
  const [emarges, setEmarges] = useState("");
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (!ouvert || !ligne) return;
    setAttendus(String(ligne.effectif));
    setEmarges("");
    setObservations("");
  }, [ouvert, ligne]);

  if (!ligne) return null;

  const a = Number(attendus);
  const e = Number(emarges);
  const valide = Number.isFinite(a) && Number.isFinite(e) && a >= 0 && e >= 0 && e <= a;

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre="Clore le cahier du jour"
      description={`${ligne.entite.sigle} — le cahier clos atteste ; le cahier ouvert n'atteste rien.`}
      surValidation={() => surValidation(a, e, observations.trim())}
      libelleValidation="Clore le cahier"
      validationPossible={valide}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampTexte
          label="Effectif attendu" valeur={attendus} surChangement={setAttendus} type="number" obligatoire
        />
        <ChampTexte
          label="Émargements relevés" valeur={emarges} surChangement={setEmarges} type="number" obligatoire
        />
      </div>
      {!valide && emarges !== "" && (
        <p className="text-[11px] text-destructive">
          Le nombre d'émargements ne peut pas dépasser l'effectif attendu.
        </p>
      )}
      <ChampZone
        label="Observations du jour" valeur={observations} surChangement={setObservations} lignes={3}
        aide="Ce qui explique l'écart : réunion de service, journée de deuil, panne de transport…"
      />
    </DialogueFormulaire>
  );
}
