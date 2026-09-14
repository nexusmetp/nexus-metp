"use client";

import { useMemo, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import type { Agent, Habilitation, Utilisateur } from "@/lib/types";
import {
  PROFILS, RANG_HIERARCHIQUE, cheminDe, entiteById, habilitationsEnVigueur,
  libelleProfil, peutHabiliter, profilParCode, profilsAccordables,
} from "@/lib/referentiels";
import { fmtDate } from "@/lib/format";
import {
  useAccorderHabilitation, useHabilitations, useUtilisateurs,
} from "@/lib/queries";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/* L'accès d'un agent — attribué depuis son dossier                    */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi cette carte vit dans la fiche de l'agent.
 *
 * C'est là que le chef travaille. Un écran séparé « gestion des accès »
 * l'obligerait à retrouver la même personne dans une seconde liste, et c'est
 * précisément ce détour qui fait qu'on ne retire jamais un accès devenu
 * inutile : le geste existe, mais il n'est pas sur le chemin.
 *
 * Ce que la carte dit, et qui n'était visible nulle part : **de qui l'agent
 * tient son profil**, depuis quand, et à quel titre. Un droit dont on ne
 * connaît pas l'auteur n'est pas administrable.
 */
export function AccesAgent({ agent, utilisateur }: {
  agent: Agent;
  utilisateur: Utilisateur;
}) {
  const { toast } = useToast();
  const { data: comptes = [] } = useUtilisateurs();
  const { data: habilitations = [] } = useHabilitations();
  const accorder = useAccorderHabilitation();
  const [ouvert, setOuvert] = useState(false);

  const compte = useMemo(
    () => comptes.find((c) => c.agentId === agent.id) ?? null,
    [comptes, agent.id]
  );

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const enCours = compte
    ? habilitationsEnVigueur(habilitations, compte.id, aujourdhui)
    : [];
  const [courante] = enCours;

  /* Le chef ne voit le bouton que s'il a réellement quelque chose à donner
     ici : un rang supérieur, et l'entité de l'agent dans son périmètre. */
  const cible = compte?.entiteId ?? "";
  const accordables = useMemo(
    () => (cible ? profilsAccordables(utilisateur, cible) : []),
    [utilisateur, cible]
  );
  const peutAgir = compte !== null
    && compte.id !== utilisateur.id
    && accordables.length > 0
    && (RANG_HIERARCHIQUE[compte.role] ?? 0) < (RANG_HIERARCHIQUE[utilisateur.role] ?? 0);

  const profil = profilParCode(compte?.role);
  const entite = entiteById(compte?.entiteId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Accès à la plateforme
          </CardTitle>
          <CardDescription>
            Tout agent du ministère dispose du profil Agent sur son entité : il consulte son
            dossier, l'annuaire et les notes de service. Un profil plus large se décide.
          </CardDescription>
        </div>
        {peutAgir && (
          <Button size="sm" variant="outline" onClick={() => setOuvert(true)}>
            Changer de profil
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!compte
          ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-500">
              Aucun compte n'est ouvert pour cet agent. C'est une anomalie : l'accès de base
              s'ouvre à l'inscription au fichier. Signalez-le à l'administrateur système.
            </p>
          )
          : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/12 text-emerald-600 border-emerald-500/20">
                  <ShieldCheck className="mr-1 h-3 w-3" /> {libelleProfil(compte.role)}
                </Badge>
                {entite && (
                  <span className="text-xs text-muted-foreground">
                    sur {entite.sigle} — {cheminDe(entite.id).map((e) => e.sigle).join(" › ")}
                  </span>
                )}
              </div>

              {profil?.description && (
                <p className="text-xs leading-relaxed text-muted-foreground">{profil.description}</p>
              )}

              <div className="space-y-1 border-t pt-2 text-xs">
                <Ligne k="Identifiant" v={compte.email} />
                <Ligne
                  k="Tenu de"
                  v={courante
                    ? (courante.accordePar ? courante.accordeParNom : "l'installation de la plateforme")
                    : "aucune habilitation en vigueur"}
                />
                {courante && (
                  <>
                    <Ligne
                      k="Depuis"
                      v={`${fmtDate(courante.dateDebut)}${courante.dateFin ? ` — jusqu'au ${fmtDate(courante.dateFin)}` : ""}`}
                    />
                    <Ligne k="Au titre de" v={courante.motif} />
                  </>
                )}
              </div>

              {!courante && (
                <p className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] leading-relaxed text-rose-700 dark:text-rose-400">
                  Ce compte porte un profil qu'aucune habilitation en vigueur ne fonde. Il ouvre
                  donc un droit que plus personne n'a accordé — le cas le plus discret et le plus
                  gênant. Attribuez-lui un profil, ou fermez le compte.
                </p>
              )}

              {enCours.length > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  Cet agent cumule {enCours.length} habilitations ; c'est la plus forte qui
                  s'applique.
                </p>
              )}
            </>
          )}
      </CardContent>

      {compte && (
        <DialogueProfilAgent
          ouvert={ouvert}
          agent={agent}
          compte={compte}
          chef={utilisateur}
          accordables={accordables}
          surFermeture={() => setOuvert(false)}
          surValidation={({ role, motif, dateDebut, dateFin }) => {
            accorder.mutate(
              { compte, role, entiteId: compte.entiteId, motif, dateDebut, dateFin, accordeur: utilisateur },
              {
                onError: (e) => toast({
                  title: "Geste refusé",
                  description: e instanceof Error ? e.message : "Opération impossible.",
                  variant: "destructive",
                }),
                onSuccess: () => toast({
                  title: "Profil attribué",
                  description: `${libelleProfil(role)} — l'octroi est inscrit au journal avec son motif.`,
                }),
              }
            );
            setOuvert(false);
          }}
        />
      )}
    </Card>
  );
}

function Ligne({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v ?? "—"}</span>
    </div>
  );
}

/** Le choix d'un profil pour un agent. Motif obligatoire, comme partout. */
function DialogueProfilAgent({
  ouvert, agent, compte, chef, accordables, surFermeture, surValidation,
}: {
  ouvert: boolean;
  agent: Agent;
  compte: Utilisateur;
  chef: Utilisateur;
  accordables: string[];
  surFermeture: () => void;
  surValidation: (v: { role: string; motif: string; dateDebut: string; dateFin: string | null }) => void;
}) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [role, setRole] = useState("");
  const [motif, setMotif] = useState("");
  const [debut, setDebut] = useState(aujourdhui);
  const [fin, setFin] = useState("");

  const verdict = role ? peutHabiliter(chef, role, compte.entiteId) : { ok: false };
  const valide = !!role && motif.trim().length >= 10 && !!debut && verdict.ok;
  const choisi = profilParCode(role);

  return (
    <DialogueFormulaire
      ouvert={ouvert}
      surFermeture={surFermeture}
      titre="Attribuer un profil d'accès"
      description={`${agent.prenom} ${agent.nom.toUpperCase()} — actuellement ${libelleProfil(compte.role)}`}
      surValidation={() => surValidation({
        role, motif: motif.trim(), dateDebut: debut, dateFin: fin || null,
      })}
      libelleValidation="Attribuer"
      validationPossible={valide}
      large
    >
      <ChampSelect
        label="Profil" valeur={role} surChangement={setRole}
        options={accordables
          .filter((r) => r !== compte.role)
          .map((r) => ({ valeur: r, libelle: `${libelleProfil(r)} · rang ${RANG_HIERARCHIQUE[r] ?? 0}` }))}
        obligatoire
        placeholder={accordables.length ? "Choisir un profil…" : "Aucun profil attribuable ici"}
        aide="Seuls figurent les profils strictement inférieurs au vôtre, dans votre périmètre."
      />
      {choisi?.description && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {choisi.description}
        </p>
      )}
      {role && !verdict.ok && verdict.motif && (
        <p className="text-[11px] text-destructive">{verdict.motif}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampTexte label="À compter du" valeur={debut} surChangement={setDebut} type="date" obligatoire />
        <ChampTexte
          label="Jusqu'au" valeur={fin} surChangement={setFin} type="date"
          aide="Laissé vide : sans terme. Un intérim se borne toujours."
        />
      </div>
      <ChampZone
        label="Au titre de quoi" valeur={motif} surChangement={setMotif} lignes={3} obligatoire
        placeholder="Note de service n° …, intérim de M. …, désignation pour tenir le secrétariat…"
        aide="Obligatoire. Un accès sans motif écrit ne se justifie devant personne."
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Le profil précédent n'est pas effacé : il reste au dossier, et l'historique dit toujours
        qui détenait quoi, à quelle date, et de qui il le tenait. {PROFILS.length} profils
        existent au catalogue ; {accordables.length} vous sont ouverts ici.
      </p>
    </DialogueFormulaire>
  );
}
