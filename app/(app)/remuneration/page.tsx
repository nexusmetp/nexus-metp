"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, CircleHelp, Coins, Users2 } from "lucide-react";
import {
  useAgentsProjetes, useEnregistrerRemuneration, useMajParametres, useParametres,
  useRemunerations,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  CATEGORIES_CONTRACTUELLES, DEVISE, NATURE_REMUNERATION_LABELS, REGLES_CATEGORIE,
  VALEUR_DU_POINT, entiteById, estComplet, horsGrille, montantOuMention,
  perimetreVisible, peut, peutDans,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { BadgeCategorie, BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi, TableauModule, type Colonne } from "@/components/nexus/module";
import { MentionAttribution } from "@/components/nexus/mention-attribution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NatureRemuneration, RemunerationContractuelle } from "@/lib/types";
import { parCategorie, parEntite, total, type Regroupement } from "./agregats";
import {
  FormulaireRemuneration, FormulaireValeurPoint, type SaisiePoint, type SaisieRemu,
} from "./formulaires";

/* ------------------------------------------------------------------ */
/* Rémunération et masse salariale                                     */
/*                                                                     */
/* Le module est complet, le chiffre ne l'est pas — et c'est exprès.   */
/* Tant que la valeur du point n'est pas renseignée par la DGARH,       */
/* aucun montant statutaire ne s'affiche. Un total partiel présenté     */
/* comme un total serait le pire service à rendre à un ministre.        */
/* ------------------------------------------------------------------ */

const AUJOURDHUI = "2026-09-10";

const videRemu: SaisieRemu = {
  agentId: "",
  nature: "MENSUELLE" as NatureRemuneration,
  montant: "",
  quantite: "",
  dateDebut: AUJOURDHUI,
  reference: "",
  observations: "",
};

export default function RemunerationPage() {
  const user = useAuth((s) => s.user)!;
  const redacteur = peutDans(user, "remuneration", "W");
  const { data: tousAgents, pret } = useAgentsProjetes();
  const { data: remunerations = [], isLoading } = useRemunerations();
  const { data: parametres } = useParametres();
  const enregistrer = useEnregistrerRemuneration();
  const majParametres = useMajParametres();

  const [formulaire, setFormulaire] = useState<SaisieRemu | null>(null);
  const [saisiePoint, setSaisiePoint] = useState<SaisiePoint | null>(null);

  const valeurPoint = parametres?.valeurPoint ?? null;

  /* La masse salariale se lit à l'échelle où l'on décide. Le ministère pour
     qui en répond ; sa direction pour un directeur central — lui montrer la
     masse du ministère au-dessus d'une liste bornée à sa direction ne lui
     donnerait ni le chiffre de l'un, ni celui de l'autre. */
  const perimetreDroit = useMemo(() => perimetreVisible(user), [user.role, user.entiteId]);

  const agents = useMemo(
    () => tousAgents.filter((a) => !perimetreDroit || (a.entiteId && perimetreDroit.has(a.entiteId))),
    [tousAgents, perimetreDroit]
  );

  /* Une rémunération par agent : la plus récente encore ouverte. */
  const remuDe = useMemo(() => {
    const m = new Map<string, RemunerationContractuelle>();
    remunerations
      .filter((r) => !r.dateFin || r.dateFin >= AUJOURDHUI)
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
      .forEach((r) => m.set(r.agentId, r));
    return m;
  }, [remunerations]);

  const agentDe = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const nonStatutaires = useMemo(() => agents.filter((a) => horsGrille(a.categorie)), [agents]);

  const global = useMemo(() => total(agents, remuDe, valeurPoint), [agents, remuDe, valeurPoint]);
  const directions = useMemo(() => parEntite(agents, remuDe, valeurPoint), [agents, remuDe, valeurPoint]);
  const categories = useMemo(() => parCategorie(agents, remuDe, valeurPoint), [agents, remuDe, valeurPoint]);

  const colonnesRegroupement: Colonne<Regroupement>[] = [
    { cle: "libelle", entete: "Rattachement", rendu: (r) => <span className="text-sm">{r.libelle.slice(0, 62)}</span> },
    { cle: "effectif", entete: "Effectif", aligne: "droite", rendu: (r) => <span className="tabular-nums text-sm">{fmtNum(r.effectif)}</span> },
    {
      cle: "chiffre", entete: "Coût mensuel connu", aligne: "droite",
      rendu: (r) => (
        <span className="tabular-nums text-sm font-medium">
          {r.cout.agentsChiffres ? `${fmtNum(r.cout.montant)} ${DEVISE}` : "—"}
        </span>
      ),
    },
    {
      cle: "couverture", entete: "Part chiffrée", aligne: "droite", visible: "md",
      rendu: (r) => (
        <span className={estComplet(r.cout) ? "text-sm tabular-nums text-emerald-600" : "text-sm tabular-nums text-amber-600"}>
          {fmtPct(r.effectif ? (r.cout.agentsChiffres / r.effectif) * 100 : 0)}
        </span>
      ),
    },
    {
      cle: "reserve", entete: "Réserve", visible: "lg",
      rendu: (r) => r.cout.agentsNonChiffres
        ? <span className="text-xs text-muted-foreground">{fmtNum(r.cout.agentsNonChiffres)} agents sans montant connu</span>
        : <span className="text-xs text-emerald-600">agrégat complet</span>,
    },
  ];

  const colonnesRemu: Colonne<RemunerationContractuelle>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (r) => {
        const a = agentDe.get(r.agentId);
        return (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{a ? `${a.prenom} ${a.nom}` : r.agentId}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {a?.matricule} · {entiteById(a?.entiteId)?.sigle ?? "—"}
            </div>
          </div>
        );
      },
    },
    {
      cle: "categorie", entete: "Catégorie", visible: "md",
      rendu: (r) => {
        const a = agentDe.get(r.agentId);
        return a ? <BadgeCategorie v={a.categorie} /> : null;
      },
    },
    {
      cle: "nature", entete: "Nature", visible: "lg",
      rendu: (r) => <span className="text-xs text-muted-foreground">{NATURE_REMUNERATION_LABELS[r.nature]}</span>,
    },
    {
      cle: "montant", entete: "Montant", aligne: "droite",
      rendu: (r) => r.montant === null
        ? <span className="text-xs italic text-muted-foreground/70">Donnée non renseignée</span>
        : (
          <div className="text-right">
            <div className="tabular-nums text-sm font-medium">{fmtNum(r.montant)} {DEVISE}</div>
            {r.quantite ? <div className="text-[10px] text-muted-foreground">× {r.quantite}</div> : null}
          </div>
        ),
    },
    {
      cle: "reference", entete: "Contrat", visible: "xl",
      rendu: (r) => <span className="text-[11px] text-muted-foreground">{r.reference ?? "—"}</span>,
    },
    { cle: "provenance", entete: "Preuve", aligne: "droite", rendu: (r) => <BadgeProvenance v={r.provenance} /> },
  ];

  const validerRemu = async () => {
    if (!formulaire?.agentId) { toast.error("Choisissez un agent."); return; }
    const montant = formulaire.montant.trim() === "" ? null : Number(formulaire.montant);
    if (montant !== null && !Number.isFinite(montant)) { toast.error("Montant illisible."); return; }
    await enregistrer.mutateAsync({
      creation: true,
      utilisateur: user,
      remuneration: {
        id: "",
        agentId: formulaire.agentId,
        nature: formulaire.nature,
        montant,
        quantite: formulaire.quantite ? Number(formulaire.quantite) : null,
        dateDebut: formulaire.dateDebut,
        dateFin: null,
        reference: formulaire.reference || undefined,
        /* Un montant saisi à l'écran n'est pas un montant vérifié : la pièce
           reste à verser au dossier. */
        provenance: "A_VERIFIER",
        observations: formulaire.observations || undefined,
      },
    });
    toast.success("Rémunération enregistrée", {
      description: montant === null
        ? "Montant laissé non renseigné : l'agent sera compté hors agrégat."
        : `${fmtNum(montant)} ${DEVISE}.`,
    });
    setFormulaire(null);
  };

  const validerPoint = async () => {
    if (!saisiePoint || !parametres) return;
    const v = Number(saisiePoint.valeur);
    if (!Number.isFinite(v) || v <= 0) { toast.error("Valeur du point illisible."); return; }
    if (!saisiePoint.reference.trim()) {
      toast.error("La référence du texte est obligatoire.", {
        description: "Une valeur du point sans texte qui la fonde ne vaut pas mieux qu'une valeur devinée.",
      });
      return;
    }
    await majParametres.mutateAsync({
      utilisateur: user,
      parametres: {
        ...parametres,
        valeurPoint: v,
        valeurPointDateEffet: saisiePoint.dateEffet,
        valeurPointReference: saisiePoint.reference.trim(),
      },
    });
    toast.success("Valeur du point enregistrée", {
      description: "Les montants statutaires s'affichent désormais partout.",
    });
    setSaisiePoint(null);
  };

  if (!pret || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Rémunération et masse salariale"
        description={
          "Ce que coûte le personnel, par direction et par catégorie — et, pour les agents qui ne "
          + "relèvent d'aucune grille, ce que portent leurs contrats. Chaque agrégat dit combien "
          + "d'agents il laisse dehors."
          + (perimetreDroit ? " Les chiffres portent sur votre périmètre." : "")
        }
      >
        {redacteur && (
          <Button size="sm" variant="outline" onClick={() => setFormulaire({ ...videRemu, agentId: nonStatutaires[0]?.id ?? "" })}>
            Enregistrer une rémunération
          </Button>
        )}
      </PageHeader>

      <MentionAttribution utilisateur={user} module="remuneration" />

      {valeurPoint === null ? (
        <Card className="border-amber-500/40 bg-amber-500/[0.05]">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <CircleHelp className="h-4 w-4 text-amber-600" />
              La valeur du point indiciaire n'est pas renseignée
              <BadgeProvenance v={VALEUR_DU_POINT.provenance} />
            </CardTitle>
            <CardDescription className="space-y-3">
              <span className="block text-xs">
                C'est une donnée réglementaire, et la plateforme ne l'inventera pas : une masse
                salariale fausse sous le timbre de l'État serait indiscernable d'une vraie. Tant
                qu'elle manque, les traitements des {fmtNum(agents.length - nonStatutaires.length)} agents
                à carrière indiciaire ne sont pas chiffrés. Les montants contractuels, eux, sont
                additionnés normalement : ils viennent de contrats, pas d'une grille.
              </span>
              {redacteur && (
                <Button size="sm" variant="outline"
                  onClick={() => setSaisiePoint({ valeur: "", reference: "", dateEffet: AUJOURDHUI })}>
                  Renseigner la valeur du point
                </Button>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-emerald-500/30 bg-emerald-500/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Valeur du point : {fmtNum(valeurPoint)} {DEVISE}
            </CardTitle>
            <CardDescription className="text-xs">
              {parametres?.valeurPointReference ?? "Référence non renseignée"}
              {parametres?.valeurPointDateEffet ? ` — effet au ${fmtDate(parametres.valeurPointDateEffet)}` : ""}
              {redacteur && (
                <Button size="sm" variant="ghost" className="ml-2 h-6 px-2 text-xs"
                  onClick={() => setSaisiePoint({
                    valeur: String(valeurPoint),
                    reference: parametres?.valeurPointReference ?? "",
                    dateEffet: parametres?.valeurPointDateEffet ?? AUJOURDHUI,
                  })}>
                  Modifier
                </Button>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <RangeeKpi tuiles={[
        {
          ton: "bleu", titre: "Coût mensuel connu",
          valeur: global.agentsChiffres ? `${fmtNum(global.montant)}` : "À vérifier",
          sousTitre: global.agentsChiffres
            ? `${DEVISE} · sur ${fmtNum(global.agentsChiffres)} agents chiffrés`
            : "aucun montant calculable en l'état",
          icon: Banknote,
        },
        {
          ton: "ambre", titre: "Agents sans coût connu", valeur: fmtNum(global.agentsNonChiffres),
          sousTitre: `${fmtPct(agents.length ? (global.agentsNonChiffres / agents.length) * 100 : 0)} de l'effectif`,
          icon: CircleHelp,
        },
        {
          ton: "violet", titre: "Personnels hors grille", valeur: fmtNum(nonStatutaires.length),
          sousTitre: "prestataires, volontaires, vacataires", icon: Users2,
        },
        {
          ton: "cyan", titre: "Contrats enregistrés", valeur: fmtNum(remunerations.length),
          sousTitre: `dont ${fmtNum(remunerations.filter((r) => r.montant === null).length)} sans montant`,
          icon: Coins,
        },
      ]} />

      <Tabs defaultValue="directions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="directions">Par rattachement</TabsTrigger>
          <TabsTrigger value="categories">Par catégorie</TabsTrigger>
          <TabsTrigger value="contrats">Personnels hors grille</TabsTrigger>
        </TabsList>

        <TabsContent value="directions">
          <TableauModule<Regroupement>
            titre="Coût par rattachement"
            description="Le coût connu, et la part de l'effectif qu'il couvre. Une part inférieure à 100 % signifie que le montant affiché est un plancher, non un total."
            lignes={directions}
            colonnes={colonnesRegroupement}
            recherche={(r, t) => r.libelle.toLowerCase().includes(t)}
            placeholderRecherche="Sigle ou nom de l'entité…"
            vide="Aucune entité peuplée."
            parPage={16}
          />
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-4">
            <TableauModule<Regroupement>
              titre="Coût par catégorie de personnel"
              description="C'est l'axe qui sépare les deux régimes : la grille indiciaire d'un côté, le contrat de l'autre."
              lignes={categories}
              colonnes={colonnesRegroupement}
              vide="Aucune donnée."
              parPage={10}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pourquoi deux régimes, et pas un</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {(Object.keys(REGLES_CATEGORIE) as (keyof typeof REGLES_CATEGORIE)[]).map((c) => (
                  <div key={c} className="flex flex-wrap items-center gap-2">
                    <BadgeCategorie v={c} />
                    <span className="text-xs">
                      {REGLES_CATEGORIE[c].carriereStatutaire
                        ? "carrière indiciaire — le traitement se calcule (indice × valeur du point)"
                        : "hors grille — la rémunération se lit dans le contrat, elle ne se calcule pas"}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70">{REGLES_CATEGORIE[c].lien}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contrats">
          <TableauModule<RemunerationContractuelle>
            titre="Rémunérations contractuelles"
            description="Les agents qui ne relèvent d'aucune grille. Un montant absent s'affiche comme absent : il n'est jamais compté pour zéro."
            lignes={remunerations}
            colonnes={colonnesRemu}
            recherche={(r, t) => {
              const a = agentDe.get(r.agentId);
              return !!a && (a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.toLowerCase().includes(t));
            }}
            placeholderRecherche="Nom, prénom ou matricule…"
            vide="Aucune rémunération contractuelle enregistrée."
            parPage={18}
            actions={
              <Badge variant="outline" className="text-[10px]">
                {fmtNum(remunerations.filter((r) => r.montant !== null).length)} montants connus sur {fmtNum(remunerations.length)}
              </Badge>
            }
          />
        </TabsContent>
      </Tabs>

      <FormulaireRemuneration
        valeurs={formulaire}
        surChangement={setFormulaire}
        surFermeture={() => setFormulaire(null)}
        surValidation={validerRemu}
        enCours={enregistrer.isPending}
        nonStatutaires={nonStatutaires}
      />

      <FormulaireValeurPoint
        valeurs={saisiePoint}
        surChangement={setSaisiePoint}
        surFermeture={() => setSaisiePoint(null)}
        surValidation={validerPoint}
        enCours={majParametres.isPending}
      />
    </div>
  );
}
