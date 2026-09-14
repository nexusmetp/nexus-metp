"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Banknote, BookOpen, GraduationCap, Plus, TrendingUp, Users2,
} from "lucide-react";
import {
  useAgentsProjetes, useEnregistrerOffre, useInscriptions, useOffresFormation,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  entiteById, peut, peutDans,
 perimetreVisible, visible,} from "@/lib/referentiels";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import { ListeActes } from "@/components/nexus/liste-actes";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, Jauge, LigneInfo,
  PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { NatureFormation, OffreFormation } from "@/lib/types";

const NATURE_LABELS: Record<NatureFormation, string> = {
  INITIALE: "Initiale", CONTINUE: "Continue", PERFECTIONNEMENT: "Perfectionnement",
  RECONVERSION: "Reconversion", CERTIFIANTE: "Certifiante",
};

const STATUT_LABELS = {
  PROGRAMMEE: "Programmée", OUVERTE: "Ouverte", COMPLETE: "Complète",
  REALISEE: "Réalisée", ANNULEE: "Annulée",
} as const;

const COULEUR: Record<keyof typeof STATUT_LABELS, string> = {
  PROGRAMMEE: "bg-slate-500/12 text-slate-600 border-slate-500/20",
  OUVERTE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  COMPLETE: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  REALISEE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  ANNULEE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
};

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n)} F CFA`;

const vide = {
  intitule: "", organisme: "", lieu: "Brazzaville",
  nature: "CONTINUE" as NatureFormation,
  dureeJours: "5", places: "20",
  dateDebut: new Date().toISOString().slice(0, 10),
  coutUnitaire: "250000", publicVise: "Personnel administratif",
};

export default function FormationPage() {
  const user = useAuth((s) => s.user)!;
  const { data: offres = [], isLoading } = useOffresFormation();
  const { data: inscriptions = [] } = useInscriptions();
  const { data: tousAgents, pret } = useAgentsProjetes();
  /* Borné au périmètre : la présence, la formation et le versement aux
     archives sont des faits de dossier, pas des informations de couloir. */
  const agents = useMemo(() => {
    const p = perimetreVisible(user);
    return tousAgents.filter((a) => visible(p, a.entiteId));
  }, [tousAgents, user]);
  const enregistrer = useEnregistrerOffre();

  const [selection, setSelection] = useState<OffreFormation | null>(null);
  const [formulaire, setFormulaire] = useState<typeof vide | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ nature: "all", statut: "all" });

  const redacteur = peutDans(user, "formations", "W") || peutDans(user, "carrieres", "W");
  const agentDe = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const parOffre = useMemo(() => {
    const m = new Map<string, typeof inscriptions>();
    inscriptions.forEach((i) => {
      const l = m.get(i.offreId) ?? [];
      l.push(i);
      m.set(i.offreId, l);
    });
    return m;
  }, [inscriptions]);

  const lignes = useMemo(() => offres
    .filter((o) => filtres.nature === "all" || o.nature === filtres.nature)
    .filter((o) => filtres.statut === "all" || o.statut === filtres.statut)
    .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)), [offres, filtres]);

  const stats = useMemo(() => {
    const suivies = inscriptions.filter((i) => i.statut === "SUIVIE");
    const acquis = suivies.filter((i) => i.resultat === "ACQUIS").length;
    const budget = offres.reduce((s, o) => {
      const n = (parOffre.get(o.id) ?? []).filter((i) => i.statut === "RETENUE" || i.statut === "SUIVIE").length;
      return s + n * o.coutUnitaire;
    }, 0);
    return {
      offres: offres.filter((o) => o.statut === "OUVERTE" || o.statut === "PROGRAMMEE").length,
      beneficiaires: new Set(inscriptions.map((i) => i.agentId)).size,
      reussite: suivies.length ? (acquis / suivies.length) * 100 : 0,
      budget,
    };
  }, [offres, inscriptions, parOffre]);

  const valide = !!formulaire && formulaire.intitule.trim().length > 8 && formulaire.organisme.trim().length > 3;

  const programmer = async () => {
    if (!formulaire || !valide) return;
    const duree = Math.max(1, Number(formulaire.dureeJours) || 1);
    const debut = new Date(formulaire.dateDebut);
    const offre: OffreFormation = {
      id: `FRM-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      reference: `PF-${String(offres.length + 1).padStart(3, "0")}/METP-${debut.getFullYear()}`,
      intitule: formulaire.intitule.trim(),
      nature: formulaire.nature,
      organisme: formulaire.organisme.trim(),
      lieu: formulaire.lieu.trim(),
      dureeJours: duree,
      places: Math.max(1, Number(formulaire.places) || 1),
      dateDebut: formulaire.dateDebut,
      dateFin: new Date(debut.getTime() + duree * 864e5).toISOString().slice(0, 10),
      coutUnitaire: Number(formulaire.coutUnitaire) || 0,
      publicVise: formulaire.publicVise,
      statut: "PROGRAMMEE",
      entiteId: user.entiteId,
    };
    await enregistrer.mutateAsync({ offre, utilisateur: user, creation: true });
    toast.success("Formation programmée", { description: `${offre.reference} — ${offre.places} places.` });
    setFormulaire(null);
    setSelection(offre);
  };

  const colonnes: Colonne<OffreFormation>[] = [
    {
      cle: "offre", entete: "Formation",
      rendu: (o) => (
        <div className="min-w-0">
          <div className="text-sm font-medium">{o.intitule}</div>
          <div className="text-[11px] text-muted-foreground">{o.organisme} — {o.lieu}</div>
        </div>
      ),
    },
    { cle: "nature", entete: "Nature", visible: "md", rendu: (o) => <Badge variant="secondary" className="text-[10px]">{NATURE_LABELS[o.nature]}</Badge> },
    {
      cle: "dates", entete: "Session", visible: "lg",
      rendu: (o) => (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmtDate(o.dateDebut)} — {o.dureeJours} j
        </span>
      ),
    },
    {
      cle: "places", entete: "Places", aligne: "droite", visible: "md",
      rendu: (o) => {
        const n = (parOffre.get(o.id) ?? []).filter((i) => i.statut !== "REFUSEE").length;
        return (
          <div className="ml-auto w-20">
            <div className="mb-1 text-right text-[11px] tabular-nums">{n} / {o.places}</div>
            <Jauge valeur={(n / Math.max(1, o.places)) * 100} teinte={n >= o.places ? "bg-amber-500" : "bg-primary"} />
          </div>
        );
      },
    },
    { cle: "cout", entete: "Coût unitaire", aligne: "droite", visible: "xl", rendu: (o) => <span className="text-xs tabular-nums">{fcfa(o.coutUnitaire)}</span> },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (o) => <Badge variant="outline" className={cn("text-[10px]", COULEUR[o.statut])}>{STATUT_LABELS[o.statut]}</Badge>,
    },
  ];

  if (isLoading || !pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const inscritsSel = selection ? (parOffre.get(selection.id) ?? []) : [];

  return (
    <>
      <PageHeader
        titre="Formation"
        description="Le catalogue, les sessions et qui y a participé. Une inscription retenue se conclut par un acte : c'est lui qui la porte au dossier de l'agent."
      >
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...vide })}>
            <Plus className="mr-1.5 h-4 w-4" /> Programmer une formation
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Sessions ouvertes", valeur: stats.offres, sousTitre: `${fmtNum(offres.length)} au catalogue`, icon: BookOpen },
        { ton: "emeraude", titre: "Agents formés", valeur: stats.beneficiaires, sousTitre: `${fmtNum(inscriptions.length)} inscriptions`, icon: Users2 },
        { ton: "bleu", titre: "Taux d'acquisition", valeur: fmtPct(stats.reussite), sousTitre: "sur les formations suivies", icon: TrendingUp },
        { ton: "ambre", titre: "Engagement budgétaire", valeur: fcfa(stats.budget), sousTitre: "places retenues et suivies", icon: Banknote },
      ]} />

      <Tabs defaultValue="catalogue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalogue">Catalogue et sessions</TabsTrigger>
          <TabsTrigger value="actes">Actes de formation</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue">
          <TableauModule<OffreFormation>
            titre="Catalogue"
            description="Cliquez une session pour voir ses inscrits et ses résultats."
            lignes={lignes}
            colonnes={colonnes}
            recherche={(o, t) =>
              o.intitule.toLowerCase().includes(t) || o.organisme.toLowerCase().includes(t)
              || o.publicVise.toLowerCase().includes(t)}
            placeholderRecherche="Intitulé, organisme, public visé…"
            filtres={[
              { cle: "nature", libelle: "Toutes natures", options: (Object.keys(NATURE_LABELS) as NatureFormation[]).map((n) => ({ valeur: n, libelle: NATURE_LABELS[n] })) },
              { cle: "statut", libelle: "Tous les statuts", options: Object.entries(STATUT_LABELS).map(([v, l]) => ({ valeur: v, libelle: l })) },
            ]}
            valeursFiltres={filtres}
            surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
            surSelection={setSelection}
            ligneActive={selection?.id}
            parPage={14}
          />
        </TabsContent>

        <TabsContent value="actes">
          <ListeActes
            titre="Actes de formation"
            description="Les décisions qui portent une formation au dossier de l'agent (§07)."
            types={["FORMATION"]}
          />
        </TabsContent>
      </Tabs>

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.intitule ?? ""}
        sousTitre={selection ? `${selection.reference} — ${selection.organisme}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR[selection.statut])}>{STATUT_LABELS[selection.statut]}</Badge>
            <Badge variant="secondary" className="text-[10px]">{NATURE_LABELS[selection.nature]}</Badge>
          </>
        )}
        large
      >
        {selection && (
          <>
            <Section titre="Session">
              <LigneInfo k="Organisme" v={selection.organisme} />
              <LigneInfo k="Lieu" v={selection.lieu} />
              <LigneInfo k="Du" v={fmtDate(selection.dateDebut)} />
              <LigneInfo k="Au" v={fmtDate(selection.dateFin)} />
              <LigneInfo k="Durée" v={`${selection.dureeJours} jours`} />
              <LigneInfo k="Public visé" v={selection.publicVise} />
              <LigneInfo k="Service organisateur" v={entiteById(selection.entiteId)?.nom ?? "—"} />
            </Section>

            <Section titre="Budget">
              <LigneInfo k="Coût par place" v={fcfa(selection.coutUnitaire)} />
              <LigneInfo k="Places offertes" v={selection.places} />
              <LigneInfo k="Engagement si complet" v={fcfa(selection.coutUnitaire * selection.places)} />
            </Section>

            <Section titre={`Inscriptions — ${fmtNum(inscritsSel.length)} sur ${selection.places} places`}>
              <Jauge
                valeur={(inscritsSel.filter((i) => i.statut !== "REFUSEE").length / Math.max(1, selection.places)) * 100}
                teinte="bg-primary"
              />
              <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {inscritsSel.slice(0, 40).map((i) => {
                  const a = agentDe.get(i.agentId);
                  return (
                    <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{a ? `${a.prenom} ${a.nom}` : i.agentId}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {entiteById(a?.entiteId)?.sigle ?? "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {i.resultat && (
                          <Badge
                            variant="outline"
                            className={cn("text-[9px]",
                              i.resultat === "ACQUIS" ? "border-emerald-500/25 text-emerald-600"
                                : i.resultat === "PARTIEL" ? "border-amber-500/25 text-amber-600"
                                : "border-rose-500/25 text-rose-600")}
                          >
                            {i.resultat === "ACQUIS" ? "acquis" : i.resultat === "PARTIEL" ? "partiel" : "non acquis"}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[9px]">{i.statut.toLowerCase()}</Badge>
                      </div>
                    </div>
                  );
                })}
                {inscritsSel.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Aucune inscription pour l'instant.</p>
                )}
              </div>
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Programmer une formation"
        description="Elle entre au catalogue en statut « programmée » ; les inscriptions s'ouvrent ensuite."
        surValidation={programmer}
        validationPossible={valide}
        libelleValidation="Programmer"
        large
      >
        {formulaire && (
          <>
            <ChampTexte label="Intitulé" obligatoire valeur={formulaire.intitule}
              surChangement={(v) => setFormulaire({ ...formulaire, intitule: v })}
              placeholder="Rédaction des actes administratifs" />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Organisme" obligatoire valeur={formulaire.organisme}
                surChangement={(v) => setFormulaire({ ...formulaire, organisme: v })}
                placeholder="ENAM Brazzaville" />
              <ChampTexte label="Lieu" valeur={formulaire.lieu}
                surChangement={(v) => setFormulaire({ ...formulaire, lieu: v })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Nature" valeur={formulaire.nature}
                surChangement={(v) => setFormulaire({ ...formulaire, nature: v as NatureFormation })}
                options={(Object.keys(NATURE_LABELS) as NatureFormation[]).map((n) => ({ valeur: n, libelle: NATURE_LABELS[n] }))} />
              <ChampSelect label="Public visé" valeur={formulaire.publicVise}
                surChangement={(v) => setFormulaire({ ...formulaire, publicVise: v })}
                options={["Enseignants techniques", "Personnel administratif", "Encadrement", "Chefs d'établissement"]
                  .map((p) => ({ valeur: p, libelle: p }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ChampTexte label="Début" type="date" valeur={formulaire.dateDebut}
                surChangement={(v) => setFormulaire({ ...formulaire, dateDebut: v })} />
              <ChampTexte label="Durée (jours)" type="number" valeur={formulaire.dureeJours}
                surChangement={(v) => setFormulaire({ ...formulaire, dureeJours: v })} />
              <ChampTexte label="Places" type="number" valeur={formulaire.places}
                surChangement={(v) => setFormulaire({ ...formulaire, places: v })} />
            </div>
            <ChampTexte label="Coût par place (F CFA)" type="number" valeur={formulaire.coutUnitaire}
              surChangement={(v) => setFormulaire({ ...formulaire, coutUnitaire: v })}
              aide="Sert à calculer l'engagement budgétaire de la session." />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
