"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motDePasseProvisoire } from "@/lib/acces/motdepasse";
import { DialogueAccesOuvert, type AccesOuvert } from "@/components/nexus/acces-ouvert";
import { toast } from "sonner";
import {
  Activity, Database, KeyRound, Pencil, Plus, ShieldCheck, Users,
} from "lucide-react";
import {
  useEnregistrerCompte, useEntites, useHabilitations, useJournal, useProfils,
  useTickets, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  DROITS, ENTITES, MODULE_LABELS, NIVEAU_LABELS, ROLE_LABELS,
  cheminDe, descendantsDe, entiteById, type ModuleKey,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatriceDroits } from "./matrice-droits";
import { ReglageAssistant } from "./assistant";
import { Parametrage } from "./parametrage";
import { SanteInstallation } from "./sante";
import { TableauDeBord } from "./tableau";
import type { CodeProfil, Utilisateur } from "@/lib/types";

const MODULES = Object.keys(MODULE_LABELS) as ModuleKey[];
const ROLES = Object.keys(ROLE_LABELS) as CodeProfil[];

const videCompte = {
  nomComplet: "", email: "", role: "AGENT_INSTRUCTEUR" as CodeProfil,
  entiteId: "ENT-DGARH", fonction: "", telephone: "", actif: true,
};

export default function AdministrationPage() {
  const user = useAuth((s) => s.user)!;
  const { data: comptes = [], isLoading } = useUtilisateurs();
  const { data: journal = [] } = useJournal();
  const { data: tickets = [] } = useTickets();
  const { data: entites = [] } = useEntites();
  const { data: habilitations = [] } = useHabilitations();
  const { data: profils = [] } = useProfils();
  const enregistrerCompte = useEnregistrerCompte();

  const [selection, setSelection] = useState<Utilisateur | null>(null);
  const [formulaire, setFormulaire] = useState<typeof videCompte | null>(null);
  const [edition, setEdition] = useState<Utilisateur | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ role: "all", etat: "all" });
  const [acces, setAcces] = useState<AccesOuvert | null>(null);

  const actifs = comptes.filter((c) => c.actif).length;
  const sansEntite = comptes.filter((c) => !entiteById(c.entiteId)).length;

  const lignes = useMemo(() => comptes
    .filter((c) => filtres.role === "all" || c.role === filtres.role)
    .filter((c) => filtres.etat === "all" || (filtres.etat === "actif" ? c.actif : !c.actif))
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet)), [comptes, filtres]);

  const ouvrirEdition = (c: Utilisateur) => {
    setEdition(c);
    setFormulaire({
      nomComplet: c.nomComplet, email: c.email, role: c.role, entiteId: c.entiteId,
      fonction: c.fonction, telephone: c.telephone ?? "", actif: c.actif,
    });
  };

  const valide = !!formulaire && formulaire.nomComplet.trim().length > 3 && /.+@.+\..+/.test(formulaire.email);

  const enregistrer = async () => {
    if (!formulaire || !valide) return;
    const creation = !edition;
    const compte: Utilisateur = {
      ...(edition ?? {} as Utilisateur),
      id: edition?.id ?? `USR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      email: formulaire.email.trim().toLowerCase(),
      motDePasse: edition?.motDePasse ?? "Nexus2026",
      nomComplet: formulaire.nomComplet.trim(),
      role: formulaire.role,
      entiteId: formulaire.entiteId,
      fonction: formulaire.fonction.trim() || ROLE_LABELS[formulaire.role],
      telephone: formulaire.telephone.trim() || undefined,
      actif: formulaire.actif,
      dateCreation: edition?.dateCreation ?? new Date().toISOString(),
      creePar: edition?.creePar ?? user.id,
      motDePasseAChanger: edition ? edition.motDePasseAChanger : true,
    };
    await enregistrerCompte.mutateAsync({ compte, utilisateur: user, creation });
    toast.success(creation ? "Compte ouvert" : "Compte mis à jour", {
      description: creation
        ? `${compte.email} — mot de passe provisoire Nexus2026.`
        : `${compte.nomComplet} — modification portée au journal.`,
    });
    setFormulaire(null); setEdition(null);
    setSelection(compte);
  };

  const basculer = async (c: Utilisateur) => {
    const compte = { ...c, actif: !c.actif };
    await enregistrerCompte.mutateAsync({ compte, utilisateur: user, creation: false });
    setSelection(compte);
    toast.success(compte.actif ? "Compte réactivé" : "Compte suspendu");
  };

  /* Un mot de passe engendré pour ce compte, et pour lui seul. Le même pour
     tout le monde — « Nexus2026 » posé sur deux mille comptes — ouvrait chacun
     d'eux dès qu'on en connaissait l'adresse. */
  const reinitialiser = async (c: Utilisateur) => {
    const provisoire = motDePasseProvisoire();
    const compte = { ...c, motDePasse: provisoire, motDePasseAChanger: true };
    await enregistrerCompte.mutateAsync({ compte, utilisateur: user, creation: false });
    setAcces({
      nom: c.nomComplet,
      identifiant: c.email,
      provisoire,
      qualite: "Mot de passe réinitialisé",
    });
  };

  const colonnes: Colonne<Utilisateur>[] = [
    {
      cle: "compte", entete: "Compte",
      rendu: (c) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {c.nomComplet}
            {c.motDePasseAChanger && <Badge variant="outline" className="text-[10px]">mot de passe à changer</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground">{c.email}</div>
        </div>
      ),
    },
    { cle: "role", entete: "Rôle", visible: "md", rendu: (c) => <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[c.role]}</Badge> },
    {
      cle: "rattachement", entete: "Rattachement", visible: "lg",
      rendu: (c) => (
        <span className="text-xs text-muted-foreground" title={entiteById(c.entiteId)?.nom}>
          {entiteById(c.entiteId)?.sigle ?? <span className="text-destructive">entité inconnue</span>}
        </span>
      ),
    },
    {
      cle: "perimetre", entete: "Périmètre", visible: "xl", aligne: "droite",
      rendu: (c) => <span className="tabular-nums text-xs text-muted-foreground">{fmtNum(descendantsDe(c.entiteId).length)} entités</span>,
    },
    {
      cle: "etat", entete: "État", aligne: "droite",
      rendu: (c) => (
        <Badge variant={c.actif ? "secondary" : "outline"} className="text-[10px]">
          {c.actif ? "actif" : "suspendu"}
        </Badge>
      ),
    },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Système"
        description="Le cadre dans lequel le ministère s'administre lui-même : les entités, les profils d'accès, et la délégation que les chefs exercent dans leur périmètre. L'administrateur ouvre les portes et règle l'outil ; il n'instruit ni ne signe, et il ne décide pas de l'organisation — celle-ci relève du directeur général (§11)."
      >
        {/* Les comptes ne se créent plus ici. Un compte naît d'une personne :
            le responsable d'une entité nouvelle, désigné depuis l'organisation,
            ou un agent inscrit par son chef. Ouvrir un compte à côté de ces
            deux chemins produisait ce qu'on voyait — des accès sans dossier,
            sans habilitation, et que personne n'avait accordés. */}
        <Button size="sm" variant="outline" asChild>
          <Link href="/dgarh/organisation">
            <Plus className="mr-1.5 h-4 w-4" /> Créer une entité
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="bord" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bord">Tableau de bord</TabsTrigger>
          <TabsTrigger value="comptes">Comptes et accès</TabsTrigger>
          <TabsTrigger value="droits">Matrice des droits</TabsTrigger>
          <TabsTrigger value="parametres">Paramétrage</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
          <TabsTrigger value="sante">Santé et maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="bord">
          <TableauDeBord
            entites={entites}
            comptes={comptes}
            habilitations={habilitations}
            profils={profils}
            aujourdhui={new Date().toISOString().slice(0, 10)}
          />
        </TabsContent>

        <TabsContent value="comptes" className="space-y-4">
          <RangeeKpi tuiles={[
            { ton: "bleu", titre: "Comptes", valeur: fmtNum(comptes.length), sousTitre: `${fmtNum(actifs)} actifs`, icon: Users },
            { ton: "indigo", titre: "Écritures d'audit", valeur: fmtNum(journal.length), sousTitre: "journal en ajout seul", icon: Database },
            { ton: "ambre", titre: "Réclamations ouvertes", valeur: fmtNum(tickets.filter((t) => t.statut !== "CLOS" && t.statut !== "RESOLU").length), sousTitre: `${fmtNum(tickets.length)} au total`, icon: Activity },
            { ton: "rose", titre: "Anomalies", valeur: fmtNum(sansEntite), sousTitre: "comptes sans entité valide", icon: ShieldCheck },
          ]} />

          <TableauModule<Utilisateur>
            titre="Comptes"
            description="Le périmètre ne se saisit pas : il se déduit du rattachement dans l'organigramme."
            lignes={lignes}
            colonnes={colonnes}
            recherche={(c, t) => c.nomComplet.toLowerCase().includes(t) || c.email.toLowerCase().includes(t)}
            placeholderRecherche="Nom ou adresse électronique…"
            filtres={[
              { cle: "role", libelle: "Tous les rôles", options: ROLES.map((r) => ({ valeur: r, libelle: ROLE_LABELS[r] })) },
              { cle: "etat", libelle: "Tous les états", options: [{ valeur: "actif", libelle: "Actifs" }, { valeur: "suspendu", libelle: "Suspendus" }] },
            ]}
            valeursFiltres={filtres}
            surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
            surSelection={setSelection}
            ligneActive={selection?.id}
            parPage={12}
          />
        </TabsContent>

        <TabsContent value="droits">
          <MatriceDroits />
        </TabsContent>

        <TabsContent value="parametres" className="space-y-4">
          <Parametrage />
        </TabsContent>

        <TabsContent value="assistant">
          <ReglageAssistant />
        </TabsContent>

        <TabsContent value="sante" className="space-y-4">
          <SanteInstallation />
        </TabsContent>
      </Tabs>

      {/* --- Prévisualisation d'un compte --- */}
      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.nomComplet ?? ""}
        sousTitre={selection?.email}
        etiquette={selection && (
          <>
            <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[selection.role]}</Badge>
            <Badge variant={selection.actif ? "outline" : "destructive"} className="text-[10px]">
              {selection.actif ? "actif" : "suspendu"}
            </Badge>
          </>
        )}
        actions={selection && (
          <>
            <Button variant="outline" size="sm" onClick={() => reinitialiser(selection)}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Réinitialiser le mot de passe
            </Button>
            <Button variant="outline" size="sm" onClick={() => basculer(selection)}>
              {selection.actif ? "Suspendre" : "Réactiver"}
            </Button>
            <Button size="sm" onClick={() => ouvrirEdition(selection)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
            </Button>
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Identité">
              <LigneInfo k="Nom complet" v={selection.nomComplet} />
              <LigneInfo k="Identifiant" v={<span className="text-xs">{selection.email}</span>} />
              <LigneInfo k="Téléphone" v={selection.telephone} />
              <LigneInfo k="Fonction" v={<span className="text-xs">{selection.fonction}</span>} />
            </Section>

            <Section titre="Habilitation">
              <LigneInfo k="Rôle" v={ROLE_LABELS[selection.role]} />
              <LigneInfo k="Rattachement" v={entiteById(selection.entiteId)?.nom ?? "entité inconnue"} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">{cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ")}</span>} />
              <LigneInfo k="Périmètre" v={`${fmtNum(descendantsDe(selection.entiteId).length)} entités`} />
              <LigneInfo k="Dossier personnel" v={selection.agentId ? "rattaché" : "aucun agent lié"} />
            </Section>

            <Section titre="Modules ouverts">
              <div className="flex flex-wrap gap-1.5">
                {MODULES.filter((m) => DROITS[selection.role]?.[m]).map((m) => (
                  <Badge key={m} variant={DROITS[selection.role]?.[m] === "W" ? "default" : "secondary"} className="text-[10px]">
                    {MODULE_LABELS[m]}
                  </Badge>
                ))}
              </div>
            </Section>

            <Section titre="Traçabilité">
              <LigneInfo k="Compte créé le" v={selection.dateCreation ? fmtDate(selection.dateCreation) : "semé"} />
              <LigneInfo k="Dernière connexion" v={selection.derniereConnexion ? fmtDate(selection.derniereConnexion) : "—"} />
              <LigneInfo k="Écritures au journal" v={fmtNum(journal.filter((j) => j.utilisateurId === selection.id).length)} />
            </Section>
          </>
        )}
      </PanneauDetail>

      {/* --- Modification d'un compte existant --- */}
      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => { setFormulaire(null); setEdition(null); }}
        titre={`Modifier ${edition?.nomComplet ?? ""}`}
        description="Toute modification est portée au journal d'audit."
        surValidation={enregistrer}
        validationPossible={valide}
        libelleValidation="Enregistrer"
        large
      >
        {formulaire && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Nom complet" obligatoire valeur={formulaire.nomComplet}
                surChangement={(v) => setFormulaire({ ...formulaire, nomComplet: v })} />
              <ChampTexte label="Adresse électronique" obligatoire type="email" valeur={formulaire.email}
                surChangement={(v) => setFormulaire({ ...formulaire, email: v })}
                placeholder="prenom.nom@metp.gouv.cg" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Rôle" obligatoire valeur={formulaire.role}
                surChangement={(v) => setFormulaire({ ...formulaire, role: v as CodeProfil })}
                options={ROLES.map((r) => ({ valeur: r, libelle: ROLE_LABELS[r] }))} />
              <ChampSelect label="Rattachement" obligatoire valeur={formulaire.entiteId}
                surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
                options={ENTITES.map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))}
                aide="C'est ce rattachement, et lui seul, qui fixe le périmètre du compte." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Fonction" valeur={formulaire.fonction}
                surChangement={(v) => setFormulaire({ ...formulaire, fonction: v })} />
              <ChampTexte label="Téléphone" valeur={formulaire.telephone}
                surChangement={(v) => setFormulaire({ ...formulaire, telephone: v })} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Compte actif</div>
                <p className="text-[11px] text-muted-foreground">Un compte suspendu ne peut plus se connecter.</p>
              </div>
              <Switch checked={formulaire.actif} onCheckedChange={(v: boolean) => setFormulaire({ ...formulaire, actif: v })} />
            </div>
          </>
        )}
      </DialogueFormulaire>

      <DialogueAccesOuvert acces={acces} surFermeture={() => setAcces(null)} />
    </>
  );
}
