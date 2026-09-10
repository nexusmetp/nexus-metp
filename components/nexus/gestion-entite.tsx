"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Landmark } from "lucide-react";
import { useEnregistrerCompte, useEnregistrerEntite } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { ENTITES, NIVEAU_LABELS, ROLE_LABELS, entiteById } from "@/lib/referentiels";
import {
  Champ, ChampSelect, ChampTexte, ChampZone, DialogueFormulaire,
} from "@/components/nexus/module";
import { SelecteurPoint } from "@/components/nexus/selecteur-point";
import type { Entite, NiveauEntite, Role, Utilisateur } from "@/lib/types";

/**
 * La création et la nomination, en un seul endroit.
 *
 * Le tableau de l'organisation et le pilotage des directions offrent les
 * mêmes gestes ; les écrire deux fois, c'est les voir diverger. Le crochet
 * rend les déclencheurs et le bloc de dialogues à poser dans la page.
 */

/** Niveaux que le directeur général peut créer. Le ministère ne se crée pas. */
export const NIVEAUX_CREABLES: NiveauEntite[] = [
  "CABINET", "DIRECTION_GENERALE", "INSPECTION_GENERALE", "SECRETARIAT", "DIRECTION",
  "SERVICE", "BUREAU", "DIRECTION_DEPARTEMENTALE",
  "INSPECTION_INTERDEPARTEMENTALE", "ANTENNE_DEPARTEMENTALE", "ETABLISSEMENT",
];

/** Rôle proposé par défaut selon le niveau que l'on vient de créer. */
export const ROLE_ATTENDU: Partial<Record<NiveauEntite, Role>> = {
  CABINET: "DIRECTEUR_CENTRAL",
  DIRECTION_GENERALE: "DIRECTEUR_GENERAL",
  INSPECTION_GENERALE: "DIRECTEUR_CENTRAL",
  SECRETARIAT: "CHEF_SERVICE",
  DIRECTION: "DIRECTEUR_CENTRAL",
  SERVICE: "CHEF_SERVICE",
  BUREAU: "CHEF_BUREAU",
  DIRECTION_DEPARTEMENTALE: "DIRECTEUR_DEPARTEMENTAL",
  INSPECTION_INTERDEPARTEMENTALE: "DIRECTEUR_DEPARTEMENTAL",
  ANTENNE_DEPARTEMENTALE: "CHEF_SERVICE",
  ETABLISSEMENT: "CHEF_ETABLISSEMENT",
};

const videEntite = {
  sigle: "", nom: "", code: "", niveau: "DIRECTION" as NiveauEntite,
  parentId: "ENT-METP", ville: "", reference: "", lat: "", lon: "",
};

const videResponsable = {
  nomComplet: "", email: "", fonction: "", telephone: "", role: "DIRECTEUR_CENTRAL" as Role,
};

/** Bornes du territoire congolais : refuser une coordonnée hors emprise vaut mieux
 *  que planter un marqueur au milieu de l'Atlantique. */
export function coordonneeValide(v: string): boolean {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && Math.abs(n) <= 180;
}

export function useGestionEntite(surChangement?: (e: Entite) => void) {
  const user = useAuth((s) => s.user)!;
  const enregistrerEntite = useEnregistrerEntite();
  const enregistrerCompte = useEnregistrerCompte();

  const [formulaire, setFormulaire] = useState<typeof videEntite | null>(null);
  const [edition, setEdition] = useState<Entite | null>(null);
  const [nomination, setNomination] = useState<{ entite: Entite; champs: typeof videResponsable } | null>(null);

  const ouvrirCreation = (parentId?: string) => {
    setEdition(null);
    setFormulaire({ ...videEntite, parentId: entiteById(parentId ?? "ENT-METP")?.id ?? "ENT-METP" });
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
      fonction: `Responsable — ${e.nom}`,
    },
  });

  const entiteValide = !!formulaire && formulaire.sigle.trim().length >= 2 && formulaire.nom.trim().length >= 4;

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
    && nomination.champs.nomComplet.trim().length > 3
    && /.+@.+\..+/.test(nomination.champs.email);

  const nommer = async () => {
    if (!nomination || !nominationValide) return;
    const { entite: cible, champs } = nomination;
    const compte: Utilisateur = {
      id: `USR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      email: champs.email.trim().toLowerCase(),
      motDePasse: "Nexus2026",
      nomComplet: champs.nomComplet.trim(),
      role: champs.role,
      entiteId: cible.id,
      fonction: champs.fonction.trim() || `Responsable — ${cible.nom}`,
      telephone: champs.telephone.trim() || undefined,
      actif: true,
      dateCreation: new Date().toISOString(),
      creePar: user.id,
      motDePasseAChanger: true,
    };
    await enregistrerCompte.mutateAsync({ compte, utilisateur: user, creation: true });
    await enregistrerEntite.mutateAsync({
      entite: { ...cible, responsableId: compte.id }, utilisateur: user, creation: false,
    });
    toast.success(`${compte.nomComplet} peut se connecter`, {
      description: `Identifiant ${compte.email} — mot de passe provisoire Nexus2026, à changer à la première connexion.`,
      duration: 9000,
    });
    setNomination(null);
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
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Niveau" obligatoire valeur={formulaire.niveau}
                surChangement={(v) => setFormulaire({ ...formulaire, niveau: v as NiveauEntite })}
                options={NIVEAUX_CREABLES.map((n) => ({ valeur: n, libelle: NIVEAU_LABELS[n] }))} />
              <ChampSelect label="Rattachée à" obligatoire valeur={formulaire.parentId}
                surChangement={(v) => setFormulaire({ ...formulaire, parentId: v })}
                options={ENTITES.filter((e) => e.id !== edition?.id)
                  .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))}
                aide="Le rattachement détermine le périmètre : qui verra cette entité et son personnel." />
            </div>
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
              surChangement={(v) => setFormulaire({ ...formulaire, reference: v })}
              placeholder="Arrêté n° … du … portant organisation de …"
              aide="Si vous citez un texte, l'entité est marquée « établie par un texte ». Sinon elle reste une décision d'organisation, signalée comme telle dans l'organigramme." />
          </>
        )}
      </DialogueFormulaire>

      <DialogueFormulaire
        ouvert={!!nomination}
        surFermeture={() => setNomination(null)}
        titre={`Nommer le responsable — ${nomination?.entite.sigle ?? ""}`}
        description="Le compte est ouvert immédiatement. Son périmètre se déduit du rattachement de l'entité : il n'y a rien d'autre à régler."
        surValidation={nommer}
        validationPossible={nominationValide}
        libelleValidation="Ouvrir le compte"
        large
      >
        {nomination && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Nom complet" obligatoire valeur={nomination.champs.nomComplet}
                surChangement={(v) => setNomination({ ...nomination, champs: { ...nomination.champs, nomComplet: v } })}
                placeholder="Alphonse NGATSE" />
              <ChampTexte label="Adresse électronique" obligatoire type="email" valeur={nomination.champs.email}
                surChangement={(v) => setNomination({ ...nomination, champs: { ...nomination.champs, email: v } })}
                placeholder="prenom.nom@metp.gouv.cg" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Rôle" obligatoire valeur={nomination.champs.role}
                surChangement={(v) => setNomination({ ...nomination, champs: { ...nomination.champs, role: v as Role } })}
                options={(Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== "ADMIN_SYSTEME")
                  .map((r) => ({ valeur: r, libelle: ROLE_LABELS[r] }))}
                aide="Le rôle dit ce qu'il peut faire ; l'entité dit sur qui." />
              <ChampTexte label="Téléphone" valeur={nomination.champs.telephone}
                surChangement={(v) => setNomination({ ...nomination, champs: { ...nomination.champs, telephone: v } })}
                placeholder="+242 …" />
            </div>
            <ChampTexte label="Fonction" valeur={nomination.champs.fonction}
              surChangement={(v) => setNomination({ ...nomination, champs: { ...nomination.champs, fonction: v } })} />
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Un mot de passe provisoire — <span className="font-mono font-semibold">Nexus2026</span> — est
                attribué et devra être changé à la première connexion. Le responsable pourra alors inscrire
                son personnel et instruire les dossiers de son périmètre.
              </p>
            </div>
          </>
        )}
      </DialogueFormulaire>
    </>
  );

  return { ouvrirCreation, ouvrirEdition, ouvrirNomination, basculerActivite, dialogues };
}
