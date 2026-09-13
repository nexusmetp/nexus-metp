"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, PenLine } from "lucide-react";
import { useEnregistrerJournee, useEnregistrerPointage } from "@/lib/queries";
import {
  COULEUR_ETAT, ETATS_PRESENCE, ETAT_PRESENCE_LABELS, entiteById,
} from "@/lib/referentiels";
import { BadgeCategorie } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EtatPresence, Pointage, Utilisateur } from "@/lib/types";
import { journeeDe, type LigneJour } from "./calculs";
import type { AgentProjete } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* La journée : constater, et corriger ce qui a été constaté          */
/* ------------------------------------------------------------------ */

const videSaisie = {
  etat: "PRESENT" as EtatPresence,
  heureArrivee: "",
  heureDepart: "",
  motif: "",
};

export function Journee({
  agents, pointages, date, utilisateur, redacteur, heureOuverture,
}: {
  agents: AgentProjete[];
  pointages: Pointage[];
  date: string;
  utilisateur: Utilisateur;
  redacteur: boolean;
  heureOuverture?: string;
}) {
  const enregistrer = useEnregistrerPointage();
  const poserJournee = useEnregistrerJournee();
  const [saisie, setSaisie] = useState<{ ligne: LigneJour; valeurs: typeof videSaisie } | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ etat: "all" });

  const lignes = useMemo(() => {
    const jour = journeeDe(agents, pointages, date);
    return jour.filter((l) => {
      if (filtres.etat === "all") return true;
      if (filtres.etat === "NON_POINTE") return !l.etat;
      return l.etat === filtres.etat;
    });
  }, [agents, pointages, date, filtres.etat]);

  const nonPointes = useMemo(
    () => journeeDe(agents, pointages, date).filter((l) => !l.etat),
    [agents, pointages, date]
  );

  const colonnes: Colonne<LigneJour>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (l) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{l.agent.prenom} {l.agent.nom}</div>
          <div className="truncate text-[11px] text-muted-foreground">{l.agent.matricule}</div>
        </div>
      ),
    },
    {
      cle: "entite", entete: "Affectation", visible: "lg",
      rendu: (l) => (
        <span className="text-xs text-muted-foreground">
          {entiteById(l.agent.entiteId)?.sigle ?? "—"}
        </span>
      ),
    },
    { cle: "categorie", entete: "Catégorie", visible: "xl", rendu: (l) => <BadgeCategorie v={l.agent.categorie} /> },
    {
      cle: "etat", entete: "Constat",
      rendu: (l) => l.etat
        ? <Badge variant="outline" className={cn("text-[10px]", COULEUR_ETAT[l.etat])}>{ETAT_PRESENCE_LABELS[l.etat]}</Badge>
        : <span className="text-[11px] italic text-muted-foreground/70">Non pointé</span>,
    },
    {
      cle: "heures", entete: "Arrivée / départ", aligne: "droite", visible: "md",
      rendu: (l) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {l.pointage?.heureArrivee || "—"} · {l.pointage?.heureDepart || "—"}
        </span>
      ),
    },
    {
      cle: "action", entete: "", aligne: "droite",
      rendu: (l) => redacteur ? (
        <Button size="sm" variant="ghost" className="h-7 px-2"
          onClick={(e) => {
            e.stopPropagation();
            setSaisie({
              ligne: l,
              valeurs: {
                etat: l.etat ?? "PRESENT",
                heureArrivee: l.pointage?.heureArrivee ?? "",
                heureDepart: l.pointage?.heureDepart ?? "",
                motif: l.pointage?.motif ?? "",
              },
            });
          }}>
          <PenLine className="h-3.5 w-3.5" />
        </Button>
      ) : null,
    },
  ];

  /* Poser la journée d'un coup : sans ce geste, un service de quarante
     personnes ne pointe pas deux jours de suite. Le gestionnaire ne corrige
     ensuite que les écarts. */
  const poserTous = async () => {
    if (!nonPointes.length) return;
    await poserJournee.mutateAsync({
      date,
      utilisateur,
      lignes: nonPointes.map((l) => ({
        agentId: l.agent.id,
        date,
        etat: "PRESENT" as EtatPresence,
        heureArrivee: null,
        heureDepart: null,
        minutesRetard: null,
        entiteId: l.agent.entiteId,
        motif: "Présence posée pour la journée, sans relevé d'heures.",
      })),
    });
    toast.success(`${nonPointes.length} agents pointés présents`, {
      description: "Corrigez maintenant les écarts un par un.",
    });
  };

  const valider = async () => {
    if (!saisie) return;
    const { ligne, valeurs } = saisie;
    await enregistrer.mutateAsync({
      utilisateur,
      correction: !!ligne.pointage,
      pointage: {
        agentId: ligne.agent.id,
        date,
        etat: valeurs.etat,
        heureArrivee: valeurs.heureArrivee || null,
        heureDepart: valeurs.heureDepart || null,
        /* Aucune minute calculée sans heure d'ouverture : voir le référentiel. */
        minutesRetard: null,
        motif: valeurs.motif || undefined,
        congeId: ligne.pointage?.congeId ?? null,
        sortieId: ligne.pointage?.sortieId ?? null,
        entiteId: ligne.agent.entiteId,
      },
    });
    toast.success(`${ligne.agent.prenom} ${ligne.agent.nom}`, {
      description: `${ETAT_PRESENCE_LABELS[valeurs.etat]} le ${date}.`,
    });
    setSaisie(null);
  };

  return (
    <>
      <TableauModule<LigneJour>
        titre={`Journée du ${date}`}
        description={
          nonPointes.length
            ? `${nonPointes.length} agents ne sont pas encore pointés. Un agent non pointé n'est pas un agent absent.`
            : "Tous les agents du périmètre sont pointés pour cette journée."
        }
        lignes={lignes}
        colonnes={colonnes}
        recherche={(l, t) =>
          l.agent.nom.toLowerCase().includes(t)
          || l.agent.prenom.toLowerCase().includes(t)
          || l.agent.matricule.toLowerCase().includes(t)}
        placeholderRecherche="Nom, prénom ou matricule…"
        filtres={[{
          cle: "etat", libelle: "Tous les constats",
          options: [
            { valeur: "NON_POINTE", libelle: "Non pointés" },
            ...ETATS_PRESENCE.map((e) => ({ valeur: e, libelle: ETAT_PRESENCE_LABELS[e] })),
          ],
        }]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        vide="Aucun agent dans ce périmètre."
        parPage={16}
        actions={redacteur && nonPointes.length ? (
          <Button size="sm" variant="outline" onClick={poserTous} disabled={poserJournee.isPending}>
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Poser présents les {nonPointes.length} non pointés
          </Button>
        ) : undefined}
      />

      <DialogueFormulaire
        ouvert={!!saisie}
        surFermeture={() => setSaisie(null)}
        titre={saisie ? `${saisie.ligne.agent.prenom} ${saisie.ligne.agent.nom}` : ""}
        description={`Constat du ${date}. Il portera votre nom : un pointage engage celui qui le pose.`}
        surValidation={valider}
        validationPossible={!enregistrer.isPending}
        libelleValidation={saisie?.ligne.pointage ? "Corriger le constat" : "Enregistrer"}
      >
        {saisie && (
          <>
            <ChampSelect
              label="Constat" obligatoire
              valeur={saisie.valeurs.etat}
              surChangement={(v) => setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, etat: v as EtatPresence } })}
              options={ETATS_PRESENCE.map((e) => ({ valeur: e, libelle: ETAT_PRESENCE_LABELS[e] }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <ChampTexte
                label="Arrivée" type="time" placeholder="07:30"
                valeur={saisie.valeurs.heureArrivee}
                surChangement={(v) => setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, heureArrivee: v } })}
                aide={heureOuverture ? `Ouverture : ${heureOuverture}` : "Heure d'ouverture non renseignée"}
              />
              <ChampTexte
                label="Départ" type="time"
                valeur={saisie.valeurs.heureDepart}
                surChangement={(v) => setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, heureDepart: v } })}
              />
            </div>
            <ChampZone
              label="Motif ou observation" lignes={3}
              valeur={saisie.valeurs.motif}
              surChangement={(v) => setSaisie({ ...saisie, valeurs: { ...saisie.valeurs, motif: v } })}
              aide="Obligatoire en pratique pour une absence : c'est ce motif qui la rend justifiable."
            />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
