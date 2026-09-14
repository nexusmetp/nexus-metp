"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2, ChevronRight, Network, Pencil, Plus, Repeat2, ShieldCheck, UserPlus,
} from "lucide-react";
import {
  useAgentsProjetes, useEntites, useHabilitations, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, NIVEAU_LABELS, PROVENANCE_LABELS, RANG_HIERARCHIQUE, ROLE_LABELS,
  niveauxCreablesSous, perimetreAdministrable,
  cheminDe, descendantsDe, enfantsDe, entiteById, habilitationsEnVigueur, peut,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import {
  LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { useGestionEntite } from "@/components/nexus/gestion-entite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Responsables, lignesResponsables } from "./responsables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Entite, Utilisateur } from "@/lib/types";

export default function OrganisationPage() {
  const { data: agents, pret } = useAgentsProjetes();
  const { data: comptes = [] } = useUtilisateurs();
  const { data: entitesDb = [] } = useEntites();
  const { data: habilitations = [] } = useHabilitations();
  const user = useAuth((s) => s.user)!;

  const [selection, setSelection] = useState<Entite | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ niveau: "all", provenance: "all" });

  const gestion = useGestionEntite((e) => setSelection(e.actif === false ? e : null));

  /* Effectif réel par entité, périmètre compris : c'est ce qui donne du poids
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

  /**
   * Le responsable d'une entité — et non le premier compte venu.
   *
   * La carte se construisait jusqu'ici en prenant le premier compte rattaché à
   * l'entité, ce qui désignait un agent au hasard : l'écran affichait son nom
   * en face de « Responsable », et le bouton de désignation disparaissait
   * parce qu'il croyait la place prise. Depuis que chaque agent a un compte,
   * cela concernait presque toutes les entités.
   *
   * Est responsable celui dont le profil **commande** — rang supérieur à celui
   * d'un agent — et dont l'habilitation est en vigueur aujourd'hui. À égalité,
   * le rang le plus élevé l'emporte.
   */
  const responsableDe = useMemo(() => {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const socle = RANG_HIERARCHIQUE.AGENT ?? 10;
    const m = new Map<string, Utilisateur>();
    comptes
      .filter((c) => c.actif && (RANG_HIERARCHIQUE[c.role] ?? 0) > socle)
      .filter((c) => habilitationsEnVigueur(habilitations, c.id, aujourdhui).length > 0)
      .forEach((c) => {
        const tenant = m.get(c.entiteId);
        if (!tenant || (RANG_HIERARCHIQUE[c.role] ?? 0) > (RANG_HIERARCHIQUE[tenant.role] ?? 0)) {
          m.set(c.entiteId, c);
        }
      });
    return m;
  }, [comptes, habilitations]);

  /* Le registre ne montre que ce qu'on administre. C'est une autre borne que
     celle des listes nominatives : ici la question n'est pas « de qui ai-je le
     droit de lire le dossier » mais « où ai-je qualité pour créer et
     désigner ». Montrer les cent cinquante et une entités à un chef de
     service lui offrait cent quarante-sept boutons « Désigner » dont chacun
     se solde par un refus — et un écran qui propose ce qu'il refuse enseigne
     surtout à se méfier de l'écran. L'organigramme complet reste consultable :
     c'est l'objet de la page voisine. */
  const perimetreAdmin = useMemo(
    () => perimetreAdministrable(user),
    [user.role, user.entiteId, entitesDb]
  );

  /* Créer et désigner est une écriture. Le ministre lit ce registre — il doit
     pouvoir consulter l'organisation qu'il dirige — mais il n'y crée rien :
     l'administration du personnel de toutes les structures relève de la
     DGARH. Lui laisser le bouton lui promettait un geste qui aurait été
     refusé au moment de l'enregistrement, ce qui est la pire des façons de
     dire non. */
  const redacteur = peut(user.role, "organisation", "W");

  const administrees = useMemo(
    () => (perimetreAdmin === null ? ENTITES : ENTITES.filter((e) => perimetreAdmin.has(e.id))),
    [perimetreAdmin, entitesDb]
  );

  const responsables = useMemo(() => lignesResponsables({
    entites: administrees,
    comptes,
    habilitations,
    effectifs: effectifs.total,
    aujourdhui: new Date().toISOString().slice(0, 10),
  }), [comptes, habilitations, effectifs, administrees]);

  const lignes = useMemo(() => administrees
    .filter((e) => filtres.niveau === "all" || e.niveau === filtres.niveau)
    .filter((e) => filtres.provenance === "all" || e.provenance === filtres.provenance)
    .sort((a, b) => cheminDe(a.id).length - cheminDe(b.id).length || a.sigle.localeCompare(b.sigle)),
    [filtres, administrees]);

  const creees = administrees.filter((e) => e.creePar).length;
  const aVerifier = administrees.filter((e) => e.provenance === "A_VERIFIER").length;
  const sansChef = administrees.filter((e) => !responsableDe.has(e.id)).length;

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
      rendu: (e) => <span className="text-xs text-muted-foreground">{e.parentId ? entiteById(e.parentId)?.sigle ?? "—" : "—"}</span>,
    },
    {
      cle: "responsable", entete: "Responsable", visible: "xl",
      rendu: (e) => {
        const r = responsableDe.get(e.id);
        return r ? <span className="text-xs">{r.nomComplet}</span>
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
  const chef = selection ? responsableDe.get(selection.id) : undefined;

  return (
    <>
      <PageHeader
        titre="Directions et services"
        description={
          "Le registre de l'organigramme, et le seul endroit où l'on crée. Direction, "
          + "service, bureau, établissement : c'est toujours la même création — une entité — "
          + "et c'est son niveau qui change, avec ce qu'elle peut contenir et qui peut la "
          + "diriger. Une entité créée ici entre aussitôt dans le calcul des périmètres : "
          + "elle décide de ce que chacun voit (§11)."
        }
      >
        {/* L'administrateur système n'a pas le pilotage : lui montrer le bouton
            ne ferait que le mener à un refus d'accès. */}
        {peut(user.role, "pilotage") && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dgarh/pilotage">Pilotage</Link>
          </Button>
        )}
        {redacteur && (
          <Button size="sm" onClick={() => gestion.ouvrirCreation()}>
            <Plus className="mr-1.5 h-4 w-4" /> Créer une entité
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        {
          ton: "bleu",
          /* « Que vous administrez » ne se dit que si l'on administre
             quelque chose : le ministre voit les cent cinquante et une, et
             n'en administre aucune. */
          titre: redacteur && perimetreAdmin ? "Entités que vous administrez" : "Entités",
          valeur: administrees.length,
          sousTitre: `dont ${fmtNum(creees)} créées dans l'outil`,
          icon: Network, href: "/dgarh/organigramme",
        },
        {
          ton: "cyan", titre: "Directions",
          valeur: administrees.filter((e) => ["DIRECTION", "DIRECTION_GENERALE", "CABINET"].includes(e.niveau)).length,
          sousTitre: "centrales, générales et cabinet", icon: Building2, href: "/dgarh/pilotage",
        },
        { ton: "rose", titre: "Sans responsable", valeur: sansChef, sousTitre: "personne n'y commande ni n'y inscrit", icon: UserPlus },
        { ton: "ambre", titre: "À confirmer", valeur: aVerifier, sousTitre: "provenance non établie par un texte", icon: ShieldCheck, href: "/referentiels" },
      ]} />

      <Tabs defaultValue="arborescence" className="space-y-4">
        <TabsList>
          <TabsTrigger value="arborescence">Arborescence</TabsTrigger>
          <TabsTrigger value="responsables">Qui dirige quoi</TabsTrigger>
        </TabsList>

        <TabsContent value="responsables">
          <Responsables
            lignes={responsables}
            surDesignation={redacteur
              ? (e, sortant) => gestion.ouvrirNomination(e, sortant)
              : undefined}
          />
        </TabsContent>

        <TabsContent value="arborescence">
      <TableauModule<Entite>
        titre="Arborescence"
        description="Cliquez une ligne pour la prévisualiser, la modifier ou lui nommer un responsable."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(e, t) =>
          e.sigle.toLowerCase().includes(t) || e.nom.toLowerCase().includes(t) || (e.ville ?? "").toLowerCase().includes(t)}
        placeholderRecherche="Sigle, intitulé ou ville…"
        filtres={[
          { cle: "niveau", libelle: "Tous les niveaux", options: Object.entries(NIVEAU_LABELS).map(([v, l]) => ({ valeur: v, libelle: l as string })) },
          { cle: "provenance", libelle: "Toutes provenances", options: Object.entries(PROVENANCE_LABELS).map(([v, l]) => ({ valeur: v, libelle: l as string })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={14}
      />
        </TabsContent>
      </Tabs>

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
        actions={selection && redacteur && (
          <>
            <Button variant="outline" size="sm" onClick={() => gestion.basculerActivite(selection)}>
              {selection.actif === false ? "Réactiver" : "Désactiver"}
            </Button>
            {/* « Sous-entité » n'a de sens que si le niveau en admet une :
                un bureau et un établissement sont des mailles terminales. */}
            {niveauxCreablesSous(selection.id).length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { const c = selection; setSelection(null); gestion.ouvrirCreation(c.id); }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Sous-entité
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { const c = selection; setSelection(null); gestion.ouvrirEdition(c); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
            </Button>
            {/* Désigner quand la place est vide, remplacer quand elle est
                tenue : sans le second cas, la relève n'avait plus d'entrée
                nulle part une fois toutes les têtes pourvues. */}
            <Button
              size="sm" variant={chef ? "outline" : "default"}
              onClick={() => {
                const c = selection;
                const sortant = chef
                  ? { nom: chef.nomComplet, profil: ROLE_LABELS[chef.role] ?? chef.role, agentId: chef.agentId }
                  : undefined;
                setSelection(null);
                gestion.ouvrirNomination(c, sortant);
              }}
            >
              {chef
                ? <><Repeat2 className="mr-1.5 h-3.5 w-3.5" /> Remplacer le responsable</>
                : <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Désigner le responsable</>}
            </Button>
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
              {chef ? (
                <>
                  <LigneInfo k="Nom" v={chef.nomComplet} />
                  <LigneInfo k="Rôle" v={ROLE_LABELS[chef.role]} />
                  <LigneInfo k="Identifiant" v={<span className="text-xs">{chef.email}</span>} />
                  <LigneInfo k="Compte" v={chef.actif ? "actif" : "suspendu"} />
                </>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  Personne n'est à la tête de cette entité — des agents peuvent y servir, mais
                  aucun n'y commande. Tant qu'il n'y a pas de responsable, aucun agent ne peut y
                  être inscrit et aucun profil n'y être attribué : la chaîne s'arrête ici.
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
                        <span className="tabular-nums text-xs text-muted-foreground">{fmtNum(effectifs.total.get(e.id) ?? 0)}</span>
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

      {gestion.dialogues}
    </>
  );
}
