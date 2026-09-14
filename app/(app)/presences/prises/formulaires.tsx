"use client";

import { useEffect, useState } from "react";
import { ChampTexte, ChampZone, DialogueFormulaire } from "@/components/nexus/module";
import type { LigneArrivee } from "./calculs";

/* ------------------------------------------------------------------ */
/* Les trois gestes du point d'accueil                                 */
/* ------------------------------------------------------------------ */

/** Constater qu'un agent s'est présenté. La date ne se devine pas. */
export function DialogueArrivee({
  ouvert, ligne, aujourdhui, surFermeture, surValidation,
}: {
  ouvert: boolean;
  ligne: LigneArrivee | null;
  aujourdhui: string;
  surFermeture: () => void;
  surValidation: (date: string) => void;
}) {
  const [date, setDate] = useState(aujourdhui);

  useEffect(() => {
    if (ouvert) setDate(aujourdhui);
  }, [ouvert, aujourdhui]);

  if (!ligne) return null;
  const nom = ligne.agent ? `${ligne.agent.prenom} ${ligne.agent.nom.toUpperCase()}` : ligne.prise.agentId;
  const avantLActe = !!date && date < ligne.prise.dateAttendue;

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre="Constater l'arrivée de l'agent"
      description={`${nom} — attendu le ${ligne.prise.dateAttendue} à ${ligne.entite?.sigle ?? "son entité"}`}
      surValidation={() => surValidation(date)}
      libelleValidation="Enregistrer l'arrivée"
      validationPossible={!!date}
    >
      <ChampTexte
        label="Jour où l'agent s'est présenté" valeur={date} surChangement={setDate}
        type="date" obligatoire
        aide="La date réelle, pas celle de l'acte : c'est l'écart entre les deux qui est utile."
      />
      {avantLActe && (
        <p className="text-[11px] text-amber-600">
          Cette date précède la date d'effet de l'acte. Elle est acceptée — un agent peut se
          présenter avant — mais elle sera visible comme telle.
        </p>
      )}
      <p className="rounded-md bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Votre nom est enregistré avec ce constat. Attester qu'un agent s'est présenté engage
        celui qui le reçoit, comme un émargement.
      </p>
    </DialogueFormulaire>
  );
}

/** Dresser le procès-verbal d'installation. Suppose l'arrivée constatée. */
export function DialogueInstallation({
  ouvert, ligne, aujourdhui, surFermeture, surValidation,
}: {
  ouvert: boolean;
  ligne: LigneArrivee | null;
  aujourdhui: string;
  surFermeture: () => void;
  surValidation: (date: string, reference: string) => void;
}) {
  const [date, setDate] = useState(aujourdhui);
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!ouvert) return;
    setDate(aujourdhui);
    setReference(ligne?.prise.referencePV ?? "");
  }, [ouvert, aujourdhui, ligne]);

  if (!ligne) return null;
  const nom = ligne.agent ? `${ligne.agent.prenom} ${ligne.agent.nom.toUpperCase()}` : ligne.prise.agentId;

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre="Constater l'installation"
      description={`${nom} — arrivé le ${ligne.prise.dateArrivee ?? "date non constatée"}`}
      surValidation={() => surValidation(date, reference.trim())}
      libelleValidation="Constater l'installation"
      validationPossible={!!date}
    >
      <ChampTexte
        label="Date du procès-verbal" valeur={date} surChangement={setDate} type="date" obligatoire
      />
      <ChampTexte
        label="Référence du procès-verbal" valeur={reference} surChangement={setReference}
        placeholder="PV n° 000/METP-DGARH/2026"
        aide="Laissée vide, l'installation est enregistrée sans pièce — et l'écran le dira."
      />
    </DialogueFormulaire>
  );
}

/**
 * Constater qu'un agent attendu ne s'est pas présenté.
 *
 * Le motif écrit est **obligatoire**, et le dialogue le refuse sans lui. Un
 * agent peut être hospitalisé, retenu faute de titre de transport, ou
 * installé depuis des semaines sans que le secrétariat l'ait saisi : porter
 * ce constat sans dire ce qui a été vérifié en ferait une accusation.
 */
export function DialogueNonPresentation({
  ouvert, ligne, surFermeture, surValidation,
}: {
  ouvert: boolean;
  ligne: LigneArrivee | null;
  surFermeture: () => void;
  surValidation: (justification: string) => void;
}) {
  const [motif, setMotif] = useState("");

  useEffect(() => {
    if (ouvert) setMotif("");
  }, [ouvert]);

  if (!ligne) return null;
  const nom = ligne.agent ? `${ligne.agent.prenom} ${ligne.agent.nom.toUpperCase()}` : ligne.prise.agentId;

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre="Constater une non-présentation"
      description={`${nom} — attendu depuis ${ligne.anciennete} jour(s)`}
      surValidation={() => surValidation(motif.trim())}
      libelleValidation="Porter le constat"
      validationPossible={motif.trim().length >= 10}
    >
      <ChampZone
        label="Ce qui a été vérifié" valeur={motif} surChangement={setMotif} lignes={4} obligatoire
        placeholder="Service d'origine contacté le…, agent injoignable au numéro du dossier, courrier adressé le…"
        aide="Obligatoire. Le constat n'est pas une sanction : il ouvre un dossier, et le dossier doit dire sur quoi il repose."
      />
      <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
        Ce constat n'emporte aucune conséquence disciplinaire et n'interrompt aucune
        rémunération. Il signale une situation à instruire, rien de plus.
      </p>
    </DialogueFormulaire>
  );
}
