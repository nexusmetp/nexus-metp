"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Award, ClipboardList, Plus, Users2, UserPlus } from "lucide-react";
import { useBesoins, useCampagnes, useCandidatures, useEnregistrerCampagne } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { CATEGORIES, ENTITES, REGLES_CATEGORIE, entiteById, peut } from "@/lib/referentiels";
import { CHART_COLORS, fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { BadgeCategorie, PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, Jauge, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CampagneRecrutement, Candidature, StatutCampagne, StatutCandidature } from "@/lib/types";

const STATUT_LABELS: Record<StatutCampagne, string> = {
  PREPARATION: "En préparation", OUVERTE: "Ouverte", CLOSE: "Clôturée",
  CORRECTION: "En correction", PROCLAMEE: "Résultats proclamés", ANNULEE: "Annulée",
};

const COULEUR: Record<StatutCampagne, string> = {
  PREPARATION: "bg-slate-500/12 text-slate-600 border-slate-500/20",
  OUVERTE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  CLOSE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  CORRECTION: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  PROCLAMEE: "bg-primary/12 text-primary border-primary/25",
  ANNULEE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
};

const CAND_LABELS: Record<StatutCandidature, string> = {
  DEPOSEE: "Déposée", RECEVABLE: "Recevable", IRRECEVABLE: "Irrecevable",
  ADMISSIBLE: "Admissible", ADMIS: "Admis", NON_ADMIS: "Non admis",
};

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

/** Suite ouverte à chaque statut : une campagne ne saute pas d'étape. */
const SUITES: Record<StatutCampagne, StatutCampagne[]> = {
  PREPARATION: ["OUVERTE", "ANNULEE"],
  OUVERTE: ["CLOSE", "ANNULEE"],
  CLOSE: ["CORRECTION", "ANNULEE"],
  CORRECTION: ["PROCLAMEE"],
  PROCLAMEE: [],
  ANNULEE: [],
};

const videCampagne = {
  intitule: "", categorie: "FONCTIONNAIRE", postesOuverts: "50",
  disciplines: "", dateOuverture: new Date().toISOString().slice(0, 10),
  dateCloture: "", entiteId: "",
};

export default function RecrutementPage() {
  const user = useAuth((s) => s.user)!;
  const enregistrerCampagne = useEnregistrerCampagne();
  const [formulaire, setFormulaire] = useState<typeof videCampagne | null>(null);
  const { data: campagnes = [], isLoading } = useCampagnes();
  const { data: candidatures = [] } = useCandidatures();
  const { data: besoins = [] } = useBesoins();

  const [selection, setSelection] = useState<CampagneRecrutement | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "all", annee: "all" });

  const parCampagne = useMemo(() => {
    const m = new Map<string, Candidature[]>();
    candidatures.forEach((c) => {
      const l = m.get(c.campagneId) ?? [];
      l.push(c);
      m.set(c.campagneId, l);
    });
    return m;
  }, [candidatures]);

  const stats = useMemo(() => {
    const ouvertes = campagnes.filter((c) => c.statut === "OUVERTE");
    const admis = candidatures.filter((c) => c.statut === "ADMIS").length;
    const postes = campagnes.reduce((s, c) => s + c.postesOuverts, 0);
    return {
      ouvertes: ouvertes.length,
      postes,
      candidats: candidatures.length,
      admis,
      selectivite: candidatures.length ? (admis / candidatures.length) * 100 : 0,
    };
  }, [campagnes, candidatures]);

  const lignes = useMemo(() => campagnes
    .filter((c) => filtres.statut === "all" || c.statut === filtres.statut)
    .filter((c) => filtres.annee === "all" || String(c.annee) === filtres.annee)
    .sort((a, b) => b.dateOuverture.localeCompare(a.dateOuverture)), [campagnes, filtres]);

  /* La courbe des notes dit si le concours a discriminé. */
  const distribution = useMemo(() => {
    if (!selection) return [];
    const notes = (parCampagne.get(selection.id) ?? [])
      .map((c) => c.note).filter((n): n is number => typeof n === "number");
    const tranches = [[0, 6], [6, 8], [8, 10], [10, 12], [12, 14], [14, 16], [16, 20]];
    return tranches.map(([min, max]) => ({
      nom: `${min}–${max}`,
      valeur: notes.filter((n) => n >= min && n < max).length,
    }));
  }, [selection, parCampagne]);

  const colonnes: Colonne<CampagneRecrutement>[] = [
    {
      cle: "campagne", entete: "Campagne",
      rendu: (c) => (
        <div className="min-w-0">
          <div className="font-mono text-xs font-semibold">{c.reference}</div>
          <div className="max-w-[340px] truncate text-xs text-muted-foreground" title={c.intitule}>{c.intitule}</div>
        </div>
      ),
    },
    { cle: "categorie", entete: "Catégorie", visible: "lg", rendu: (c) => <BadgeCategorie v={c.categorie} /> },
    { cle: "postes", entete: "Postes", aligne: "droite", rendu: (c) => <span className="tabular-nums text-sm font-medium">{fmtNum(c.postesOuverts)}</span> },
    {
      cle: "candidats", entete: "Candidats", aligne: "droite", visible: "md",
      rendu: (c) => <span className="tabular-nums text-sm">{fmtNum((parCampagne.get(c.id) ?? []).length)}</span>,
    },
    {
      cle: "fenetre", entete: "Dépôt", visible: "xl",
      rendu: (c) => (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmtDate(c.dateOuverture)} → {fmtDate(c.dateCloture)}
        </span>
      ),
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (c) => <Badge variant="outline" className={cn("text-[10px]", COULEUR[c.statut])}>{STATUT_LABELS[c.statut]}</Badge>,
    },
  ];

  const redacteur = peut(user.role, "recrutement", "W");
  const valide = !!formulaire && formulaire.intitule.trim().length > 10
    && Number(formulaire.postesOuverts) > 0 && !!formulaire.dateCloture;

  const ouvrir = async () => {
    if (!formulaire || !valide) return;
    const annee = new Date(formulaire.dateOuverture).getFullYear();
    const campagne: CampagneRecrutement = {
      id: `CMP-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      reference: `CON-${String(campagnes.length + 1).padStart(2, "0")}/METP-${annee}`,
      intitule: formulaire.intitule.trim(),
      annee,
      categorie: formulaire.categorie as CampagneRecrutement["categorie"],
      postesOuverts: Number(formulaire.postesOuverts),
      disciplines: formulaire.disciplines.split(",").map((d) => d.trim()).filter(Boolean),
      dateOuverture: formulaire.dateOuverture,
      dateCloture: formulaire.dateCloture,
      statut: "PREPARATION",
      entiteId: formulaire.entiteId || user.entiteId,
      besoinIds: [],
    };
    await enregistrerCampagne.mutateAsync({ campagne, utilisateur: user, creation: true });
    toast.success(`Campagne ${campagne.reference} ouverte en préparation`, {
      description: `${campagne.postesOuverts} postes — dépôt jusqu'au ${fmtDate(campagne.dateCloture)}.`,
    });
    setFormulaire(null);
    setSelection(campagne);
  };

  const avancer = async (c: CampagneRecrutement, statut: StatutCampagne) => {
    const campagne = { ...c, statut };
    await enregistrerCampagne.mutateAsync({ campagne, utilisateur: user, creation: false });
    setSelection(campagne);
    toast.success(`Campagne ${STATUT_LABELS[statut].toLowerCase()}`);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const mesCandidats = selection ? (parCampagne.get(selection.id) ?? []) : [];
  const admisSel = mesCandidats.filter((c) => c.statut === "ADMIS");

  return (
    <>
      <PageHeader
        titre="Recrutement et concours"
        description="La chaîne complète : un état de besoins justifie des postes, les postes ouvrent un concours, le concours produit des admis, et chaque nomination passe par un acte."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/besoins">États de besoins</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/postes">Tableau des emplois</Link>
        </Button>
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...videCampagne, entiteId: user.entiteId })}>
            <Plus className="mr-1.5 h-4 w-4" /> Ouvrir une campagne
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Campagnes ouvertes", valeur: stats.ouvertes, sousTitre: `${fmtNum(campagnes.length)} au total`, icon: ClipboardList },
        { ton: "bleu", titre: "Postes ouverts", valeur: stats.postes, sousTitre: "toutes campagnes confondues", icon: UserPlus, href: "/postes" },
        { ton: "violet", titre: "Candidatures", valeur: stats.candidats, sousTitre: "déposées et instruites", icon: Users2 },
        { ton: "ambre", titre: "Sélectivité", valeur: fmtPct(stats.selectivite), sousTitre: `${fmtNum(stats.admis)} admis`, icon: Award },
      ]} />

      <TableauModule<CampagneRecrutement>
        titre="Campagnes"
        description="Cliquez une campagne pour voir ses candidats et ses résultats."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(c, t) => c.reference.toLowerCase().includes(t) || c.intitule.toLowerCase().includes(t)}
        placeholderRecherche="Référence ou intitulé…"
        filtres={[
          { cle: "statut", libelle: "Tous les statuts", options: (Object.keys(STATUT_LABELS) as StatutCampagne[]).map((v) => ({ valeur: v, libelle: STATUT_LABELS[v] })) },
          { cle: "annee", libelle: "Toutes les années", options: [...new Set(campagnes.map((c) => String(c.annee)))].map((a) => ({ valeur: a, libelle: a })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={12}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.intitule ?? ""}
        sousTitre={selection ? `${selection.reference} — ${entiteById(selection.entiteId)?.nom ?? ""}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR[selection.statut])}>{STATUT_LABELS[selection.statut]}</Badge>
            <BadgeCategorie v={selection.categorie} />
          </>
        )}
        actions={selection && redacteur && SUITES[selection.statut].length > 0 && (
          <>
            {SUITES[selection.statut].map((st) => (
              <Button
                key={st} size="sm"
                variant={st === "ANNULEE" ? "outline" : "default"}
                onClick={() => avancer(selection, st)}
              >
                {STATUT_LABELS[st]}
              </Button>
            ))}
          </>
        )}
        large
      >
        {selection && (
          <>
            <Section titre="Ouverture">
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.reference}</span>} />
              <LigneInfo k="Catégorie recrutée" v={REGLES_CATEGORIE[selection.categorie].libelle} />
              <LigneInfo k="Postes ouverts" v={fmtNum(selection.postesOuverts)} />
              <LigneInfo k="Dépôt des dossiers" v={`${fmtDate(selection.dateOuverture)} → ${fmtDate(selection.dateCloture)}`} />
              {selection.dateEpreuves && <LigneInfo k="Épreuves" v={fmtDate(selection.dateEpreuves)} />}
              <LigneInfo k="Service organisateur" v={entiteById(selection.entiteId)?.nom ?? "—"} />
            </Section>

            <Section titre="Disciplines">
              <div className="flex flex-wrap gap-1.5">
                {selection.disciplines.map((d) => (
                  <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                ))}
              </div>
            </Section>

            {selection.besoinIds.length > 0 && (
              <Section titre="Justification">
                <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  Cette campagne s'appuie sur {fmtNum(selection.besoinIds.length)} états de besoins remontés
                  par les établissements et arbitrés par le bureau gestionnaire. Sans eux, les postes ouverts
                  ne reposeraient sur rien.
                </p>
                <div className="mt-2 flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/besoins">Voir les besoins</Link>
                  </Button>
                </div>
              </Section>
            )}

            <Section titre={`Candidatures — ${fmtNum(mesCandidats.length)}`}>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(CAND_LABELS) as StatutCandidature[]).map((s) => {
                  const n = mesCandidats.filter((c) => c.statut === s).length;
                  if (!n) return null;
                  return (
                    <div key={s} className="rounded-lg border p-2.5">
                      <div className="text-lg font-bold tabular-nums">{fmtNum(n)}</div>
                      <div className="text-[10px] text-muted-foreground">{CAND_LABELS[s]}</div>
                    </div>
                  );
                })}
              </div>
              {mesCandidats.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
                    <span className="text-muted-foreground">Taux de couverture des postes</span>
                    <span className="font-semibold tabular-nums">
                      {fmtNum(admisSel.length)} / {fmtNum(selection.postesOuverts)}
                    </span>
                  </div>
                  <Jauge
                    valeur={(admisSel.length / Math.max(1, selection.postesOuverts)) * 100}
                    teinte={admisSel.length >= selection.postesOuverts ? "bg-emerald-500" : "bg-amber-500"}
                  />
                </div>
              )}
            </Section>

            {distribution.some((d) => d.valeur > 0) && (
              <Section titre="Distribution des notes">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="nom" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...infobulle} formatter={(v: any) => [fmtNum(v as number), "candidats"]} />
                      <Bar dataKey="valeur" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} animationDuration={700} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            {admisSel.length > 0 && (
              <Section titre={`Liste d'admission — ${fmtNum(admisSel.length)}`}>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {admisSel.sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0)).slice(0, 40).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="w-6 shrink-0 text-right text-[11px] font-bold tabular-nums text-muted-foreground">
                          {c.rang}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium">{c.prenom} {c.nom}</div>
                          <div className="text-[10px] text-muted-foreground">{c.discipline} — {c.departement}</div>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums">{c.note}/20</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Être admis ne fait pas entrer au fichier : chaque nomination demande un acte de
                  recrutement, qui porte l'affectation et la prise de service.
                </p>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Ouvrir une campagne de recrutement"
        description="Elle démarre en préparation : les dépôts ne s'ouvrent qu'ensuite."
        surValidation={ouvrir}
        validationPossible={valide}
        libelleValidation="Ouvrir la campagne"
        large
      >
        {formulaire && (
          <>
            <ChampTexte label="Intitulé" obligatoire valeur={formulaire.intitule}
              surChangement={(v) => setFormulaire({ ...formulaire, intitule: v })}
              placeholder="Concours direct de recrutement de professeurs techniques adjoints" />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Catégorie recrutée" obligatoire valeur={formulaire.categorie}
                surChangement={(v) => setFormulaire({ ...formulaire, categorie: v })}
                options={CATEGORIES.map((c) => ({ valeur: c, libelle: REGLES_CATEGORIE[c].libelle }))} />
              <ChampTexte label="Postes ouverts" type="number" obligatoire valeur={formulaire.postesOuverts}
                surChangement={(v) => setFormulaire({ ...formulaire, postesOuverts: v })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Ouverture des dépôts" type="date" obligatoire valeur={formulaire.dateOuverture}
                surChangement={(v) => setFormulaire({ ...formulaire, dateOuverture: v })} />
              <ChampTexte label="Clôture des dépôts" type="date" obligatoire valeur={formulaire.dateCloture}
                surChangement={(v) => setFormulaire({ ...formulaire, dateCloture: v })} />
            </div>
            <ChampTexte label="Disciplines" valeur={formulaire.disciplines}
              surChangement={(v) => setFormulaire({ ...formulaire, disciplines: v })}
              placeholder="Génie civil, Électrotechnique, Informatique"
              aide="Séparées par des virgules." />
            <ChampSelect label="Service organisateur" valeur={formulaire.entiteId}
              surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
              options={ENTITES.filter((e) => ["SERVICE", "BUREAU", "DIRECTION"].includes(e.niveau))
                .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 40)}` }))} />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
