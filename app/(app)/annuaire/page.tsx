"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AtSign, Building2, Contact, Mail, Phone, Users } from "lucide-react";
import { useAgentsProjetes, useEntites, useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, NIVEAUX_PORTEURS, POSITION_LABELS, REGLES_CATEGORIE, ROLE_LABELS,
  cheminDe, descendantsDe, entiteById, gradeById, peut, perimetreVisible, visible,
} from "@/lib/referentiels";
import { fmtNum, initiales } from "@/lib/format";
import { BadgeCategorie, BadgePosition, PageHeader } from "@/components/nexus/ui-kit";
import { Portrait } from "@/components/nexus/portrait";
import { SelecteurEntite } from "@/components/nexus/selecteur-entite";
import {
  LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgentProjete } from "@/lib/types";

export default function AnnuairePage() {
  const user = useAuth((s) => s.user)!;
  const { data: agents, pret } = useAgentsProjetes();
  const { data: comptes = [] } = useUtilisateurs();
  const { data: entitesDb = [] } = useEntites();

  const [selection, setSelection] = useState<AgentProjete | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ entite: "all", categorie: "all" });

  /* Le compte associé, s'il existe : c'est ce qui distingue « joignable dans
     l'outil » de « simplement inscrit au fichier ». */
  const compteDe = useMemo(() => {
    const m = new Map<string, typeof comptes[number]>();
    comptes.forEach((c) => { if (c.agentId) m.set(c.agentId, c); });
    return m;
  }, [comptes]);

  /* L'annuaire n'est **pas** borné au périmètre, et c'est délibéré.
     C'est le répertoire téléphonique du ministère : son objet est justement de
     joindre quelqu'un qu'on ne connaît pas et dont on ne dépend pas. Le borner
     reviendrait à le vider de son sens — un agent de Pointe-Noire ne pourrait
     plus appeler le bureau du courrier à Brazzaville.

     Ce qui l'est, en revanche : **ce que la fiche montre**. La promesse
     ci-dessus — « nom, fonction, service, ligne professionnelle, jamais la
     carrière » — n'était pas tenue. La fiche affichait le grade, la position
     administrative et l'identifiant de connexion de n'importe qui : « en
     suspension » est un fait disciplinaire, pas une ligne d'annuaire, et il
     était lisible par les trois mille huit cents agents du ministère. Hors
     périmètre, la fiche s'arrête donc à ce qu'un annuaire dit. */
  const perimetreDroit = useMemo(() => perimetreVisible(user), [user]);
  const perimetre = useMemo(
    () => (filtres.entite === "all" ? null : new Set(descendantsDe(filtres.entite).map((e) => e.id))),
    [filtres.entite, entitesDb]
  );

  const lignes = useMemo(() => agents
    .filter((a) => !perimetre || (a.entiteId && perimetre.has(a.entiteId)))
    .filter((a) => filtres.categorie === "all" || a.categorie === filtres.categorie)
    .filter((a) => a.nature === "ACTIVITE" || filtres.categorie !== "all")
    .sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom)),
    [agents, perimetre, filtres]);

  const stats = useMemo(() => ({
    joignables: agents.filter((a) => a.telephone || a.email).length,
    comptes: compteDe.size,
    entites: new Set(agents.map((a) => a.entiteId).filter(Boolean)).size,
  }), [agents, compteDe]);

  /* L'effectif par branche, pour peser chaque entité du sélecteur. */
  const effectifBranche = useMemo(() => {
    const direct = new Map<string, number>();
    agents.forEach((a) => a.entiteId && direct.set(a.entiteId, (direct.get(a.entiteId) ?? 0) + 1));
    const cache = new Map<string, number>();
    return (id: string) => {
      let n = cache.get(id);
      if (n === undefined) {
        n = descendantsDe(id).reduce((s, e) => s + (direct.get(e.id) ?? 0), 0);
        cache.set(id, n);
      }
      return n;
    };
  }, [agents]);

  const entitesFiltrables = useMemo(
    () => ENTITES.filter((e) => NIVEAUX_PORTEURS.includes(e.niveau) && e.actif !== false),
    [entitesDb]
  );

  const colonnes: Colonne<AgentProjete>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (a) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Portrait photo={a.photo} prenom={a.prenom} nom={a.nom} cle={a.matricule} taille="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{a.prenom} {a.nom}</div>
            <div className="truncate text-[11px] text-muted-foreground">{a.fonction ?? "—"}</div>
          </div>
        </div>
      ),
    },
    {
      cle: "entite", entete: "Affectation", visible: "md",
      rendu: (a) => (
        <span className="text-xs text-muted-foreground" title={entiteById(a.entiteId)?.nom}>
          {entiteById(a.entiteId)?.sigle ?? "—"}
        </span>
      ),
    },
    {
      cle: "contact", entete: "Contact", visible: "lg",
      rendu: (a) => (
        <div className="text-[11px] leading-tight">
          {a.telephone && <div className="text-muted-foreground">{a.telephone}</div>}
          {a.email && <div className="truncate text-muted-foreground">{a.email}</div>}
          {!a.telephone && !a.email && <span className="italic text-muted-foreground/60">non renseigné</span>}
        </div>
      ),
    },
    { cle: "categorie", entete: "Catégorie", visible: "xl", rendu: (a) => <BadgeCategorie v={a.categorie} /> },
    {
      cle: "compte", entete: "Accès", aligne: "droite",
      rendu: (a) => {
        const c = compteDe.get(a.id);
        return c
          ? <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[c.role]}</Badge>
          : <span className="text-[11px] text-muted-foreground/50">—</span>;
      },
    },
  ];

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const compteSel = selection ? compteDe.get(selection.id) : undefined;
  const dansMonPerimetre = !!selection && visible(perimetreDroit, selection.entiteId);
  const collegues = selection
    ? agents.filter((a) => a.entiteId === selection.entiteId && a.id !== selection.id).slice(0, 8)
    : [];

  return (
    <>
      <PageHeader
        titre="Annuaire"
        description="Trouver et joindre quelqu'un. L'annuaire lit le fichier du personnel : il n'est pas une liste tenue à part, il ne peut donc pas diverger."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/messagerie">Messagerie</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Personnes", valeur: agents.length, sousTitre: "inscrites au fichier", icon: Users, href: "/dgarh/agents" },
        { ton: "emeraude", titre: "Joignables", valeur: stats.joignables, sousTitre: "téléphone ou adresse renseignés", icon: Contact },
        { ton: "cyan", titre: "Comptes ouverts", valeur: stats.comptes, sousTitre: "accès à la plateforme", icon: AtSign },
        { ton: "violet", titre: "Implantations", valeur: stats.entites, sousTitre: "entités où quelqu'un est affecté", icon: Building2, href: "/dgarh/national" },
      ]} />

      <TableauModule<AgentProjete>
        titre="Répertoire"
        description="Cliquez une personne pour sa fiche de contact."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) =>
          a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t)
          || (a.fonction ?? "").toLowerCase().includes(t) || (a.email ?? "").toLowerCase().includes(t)
          || (a.telephone ?? "").includes(t) || a.matricule.toLowerCase().includes(t)}
        placeholderRecherche="Nom, fonction, téléphone, adresse…"
        controles={(
          <SelecteurEntite
            entites={entitesFiltrables}
            valeur={filtres.entite}
            surChangement={(v) => setFiltres((f) => ({ ...f, entite: v }))}
            effectifDe={effectifBranche}
          />
        )}
        filtres={[
          { cle: "categorie", libelle: "Toutes catégories", options: Object.entries(REGLES_CATEGORIE).map(([v, r]) => ({ valeur: v, libelle: (r as any).libelle })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={20}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection ? `${selection.prenom} ${selection.nom}` : ""}
        sousTitre={selection?.fonction ?? undefined}
        etiquette={selection && (
          <>
            <BadgeCategorie v={selection.categorie} />
            <BadgePosition v={selection.nature} />
            {compteSel && <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[compteSel.role]}</Badge>}
          </>
        )}
        actions={selection && (
          <>
            {compteSel && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/messagerie">Écrire</Link>
              </Button>
            )}
            {peut(user.role, "agents") && dansMonPerimetre && (
              <Button size="sm" asChild>
                <Link href={`/dgarh/agents/${selection.id}`}>Ouvrir le dossier</Link>
              </Button>
            )}
          </>
        )}
      >
        {selection && (
          <>
            <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
              <Portrait photo={selection.photo} prenom={selection.prenom} nom={selection.nom}
                        cle={selection.matricule} taille="lg" />
              <div className="min-w-0">
                <div className="text-base font-semibold">{selection.prenom} {selection.nom}</div>
                <div className="font-mono text-xs text-muted-foreground">{selection.matricule}</div>
                <div className="mt-1 text-xs text-muted-foreground">{entiteById(selection.entiteId)?.nom ?? "—"}</div>
              </div>
            </div>

            <Section titre="Contact">
              <LigneInfo k="Téléphone" v={selection.telephone
                ? <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{selection.telephone}</span>
                : undefined} />
              <LigneInfo k="Adresse électronique" v={selection.email
                ? <span className="inline-flex items-center gap-1.5 text-xs"><Mail className="h-3 w-3" />{selection.email}</span>
                : undefined} />
              {compteSel && dansMonPerimetre && (
                <LigneInfo k="Identifiant de connexion" v={<span className="text-xs">{compteSel.email}</span>} />
              )}
            </Section>

            <Section titre="Position dans le ministère">
              <LigneInfo k="Affectation" v={entiteById(selection.entiteId)?.nom ?? "—"} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">
                {selection.entiteId ? cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ") : "—"}
              </span>} />
              <LigneInfo k="Fonction" v={selection.fonction ?? "—"} />
              {/* Grade et position sont de la carrière, pas de l'annuaire. */}
              {dansMonPerimetre ? (
                <>
                  <LigneInfo k="Grade" v={gradeById(selection.gradeId)?.libelle ?? "hors carrière statutaire"} />
                  <LigneInfo k="Position" v={POSITION_LABELS[selection.nature]} />
                </>
              ) : (
                <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Grade et position administrative relèvent du dossier, et ce dossier
                  est tenu par une autre structure. L'annuaire s'arrête ici.
                </p>
              )}
            </Section>

            {collegues.length > 0 && (
              <Section titre={`Dans la même entité — ${collegues.length}`}>
                <div className="space-y-1">
                  {collegues.map((c) => (
                    <button
                      key={c.id} onClick={() => setSelection(c)}
                      className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <Portrait photo={c.photo} prenom={c.prenom} nom={c.nom} cle={c.matricule} taille="xs" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{c.prenom} {c.nom}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{c.fonction ?? "—"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>
    </>
  );
}
