"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Briefcase, Plus, ShieldCheck, Snowflake, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useAgentsProjetes, useEnregistrerPoste, useEntites, usePostes } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, GRADES, NIVEAU_LABELS, bornerPerimetre, cheminDe, descendantsDe, entiteById,
  gradeById, perimetreVisible, peut, peutDans,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtNum, fmtPct } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, Jauge, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { MentionAttribution } from "@/components/nexus/mention-attribution";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Poste, StatutPoste } from "@/lib/types";

const STATUT_LABELS: Record<StatutPoste, string> = {
  OCCUPE: "Occupé", VACANT: "Vacant", GELE: "Gelé",
};

const COULEUR: Record<StatutPoste, string> = {
  OCCUPE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  VACANT: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  GELE: "bg-slate-500/12 text-slate-600 border-slate-500/20",
};

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

const videPoste = {
  intitule: "", entiteId: "", gradeRequisId: "", budgetise: true,
};

export default function TableauDesEmploisPage() {
  const user = useAuth((s) => s.user)!;
  const { data: postes = [], isLoading } = usePostes();
  const { data: agents, pret } = useAgentsProjetes();
  const { data: entitesDb = [] } = useEntites();
  const enregistrer = useEnregistrerPoste();

  const redacteur = peutDans(user, "postes", "W");
  const [selection, setSelection] = useState<Poste | null>(null);
  const [formulaire, setFormulaire] = useState<typeof videPoste | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "all", entite: "all", budget: "all" });

  /* Qui occupe quoi : le poste ne porte pas l'agent, c'est l'affectation. */
  const occupantDe = useMemo(() => {
    const m = new Map<string, string>();
    agents.forEach((a) => {
      const poste = (a as any).affectation?.posteId;
      if (poste) m.set(poste, `${a.prenom} ${a.nom}`);
    });
    return m;
  }, [agents]);

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

  const lignes = useMemo(() => postes
    .filter((p) => filtres.statut === "all" || p.statut === filtres.statut)
    .filter((p) => !perimetre || perimetre.has(p.entiteId))
    .filter((p) => filtres.budget === "all" || (filtres.budget === "oui" ? p.budgetise : !p.budgetise))
    .sort((a, b) => a.code.localeCompare(b.code)), [postes, filtres, perimetre]);

  const stats = useMemo(() => {
    const dans = perimetre ? postes.filter((p) => perimetre.has(p.entiteId)) : postes;
    const occupes = dans.filter((p) => p.statut === "OCCUPE").length;
    const vacants = dans.filter((p) => p.statut === "VACANT").length;
    const geles = dans.filter((p) => p.statut === "GELE").length;
    return {
      total: dans.length, occupes, vacants, geles,
      budgetises: dans.filter((p) => p.budgetise).length,
      taux: dans.length ? (occupes / dans.length) * 100 : 0,
    };
  }, [postes, perimetre]);

  /* Le graphe qui compte : où sont les emplois vides.
     Il se regroupe à l'échelle de celui qui regarde. Le ministère se lit par
     direction ; un chef de service dont tous les emplois tiennent dans une
     seule direction n'y lirait qu'une barre — on descend alors à l'entité
     qui porte le poste, qui est la maille où il peut agir. */
  const parEntite = useMemo(() => {
    const m = new Map<string, { nom: string; occupe: number; vacant: number; gele: number }>();
    const dansLeChamp = perimetreDroit ? postes.filter((p) => perimetreDroit.has(p.entiteId)) : postes;
    dansLeChamp.forEach((p) => {
      const chaine = cheminDe(p.entiteId);
      const tete = perimetreDroit
        ? entiteById(p.entiteId)
        : chaine.find((e) =>
          ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "INSPECTION_GENERALE",
           "DIRECTION_DEPARTEMENTALE", "INSPECTION_INTERDEPARTEMENTALE"].includes(e.niveau));
      if (!tete) return;
      const cur = m.get(tete.id) ?? { nom: tete.sigle, occupe: 0, vacant: 0, gele: 0 };
      if (p.statut === "OCCUPE") cur.occupe++;
      else if (p.statut === "VACANT") cur.vacant++;
      else cur.gele++;
      m.set(tete.id, cur);
    });
    return [...m.values()]
      .sort((a, b) => (b.vacant + b.gele) - (a.vacant + a.gele))
      .slice(0, 10);
  }, [postes, perimetreDroit]);

  const entitesPorteuses = useMemo(() => ENTITES.filter((e) =>
    (!perimetreDroit || perimetreDroit.has(e.id))
    && postes.some((p) => descendantsDe(e.id).some((x) => x.id === p.entiteId))
    && ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "INSPECTION_GENERALE",
        "DIRECTION_DEPARTEMENTALE", "INSPECTION_INTERDEPARTEMENTALE", "SERVICE", "BUREAU", "ETABLISSEMENT"].includes(e.niveau)),
    [postes, entitesDb, perimetreDroit]);

  const colonnes: Colonne<Poste>[] = [
    {
      cle: "poste", entete: "Poste",
      rendu: (p) => (
        <div className="min-w-0">
          <div className="font-mono text-xs font-semibold">{p.code}</div>
          <div className="max-w-[300px] truncate text-xs text-muted-foreground" title={p.intitule}>{p.intitule}</div>
        </div>
      ),
    },
    {
      cle: "entite", entete: "Entité", visible: "md",
      rendu: (p) => (
        <span className="text-xs text-muted-foreground" title={entiteById(p.entiteId)?.nom}>
          {entiteById(p.entiteId)?.sigle ?? "—"}
        </span>
      ),
    },
    {
      cle: "grade", entete: "Grade requis", visible: "lg",
      rendu: (p) => <span className="text-xs">{gradeById(p.gradeRequisId)?.libelle ?? "—"}</span>,
    },
    {
      cle: "occupant", entete: "Occupant", visible: "xl",
      rendu: (p) => {
        const nom = occupantDe.get(p.id);
        return nom
          ? <span className="text-xs">{nom}</span>
          : <span className="text-xs italic text-muted-foreground">—</span>;
      },
    },
    {
      cle: "budget", entete: "Budget", aligne: "droite", visible: "lg",
      rendu: (p) => (
        <Badge variant="outline" className="text-[10px]">
          {p.budgetise ? "budgétisé" : "non budgétisé"}
        </Badge>
      ),
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (p) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR[p.statut])}>
          {STATUT_LABELS[p.statut]}
        </Badge>
      ),
    },
  ];

  const valide = !!formulaire && formulaire.intitule.trim().length > 4 && !!formulaire.entiteId;

  const creer = async () => {
    if (!formulaire || !valide) return;
    const ent = entiteById(formulaire.entiteId);
    const poste: Poste = {
      id: `PST-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      code: `${ent?.sigle ?? "ENT"}-${String(postes.length + 1).padStart(3, "0")}`,
      intitule: formulaire.intitule.trim(),
      entiteId: formulaire.entiteId,
      gradeRequisId: formulaire.gradeRequisId || GRADES[0].id,
      // Un poste naît vacant : on ouvre un emploi, on ne nomme pas quelqu'un.
      statut: formulaire.budgetise ? "VACANT" : "GELE",
      budgetise: formulaire.budgetise,
    };
    await enregistrer.mutateAsync({ poste, utilisateur: user, creation: true });
    toast.success(`Emploi ${poste.code} créé`, {
      description: poste.budgetise
        ? "Il est vacant : il se pourvoit par mutation ou par recrutement."
        : "Il est gelé faute d'inscription budgétaire.",
    });
    setFormulaire(null);
    setSelection(poste);
  };

  const basculerGel = async (p: Poste) => {
    if (p.statut === "OCCUPE") return;
    const poste: Poste = p.statut === "GELE"
      ? { ...p, statut: "VACANT", budgetise: true }
      : { ...p, statut: "GELE", budgetise: false };
    await enregistrer.mutateAsync({ poste, utilisateur: user, creation: false });
    setSelection(poste);
    toast.success(poste.statut === "GELE" ? "Emploi gelé" : "Emploi dégelé", {
      description: poste.statut === "GELE"
        ? "Il reste au tableau des emplois mais n'est plus pourvoyable."
        : "Il redevient pourvoyable et compte au budget.",
    });
  };

  if (isLoading || !pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Tableau des emplois"
        description="Le poste existe avant l'agent qui l'occupe (§03). Un poste vacant appelle un recrutement ; un poste gelé explique qu'un besoin reste sans suite."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/besoins">États de besoins</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/recrutement">Recrutement</Link>
        </Button>
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...videPoste, entiteId: user.entiteId })}>
            <Plus className="mr-1.5 h-4 w-4" /> Créer un emploi
          </Button>
        )}
      </PageHeader>

      <MentionAttribution utilisateur={user} module="postes" />

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Emplois", valeur: stats.total, sousTitre: `${fmtNum(stats.budgetises)} budgétisés`, icon: Briefcase },
        { ton: "emeraude", titre: "Occupés", valeur: stats.occupes, sousTitre: `taux d'occupation ${fmtPct(stats.taux)}`, icon: UserCheck },
        { ton: "ambre", titre: "Vacants", valeur: stats.vacants, sousTitre: "à pourvoir par recrutement ou mutation", icon: UserX, href: "/recrutement" },
        { ton: "ardoise", titre: "Gelés", valeur: stats.geles, sousTitre: "hors budget, non pourvoyables", icon: Snowflake },
      ]} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Où sont les emplois vides</CardTitle>
          <CardDescription>Les entités qui cumulent le plus de postes vacants et gelés.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parEntite} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...infobulle} />
              <Bar dataKey="occupe" name="Occupés" stackId="a" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} animationDuration={800} />
              <Bar dataKey="vacant" name="Vacants" stackId="a" fill={CHART_COLORS[4]} radius={[0, 0, 0, 0]} animationDuration={800} />
              <Bar dataKey="gele" name="Gelés" stackId="a" fill="#8D99AE" radius={[5, 5, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <TableauModule<Poste>
        titre="Emplois"
        description="Cliquez un poste pour voir sa fiche."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(p, t) =>
          p.code.toLowerCase().includes(t) || p.intitule.toLowerCase().includes(t)
          || (occupantDe.get(p.id) ?? "").toLowerCase().includes(t)}
        placeholderRecherche="Code, intitulé ou occupant…"
        filtres={[
          { cle: "statut", libelle: "Tous les statuts", options: (Object.keys(STATUT_LABELS) as StatutPoste[]).map((v) => ({ valeur: v, libelle: STATUT_LABELS[v] })) },
          { cle: "entite", libelle: "Toutes les entités", options: entitesPorteuses.slice(0, 80).map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 40)}` })) },
          { cle: "budget", libelle: "Budgétisés ou non", options: [{ valeur: "oui", libelle: "Budgétisés" }, { valeur: "non", libelle: "Non budgétisés" }] },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={18}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.intitule ?? ""}
        sousTitre={selection ? `${selection.code} — ${entiteById(selection.entiteId)?.nom ?? ""}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR[selection.statut])}>
              {STATUT_LABELS[selection.statut]}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {selection.budgetise ? "budgétisé" : "non budgétisé"}
            </Badge>
          </>
        )}
        actions={selection && (
          <>
            {redacteur && selection.statut !== "OCCUPE" && (
              <Button variant="outline" size="sm" onClick={() => basculerGel(selection)}>
                <Snowflake className="mr-1.5 h-3.5 w-3.5" />
                {selection.statut === "GELE" ? "Dégeler" : "Geler"}
              </Button>
            )}
            {selection.statut === "VACANT" && (
              <Button size="sm" asChild>
                <Link href="/recrutement">Ouvrir un recrutement</Link>
              </Button>
            )}
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Emploi">
              <LigneInfo k="Code" v={<span className="font-mono text-xs">{selection.code}</span>} />
              <LigneInfo k="Intitulé" v={selection.intitule} />
              <LigneInfo k="Grade requis" v={gradeById(selection.gradeRequisId)?.libelle ?? "—"} />
              <LigneInfo k="Statut" v={STATUT_LABELS[selection.statut]} />
              <LigneInfo k="Inscription budgétaire" v={selection.budgetise ? "oui" : "non"} />
            </Section>

            <Section titre="Rattachement">
              <LigneInfo k="Entité" v={entiteById(selection.entiteId)?.nom ?? "—"} />
              <LigneInfo k="Niveau" v={NIVEAU_LABELS[entiteById(selection.entiteId)?.niveau ?? "BUREAU"]} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">{cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ")}</span>} />
            </Section>

            <Section titre="Occupation">
              {occupantDe.get(selection.id) ? (
                <LigneInfo k="Occupé par" v={occupantDe.get(selection.id)} />
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
                  {selection.statut === "GELE"
                    ? "Poste gelé : il figure au tableau des emplois mais n'est pas pourvoyable tant qu'il n'est pas inscrit au budget."
                    : "Poste vacant. Il se pourvoit par mutation d'un agent en place, ou par un recrutement — dans les deux cas, un acte porte la décision."}
                </p>
              )}
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Créer un emploi"
        description="Un emploi naît vacant : il ouvre une place, il ne nomme personne."
        surValidation={creer}
        validationPossible={valide}
        libelleValidation="Créer l'emploi"
        large
      >
        {formulaire && (
          <>
            <ChampTexte label="Intitulé" obligatoire valeur={formulaire.intitule}
              surChangement={(v) => setFormulaire({ ...formulaire, intitule: v })}
              placeholder="Enseignant — Génie civil" />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Entité" obligatoire valeur={formulaire.entiteId}
                surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
                options={ENTITES.filter((e) => e.actif !== false)
                  .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))} />
              <ChampSelect label="Grade requis" valeur={formulaire.gradeRequisId}
                surChangement={(v) => setFormulaire({ ...formulaire, gradeRequisId: v })}
                options={GRADES.map((g) => ({ valeur: g.id, libelle: g.libelle }))}
                aide="Il conditionne qui peut être nommé sur cet emploi." />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Inscrit au budget</div>
                <p className="text-[11px] text-muted-foreground">
                  Sans inscription budgétaire, l'emploi est créé gelé : il figure au tableau mais
                  n'est pas pourvoyable.
                </p>
              </div>
              <input type="checkbox" className="h-4 w-4 accent-primary"
                checked={formulaire.budgetise}
                onChange={(e) => setFormulaire({ ...formulaire, budgetise: e.target.checked })} />
            </label>
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
