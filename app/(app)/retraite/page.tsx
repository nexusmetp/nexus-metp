"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CalendarClock, HeartHandshake, TrendingDown, UserMinus, Users } from "lucide-react";
import { useActes, useAgentsProjetes, useEntites } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, REGLES_CATEGORIE, cheminDe, descendantsDe, entiteById, gradeById,
  bornerPerimetre, perimetreVisible,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { BadgeCategorie, PageHeader } from "@/components/nexus/ui-kit";
import {
  Jauge, LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AgentProjete } from "@/lib/types";

/**
 * Âge d'ouverture des droits dans la fonction publique congolaise. Il varie
 * selon les catégories dans plusieurs textes ; celui retenu ici est l'âge
 * usuel, et il est paramétrable dans l'espace système.
 */
const AGE_DEPART = 60;
const HORIZON = 5;

const anneeDepart = (a: AgentProjete) =>
  new Date(a.dateNaissance).getFullYear() + AGE_DEPART;

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

export default function RetraitePage() {
  const user = useAuth((s) => s.user)!;
  const { data: agents, pret } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: entitesDb = [] } = useEntites();

  const [selection, setSelection] = useState<AgentProjete | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ horizon: "all", entite: "all" });

  const annee = new Date().getFullYear();

  /* Ce que ce profil a le droit de voir, quel que soit le filtre. Le filtre
     d'entité réduit à l'intérieur de cette borne ; il ne l'élargit jamais. */
  const perimetreDroit = useMemo(
    () => perimetreVisible(user),
    [user.role, user.entiteId, entitesDb]
  );

  const perimetre = useMemo(
    () => bornerPerimetre(
      perimetreDroit,
      filtres.entite === "all" ? null : new Set(descendantsDe(filtres.entite).map((e) => e.id))
    ),
    [perimetreDroit, filtres.entite, entitesDb]
  );

  /* Ceux dont le départ tombe dans l'horizon retenu, plus ceux qui l'ont
     dépassé sans acte de fin de carrière : ce sont les cas à régulariser. */
  const concernes = useMemo(() => agents
    /* Borné au périmètre de droit avant tout calcul : les tuiles comptent sur
       `concernes`, et un chef de service n'a pas à lire « 230 départs » quand
       la liste au-dessous en montre trois. */
    .filter((a) => !perimetreDroit || (a.entiteId && perimetreDroit.has(a.entiteId)))
    .filter((a) => anneeDepart(a) <= annee + HORIZON)
    .map((a) => ({
      ...a,
      annee: anneeDepart(a),
      reste: anneeDepart(a) - annee,
      acteFin: actes.find((x) => x.agentId === a.id && x.type === "FIN_CARRIERE"),
    })), [agents, actes, annee, perimetreDroit]);

  const lignes = useMemo(() => concernes
    .filter((a) => !perimetre || (a.entiteId && perimetre.has(a.entiteId)))
    .filter((a) => {
      if (filtres.horizon === "all") return true;
      if (filtres.horizon === "depasse") return a.reste < 0;
      if (filtres.horizon === "annee") return a.reste === 0;
      return a.reste > 0 && a.reste <= Number(filtres.horizon);
    })
    .sort((a, b) => a.annee - b.annee || a.nom.localeCompare(b.nom)), [concernes, perimetre, filtres]);

  /* Le dénominateur de la part doit être le même effectif que le numérateur :
     un compte borné divisé par l'effectif du ministère donnerait un taux qui
     ne décrit ni l'un ni l'autre. */
  const effectifVu = useMemo(
    () => agents.filter((a) => !perimetreDroit || (a.entiteId && perimetreDroit.has(a.entiteId))).length,
    [agents, perimetreDroit]
  );

  const stats = useMemo(() => ({
    horizon: concernes.filter((a) => a.reste >= 0).length,
    cetteAnnee: concernes.filter((a) => a.reste === 0).length,
    depasses: concernes.filter((a) => a.reste < 0 && !a.acteFin).length,
    part: effectifVu ? (concernes.filter((a) => a.reste >= 0).length / effectifVu) * 100 : 0,
  }), [concernes, effectifVu]);

  const parAnnee = useMemo(() => Array.from({ length: HORIZON + 1 }, (_, i) => {
    const an = annee + i;
    return {
      nom: String(an),
      enseignants: concernes.filter((a) => a.annee === an && a.enseignant).length,
      administratifs: concernes.filter((a) => a.annee === an && !a.enseignant).length,
    };
  }), [concernes, annee]);

  /* Les entités qui perdront le plus de monde : c'est là qu'il faut recruter.
     La maille suit le lecteur — le ministère se lit par direction, un chef de
     service par entité, faute de quoi son graphe n'aurait qu'une barre. */
  const parEntite = useMemo(() => {
    const m = new Map<string, { nom: string; nb: number }>();
    concernes.filter((a) => a.reste >= 0).forEach((a) => {
      if (!a.entiteId) return;
      const tete = perimetreDroit
        ? entiteById(a.entiteId)
        : cheminDe(a.entiteId).find((e) =>
          ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "INSPECTION_GENERALE",
           "DIRECTION_DEPARTEMENTALE"].includes(e.niveau));
      if (!tete) return;
      const cur = m.get(tete.id) ?? { nom: tete.sigle, nb: 0 };
      cur.nb++;
      m.set(tete.id, cur);
    });
    return [...m.values()].sort((a, b) => b.nb - a.nb).slice(0, 8);
  }, [concernes, perimetreDroit]);

  const colonnes: Colonne<typeof lignes[number]>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (a) => (
        <div className="min-w-0">
          <div className="text-sm font-medium">{a.prenom} {a.nom}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{a.matricule}</div>
        </div>
      ),
    },
    { cle: "age", entete: "Âge", aligne: "droite", rendu: (a) => <span className="tabular-nums text-sm">{a.age}</span> },
    {
      cle: "annee", entete: "Départ prévu", visible: "md",
      rendu: (a) => (
        <span className={cn("text-sm tabular-nums", a.reste < 0 && "font-semibold text-rose-600")}>
          {a.annee}
          {a.reste === 0 && <span className="ml-1.5 text-[10px] font-semibold text-amber-600">cette année</span>}
          {a.reste < 0 && <span className="ml-1.5 text-[10px]">dépassé</span>}
        </span>
      ),
    },
    {
      cle: "entite", entete: "Affectation", visible: "lg",
      rendu: (a) => (
        <span className="text-xs text-muted-foreground" title={entiteById(a.entiteId)?.nom}>
          {entiteById(a.entiteId)?.sigle ?? "—"}
        </span>
      ),
    },
    { cle: "categorie", entete: "Catégorie", visible: "xl", rendu: (a) => <BadgeCategorie v={a.categorie} /> },
    {
      cle: "acte", entete: "Acte de fin de carrière", aligne: "droite",
      rendu: (a) => a.acteFin
        ? <Badge variant="secondary" className="text-[10px]">ouvert</Badge>
        : a.reste < 0
          ? <Badge variant="destructive" className="text-[10px]">manquant</Badge>
          : <span className="text-[11px] text-muted-foreground/60">—</span>,
    },
  ];

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Départs à la retraite"
        description={`Qui part, quand, et d'où. L'âge retenu est ${AGE_DEPART} ans ; un départ ne se produit pas de lui-même : il demande un acte de fin de carrière.`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/besoins">États de besoins</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/recrutement">Recrutement</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: `Départs sous ${HORIZON} ans`, valeur: stats.horizon, sousTitre: `${fmtPct(stats.part)} de l'effectif`, icon: UserMinus },
        { ton: "ambre", titre: "Départs cette année", valeur: stats.cetteAnnee, sousTitre: `atteignent ${AGE_DEPART} ans en ${annee}`, icon: CalendarClock },
        { ton: "rose", titre: "Âge dépassé sans acte", valeur: stats.depasses, sousTitre: "situations à régulariser", icon: TrendingDown, href: "/dgarh/actes" },
        { ton: "cyan", titre: "Effectif concerné", valeur: concernes.length, sousTitre: "horizon et retards confondus", icon: Users },
      ]} />

      {stats.depasses > 0 && (
        <Card className="border-rose-500/30 bg-rose-500/[0.04]">
          <CardHeader className="flex flex-row items-start gap-3 pb-3">
            <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div>
              <CardTitle className="text-base">
                {fmtNum(stats.depasses)} agents ont dépassé l'âge sans acte de fin de carrière
              </CardTitle>
              <CardDescription>
                Tant que l'acte n'est pas pris, l'agent reste en activité dans le fichier et occupe son
                poste : le tableau des emplois compte un poste occupé qui devrait être vacant.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Départs prévisionnels par année</CardTitle>
            <CardDescription>Enseignants et administratifs ne se remplacent pas de la même façon.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parAnnee} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip {...infobulle} />
                <Bar dataKey="enseignants" name="Enseignants" stackId="a" fill={CHART_COLORS[0]} animationDuration={800} />
                <Bar dataKey="administratifs" name="Administratifs" stackId="a" fill={CHART_COLORS[4]} radius={[5, 5, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Où les départs pèseront</CardTitle>
            <CardDescription>Les entités à préparer en priorité.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parEntite} layout="vertical" margin={{ top: 4, right: 16, left: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="nom" width={74} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip {...infobulle} formatter={(v: any) => [fmtNum(v as number), "départs"]} />
                <Bar dataKey="nb" fill={CHART_COLORS[1]} radius={[0, 5, 5, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <TableauModule<typeof lignes[number]>
        titre="Agents concernés"
        description="Cliquez un agent pour préparer son dossier."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) => a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.toLowerCase().includes(t)}
        placeholderRecherche="Nom, prénom ou matricule…"
        filtres={[
          { cle: "horizon", libelle: "Tout l'horizon", options: [
            { valeur: "depasse", libelle: "Âge dépassé" },
            { valeur: "annee", libelle: "Cette année" },
            { valeur: "1", libelle: "Sous 1 an" },
            { valeur: "3", libelle: "Sous 3 ans" },
            { valeur: "5", libelle: "Sous 5 ans" },
          ] },
          { cle: "entite", libelle: "Toutes les entités", options: ENTITES
            .filter((e) => ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "DIRECTION_DEPARTEMENTALE", "INSPECTION_GENERALE"].includes(e.niveau))
            .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 40)}` })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection as any}
        ligneActive={selection?.id}
        parPage={18}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection ? `${selection.prenom} ${selection.nom}` : ""}
        sousTitre={selection ? `${selection.matricule} — ${entiteById(selection.entiteId)?.nom ?? ""}` : undefined}
        etiquette={selection && (
          <>
            <BadgeCategorie v={selection.categorie} />
            <Badge variant="outline" className="text-[10px]">
              départ en {anneeDepart(selection)}
            </Badge>
          </>
        )}
        actions={selection && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dgarh/agents/${selection.id}`}>Ouvrir le dossier</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dgarh/actes/nouveau">Préparer l'acte</Link>
            </Button>
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Échéance">
              <LigneInfo k="Né(e) le" v={fmtDate(selection.dateNaissance)} />
              <LigneInfo k="Âge" v={`${selection.age} ans`} />
              <LigneInfo k="Âge de départ retenu" v={`${AGE_DEPART} ans`} />
              <LigneInfo k="Année de départ" v={anneeDepart(selection)} />
              <LigneInfo k="Ancienneté" v={`${selection.anciennete} ans de service`} />
            </Section>

            <Section titre="Situation à la veille du départ">
              <LigneInfo k="Grade" v={gradeById(selection.gradeId)?.libelle ?? "hors carrière statutaire"} />
              <LigneInfo k="Échelon" v={selection.echelon ?? "—"} />
              <LigneInfo k="Indice" v={selection.indice ?? "—"} />
              <LigneInfo k="Catégorie" v={REGLES_CATEGORIE[selection.categorie].libelle} />
              <LigneInfo k="Affectation" v={entiteById(selection.entiteId)?.nom ?? "—"} />
            </Section>

            <Section titre="Complétude du dossier">
              <Jauge
                valeur={selection.tauxCompletude}
                teinte={selection.tauxCompletude >= 75 ? "bg-emerald-500" : selection.tauxCompletude >= 50 ? "bg-amber-500" : "bg-rose-500"}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {fmtPct(selection.tauxCompletude)} des pièces attendues sont présentes. Un dossier
                incomplet retarde la liquidation de la pension bien après le départ effectif.
              </p>
            </Section>

            <Section titre="Ce qu'il reste à faire">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Le départ demande un acte de fin de carrière : c'est lui qui ferme l'affectation, la
                situation et la position, et qui libère le poste au tableau des emplois. Prévoir le
                remplacement suppose de porter le poste à l'état de besoins avant qu'il ne se vide.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>
    </>
  );
}
