"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2, ChevronRight, Network, Pencil, Plus, ShieldCheck, UserPlus,
} from "lucide-react";
import { useAgentsProjetes, useEntites, useUtilisateurs } from "@/lib/queries";
import {
  ENTITES, NIVEAU_LABELS, PROVENANCE_LABELS, ROLE_LABELS,
  cheminDe, descendantsDe, enfantsDe, entiteById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import {
  LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { useGestionEntite } from "@/components/nexus/gestion-entite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Entite, Utilisateur } from "@/lib/types";

export default function OrganisationPage() {
  const { data: agents, pret } = useAgentsProjetes();
  const { data: comptes = [] } = useUtilisateurs();
  const { data: entitesDb = [] } = useEntites();

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

  const responsableDe = useMemo(() => {
    const m = new Map<string, Utilisateur>();
    comptes.forEach((c) => { if (!m.has(c.entiteId)) m.set(c.entiteId, c); });
    return m;
  }, [comptes]);

  const lignes = useMemo(() => ENTITES
    .filter((e) => filtres.niveau === "all" || e.niveau === filtres.niveau)
    .filter((e) => filtres.provenance === "all" || e.provenance === filtres.provenance)
    .sort((a, b) => cheminDe(a.id).length - cheminDe(b.id).length || a.sigle.localeCompare(b.sigle)),
    [filtres, entitesDb]);

  const creees = ENTITES.filter((e) => e.creePar).length;
  const aVerifier = ENTITES.filter((e) => e.provenance === "A_VERIFIER").length;
  const sansChef = ENTITES.filter((e) => !responsableDe.has(e.id)).length;

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
        titre="Organisation"
        description="Créer une direction, la rattacher, en nommer le responsable. Une entité créée ici entre aussitôt dans le calcul des périmètres : elle décide de ce que chacun voit (§11)."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh/pilotage">Pilotage</Link>
        </Button>
        <Button size="sm" onClick={() => gestion.ouvrirCreation()}>
          <Plus className="mr-1.5 h-4 w-4" /> Créer une entité
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Entités", valeur: ENTITES.length, sousTitre: `dont ${fmtNum(creees)} créées dans l'outil`, icon: Network, href: "/dgarh/organigramme" },
        { titre: "Directions", valeur: ENTITES.filter((e) => ["DIRECTION", "DIRECTION_GENERALE", "CABINET"].includes(e.niveau)).length, sousTitre: "centrales, générales et cabinet", icon: Building2, href: "/dgarh/pilotage" },
        { titre: "Sans responsable", valeur: sansChef, sousTitre: "aucun compte rattaché", icon: UserPlus },
        { titre: "À confirmer", valeur: aVerifier, sousTitre: "provenance non établie par un texte", icon: ShieldCheck, href: "/referentiels" },
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
          { cle: "niveau", libelle: "Tous les niveaux", options: Object.entries(NIVEAU_LABELS).map(([v, l]) => ({ valeur: v, libelle: l as string })) },
          { cle: "provenance", libelle: "Toutes provenances", options: Object.entries(PROVENANCE_LABELS).map(([v, l]) => ({ valeur: v, libelle: l as string })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={14}
      />

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
            <Button variant="outline" size="sm" onClick={() => gestion.basculerActivite(selection)}>
              {selection.actif === false ? "Réactiver" : "Désactiver"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { const c = selection; setSelection(null); gestion.ouvrirCreation(c.id); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Sous-entité
            </Button>
            <Button variant="outline" size="sm" onClick={() => { const c = selection; setSelection(null); gestion.ouvrirEdition(c); }}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
            </Button>
            {!chef && (
              <Button size="sm" onClick={() => { const c = selection; setSelection(null); gestion.ouvrirNomination(c); }}>
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
              {chef ? (
                <>
                  <LigneInfo k="Nom" v={chef.nomComplet} />
                  <LigneInfo k="Rôle" v={ROLE_LABELS[chef.role]} />
                  <LigneInfo k="Identifiant" v={<span className="text-xs">{chef.email}</span>} />
                  <LigneInfo k="Compte" v={chef.actif ? "actif" : "suspendu"} />
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
