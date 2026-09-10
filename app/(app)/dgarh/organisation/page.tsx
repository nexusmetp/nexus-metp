"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2, ChevronRight, Landmark, Network, Pencil, Plus, ShieldCheck, UserPlus, Users,
} from "lucide-react";
import {
  useAgentsProjetes, useEnregistrerCompte, useEnregistrerEntite, useEntites, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, NIVEAU_LABELS, PROVENANCE_LABELS, ROLE_LABELS,
  cheminDe, descendantsDe, enfantsDe, entiteById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { Entite, NiveauEntite, Role, Utilisateur } from "@/lib/types";

/** Niveaux que le directeur général peut créer. Le ministère ne se crée pas. */
const NIVEAUX_CREABLES: NiveauEntite[] = [
  "DIRECTION_GENERALE", "INSPECTION_GENERALE", "SECRETARIAT", "DIRECTION",
  "SERVICE", "BUREAU", "DIRECTION_DEPARTEMENTALE",
  "INSPECTION_INTERDEPARTEMENTALE", "ANTENNE_DEPARTEMENTALE", "ETABLISSEMENT",
];

/** Rôle proposé par défaut selon le niveau que l'on vient de créer. */
const ROLE_ATTENDU: Partial<Record<NiveauEntite, Role>> = {
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

const vide = {
  sigle: "", nom: "", code: "", niveau: "DIRECTION" as NiveauEntite,
  parentId: "ENT-METP", ville: "", reference: "", motif: "",
};

const videResponsable = { nomComplet: "", email: "", fonction: "", telephone: "", role: "DIRECTEUR_CENTRAL" as Role };

export default function OrganisationPage() {
  const user = useAuth((s) => s.user)!;
  const { data: agents, pret } = useAgentsProjetes();
  const { data: comptes = [] } = useUtilisateurs();
  const { data: entitesDb = [] } = useEntites();
  const enregistrerEntite = useEnregistrerEntite();
  const enregistrerCompte = useEnregistrerCompte();

  const [selection, setSelection] = useState<Entite | null>(null);
  const [formulaire, setFormulaire] = useState<typeof vide | null>(null);
  const [edition, setEdition] = useState<Entite | null>(null);
  /* La nomination porte sa propre cible : ouvrir en même temps le panneau de
     détail et le dialogue les ferait se recouvrir. */
  const [responsable, setResponsable] = useState<{ entite: Entite; champs: typeof videResponsable } | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ niveau: "all", provenance: "all" });

  /* Effectif réel par entité, périmètre compris — c'est ce qui donne du poids
     à une ligne de l'organigramme. */
  const effectifs = useMemo(() => {
    const direct = new Map<string, number>();
    agents.forEach((a) => a.entiteId && direct.set(a.entiteId, (direct.get(a.entiteId) ?? 0) + 1));
    const total = new Map<string, number>();
    ENTITES.forEach((e) => {
      total.set(e.id, descendantsDe(e.id).reduce((s, d) => s + (direct.get(d.id) ?? 0), 0));
    });
    return { direct, total };
  }, [agents, entitesDb]);

  const responsableDe = useMemo(() => {
    const m = new Map<string, Utilisateur>();
    comptes.forEach((c) => { if (!m.has(c.entiteId)) m.set(c.entiteId, c); });
    return m;
  }, [comptes]);

  const lignes = useMemo(() => {
    return ENTITES
      .filter((e) => filtres.niveau === "all" || e.niveau === filtres.niveau)
      .filter((e) => filtres.provenance === "all" || e.provenance === filtres.provenance)
      .sort((a, b) => cheminDe(a.id).length - cheminDe(b.id).length || a.sigle.localeCompare(b.sigle));
  }, [filtres, entitesDb]);

  const creees = ENTITES.filter((e) => e.creePar).length;
  const aVerifier = ENTITES.filter((e) => e.provenance === "A_VERIFIER").length;

  const ouvrirCreation = (parentId?: string) => {
    const parent = entiteById(parentId ?? "ENT-METP");
    setFormulaire({ ...vide, parentId: parent?.id ?? "ENT-METP" });
    setEdition(null);
  };

  const ouvrirEdition = (e: Entite) => {
    setEdition(e);
    setFormulaire({
      sigle: e.sigle, nom: e.nom, code: e.code, niveau: e.niveau,
      parentId: e.parentId ?? "ENT-METP", ville: e.ville ?? "",
      reference: e.reference ?? "", motif: "",
    });
  };

  const valide = !!formulaire && formulaire.sigle.trim().length >= 2 && formulaire.nom.trim().length >= 4;

  const enregistrer = async () => {
    if (!formulaire || !valide) return;
    const creation = !edition;
    const entite: Entite = {
      id: edition?.id ?? `ENT-${formulaire.sigle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      code: formulaire.code.trim() || formulaire.sigle.trim().toUpperCase(),
      sigle: formulaire.sigle.trim().toUpperCase(),
      nom: formulaire.nom.trim(),
      niveau: formulaire.niveau,
      parentId: formulaire.parentId,
      ville: formulaire.ville.trim() || undefined,
      // Une entité créée dans l'outil n'est pas fondée par un texte tant qu'on
      // n'en cite pas un : elle reste une décision d'organisation. §01
      provenance: formulaire.reference.trim() ? "TEXTE" : "RECOMMANDATION",
      reference: formulaire.reference.trim() || (creation ? `Décision d'organisation — ${user.nomComplet}` : edition?.reference),
      actif: edition?.actif ?? true,
      creePar: edition?.creePar ?? user.id,
      dateCreation: edition?.dateCreation ?? new Date().toISOString(),
      responsableId: edition?.responsableId ?? null,
    };
    await enregistrerEntite.mutateAsync({ entite, utilisateur: user, creation });
    toast.success(creation ? `${entite.sigle} créée` : `${entite.sigle} mise à jour`, {
      description: creation
        ? "L'entité entre dans l'organigramme et dans le calcul des périmètres."
        : "La modification est portée au journal d'audit.",
    });
    setFormulaire(null);
    setEdition(null);
    if (creation) {
      setSelection(null);
      setResponsable({
        entite,
        champs: {
          ...videResponsable,
          role: ROLE_ATTENDU[entite.niveau] ?? "CHEF_SERVICE",
          fonction: `Responsable — ${entite.nom}`,
        },
      });
    } else {
      setSelection(entite);
    }
  };

  const basculerActivite = async (e: Entite) => {
    const entite = { ...e, actif: e.actif === false };
    await enregistrerEntite.mutateAsync({ entite, utilisateur: user, creation: false });
    setSelection(entite);
    toast.success(entite.actif ? `${e.sigle} réactivée` : `${e.sigle} désactivée`, {
      description: entite.actif
        ? "Elle réapparaît dans les listes et les périmètres."
        : "Elle sort des listes ; son historique est conservé.",
    });
  };

  const responsableValide =
    !!responsable && responsable.champs.nomComplet.trim().length > 3
    && /.+@.+\..+/.test(responsable.champs.email);

  const nommerResponsable = async () => {
    if (!responsable || !responsableValide) return;
    const { entite: cible, champs } = responsable;
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
      entite: { ...cible, responsableId: compte.id },
      utilisateur: user, creation: false,
    });
    toast.success(`${compte.nomComplet} peut se connecter`, {
      description: `Identifiant ${compte.email} — mot de passe provisoire Nexus2026, à changer à la première connexion.`,
      duration: 9000,
    });
    setResponsable(null);
  };

  const colonnes: Colonne<Entite>[] = [
    {
      cle: "entite", entete: "Entité",
      rendu: (e) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">{e.sigle}</span>
            {e.actif === false && <Badge variant="outline" className="text-[10px]">désactivée</Badge>}
            {e.creePar && <Badge variant="secondary" className="text-[10px]">créée ici</Badge>}
          </div>
          <div className="max-w-[380px] truncate text-xs text-muted-foreground" title={e.nom}>{e.nom}</div>
        </div>
      ),
    },
    {
      cle: "niveau", entete: "Niveau", visible: "md",
      rendu: (e) => <Badge variant="outline" className="text-[10px]">{NIVEAU_LABELS[e.niveau]}</Badge>,
    },
    {
      cle: "rattachement", entete: "Rattachée à", visible: "lg",
      rendu: (e) => (
        <span className="text-xs text-muted-foreground">
          {e.parentId ? entiteById(e.parentId)?.sigle ?? "—" : "—"}
        </span>
      ),
    },
    {
      cle: "responsable", entete: "Responsable", visible: "xl",
      rendu: (e) => {
        const r = responsableDe.get(e.id);
        return r
          ? <span className="text-xs">{r.nomComplet}</span>
          : <span className="text-xs italic text-muted-foreground">à nommer</span>;
      },
    },
    {
      cle: "effectif", entete: "Effectif", aligne: "droite",
      rendu: (e) => <span className="tabular-nums text-sm">{fmtNum(effectifs.total.get(e.id) ?? 0)}</span>,
    },
    {
      cle: "provenance", entete: "Provenance", aligne: "droite", visible: "md",
      rendu: (e) => <BadgeProvenance v={e.provenance} />,
    },
  ];

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const enfants = selection ? enfantsDe(selection.id) : [];
  const chefSelection = selection ? responsableDe.get(selection.id) : undefined;

  return (
    <>
      <PageHeader
        titre="Organisation"
        description="Créer une direction, la rattacher, en nommer le responsable. Une entité créée ici entre aussitôt dans le calcul des périmètres : elle décide de ce que chacun voit (§11)."
      >
        <Button size="sm" onClick={() => ouvrirCreation()}>
          <Plus className="mr-1.5 h-4 w-4" /> Créer une entité
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Entités", valeur: fmtNum(ENTITES.length), sousTitre: `dont ${fmtNum(creees)} créées dans l'outil`, icon: Network },
        { titre: "Directions", valeur: fmtNum(ENTITES.filter((e) => e.niveau === "DIRECTION" || e.niveau === "DIRECTION_GENERALE").length), sousTitre: "centrales et générales", icon: Building2 },
        { titre: "Sans responsable", valeur: fmtNum(ENTITES.filter((e) => !responsableDe.has(e.id)).length), sousTitre: "aucun compte rattaché", icon: UserPlus },
        { titre: "À confirmer", valeur: fmtNum(aVerifier), sousTitre: "provenance non établie par un texte", icon: ShieldCheck },
      ]} />

      <TableauModule<Entite>
        titre="Arborescence"
        description="Cliquez une ligne pour la prévisualiser, la modifier ou lui nommer un responsable."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(e, t) =>
          e.sigle.toLowerCase().includes(t) || e.nom.toLowerCase().includes(t) || (e.ville ?? "").toLowerCase().includes(t)}
        placeholderRecherche="Sigle, intitulé ou ville…"
        filtres={[
          { cle: "niveau", libelle: "Tous les niveaux", options: Object.entries(NIVEAU_LABELS).map(([v, l]) => ({ valeur: v, libelle: l })) },
          { cle: "provenance", libelle: "Toutes provenances", options: Object.entries(PROVENANCE_LABELS).map(([v, l]) => ({ valeur: v, libelle: l })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={14}
      />

      {/* --- Prévisualisation --- */}
      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.nom ?? ""}
        sousTitre={selection ? cheminDe(selection.id).map((e) => e.sigle).join(" › ") : undefined}
        etiquette={selection && (
          <>
            <Badge variant="secondary" className="text-[10px]">{NIVEAU_LABELS[selection.niveau]}</Badge>
            <BadgeProvenance v={selection.provenance} />
            {selection.actif === false && <Badge variant="outline" className="text-[10px]">désactivée</Badge>}
          </>
        )}
        actions={selection && (
          <>
            <Button variant="outline" size="sm" onClick={() => basculerActivite(selection)}>
              {selection.actif === false ? "Réactiver" : "Désactiver"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => ouvrirCreation(selection.id)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Sous-entité
            </Button>
            <Button variant="outline" size="sm" onClick={() => ouvrirEdition(selection)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
            </Button>
            {!chefSelection && (
              <Button size="sm" onClick={() => {
                const cible = selection;
                setSelection(null);
                setResponsable({
                  entite: cible,
                  champs: {
                    ...videResponsable,
                    role: ROLE_ATTENDU[cible.niveau] ?? "CHEF_SERVICE",
                    fonction: `Responsable — ${cible.nom}`,
                  },
                });
              }}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Nommer le responsable
              </Button>
            )}
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Identification">
              <LigneInfo k="Sigle" v={<span className="font-mono">{selection.sigle}</span>} />
              <LigneInfo k="Code" v={<span className="font-mono text-xs">{selection.code}</span>} />
              <LigneInfo k="Niveau" v={NIVEAU_LABELS[selection.niveau]} />
              <LigneInfo k="Rattachement" v={selection.parentId ? entiteById(selection.parentId)?.nom : "—"} />
              <LigneInfo k="Ville" v={selection.ville} />
            </Section>

            <Section titre="Fondement">
              <LigneInfo k="Provenance" v={PROVENANCE_LABELS[selection.provenance]} />
              <LigneInfo k="Référence" v={<span className="text-xs">{selection.reference ?? "—"}</span>} />
              {selection.dateCreation && <LigneInfo k="Créée le" v={fmtDate(selection.dateCreation)} />}
            </Section>

            <Section titre="Responsable">
              {chefSelection ? (
                <>
                  <LigneInfo k="Nom" v={chefSelection.nomComplet} />
                  <LigneInfo k="Rôle" v={ROLE_LABELS[chefSelection.role]} />
                  <LigneInfo k="Identifiant" v={<span className="text-xs">{chefSelection.email}</span>} />
                  <LigneInfo k="Compte" v={chefSelection.actif ? "actif" : "suspendu"} />
                </>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  Aucun compte n'est rattaché à cette entité. Tant qu'il n'y en a pas, personne ne peut
                  y instruire de dossier ni y inscrire de personnel.
                </p>
              )}
            </Section>

            <Section titre={`Effectif — ${fmtNum(effectifs.total.get(selection.id) ?? 0)} agents`}>
              <LigneInfo k="Rattachés directement" v={fmtNum(effectifs.direct.get(selection.id) ?? 0)} />
              <LigneInfo k="Dans le périmètre" v={fmtNum(effectifs.total.get(selection.id) ?? 0)} />
              <LigneInfo k="Entités sous elle" v={fmtNum(Math.max(0, descendantsDe(selection.id).length - 1))} />
            </Section>

            {enfants.length > 0 && (
              <Section titre={`Entités rattachées — ${enfants.length}`}>
                <div className="space-y-1">
                  {enfants.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelection(e)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{e.sigle}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{e.nom}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-xs text-muted-foreground">
                          {fmtNum(effectifs.total.get(e.id) ?? 0)}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>

      {/* --- Création / modification d'entité --- */}
      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => { setFormulaire(null); setEdition(null); }}
        titre={edition ? `Modifier ${edition.sigle}` : "Créer une entité"}
        description={
          edition
            ? "La modification est portée au journal d'audit."
            : "L'entité entre immédiatement dans l'organigramme et dans le calcul des périmètres."
        }
        surValidation={enregistrer}
        validationPossible={valide}
        libelleValidation={edition ? "Enregistrer" : "Créer l'entité"}
        large
      >
        {formulaire && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte
                label="Sigle" obligatoire valeur={formulaire.sigle}
                surChangement={(v) => setFormulaire({ ...formulaire, sigle: v })}
                placeholder="DGARH"
              />
              <ChampTexte
                label="Code" valeur={formulaire.code}
                surChangement={(v) => setFormulaire({ ...formulaire, code: v })}
                placeholder="repris du sigle si vide"
              />
            </div>
            <ChampTexte
              label="Intitulé complet" obligatoire valeur={formulaire.nom}
              surChangement={(v) => setFormulaire({ ...formulaire, nom: v })}
              placeholder="Direction générale de l'administration et des ressources humaines"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect
                label="Niveau" obligatoire valeur={formulaire.niveau}
                surChangement={(v) => setFormulaire({ ...formulaire, niveau: v as NiveauEntite })}
                options={NIVEAUX_CREABLES.map((n) => ({ valeur: n, libelle: NIVEAU_LABELS[n] }))}
              />
              <ChampSelect
                label="Rattachée à" obligatoire valeur={formulaire.parentId}
                surChangement={(v) => setFormulaire({ ...formulaire, parentId: v })}
                options={ENTITES
                  .filter((e) => e.id !== edition?.id)
                  .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))}
                aide="Le rattachement détermine le périmètre : qui verra cette entité et son personnel."
              />
            </div>
            <ChampTexte
              label="Ville" valeur={formulaire.ville}
              surChangement={(v) => setFormulaire({ ...formulaire, ville: v })}
              placeholder="Brazzaville"
            />
            <ChampZone
              label="Texte fondateur" lignes={2} valeur={formulaire.reference}
              surChangement={(v) => setFormulaire({ ...formulaire, reference: v })}
              placeholder="Arrêté n° … du … portant organisation de …"
              aide="Si vous citez un texte, l'entité est marquée « établie par un texte ». Sinon elle reste une décision d'organisation, signalée comme telle dans l'organigramme."
            />
          </>
        )}
      </DialogueFormulaire>

      {/* --- Nomination du responsable --- */}
      <DialogueFormulaire
        ouvert={!!responsable}
        surFermeture={() => setResponsable(null)}
        titre={`Nommer le responsable — ${responsable?.entite.sigle ?? ""}`}
        description="Le compte est ouvert immédiatement. Son périmètre se déduit du rattachement de l'entité : il n'y a rien d'autre à régler."
        surValidation={nommerResponsable}
        validationPossible={responsableValide}
        libelleValidation="Ouvrir le compte"
        large
      >
        {responsable && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte
                label="Nom complet" obligatoire valeur={responsable.champs.nomComplet}
                surChangement={(v) => setResponsable({ ...responsable, champs: { ...responsable.champs, nomComplet: v } })}
                placeholder="Alphonse NGATSE"
              />
              <ChampTexte
                label="Adresse électronique" obligatoire type="email" valeur={responsable.champs.email}
                surChangement={(v) => setResponsable({ ...responsable, champs: { ...responsable.champs, email: v } })}
                placeholder="prenom.nom@metp.gouv.cg"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect
                label="Rôle" obligatoire valeur={responsable.champs.role}
                surChangement={(v) => setResponsable({ ...responsable, champs: { ...responsable.champs, role: v as Role } })}
                options={(Object.keys(ROLE_LABELS) as Role[])
                  .filter((r) => r !== "ADMIN_SYSTEME")
                  .map((r) => ({ valeur: r, libelle: ROLE_LABELS[r] }))}
                aide="Le rôle dit ce qu'il peut faire ; l'entité dit sur qui."
              />
              <ChampTexte
                label="Téléphone" valeur={responsable.champs.telephone}
                surChangement={(v) => setResponsable({ ...responsable, champs: { ...responsable.champs, telephone: v } })}
                placeholder="+242 …"
              />
            </div>
            <ChampTexte
              label="Fonction" valeur={responsable.champs.fonction}
              surChangement={(v) => setResponsable({ ...responsable, champs: { ...responsable.champs, fonction: v } })}
            />
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
}
