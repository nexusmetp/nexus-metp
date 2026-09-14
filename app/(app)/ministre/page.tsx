"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Banknote, Briefcase, Globe2, ShieldQuestion, UserCheck, Users,
} from "lucide-react";
import {
  useActes, useAgentsProjetes, useParametres, usePointages, usePostes, useRemunerations,
  useSorties,
} from "@/lib/queries";
import {
  DEVISE, SEUIL_ABSENCE_PROLONGEE, statutEffectif,
} from "@/lib/referentiels";
import { fmtNum, fmtPct } from "@/lib/format";
import { useAuth } from "@/lib/store";
import { PageHeader } from "@/components/nexus/ui-kit";
import { Jauge, RangeeKpi } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RemunerationContractuelle } from "@/lib/types";
import { AUJOURDHUI, anomalies, journeeDe, resumerJournee } from "../presences/calculs";
import { total as coutTotal } from "../remuneration/agregats";
import { AXES } from "./effectifs";
import { Approbations } from "./approbations";

/* ------------------------------------------------------------------ */
/* L'espace du ministre — quatre questions, quatre réponses            */
/*                                                                     */
/* Cet écran n'invente aucun chiffre : il va chercher ceux des modules  */
/* et, quand la donnée manque, il le dit au lieu de laisser un blanc.   */
/* Chaque bloc mène au module qui le produit : un chiffre qui ne        */
/* s'ouvre sur rien ne se vérifie pas.                                  */
/* ------------------------------------------------------------------ */

function Question({
  numero, titre, reponse, reserve, href, hrefLibelle, children,
}: {
  numero: string;
  titre: string;
  reponse: React.ReactNode;
  reserve?: string;
  href: string;
  hrefLibelle: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Question {numero}
            </div>
            <CardTitle className="mt-1 text-lg">{titre}</CardTitle>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={href}>{hrefLibelle}</Link>
          </Button>
        </div>
        <div className="pt-2 text-foreground">{reponse}</div>
        {reserve && (
          <p className="pt-1 text-xs text-amber-600">{reserve}</p>
        )}
      </CardHeader>
      {children && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

export default function MinistrePage() {
  const user = useAuth((s) => s.user)!;
  const { data: agents, pret } = useAgentsProjetes();
  const { data: postes = [] } = usePostes();
  const { data: pointages = [] } = usePointages();
  const { data: sorties = [] } = useSorties();
  const { data: actes = [] } = useActes();
  const { data: remunerations = [] } = useRemunerations();
  const { data: parametres } = useParametres();
  const [axe, setAxe] = useState("categorie");

  const valeurPoint = parametres?.valeurPoint ?? null;
  const seuil = parametres?.seuilAbsenceProlongee ?? SEUIL_ABSENCE_PROLONGEE.jours;

  const emplois = useMemo(() => {
    const occupes = postes.filter((p) => p.statut === "OCCUPE").length;
    const vacants = postes.filter((p) => p.statut === "VACANT").length;
    const geles = postes.filter((p) => p.statut === "GELE").length;
    return {
      total: postes.length, occupes, vacants, geles,
      taux: postes.length ? (occupes / postes.length) * 100 : 0,
    };
  }, [postes]);

  const jour = useMemo(
    () => resumerJournee(journeeDe(agents, pointages, AUJOURDHUI)),
    [agents, pointages]
  );

  const aVerifier = useMemo(() => {
    const absences = anomalies(agents, pointages, seuil);
    /* L'âge de départ dépassé sans acte de fin de carrière : le module
       retraite le détecte déjà, on reprend le même raisonnement. */
    const retraitesSansActe = agents.filter((a) => {
      if (a.age < 60) return false;
      return !actes.some((x) => x.agentId === a.id && x.type === "FIN_CARRIERE");
    });
    const positionsParticulieres = agents.filter(
      (a) => a.nature === "DISPONIBILITE" || a.nature === "SUSPENSION" || a.nature === "DETACHEMENT"
    );
    return {
      absences: absences.length,
      absencesNues: absences.filter((x) => !x.justifiee).length,
      retraitesSansActe: retraitesSansActe.length,
      positionsParticulieres: positionsParticulieres.length,
      dossiersIncomplets: agents.filter((a) => a.tauxCompletude < 50).length,
    };
  }, [agents, pointages, actes, seuil]);

  const mobilite = useMemo(() => {
    const vues = sorties.map((s) => statutEffectif(s, AUJOURDHUI));
    return {
      dehors: vues.filter((s) => s === "EN_COURS").length,
      retards: vues.filter((s) => s === "RETARD_RETOUR").length,
    };
  }, [sorties]);

  const cout = useMemo(() => {
    const m = new Map<string, RemunerationContractuelle>();
    remunerations
      .filter((r) => !r.dateFin || r.dateFin >= AUJOURDHUI)
      .forEach((r) => m.set(r.agentId, r));
    return coutTotal(agents, m, valeurPoint);
  }, [agents, remunerations, valeurPoint]);

  const parts = useMemo(() => {
    const a = AXES.find((x) => x.cle === axe) ?? AXES[0];
    return a.calcul(agents).slice(0, 12);
  }, [axe, agents]);

  if (!pret) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Pilotage du ministère"
        description={
          "Les quatre questions auxquelles la plateforme doit savoir répondre à l'échelle du "
          + "ministère, et l'état de chacune. Quand un chiffre manque, l'écran dit pourquoi plutôt "
          + "que d'afficher un blanc — et chaque réponse mène au module qui la produit, pour "
          + "qu'elle puisse être vérifiée. Cet écran n'appartient à personne : il s'ouvre par le "
          + "profil d'accès, comme tous les autres."
        }
      />

      {/* Ce qui appelle une décision passe avant ce qui appelle une lecture :
          un tableau de bord qui enterre une signature attendue sous quatre
          graphiques apprend surtout à ne pas le lire. */}
      <Approbations utilisateur={user} />

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Effectif du ministère", valeur: fmtNum(agents.length), sousTitre: "toutes catégories confondues", icon: Users, href: "/dgarh/agents" },
        { ton: "ambre", titre: "Postes vacants", valeur: fmtNum(emplois.vacants), sousTitre: `${fmtPct(emplois.taux)} des postes occupés`, icon: Briefcase, href: "/postes" },
        { ton: "emeraude", titre: "Ont servi aujourd'hui", valeur: fmtNum(jour.servis), sousTitre: `${fmtNum(jour.nonPointes)} agents non pointés`, icon: UserCheck, href: "/presences" },
        { ton: "cyan", titre: "Hors du territoire", valeur: fmtNum(mobilite.dehors), sousTitre: `dont ${fmtNum(mobilite.retards)} en retard de retour`, icon: Globe2, href: "/sorties" },
      ]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Question
          numero="1"
          titre="Combien sommes-nous ?"
          href="/rapports"
          hrefLibelle="États exportables"
          reponse={
            <span className="text-2xl font-bold tabular-nums">
              {fmtNum(agents.length)} <span className="text-sm font-normal text-muted-foreground">agents</span>
            </span>
          }
        >
          <Tabs value={axe} onValueChange={setAxe} className="space-y-3">
            <TabsList className="flex h-auto flex-wrap justify-start gap-1">
              {AXES.map((a) => (
                <TabsTrigger key={a.cle} value={a.cle} className="text-[11px]">
                  {a.libelle.replace("Par ", "")}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={axe} className="space-y-2">
              {parts.map((p) => (
                <div key={p.cle} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs">{p.libelle.slice(0, 46)}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {fmtNum(p.effectif)} · {fmtPct(p.part)}
                    </span>
                  </div>
                  <Jauge valeur={p.part} />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </Question>

        <Question
          numero="2"
          titre="Combien avons-nous de postes vacants ?"
          href="/postes"
          hrefLibelle="Tableau des emplois"
          reserve={
            "Le statut du poste est encore un champ enregistré, non recalculé depuis les affectations "
            + "en cours : ce taux peut dériver sans le dire. C'est la prochaine correction du module."
          }
          reponse={
            <span className="text-2xl font-bold tabular-nums">
              {fmtNum(emplois.vacants)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                sur {fmtNum(emplois.total)} postes
              </span>
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Occupés", emplois.occupes, "text-emerald-600"],
              ["Vacants", emplois.vacants, "text-amber-600"],
              ["Gelés", emplois.geles, "text-slate-500"],
            ].map(([libelle, n, couleur]) => (
              <div key={libelle as string} className="rounded-md border bg-muted/30 p-3">
                <div className={`text-xl font-bold tabular-nums ${couleur}`}>{fmtNum(n as number)}</div>
                <div className="text-[11px] text-muted-foreground">{libelle as string}</div>
              </div>
            ))}
          </div>
        </Question>

        <Question
          numero="3"
          titre="Qui est payé sans servir ?"
          href="/presences"
          hrefLibelle="Présences"
          reserve={
            "Aucune de ces situations n'établit une faute. Ce sont des dossiers à contrôler : une "
            + "absence prolongée peut couvrir une hospitalisation ou un ordre de mission jamais remonté."
          }
          reponse={
            <span className="text-2xl font-bold tabular-nums text-amber-600">
              {fmtNum(aVerifier.absences + aVerifier.retraitesSansActe)}{" "}
              <span className="text-sm font-normal text-muted-foreground">dossiers à vérifier</span>
            </span>
          }
        >
          <div className="space-y-2 text-sm">
            {[
              [`Absences continues au-delà de ${seuil} jours ouvrés`, aVerifier.absences, "/presences"],
              ["dont absences sans pièce justificative", aVerifier.absencesNues, "/presences"],
              ["Agents de 60 ans et plus sans acte de fin de carrière", aVerifier.retraitesSansActe, "/retraite"],
              ["Positions particulières (disponibilité, détachement, suspension)", aVerifier.positionsParticulieres, "/conges"],
              ["Dossiers dont moins de la moitié des pièces sont présentes", aVerifier.dossiersIncomplets, "/dgarh/agents"],
            ].map(([libelle, n, lien]) => (
              <Link key={libelle as string} href={lien as string}
                className="flex items-baseline justify-between gap-3 rounded px-1 py-0.5 hover:bg-muted/60">
                <span className="text-xs text-muted-foreground">{libelle as string}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtNum(n as number)}</span>
              </Link>
            ))}
          </div>
        </Question>

        <Question
          numero="4"
          titre="Et combien ça coûte ?"
          href="/remuneration"
          hrefLibelle="Masse salariale"
          reserve={
            valeurPoint === null
              ? "La valeur du point indiciaire n'est pas renseignée : les traitements des agents à "
                + "carrière indiciaire ne sont pas chiffrés. Le montant ci-dessus n'est donc pas la "
                + "masse salariale du ministère — c'est la seule part contractuelle, et elle en est "
                + "une petite fraction."
              : `${fmtNum(cout.agentsNonChiffres)} agents restent hors du chiffre, faute de montant connu.`
          }
          reponse={
            cout.agentsChiffres ? (
              <div className="space-y-1">
                {/* Le libellé change avec ce que le chiffre couvre réellement.
                    Écrire « masse salariale » sur une somme qui n'en est
                    qu'une fraction serait le mensonge le plus facile à
                    commettre de tout cet écran. */}
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                  {valeurPoint === null ? "Part contractuelle seulement" : "Masse salariale mensuelle"}
                </div>
                <span className="text-2xl font-bold tabular-nums">
                  {fmtNum(cout.montant)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {DEVISE} par mois, sur {fmtNum(cout.agentsChiffres)} agents chiffrés
                  </span>
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-lg font-semibold text-amber-600">
                <ShieldQuestion className="h-5 w-5" /> À vérifier
              </span>
            )
          }
        >
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Part de l'effectif réellement chiffrée</span>
              <span className="tabular-nums font-medium">
                {fmtPct(agents.length ? (cout.agentsChiffres / agents.length) * 100 : 0)}
              </span>
            </div>
            <Jauge
              valeur={agents.length ? (cout.agentsChiffres / agents.length) * 100 : 0}
              teinte={cout.agentsNonChiffres ? "bg-amber-500" : "bg-emerald-500"}
            />
            <p className="pt-1 text-[11px] text-muted-foreground">
              {fmtNum(remunerations.filter((r) => r.montant !== null).length)} rémunérations
              contractuelles connues sur {fmtNum(remunerations.length)} enregistrées.
            </p>
          </div>
        </Question>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Ce que cet écran ne sait pas encore dire
          </CardTitle>
          <CardDescription className="space-y-1 text-xs">
            <span className="block">
              Les dossiers disciplinaires, les missions à l'intérieur du pays, les compétences
              qualifiées et les campagnes d'inspection n'ont pas encore de module : les chiffres
              correspondants sont absents, et non à zéro.
            </span>
            <span className="block">
              Le pointage couvre {fmtPct(jour.effectif ? (jour.pointes / jour.effectif) * 100 : 0)} de
              l'effectif. Tant qu'il n'est pas généralisé, « qui est présent aujourd'hui » répond pour
              les services qui tiennent leur cahier, pas pour le ministère entier.
            </span>
            <span className="block">
              Les données affichées proviennent d'un jeu de démonstration. Aucun chiffre de cet écran
              n'est un chiffre du ministère.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
