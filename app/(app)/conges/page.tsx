"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { CalendarCheck, CalendarDays, CalendarX, Check, Plane, Plus, X } from "lucide-react";
import { useAgentsProjetes, useConges, useEnregistrerConge, useEntites } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, POSITION_LABELS, cheminDe, descendantsDe, entiteById, peut,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { BadgePosition, PageHeader } from "@/components/nexus/ui-kit";
import { ListeActes } from "@/components/nexus/liste-actes";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, Jauge, LigneInfo,
  PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Conge, NatureConge } from "@/lib/types";

/** Droit annuel de la fonction publique, paramétrable côté système. */
const DROIT_ANNUEL = 30;

const NATURE_LABELS: Record<NatureConge, string> = {
  ANNUEL: "Congé annuel", MALADIE: "Congé de maladie", MATERNITE: "Congé de maternité",
  EXCEPTIONNEL: "Congé exceptionnel", SANS_SOLDE: "Congé sans solde",
};

const STATUT_LABELS = {
  DEMANDE: "Demandé", ACCORDE: "Accordé", REFUSE: "Refusé", PRIS: "Pris",
} as const;

const COULEUR: Record<keyof typeof STATUT_LABELS, string> = {
  DEMANDE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  ACCORDE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  REFUSE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
  PRIS: "bg-slate-500/12 text-slate-600 border-slate-500/20",
};

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

const videConge = {
  agentId: "", nature: "ANNUEL" as NatureConge,
  dateDebut: new Date().toISOString().slice(0, 10), dateFin: "", motif: "",
};

export default function CongesPage() {
  const user = useAuth((s) => s.user)!;
  const enregistrer = useEnregistrerConge();
  const [formulaire, setFormulaire] = useState<typeof videConge | null>(null);
  const { data: conges = [], isLoading } = useConges();
  const { data: agents, pret } = useAgentsProjetes();
  const { data: entitesDb = [] } = useEntites();

  const [selection, setSelection] = useState<Conge | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ nature: "all", statut: "all", entite: "all" });

  const agentDe = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const perimetre = useMemo(
    () => (filtres.entite === "all" ? null : new Set(descendantsDe(filtres.entite).map((e) => e.id))),
    [filtres.entite, entitesDb]
  );

  const lignes = useMemo(() => conges
    .filter((c) => filtres.nature === "all" || c.nature === filtres.nature)
    .filter((c) => filtres.statut === "all" || c.statut === filtres.statut)
    .filter((c) => {
      if (!perimetre) return true;
      const a = agentDe.get(c.agentId);
      return !!a?.entiteId && perimetre.has(a.entiteId);
    })
    .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)), [conges, filtres, perimetre, agentDe]);

  const stats = useMemo(() => {
    const annuels = conges.filter((c) => c.nature === "ANNUEL" && (c.statut === "PRIS" || c.statut === "ACCORDE"));
    const joursPris = annuels.reduce((s, c) => s + c.jours, 0);
    const beneficiaires = new Set(annuels.map((c) => c.agentId)).size;
    const droitTotal = agents.length * DROIT_ANNUEL;
    return {
      enCours: conges.filter((c) => c.statut === "ACCORDE" || c.statut === "DEMANDE").length,
      demandes: conges.filter((c) => c.statut === "DEMANDE").length,
      joursPris,
      taux: droitTotal ? (joursPris / droitTotal) * 100 : 0,
      beneficiaires,
      absents: agents.filter((a) => a.nature !== "ACTIVITE").length,
    };
  }, [conges, agents]);

  /* Le solde de chacun : le droit annuel moins ce qui est pris ou accordé. */
  const soldes = useMemo(() => {
    const m = new Map<string, number>();
    conges
      .filter((c) => c.nature === "ANNUEL" && c.exercice === 2026 && (c.statut === "PRIS" || c.statut === "ACCORDE"))
      .forEach((c) => m.set(c.agentId, (m.get(c.agentId) ?? 0) + c.jours));
    return m;
  }, [conges]);

  const monSolde = DROIT_ANNUEL - (user.agentId ? soldes.get(user.agentId) ?? 0 : 0);

  /* Le planning : combien d'agents absents chaque mois. Les creux et les pics
     se voient, et c'est ce qui permet d'étaler. */
  const planning = useMemo(() => MOIS.map((nom, i) => ({
    nom,
    agents: conges.filter((c) => {
      if (c.statut === "REFUSE") return false;
      const d = new Date(c.dateDebut).getMonth();
      const f = new Date(c.dateFin).getMonth();
      return i >= d && i <= f;
    }).length,
  })), [conges]);

  const colonnes: Colonne<Conge>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (c) => {
        const a = agentDe.get(c.agentId);
        return (
          <div className="min-w-0">
            <div className="text-sm font-medium">{a ? `${a.prenom} ${a.nom}` : "—"}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{a?.matricule ?? c.agentId}</div>
          </div>
        );
      },
    },
    {
      cle: "nature", entete: "Nature", visible: "md",
      rendu: (c) => <Badge variant="secondary" className="text-[10px]">{NATURE_LABELS[c.nature]}</Badge>,
    },
    {
      cle: "periode", entete: "Période", visible: "lg",
      rendu: (c) => (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmtDate(c.dateDebut)} → {fmtDate(c.dateFin)}
        </span>
      ),
    },
    { cle: "jours", entete: "Jours", aligne: "droite", rendu: (c) => <span className="tabular-nums text-sm font-medium">{c.jours}</span> },
    {
      cle: "entite", entete: "Entité", visible: "xl",
      rendu: (c) => {
        const a = agentDe.get(c.agentId);
        return <span className="text-xs text-muted-foreground">{entiteById(a?.entiteId)?.sigle ?? "—"}</span>;
      },
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (c) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR[c.statut])}>{STATUT_LABELS[c.statut]}</Badge>
      ),
    },
  ];

  const instructeur = peut(user.role, "conges", "W") || peut(user.role, "actes", "W");

  const joursEntre = (a: string, b: string) =>
    a && b && b >= a ? Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5) + 1 : 0;

  const valide = !!formulaire && !!formulaire.agentId
    && joursEntre(formulaire.dateDebut, formulaire.dateFin) > 0;

  const demander = async () => {
    if (!formulaire || !valide) return;
    const jours = joursEntre(formulaire.dateDebut, formulaire.dateFin);
    const conge: Conge = {
      id: `CNG-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      agentId: formulaire.agentId,
      nature: formulaire.nature,
      dateDebut: formulaire.dateDebut,
      dateFin: formulaire.dateFin,
      jours,
      exercice: new Date(formulaire.dateDebut).getFullYear(),
      statut: "DEMANDE",
      acteId: null,
      motif: formulaire.motif.trim() || undefined,
    };
    await enregistrer.mutateAsync({ conge, utilisateur: user, creation: true });
    const a = agentDe.get(conge.agentId);
    toast.success("Demande enregistrée", {
      description: `${a ? a.prenom + " " + a.nom : ""} — ${jours} jours, en attente d'accord.`,
    });
    setFormulaire(null);
    setSelection(conge);
  };

  /* Accorder n'est pas prendre : le congé devient effectif à la date de
     début, et c'est un acte qui le porte au dossier. */
  const statuer = async (c: Conge, statut: Conge["statut"]) => {
    const conge = { ...c, statut };
    await enregistrer.mutateAsync({ conge, utilisateur: user, creation: false });
    setSelection(conge);
    toast.success(`Congé ${STATUT_LABELS[statut].toLowerCase()}`, {
      description: statut === "ACCORDE"
        ? "Reste à ouvrir l'acte qui le portera au dossier de l'agent."
        : undefined,
    });
  };

  if (isLoading || !pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const agentSel = selection ? agentDe.get(selection.agentId) : undefined;
  const prisParAgentSel = selection ? soldes.get(selection.agentId) ?? 0 : 0;

  return (
    <>
      <PageHeader
        titre="Congés et positions"
        description="Le solde et le planning ne se déduisent pas d'un acte isolé : ils se tiennent ici. La décision, elle, reste portée par un acte (§05)."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/mon-dossier">Mon dossier</Link>
        </Button>
        <Button size="sm" onClick={() => setFormulaire({
          ...videConge, agentId: user.agentId ?? agents[0]?.id ?? "",
        })}>
          <Plus className="mr-1.5 h-4 w-4" /> Demander un congé
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Congés en cours", valeur: stats.enCours, sousTitre: `${fmtNum(stats.demandes)} demandes à instruire`, icon: Plane },
        { titre: "Jours annuels consommés", valeur: stats.joursPris, sousTitre: `${fmtPct(stats.taux)} du droit ouvert`, icon: CalendarCheck },
        { titre: "Agents hors activité", valeur: stats.absents, sousTitre: "détachement, disponibilité, suspension", icon: CalendarX },
        { titre: "Votre solde", valeur: `${monSolde} j`, sousTitre: `sur ${DROIT_ANNUEL} jours de droit annuel`, icon: CalendarDays, href: "/mon-dossier" },
      ]} />

      <Tabs defaultValue="registre" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registre">Registre des congés</TabsTrigger>
          <TabsTrigger value="planning">Planning annuel</TabsTrigger>
          <TabsTrigger value="actes">Actes et positions</TabsTrigger>
        </TabsList>

        <TabsContent value="registre">
          <TableauModule<Conge>
            titre="Congés"
            description="Cliquez une ligne pour voir le solde de l'agent."
            lignes={lignes}
            colonnes={colonnes}
            recherche={(c, t) => {
              const a = agentDe.get(c.agentId);
              return !!a && (a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.toLowerCase().includes(t));
            }}
            placeholderRecherche="Nom, prénom ou matricule…"
            filtres={[
              { cle: "nature", libelle: "Toutes natures", options: (Object.keys(NATURE_LABELS) as NatureConge[]).map((n) => ({ valeur: n, libelle: NATURE_LABELS[n] })) },
              { cle: "statut", libelle: "Tous les statuts", options: Object.entries(STATUT_LABELS).map(([v, l]) => ({ valeur: v, libelle: l })) },
              { cle: "entite", libelle: "Toutes les entités", options: ENTITES
                .filter((e) => ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "DIRECTION_DEPARTEMENTALE", "SERVICE", "BUREAU"].includes(e.niveau))
                .slice(0, 70).map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 38)}` })) },
            ]}
            valeursFiltres={filtres}
            surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
            surSelection={setSelection}
            ligneActive={selection?.id}
            parPage={18}
          />
        </TabsContent>

        <TabsContent value="planning">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Agents absents par mois</CardTitle>
              <CardDescription>
                Les pics disent où le service se dégarnit. C'est ce qui permet d'étaler les départs
                plutôt que de les subir.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planning} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip {...infobulle} formatter={(v: any) => [fmtNum(v as number), "agents"]} />
                  <Bar dataKey="agents" fill={CHART_COLORS[0]} radius={[5, 5, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actes">
          <ListeActes
            titre="Congés et positions administratives"
            description="Les actes qui portent les mises en congé et les changements de position (§07)."
            types={["CONGE", "POSITION"]}
          />
        </TabsContent>
      </Tabs>

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={agentSel ? `${agentSel.prenom} ${agentSel.nom}` : ""}
        sousTitre={selection ? `${NATURE_LABELS[selection.nature]} — ${selection.jours} jours` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR[selection.statut])}>
              {STATUT_LABELS[selection.statut]}
            </Badge>
            {agentSel && <BadgePosition v={agentSel.nature} />}
          </>
        )}
        actions={selection && (
          <>
            {instructeur && selection.statut === "DEMANDE" && (
              <>
                <Button variant="outline" size="sm" onClick={() => statuer(selection, "REFUSE")}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Refuser
                </Button>
                <Button size="sm" onClick={() => statuer(selection, "ACCORDE")}>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Accorder
                </Button>
              </>
            )}
            {instructeur && selection.statut === "ACCORDE" && (
              <Button variant="outline" size="sm" onClick={() => statuer(selection, "PRIS")}>
                Marquer pris
              </Button>
            )}
            {agentSel && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dgarh/agents/${agentSel.id}`}>Ouvrir le dossier</Link>
              </Button>
            )}
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Congé">
              <LigneInfo k="Nature" v={NATURE_LABELS[selection.nature]} />
              <LigneInfo k="Du" v={fmtDate(selection.dateDebut)} />
              <LigneInfo k="Au" v={fmtDate(selection.dateFin)} />
              <LigneInfo k="Durée" v={`${selection.jours} jours`} />
              <LigneInfo k="Exercice d'imputation" v={selection.exercice} />
              {selection.motif && <LigneInfo k="Motif" v={selection.motif} />}
              <LigneInfo k="Acte de référence" v={selection.acteId
                ? <Link href={`/dgarh/actes/${selection.acteId}`} className="text-xs text-primary hover:underline">ouvrir l'acte</Link>
                : <span className="text-xs italic text-muted-foreground">aucun — anomalie</span>} />
            </Section>

            {agentSel && (
              <>
                <Section titre={`Solde ${selection.exercice}`}>
                  <div className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Consommé</span>
                    <span className="font-semibold tabular-nums">
                      {prisParAgentSel} / {DROIT_ANNUEL} jours
                    </span>
                  </div>
                  <Jauge
                    valeur={(prisParAgentSel / DROIT_ANNUEL) * 100}
                    teinte={prisParAgentSel > DROIT_ANNUEL ? "bg-rose-500" : prisParAgentSel > DROIT_ANNUEL * 0.75 ? "bg-amber-500" : "bg-emerald-500"}
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {prisParAgentSel > DROIT_ANNUEL
                      ? `Dépassement de ${prisParAgentSel - DROIT_ANNUEL} jours sur le droit annuel.`
                      : `Reste ${DROIT_ANNUEL - prisParAgentSel} jours à prendre avant la fin de l'exercice.`}
                  </p>
                </Section>

                <Section titre="Situation de l'agent">
                  <LigneInfo k="Affectation" v={entiteById(agentSel.entiteId)?.nom ?? "—"} />
                  <LigneInfo k="Chaîne" v={<span className="text-[11px]">
                    {agentSel.entiteId ? cheminDe(agentSel.entiteId).map((e) => e.sigle).join(" › ") : "—"}
                  </span>} />
                  <LigneInfo k="Position en vigueur" v={POSITION_LABELS[agentSel.nature]} />
                </Section>
              </>
            )}
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Demander un congé"
        description="La demande est enregistrée en attente d'accord. Accorder ne suffit pas : un acte porte la décision au dossier."
        surValidation={demander}
        validationPossible={valide}
        libelleValidation="Enregistrer la demande"
        large
      >
        {formulaire && (
          <>
            <ChampSelect label="Agent" obligatoire valeur={formulaire.agentId}
              surChangement={(v) => setFormulaire({ ...formulaire, agentId: v })}
              options={agents.slice(0, 400).map((a) => ({
                valeur: a.id, libelle: `${a.prenom} ${a.nom} — ${a.matricule}`,
              }))} />
            <ChampSelect label="Nature" obligatoire valeur={formulaire.nature}
              surChangement={(v) => setFormulaire({ ...formulaire, nature: v as NatureConge })}
              options={(Object.keys(NATURE_LABELS) as NatureConge[]).map((n) => ({ valeur: n, libelle: NATURE_LABELS[n] }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Du" type="date" obligatoire valeur={formulaire.dateDebut}
                surChangement={(v) => setFormulaire({ ...formulaire, dateDebut: v })} />
              <ChampTexte label="Au" type="date" obligatoire valeur={formulaire.dateFin}
                surChangement={(v) => setFormulaire({ ...formulaire, dateFin: v })} />
            </div>
            {formulaire.dateFin && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                <span className="font-semibold">{joursEntre(formulaire.dateDebut, formulaire.dateFin)} jours</span>
                {formulaire.nature === "ANNUEL" && formulaire.agentId && (
                  <span className="text-muted-foreground">
                    {" "}— solde après accord :{" "}
                    {DROIT_ANNUEL - (soldes.get(formulaire.agentId) ?? 0) - joursEntre(formulaire.dateDebut, formulaire.dateFin)} jours
                  </span>
                )}
              </div>
            )}
            <ChampZone label="Motif" lignes={2} valeur={formulaire.motif}
              surChangement={(v) => setFormulaire({ ...formulaire, motif: v })}
              placeholder="Facultatif pour un congé annuel ; attendu pour un congé exceptionnel." />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
