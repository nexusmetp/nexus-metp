"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity, Database, KeyRound, Pencil, Plus, RefreshCw, ShieldCheck, Users,
} from "lucide-react";
import {
  useAnnonces, useConversations, useEnregistrerCompte, useJournal, useMajParametres,
  useMessages, useParametres, useResetData, useTickets, useUtilisateurs,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatriceDroits } from "./matrice-droits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Role, Utilisateur } from "@/lib/types";

const MODULES = Object.keys(MODULE_LABELS) as ModuleKey[];
const ROLES = Object.keys(ROLE_LABELS) as Role[];

const videCompte = {
  nomComplet: "", email: "", role: "AGENT_INSTRUCTEUR" as Role,
  entiteId: "ENT-DGARH", fonction: "", telephone: "", actif: true,
};

export default function AdministrationPage() {
  const user = useAuth((s) => s.user)!;
  const { data: comptes = [], isLoading } = useUtilisateurs();
  const { data: journal = [] } = useJournal();
  const { data: tickets = [] } = useTickets();
  const { data: messages = [] } = useMessages();
  const { data: conversations = [] } = useConversations();
  const { data: annonces = [] } = useAnnonces();
  const { data: parametres } = useParametres();
  const enregistrerCompte = useEnregistrerCompte();
  const majParametres = useMajParametres();
  const reset = useResetData();

  const [selection, setSelection] = useState<Utilisateur | null>(null);
  const [formulaire, setFormulaire] = useState<typeof videCompte | null>(null);
  const [edition, setEdition] = useState<Utilisateur | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ role: "all", etat: "all" });
  const [confirme, setConfirme] = useState(false);
  const [reglages, setReglages] = useState<Record<string, any> | null>(null);

  const actifs = comptes.filter((c) => c.actif).length;
  const sansEntite = comptes.filter((c) => !entiteById(c.entiteId)).length;

  const lignes = useMemo(() => comptes
    .filter((c) => filtres.role === "all" || c.role === filtres.role)
    .filter((c) => filtres.etat === "all" || (filtres.etat === "actif" ? c.actif : !c.actif))
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet)), [comptes, filtres]);

  const ouvrirCreation = () => { setEdition(null); setFormulaire({ ...videCompte }); };
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

  const reinitialiser = async (c: Utilisateur) => {
    const compte = { ...c, motDePasse: "Nexus2026", motDePasseAChanger: true };
    await enregistrerCompte.mutateAsync({ compte, utilisateur: user, creation: false });
    toast.success("Mot de passe réinitialisé", {
      description: `${c.nomComplet} devra saisir Nexus2026 puis en choisir un nouveau.`,
      duration: 8000,
    });
  };

  const enregistrerReglages = async () => {
    if (!parametres || !reglages) return;
    await majParametres.mutateAsync({ parametres: { ...parametres, ...reglages } as any, utilisateur: user });
    toast.success("Paramétrage enregistré");
    setReglages(null);
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

  const reg = { ...(parametres ?? {}), ...(reglages ?? {}) } as any;

  return (
    <>
      <PageHeader
        titre="Système"
        description="Accès, paramétrage, santé de l'installation. L'administrateur ouvre les portes et règle l'outil ; il n'instruit ni ne signe, et il ne décide pas de l'organisation — celle-ci relève du directeur général (§11)."
      >
        <Button size="sm" onClick={ouvrirCreation}>
          <Plus className="mr-1.5 h-4 w-4" /> Ouvrir un compte
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Comptes", valeur: fmtNum(comptes.length), sousTitre: `${fmtNum(actifs)} actifs`, icon: Users },
        { ton: "indigo", titre: "Écritures d'audit", valeur: fmtNum(journal.length), sousTitre: "journal en ajout seul", icon: Database },
        { ton: "ambre", titre: "Réclamations ouvertes", valeur: fmtNum(tickets.filter((t) => t.statut !== "CLOS" && t.statut !== "RESOLU").length), sousTitre: `${fmtNum(tickets.length)} au total`, icon: Activity },
        { ton: "rose", titre: "Anomalies", valeur: fmtNum(sansEntite), sousTitre: "comptes sans entité valide", icon: ShieldCheck },
      ]} />

      <Tabs defaultValue="comptes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comptes">Comptes et accès</TabsTrigger>
          <TabsTrigger value="droits">Matrice des droits</TabsTrigger>
          <TabsTrigger value="parametres">Paramétrage</TabsTrigger>
          <TabsTrigger value="sante">Santé et maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="comptes" className="space-y-4">
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Paramétrage de l'installation</CardTitle>
              <CardDescription>Ce qui vaut pour tout le ministère, et que seul l'administrateur règle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Institution</Label>
                  <Input
                    value={reg.nomInstitution ?? ""}
                    onChange={(e) => setReglages({ ...(reglages ?? {}), nomInstitution: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Exercice</Label>
                  <Input
                    type="number" value={reg.exercice ?? 2026}
                    onChange={(e) => setReglages({ ...(reglages ?? {}), exercice: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Délai cible d'instruction d'un acte (jours)</Label>
                  <Input
                    type="number" value={reg.delaiCibleActe ?? 15}
                    onChange={(e) => setReglages({ ...(reglages ?? {}), delaiCibleActe: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Au-delà, un dossier est signalé en retard dans les bannettes et les rapports (§13).
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Délai de réponse — réclamation critique (heures)</Label>
                  <Input
                    type="number" value={reg.delaiTicket?.CRITIQUE ?? 4}
                    onChange={(e) => setReglages({
                      ...(reglages ?? {}),
                      delaiTicket: { ...(reg.delaiTicket ?? {}), CRITIQUE: Number(e.target.value) },
                    })}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modules de collaboration</div>
                {([
                  ["messagerieActive", "Messagerie interne"],
                  ["ticketsActifs", "Réclamations et assistance"],
                  ["annoncesActives", "Notes de service et circulaires"],
                ] as const).map(([cle, libelle]) => (
                  <div key={cle} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{libelle}</span>
                    <Switch
                      checked={reg[cle] !== false}
                      onCheckedChange={(v: boolean) => setReglages({ ...(reglages ?? {}), [cle]: v })}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Dernière modification : {parametres ? fmtDate(parametres.maj) : "—"}
                </p>
                <Button size="sm" disabled={!reglages} onClick={enregistrerReglages}>Enregistrer</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sante" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">État de l'installation</CardTitle>
                <CardDescription>Ce que contient la base de ce navigateur.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                <LigneInfo k="Entités" v={fmtNum(ENTITES.length)} />
                <LigneInfo k="Comptes" v={`${fmtNum(comptes.length)} — ${fmtNum(actifs)} actifs`} />
                <LigneInfo k="Écritures d'audit" v={fmtNum(journal.length)} />
                <LigneInfo k="Réclamations" v={fmtNum(tickets.length)} />
                <LigneInfo k="Conversations" v={`${fmtNum(conversations.length)} — ${fmtNum(messages.length)} messages`} />
                <LigneInfo k="Notes et circulaires" v={fmtNum(annonces.length)} />
              </CardContent>
            </Card>

            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Limite connue — persistance locale</CardTitle>
                <CardDescription>Ce point conditionne tout usage réel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Les données vivent dans le navigateur de ce poste. Deux agents ne partagent donc pas la
                  même base : le circuit ne se joue à plusieurs rôles qu'en changeant de compte dans le
                  même navigateur. Une exploitation réelle demande un serveur.
                </p>
                <div className="rounded-lg border border-dashed p-3">
                  <div className="text-xs font-semibold">Reprise du jeu de données</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Efface la base de ce navigateur et la resème. Les créations faites ici — entités,
                    comptes, agents — sont perdues.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {!confirme ? (
                      <Button variant="outline" size="sm" onClick={() => setConfirme(true)}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Réinitialiser
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="destructive" size="sm" disabled={reset.isPending}
                          onClick={() => reset.mutate(undefined, {
                            onSuccess: () => { setConfirme(false); toast.success("Base resemée"); },
                          })}
                        >
                          Confirmer l'effacement
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirme(false)}>Annuler</Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

      {/* --- Création / modification de compte --- */}
      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => { setFormulaire(null); setEdition(null); }}
        titre={edition ? `Modifier ${edition.nomComplet}` : "Ouvrir un compte"}
        description={
          edition
            ? "Toute modification est portée au journal d'audit."
            : "Le compte est utilisable immédiatement, avec le mot de passe provisoire Nexus2026."
        }
        surValidation={enregistrer}
        validationPossible={valide}
        libelleValidation={edition ? "Enregistrer" : "Ouvrir le compte"}
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
                surChangement={(v) => setFormulaire({ ...formulaire, role: v as Role })}
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
    </>
  );
}
