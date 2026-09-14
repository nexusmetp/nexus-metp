"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Landmark } from "lucide-react";
import { useDesignerResponsable, useEnregistrerEntite, useParametres } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, NIVEAU_LABELS, PROFILS, PROFILS_TECHNIQUES,
  creeUnCycle, entiteById, exigeApprobation, libelleProfil, mentionApprobation,
  niveauxApprobation, niveauxCreablesSous, optionsNiveaux, perimetreAdministrable,
  verdictRattachement,
} from "@/lib/referentiels";
import {
  Champ, ChampSelect, ChampTexte, ChampZone, DialogueFormulaire,
} from "@/components/nexus/module";
import { SelecteurPoint } from "@/components/nexus/selecteur-point";
import { DialogueAccesOuvert, type AccesOuvert } from "@/components/nexus/acces-ouvert";
import type { Agent, Entite, NiveauEntite, Role } from "@/lib/types";

/**
 * La création et la nomination, en un seul endroit.
 *
 * Le tableau de l'organisation et le pilotage des directions offrent les
 * mêmes gestes ; les écrire deux fois, c'est les voir diverger. Le crochet
 * rend les déclencheurs et le bloc de dialogues à poser dans la page.
 */

import {
  CATEGORIES, LIBELLES_CATEGORIE, NIVEAUX_CREABLES, ROLE_ATTENDU,
  coordonneeValide, videEntite, videResponsable,
} from "./entite-constantes";

export { NIVEAUX_CREABLES, ROLE_ATTENDU, coordonneeValide };

export function useGestionEntite(surChangement?: (e: Entite) => void) {
  const user = useAuth((s) => s.user)!;
  const enregistrerEntite = useEnregistrerEntite();
  const designer = useDesignerResponsable();
  const { data: parametres } = useParametres();

  const [formulaire, setFormulaire] = useState<typeof videEntite | null>(null);
  const [edition, setEdition] = useState<Entite | null>(null);
  const [nomination, setNomination] = useState<{ entite: Entite; champs: typeof videResponsable } | null>(null);
  const [acces, setAcces] = useState<AccesOuvert | null>(null);

  /* Les profils qu'on peut poser à la tête d'une entité : tous ceux du
     catalogue, sauf les techniques — l'administrateur système n'est pas un
     agent et ne dirige aucun service. Du plus élevé au plus bas, parce qu'on
     désigne ici un responsable, pas un exécutant. */
  const profilsDesignables = PROFILS
    .filter((p) => p.actif && !p.technique)
    .sort((a, b) => b.rang - a.rang);

  /* Les entités auxquelles on peut rattacher : celles qu'on administre.
     Pour presque tous, c'est la sienne et ce qu'elle contient ; pour le
     directeur général de la DGARH, c'est le ministère, cabinet compris —
     administrer les autres structures est l'objet de sa direction. La règle
     est vérifiée à l'écriture ; ici elle évite de proposer un refus. */
  const perimetreAdmin = perimetreAdministrable(user);
  const rattachables = perimetreAdmin === null
    ? ENTITES
    : ENTITES.filter((e) => perimetreAdmin.has(e.id));

  const ouvrirCreation = (parentId?: string) => {
    setEdition(null);
    /* À défaut de parent désigné, la sienne : un chef de service qui crée un
       bureau le crée chez lui, pas à la racine du ministère. */
    const defaut = perimetreAdministrable(user) === null ? "ENT-METP" : user.entiteId;
    const parent = entiteById(parentId ?? defaut)?.id ?? defaut;
    /* Le niveau proposé est le premier que ce parent accepte : ouvrir sur
       « Direction » sous un service donnerait un formulaire déjà fautif. */
    setFormulaire({
      ...videEntite,
      parentId: parent,
      niveau: niveauxCreablesSous(parent)[0] ?? videEntite.niveau,
    });
  };

  const ouvrirEdition = (e: Entite) => {
    setEdition(e);
    setFormulaire({
      sigle: e.sigle, nom: e.nom, code: e.code, niveau: e.niveau,
      parentId: e.parentId ?? "ENT-METP", ville: e.ville ?? "", reference: e.reference ?? "",
      lat: e.lat != null ? String(e.lat) : "", lon: e.lon != null ? String(e.lon) : "",
    });
  };

  const ouvrirNomination = (e: Entite) => setNomination({
    entite: e,
    champs: {
      ...videResponsable,
      role: ROLE_ATTENDU[e.niveau] ?? "CHEF_SERVICE",
      motif: "",
      fonction: `Responsable — ${e.nom}`,
    },
  });

  /* Ce que le parent choisi accepte. Recalculé à chaque rendu : changer le
     rattachement change la liste des niveaux, et laisser l'ancien choix en
     place produirait un formulaire valide à l'œil et refusé à l'envoi. */
  const niveauxOfferts = formulaire ? optionsNiveaux(formulaire.parentId) : [];

  /* Au-dessus du seuil, le texte fondateur cesse d'être facultatif : c'est le
     contrôle qui répond, pour les structures, à ce que l'approbation du
     ministre fait pour les nominations. */
  const texteExige = !!formulaire
    && niveauxApprobation(parametres).includes(formulaire.niveau);
  const rattachement = formulaire
    ? verdictRattachement(formulaire.niveau, formulaire.parentId)
    : { ok: false as boolean, motif: undefined as string | undefined };

  const entiteValide = !!formulaire
    && formulaire.sigle.trim().length >= 2
    && formulaire.nom.trim().length >= 4
    && rattachement.ok
    && (!texteExige || formulaire.reference.trim().length >= 8)
    && !(edition && creeUnCycle(edition.id, formulaire.parentId));

  const enregistrer = async () => {
    if (!formulaire || !entiteValide) return;
    const creation = !edition;
    const entite: Entite = {
      id: edition?.id
        ?? `ENT-${formulaire.sigle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      code: formulaire.code.trim() || formulaire.sigle.trim().toUpperCase(),
      sigle: formulaire.sigle.trim().toUpperCase(),
      nom: formulaire.nom.trim(),
      niveau: formulaire.niveau,
      parentId: formulaire.parentId,
      ville: formulaire.ville.trim() || undefined,
      // Sans texte cité, l'entité reste une décision d'organisation : elle est
      // signalée comme telle partout où l'organigramme s'affiche. §01
      provenance: formulaire.reference.trim() ? "TEXTE" : "RECOMMANDATION",
      reference: formulaire.reference.trim()
        || (creation ? `Décision d'organisation — ${user.nomComplet}` : edition?.reference),
      actif: edition?.actif ?? true,
      creePar: edition?.creePar ?? user.id,
      dateCreation: edition?.dateCreation ?? new Date().toISOString(),
      responsableId: edition?.responsableId ?? null,
      // Une entité localisée se place elle-même sur la vue nationale : c'est
      // ce qui fait la différence entre une carte et une liste d'adresses.
      lat: coordonneeValide(formulaire.lat) ? Number(formulaire.lat) : undefined,
      lon: coordonneeValide(formulaire.lon) ? Number(formulaire.lon) : undefined,
    };
    await enregistrerEntite.mutateAsync({ entite, utilisateur: user, creation });
    toast.success(creation ? `${entite.sigle} créée` : `${entite.sigle} mise à jour`, {
      description: creation
        ? "L'entité entre dans l'organigramme et dans le calcul des périmètres."
        : "La modification est portée au journal d'audit.",
    });
    setFormulaire(null);
    setEdition(null);
    surChangement?.(entite);
    if (creation) ouvrirNomination(entite);
  };

  const basculerActivite = async (e: Entite) => {
    const entite = { ...e, actif: e.actif === false };
    await enregistrerEntite.mutateAsync({ entite, utilisateur: user, creation: false });
    surChangement?.(entite);
    toast.success(entite.actif ? `${e.sigle} réactivée` : `${e.sigle} désactivée`, {
      description: entite.actif
        ? "Elle réapparaît dans les listes et les périmètres."
        : "Elle sort des listes ; son historique est conservé.",
    });
  };

  const nominationValide = !!nomination
    && nomination.champs.nom.trim().length > 1
    && nomination.champs.prenom.trim().length > 1
    && !!nomination.champs.dateNaissance
    && !!nomination.champs.dateEffet
    && nomination.champs.motif.trim().length >= 10
    && (!nomination.champs.email.trim() || /.+@.+\..+/.test(nomination.champs.email));

  /* La nomination attend-elle le ministre ? Le seuil est un réglage du
     ministère ; ici on ne fait que le lire, pour que l'écran le dise. */
  const soumisAuMinistre = !!nomination
    && exigeApprobation(nomination.entite.niveau, user, parametres, ["MINISTRE", ...PROFILS_TECHNIQUES]);

  const nommer = async () => {
    if (!nomination || !nominationValide) return;
    const { entite: cible, champs } = nomination;
    try {
      const { compte, provisoire, enAttente, acte } = await designer.mutateAsync({
        entite: cible,
        identite: {
          nom: champs.nom, prenom: champs.prenom, sexe: champs.sexe,
          dateNaissance: champs.dateNaissance,
          telephone: champs.telephone.trim(),
          email: champs.email.trim().toLowerCase(),
          categorie: champs.categorie,
        },
        profil: champs.role,
        fonction: champs.fonction.trim() || `Responsable — ${cible.nom}`,
        dateEffet: champs.dateEffet,
        motif: champs.motif,
        utilisateur: user,
      });
      setNomination(null);

      /* La nomination qui attend le ministre n'a rien ouvert : afficher des
         identifiants ici laisserait croire le contraire, et quelqu'un
         essaierait de se connecter avec un compte qui n'existe pas. */
      if (enAttente || !compte || !provisoire) {
        toast.success("Nomination soumise au ministre", {
          description:
            `${acte.reference} — ${champs.prenom} ${champs.nom.toUpperCase()} à la tête de `
            + `${cible.sigle}. Aucun accès n'est ouvert tant que l'acte n'est pas notifié : `
            + "le compte et l'habilitation suivront l'approbation.",
          duration: 12000,
        });
        return;
      }

      /* Les identifiants dans un dialogue et non dans une notification : le
         mot de passe provisoire ne s'affiche qu'une fois, et une notification
         qui s'efface toute seule ferait perdre l'accès de quelqu'un. */
      setAcces({
        nom: compte.nomComplet,
        identifiant: compte.email,
        provisoire,
        qualite: `${libelleProfil(compte.role)} — ${cible.sigle}`,
      });
    } catch (e) {
      toast.error("Désignation refusée", {
        description: e instanceof Error ? e.message : "Opération impossible.",
        duration: 9000,
      });
    }
  };

  const dialogues = (
    <>
      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => { setFormulaire(null); setEdition(null); }}
        titre={edition ? `Modifier ${edition.sigle}` : "Créer une entité"}
        description={edition
          ? "La modification est portée au journal d'audit."
          : "L'entité entre immédiatement dans l'organigramme et dans le calcul des périmètres."}
        surValidation={enregistrer}
        validationPossible={entiteValide}
        libelleValidation={edition ? "Enregistrer" : "Créer l'entité"}
        large
      >
        {formulaire && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Sigle" obligatoire valeur={formulaire.sigle}
                surChangement={(v) => setFormulaire({ ...formulaire, sigle: v })} placeholder="DGARH" />
              <ChampTexte label="Code" valeur={formulaire.code}
                surChangement={(v) => setFormulaire({ ...formulaire, code: v })}
                placeholder="repris du sigle si vide" />
            </div>
            <ChampTexte label="Intitulé complet" obligatoire valeur={formulaire.nom}
              surChangement={(v) => setFormulaire({ ...formulaire, nom: v })}
              placeholder="Direction générale de l'administration et des ressources humaines" />
            {/* Le rattachement d'abord : c'est lui qui décide des niveaux
                possibles. L'ordre inverse obligeait à choisir un niveau, puis
                à découvrir qu'il ne tenait pas sous le parent retenu. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Rattachée à" obligatoire valeur={formulaire.parentId}
                surChangement={(v) => setFormulaire({
                  ...formulaire,
                  parentId: v,
                  /* Le niveau suit le parent : garder l'ancien produirait un
                     couple refusé à l'envoi, sans que l'écran l'annonce. */
                  niveau: niveauxCreablesSous(v).includes(formulaire.niveau)
                    ? formulaire.niveau
                    : niveauxCreablesSous(v)[0] ?? formulaire.niveau,
                })}
                options={rattachables.filter((e) => e.id !== edition?.id)
                  .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))}
                aide="Le rattachement détermine le périmètre : qui verra cette entité et son personnel." />
              <ChampSelect label="Niveau" obligatoire valeur={formulaire.niveau}
                surChangement={(v) => setFormulaire({ ...formulaire, niveau: v as NiveauEntite })}
                options={niveauxOfferts}
                placeholder={niveauxOfferts.length ? "Choisir…" : "Aucun niveau possible ici"}
                aide="Seuls figurent les niveaux que le rattachement choisi admet." />
            </div>
            {!rattachement.ok && rattachement.motif && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
                {rattachement.motif}
              </p>
            )}
            {edition && creeUnCycle(edition.id, formulaire.parentId) && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive">
                Une entité ne peut pas être rattachée à l'une de celles qu'elle contient.
              </p>
            )}
            <ChampTexte label="Ville" valeur={formulaire.ville}
              surChangement={(v) => setFormulaire({ ...formulaire, ville: v })} placeholder="Brazzaville" />

            <Champ
              label="Localisation"
              aide="Cliquez sur la carte pour poser la structure, ou saisissez les coordonnées. Sans localisation, elle est placée près du chef-lieu de son département — approximation utile, mais approximation."
            >
              <div className="space-y-2">
                <SelecteurPoint
                  lat={coordonneeValide(formulaire.lat) ? Number(formulaire.lat) : undefined}
                  lon={coordonneeValide(formulaire.lon) ? Number(formulaire.lon) : undefined}
                  surChoix={(lat, lon) =>
                    setFormulaire({ ...formulaire, lat: lat.toFixed(5), lon: lon.toFixed(5) })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChampTexte label="Latitude" valeur={formulaire.lat}
                    surChangement={(v) => setFormulaire({ ...formulaire, lat: v })}
                    placeholder="-4.26730" />
                  <ChampTexte label="Longitude" valeur={formulaire.lon}
                    surChangement={(v) => setFormulaire({ ...formulaire, lon: v })}
                    placeholder="15.28320" />
                </div>
                {(formulaire.lat || formulaire.lon) && !(coordonneeValide(formulaire.lat) && coordonneeValide(formulaire.lon)) && (
                  <p className="text-[11px] text-amber-600">
                    Coordonnées incomplètes ou hors du territoire congolais : elles ne seront pas enregistrées.
                  </p>
                )}
              </div>
            </Champ>
            <ChampZone label="Texte fondateur" lignes={2} valeur={formulaire.reference}
              obligatoire={texteExige}
              surChangement={(v) => setFormulaire({ ...formulaire, reference: v })}
              placeholder="Arrêté n° … du … portant organisation de …"
              aide={texteExige
                ? `Obligatoire à ce niveau : une ${NIVEAU_LABELS[formulaire.niveau].toLowerCase()} ne naît pas d'une décision de service, mais d'un décret ou d'un arrêté. Citez son numéro et sa date.`
                : "Si vous citez un texte, l'entité est marquée « établie par un texte ». Sinon elle reste une décision d'organisation, signalée comme telle dans l'organigramme."} />
          </>
        )}
      </DialogueFormulaire>

      <DialogueFormulaire
        ouvert={!!nomination}
        surFermeture={() => setNomination(null)}
        titre={`Désigner le responsable — ${nomination?.entite.sigle ?? ""}`}
        description={
          "Une seule personne, celle qui dirige. C'est elle qui inscrira ensuite son secrétariat "
          + "et son personnel, et leur attribuera les profils — vous n'aurez plus à intervenir."
        }
        surValidation={nommer}
        validationPossible={nominationValide}
        libelleValidation={soumisAuMinistre ? "Soumettre au ministre" : "Désigner et ouvrir l'accès"}
        large
      >
        {/* Dit avant le geste, jamais après : un bouton qui promet d'ouvrir un
            accès et soumet une demande à la place est un bouton qui ment. */}
        {nomination && soumisAuMinistre && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
            {mentionApprobation(nomination.entite.niveau)}
          </p>
        )}
        {nomination && (() => {
          const maj = (c: Partial<typeof nomination.champs>) =>
            setNomination({ ...nomination, champs: { ...nomination.champs, ...c } });
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ChampTexte label="Nom" obligatoire valeur={nomination.champs.nom}
                  surChangement={(v) => maj({ nom: v })} placeholder="NGATSE" />
                <ChampTexte label="Prénom" obligatoire valeur={nomination.champs.prenom}
                  surChangement={(v) => maj({ prenom: v })} placeholder="Alphonse" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <ChampSelect label="Sexe" obligatoire valeur={nomination.champs.sexe}
                  surChangement={(v) => maj({ sexe: v as Agent["sexe"] })}
                  options={[{ valeur: "M", libelle: "Masculin" }, { valeur: "F", libelle: "Féminin" }]} />
                <ChampTexte label="Date de naissance" obligatoire type="date"
                  valeur={nomination.champs.dateNaissance}
                  surChangement={(v) => maj({ dateNaissance: v })} />
                <ChampSelect label="Catégorie" obligatoire valeur={nomination.champs.categorie}
                  surChangement={(v) => maj({ categorie: v as Agent["categorie"] })}
                  options={CATEGORIES.map((c) => ({ valeur: c, libelle: LIBELLES_CATEGORIE[c] }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ChampTexte label="Adresse électronique" type="email" valeur={nomination.champs.email}
                  surChangement={(v) => maj({ email: v })}
                  placeholder="prenom.nom@metp.gouv.cg"
                  aide="Laissée vide, elle est dérivée du nom, comme pour tout agent." />
                <ChampTexte label="Téléphone" valeur={nomination.champs.telephone}
                  surChangement={(v) => maj({ telephone: v })} placeholder="+242 …" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ChampSelect label="Profil d'accès" obligatoire valeur={nomination.champs.role}
                  surChangement={(v) => maj({ role: v })}
                  options={profilsDesignables.map((p) => ({
                    valeur: p.code, libelle: `${p.libelle} · rang ${p.rang}`,
                  }))}
                  aide="Le profil dit ce qu'il peut faire ; l'entité dit sur qui. Celui qui est proposé correspond au niveau de l'entité — c'est une suggestion, pas une règle." />
                <ChampTexte label="À compter du" obligatoire type="date" valeur={nomination.champs.dateEffet}
                  surChangement={(v) => maj({ dateEffet: v })} />
              </div>
              <ChampTexte label="Fonction" valeur={nomination.champs.fonction}
                surChangement={(v) => maj({ fonction: v })} />
              <ChampZone label="Acte qui le nomme" obligatoire lignes={2} valeur={nomination.champs.motif}
                surChangement={(v) => maj({ motif: v })}
                placeholder="Décret n° … du … portant nomination de …"
                aide="Obligatoire. Un responsable désigné sans acte cité ne se justifie devant personne — et c'est ce texte que porteront l'acte d'affectation et l'habilitation." />
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Trois choses s&apos;ouvrent ensemble : le <strong className="font-medium">dossier
                  d&apos;agent</strong> — un responsable est d&apos;abord un agent du ministère —, le{" "}
                  <strong className="font-medium">compte</strong>, et l&apos;<strong className="font-medium">habilitation</strong>{" "}
                  qui dit de qui il tient son profil. Mot de passe provisoire{" "}
                  <span className="font-mono font-semibold">Nexus2026</span>, à changer à la première
                  connexion. Le dossier s&apos;ouvre incomplet : les pièces d&apos;état civil se
                  déposent ensuite, par l&apos;intéressé ou son secrétariat.
                </p>
              </div>
            </>
          );
        })()}
      </DialogueFormulaire>

      <DialogueAccesOuvert acces={acces} surFermeture={() => setAcces(null)} />
    </>
  );

  return { ouvrirCreation, ouvrirEdition, ouvrirNomination, basculerActivite, dialogues };
}
