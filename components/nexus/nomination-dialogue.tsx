"use client";

import { Landmark, UserCheck, UserPlus } from "lucide-react";
import { mentionApprobation } from "@/lib/referentiels";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire,
} from "@/components/nexus/module";
import { CATEGORIES, LIBELLES_CATEGORIE, type ChampsResponsable } from "./entite-constantes";
import type { Agent, AgentProjete, Entite, ProfilAcces } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Désigner le responsable d'une entité                                */
/* ------------------------------------------------------------------ */

/**
 * Deux façons de nommer, et la première manquait.
 *
 * L'écran n'offrait qu'un geste : **saisir une identité nouvelle**. C'était le
 * cas de l'amorçage — une direction qui vient de naître et où personne ne sert
 * encore. Mais appliqué au ministère réel, cela donnait ceci : soixante-dix-sept
 * entités sans chef, **toutes peuplées**, aucune vide, et pour seule issue
 * proposée d'inventer soixante-dix-sept personnes à côté de celles qui y
 * travaillent déjà.
 *
 * C'est faux deux fois. Administrativement, on nomme **parmi le personnel en
 * poste** : un chef de service sort du service, un chef d'établissement du
 * corps enseignant. Et techniquement, cela fabriquait des doublons — un agent
 * réel d'un côté, son sosie nommé de l'autre, sans moyen de les rapprocher.
 *
 * D'où les deux modes. Celui qui est proposé par défaut est celui qui
 * correspond à la situation : s'il y a du monde dans l'entité, on choisit
 * parmi eux.
 */
export function DialogueNomination({
  nomination, surChamps, surFermeture, surValidation, valide,
  profilsDesignables, candidats, soumisAuMinistre,
}: {
  nomination: { entite: Entite; champs: ChampsResponsable } | null;
  surChamps: (c: Partial<ChampsResponsable>) => void;
  surFermeture: () => void;
  surValidation: () => void;
  valide: boolean;
  profilsDesignables: ProfilAcces[];
  /** Les agents dont l'affectation en vigueur porte sur cette entité. */
  candidats: AgentProjete[];
  soumisAuMinistre: boolean;
}) {
  if (!nomination) return null;
  const { champs } = nomination;
  const enPoste = champs.source === "EN_POSTE";
  const choisi = candidats.find((a) => a.id === champs.agentId);

  return (
    <DialogueFormulaire
      ouvert
      surFermeture={surFermeture}
      titre={`Désigner le responsable — ${nomination.entite.sigle}`}
      description={
        "Une seule personne, celle qui dirige. C'est elle qui inscrira ensuite son secrétariat "
        + "et son personnel, et leur attribuera les profils — vous n'aurez plus à intervenir."
      }
      surValidation={surValidation}
      validationPossible={valide}
      libelleValidation={soumisAuMinistre
        ? "Soumettre au ministre"
        : enPoste ? "Désigner" : "Désigner et ouvrir l'accès"}
      large
    >
      {/* Dit avant le geste, jamais après : un bouton qui promet d'ouvrir un
          accès et soumet une demande à la place est un bouton qui ment. */}
      {soumisAuMinistre && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
          {mentionApprobation(nomination.entite.niveau)}
        </p>
      )}

      <ChampSelect
        label="Qui" obligatoire valeur={champs.source}
        surChangement={(v) => surChamps({ source: v as ChampsResponsable["source"], agentId: "" })}
        options={[
          {
            valeur: "EN_POSTE",
            libelle: candidats.length
              ? `Un agent déjà en poste — ${candidats.length} dans cette entité`
              : "Un agent déjà en poste — aucun dans cette entité",
          },
          { valeur: "A_INSCRIRE", libelle: "Une personne à inscrire au fichier" },
        ]}
        aide="On nomme d'ordinaire parmi le personnel en poste. Inscrire quelqu'un ne se justifie que si l'entité vient de naître, ou si la personne arrive d'ailleurs."
      />

      {enPoste ? (
        <>
          <ChampSelect
            label="Agent" obligatoire valeur={champs.agentId}
            surChangement={(v) => surChamps({ agentId: v })}
            options={candidats.map((a) => ({
              valeur: a.id,
              libelle: `${a.matricule} — ${a.prenom} ${a.nom.toUpperCase()}${a.fonction ? ` · ${a.fonction}` : ""}`,
            }))}
            placeholder={candidats.length ? "Choisir dans le personnel de l'entité…" : "Personne n'est affecté ici"}
            aide="Son dossier, sa carrière et son compte existent déjà : rien n'est créé, sa fonction change et un profil lui est accordé."
          />
          {choisi && (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <strong className="font-medium">{choisi.prenom} {choisi.nom.toUpperCase()}</strong>{" "}
                — matricule {choisi.matricule}, {LIBELLES_CATEGORIE[choisi.categorie]}. Son compte
                passe au profil choisi et <strong className="font-medium">son mot de passe ne
                change pas</strong> : il n&apos;y a pas d&apos;accès nouveau à lui transmettre.
                L&apos;affectation en cours est close à la date d&apos;effet et une nouvelle
                s&apos;ouvre à la fonction de responsable.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampTexte label="Nom" obligatoire valeur={champs.nom}
              surChangement={(v) => surChamps({ nom: v })} placeholder="NGATSE" />
            <ChampTexte label="Prénom" obligatoire valeur={champs.prenom}
              surChangement={(v) => surChamps({ prenom: v })} placeholder="Alphonse" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ChampSelect label="Sexe" obligatoire valeur={champs.sexe}
              surChangement={(v) => surChamps({ sexe: v as Agent["sexe"] })}
              options={[{ valeur: "M", libelle: "Masculin" }, { valeur: "F", libelle: "Féminin" }]} />
            <ChampTexte label="Date de naissance" obligatoire type="date"
              valeur={champs.dateNaissance} surChangement={(v) => surChamps({ dateNaissance: v })} />
            <ChampSelect label="Catégorie" obligatoire valeur={champs.categorie}
              surChangement={(v) => surChamps({ categorie: v as Agent["categorie"] })}
              options={CATEGORIES.map((c) => ({ valeur: c, libelle: LIBELLES_CATEGORIE[c] }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampTexte label="Adresse électronique" type="email" valeur={champs.email}
              surChangement={(v) => surChamps({ email: v })}
              placeholder="prenom.nom@metp.gouv.cg"
              aide="Laissée vide, elle est dérivée du nom, comme pour tout agent." />
            <ChampTexte label="Téléphone" valeur={champs.telephone}
              surChangement={(v) => surChamps({ telephone: v })} placeholder="+242 …" />
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelect label="Profil d'accès" obligatoire valeur={champs.role}
          surChangement={(v) => surChamps({ role: v })}
          options={profilsDesignables.map((p) => ({
            valeur: p.code, libelle: `${p.libelle} · rang ${p.rang}`,
          }))}
          aide="Le profil dit ce qu'il peut faire ; l'entité dit sur qui. Celui qui est proposé correspond au niveau de l'entité — c'est une suggestion, pas une règle." />
        <ChampTexte label="À compter du" obligatoire type="date" valeur={champs.dateEffet}
          surChangement={(v) => surChamps({ dateEffet: v })} />
      </div>
      <ChampTexte label="Fonction" valeur={champs.fonction}
        surChangement={(v) => surChamps({ fonction: v })} />
      <ChampZone label="Acte qui le nomme" obligatoire lignes={2} valeur={champs.motif}
        surChangement={(v) => surChamps({ motif: v })}
        placeholder="Décret n° … du … portant nomination de …"
        aide="Obligatoire. Un responsable désigné sans acte cité ne se justifie devant personne — et c'est ce texte que porteront l'acte d'affectation et l'habilitation." />

      {!enPoste && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Trois choses s&apos;ouvrent ensemble : le <strong className="font-medium">dossier
            d&apos;agent</strong> — un responsable est d&apos;abord un agent du ministère —, le{" "}
            <strong className="font-medium">compte</strong>, et l&apos;<strong className="font-medium">habilitation</strong>{" "}
            qui dit de qui il tient son profil. Le mot de passe provisoire est propre à ce compte,
            ne s&apos;affiche qu&apos;une fois et doit être changé à la première connexion. Le
            dossier s&apos;ouvre incomplet : les pièces d&apos;état civil se déposent ensuite, par
            l&apos;intéressé ou son secrétariat.
          </p>
        </div>
      )}

      {enPoste && candidats.length === 0 && (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
          <UserPlus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Aucun agent n&apos;est affecté à cette entité. Elle vient sans doute d&apos;être créée :
          inscrivez d&apos;abord son responsable, il inscrira ensuite son personnel.
        </p>
      )}
    </DialogueFormulaire>
  );
}
