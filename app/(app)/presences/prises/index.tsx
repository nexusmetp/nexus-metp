"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, DoorOpen, FileWarning, Hourglass } from "lucide-react";
import {
  useAgentsProjetes, useConstaterNonPresentation, useEnregistrerArrivee,
  useEntites, useInstaller, usePointsAccueil, usePrisesService,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  COULEUR_PRISE, NIVEAU_LABELS, SEUIL_ARRIVEE_A_VERIFIER, STATUT_PRISE_LABELS, peut,
 perimetreVisible, visible,} from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import {
  Badge, Colonne, LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule,
} from "@/components/nexus/module";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AUJOURDHUI, lignesArrivees, resumerArrivees, tensionsParEntite, type LigneArrivee,
} from "./calculs";
import { DialogueArrivee, DialogueInstallation, DialogueNonPresentation } from "./formulaires";

/* ------------------------------------------------------------------ */
/* Prises de service                                                   */
/*                                                                     */
/* Le premier pointage, celui qui n'a lieu qu'une fois : le jour où    */
/* l'agent affecté quelque part s'y présente réellement. C'est pour    */
/* cela que l'écran vit sous « Présences » et non à part — c'est un    */
/* pointage, simplement le premier, et il est le chaînon manquant      */
/* entre l'acte et le poste réellement occupé. L'affectation dit où    */
/* l'agent doit servir ; elle ne dit pas qu'il s'y est présenté, et le */
/* tableau des emplois comptait jusqu'ici comme occupé tout poste      */
/* affecté — c'est-à-dire qu'il affirmait, sans le savoir, que         */
/* quelqu'un y servait.                                                */
/* ------------------------------------------------------------------ */

export function PrisesDeService() {
  const user = useAuth((s) => s.user)!;
  const { toast } = useToast();
  const redacteur = peut(user.role, "presences", "W");
  const { data: tousAgents, pret } = useAgentsProjetes();
  /* Borné au périmètre : la présence, la formation et le versement aux
     archives sont des faits de dossier, pas des informations de couloir. */
  const agents = useMemo(() => {
    const p = perimetreVisible(user);
    return tousAgents.filter((a) => visible(p, a.entiteId));
  }, [tousAgents, user]);
  const { data: entites = [], isLoading: chargeEntites } = useEntites();
  const { data: points = [] } = usePointsAccueil();
  const { data: prises = [], isLoading: chargePrises } = usePrisesService();

  const enregistrerArrivee = useEnregistrerArrivee();
  const installer = useInstaller();
  const constaterAbsence = useConstaterNonPresentation();

  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "ATTENDUE" });
  const [selection, setSelection] = useState<string | null>(null);
  const [arrivee, setArrivee] = useState<LigneArrivee | null>(null);
  const [installation, setInstallation] = useState<LigneArrivee | null>(null);
  const [nonPresentation, setNonPresentation] = useState<LigneArrivee | null>(null);

  const lignes = useMemo(
    () => lignesArrivees({ prises, agents, entites, points, date: AUJOURDHUI }),
    [prises, agents, entites, points]
  );
  const resume = useMemo(() => resumerArrivees(lignes), [lignes]);
  const tensions = useMemo(() => tensionsParEntite(lignes).slice(0, 8), [lignes]);

  const visibles = useMemo(() => lignes.filter((l) => {
    if (filtres.statut === "a-verifier") return l.aVerifier;
    if (filtres.statut === "all") return true;
    return l.statut === filtres.statut;
  }), [lignes, filtres]);

  const active = lignes.find((l) => l.id === selection) ?? null;

  if (!pret || chargeEntites || chargePrises) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const echec = (e: unknown) =>
    toast({
      title: "Geste refusé",
      description: e instanceof Error ? e.message : "Opération impossible.",
      variant: "destructive",
    });

  const colonnes: Colonne<LigneArrivee>[] = [
    {
      cle: "agent", entete: "Agent", visible: "toujours",
      rendu: (l) => (
        <div className="min-w-0">
          <div className="truncate font-medium">
            {l.agent ? `${l.agent.prenom} ${l.agent.nom.toUpperCase()}` : l.prise.agentId}
          </div>
          <div className="truncate text-xs text-muted-foreground">{l.agent?.matricule ?? "—"}</div>
        </div>
      ),
    },
    {
      cle: "entite", entete: "Attendu à", visible: "lg",
      rendu: (l) => (
        <div className="min-w-0">
          <div className="truncate text-sm">{l.entite?.sigle ?? "—"}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {l.point ? l.point.libelle : "Aucun point d'accueil"}
          </div>
        </div>
      ),
    },
    {
      cle: "attendue", entete: "Date d'effet", visible: "md",
      rendu: (l) => <span className="tabular-nums text-sm">{l.prise.dateAttendue}</span>,
    },
    {
      cle: "delai", entete: "Délai", aligne: "droite", visible: "md",
      rendu: (l) => {
        if (l.statut === "INSTALLEE") {
          return (
            <span className="text-xs text-muted-foreground">
              {l.delaiInstallation !== null ? `installé en ${l.delaiInstallation} j` : "installé"}
            </span>
          );
        }
        if (l.statut === "ATTENDUE") {
          return (
            <span className={l.aVerifier ? "text-xs font-medium text-rose-600" : "text-xs text-muted-foreground"}>
              {l.anciennete < 0 ? `dans ${-l.anciennete} j` : `${l.anciennete} j d'attente`}
            </span>
          );
        }
        return (
          <span className="text-xs text-muted-foreground">
            {l.retardArrivee !== null && l.retardArrivee > 0 ? `arrivé +${l.retardArrivee} j` : "arrivé"}
          </span>
        );
      },
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (l) => (
        <Badge variant="outline" className={COULEUR_PRISE[l.statut]}>
          {STATUT_PRISE_LABELS[l.statut]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        La prise de service est le <strong className="font-medium text-foreground">premier
        pointage</strong> d&apos;un agent dans l&apos;entité où un acte vient de l&apos;affecter :
        recruté, muté, réintégré, il est attendu quelque part un jour donné. Trois moments, et
        trois seulement — il est <em>attendu</em> ; il <em>s&apos;est présenté</em> ; il est{" "}
        <em>installé</em>, c&apos;est-à-dire qu&apos;un procès-verbal le constate. Tant que le
        troisième n&apos;est pas franchi, son poste figure comme occupé sans que personne
        n&apos;y serve.
      </p>

      <RangeeKpi tuiles={[
        {
          ton: "ambre", titre: "Attendus", valeur: fmtNum(resume.attendues), icon: Hourglass,
          sousTitre: "acte pris, agent non présenté",
        },
        {
          ton: "cyan", titre: "Arrivées enregistrées", valeur: fmtNum(resume.enregistrees), icon: DoorOpen,
          sousTitre: "présentés, procès-verbal non dressé",
        },
        {
          ton: "emeraude", titre: "Installés", valeur: fmtNum(resume.installees), icon: ClipboardCheck,
          sousTitre: resume.delaiMoyenInstallation !== null
            ? `${resume.delaiMoyenInstallation} jours en moyenne entre arrivée et procès-verbal`
            : "délai moyen non calculable",
        },
        {
          ton: "rose", titre: "Dossiers à vérifier", valeur: fmtNum(resume.aVerifier), icon: FileWarning,
          sousTitre: `sans nouvelle au-delà de ${SEUIL_ARRIVEE_A_VERIFIER.jours} jours`,
        },
      ]} />

      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {fmtNum(resume.postesSansOccupant)} postes comptés occupés sans arrivée constatée
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Ces agents sont affectés par un acte dont la date d'effet est passée, et personne n'a
            constaté leur venue. Ce n'est pas une fraude et l'écran ne le présente pas comme telle :
            c'est un écart entre le papier et le terrain. Un agent peut être hospitalisé, retenu
            faute de titre de transport, ou installé depuis des semaines sans que le secrétariat
            l'ait saisi. Le seuil de {SEUIL_ARRIVEE_A_VERIFIER.jours} jours ouvre un dossier à
            vérifier — il ne conclut rien, et il est une recommandation de l'outil, non une règle
            de droit.
          </CardDescription>
        </CardHeader>
        {tensions.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {tensions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 border-b py-1.5 text-sm last:border-0">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{t.entite.sigle}</span>
                    <span className="text-muted-foreground"> — {t.entite.nom}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {t.attendues} attendus{t.aVerifier > 0 && ` · ${t.aVerifier} à vérifier`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <TableauModule<LigneArrivee>
        titre="Les prises de service"
        description="Une ligne par affectation en vigueur. Cliquer ouvre la fiche."
        lignes={visibles}
        colonnes={colonnes}
        recherche={(l, t) =>
          `${l.agent?.prenom ?? ""} ${l.agent?.nom ?? ""} ${l.agent?.matricule ?? ""} ${l.entite?.sigle ?? ""}`
            .toLowerCase().includes(t.toLowerCase())}
        placeholderRecherche="Rechercher un agent, un matricule, un service…"
        filtres={[{
          cle: "statut", libelle: "Tous les statuts",
          options: [
            { valeur: "ATTENDUE", libelle: "Attendus" },
            { valeur: "a-verifier", libelle: "À vérifier" },
            { valeur: "ENREGISTREE", libelle: "Arrivées enregistrées" },
            { valeur: "INSTALLEE", libelle: "Installés" },
            { valeur: "NON_PRESENTEE", libelle: "Non présentés" },
          ],
        }]}
        valeursFiltres={filtres}
        surChangementFiltre={(cle, valeur) => setFiltres((f) => ({ ...f, [cle]: valeur }))}
        surSelection={(l) => setSelection(l.id)}
        ligneActive={selection}
        vide="Aucune prise de service ne correspond à ce filtre."
      />

      <PanneauDetail
        ouvert={!!active}
        surFermeture={() => setSelection(null)}
        titre={active?.agent
          ? `${active.agent.prenom} ${active.agent.nom.toUpperCase()}`
          : active?.prise.agentId ?? ""}
        sousTitre={active?.entite
          ? `${active.entite.sigle} — ${NIVEAU_LABELS[active.entite.niveau]}`
          : undefined}
        etiquette={active && (
          <Badge variant="outline" className={COULEUR_PRISE[active.statut]}>
            {STATUT_PRISE_LABELS[active.statut]}
          </Badge>
        )}
        actions={active && redacteur && (
          <>
            {active.statut === "ATTENDUE" && (
              <>
                <Button variant="outline" onClick={() => setNonPresentation(active)}>
                  Constater la non-présentation
                </Button>
                <Button onClick={() => setArrivee(active)}>Constater l'arrivée</Button>
              </>
            )}
            {active.statut === "ENREGISTREE" && (
              <Button onClick={() => setInstallation(active)}>Constater l'installation</Button>
            )}
          </>
        )}
      >
        {active && (
          <>
            <Section titre="L'affectation">
              <LigneInfo k="Entité" v={active.entite ? `${active.entite.sigle} — ${active.entite.nom}` : "—"} />
              <LigneInfo k="Date d'effet de l'acte" v={active.prise.dateAttendue} />
              <LigneInfo k="Acte" v={active.prise.acteId ?? "Référence non renseignée"} />
              <LigneInfo
                k="Point d'accueil"
                v={active.point ? active.point.libelle : "Aucun point d'accueil déclaré pour cette entité"}
              />
            </Section>

            <Section titre="Ce qui a été constaté">
              <LigneInfo k="Arrivée" v={active.prise.dateArrivee ?? "Non constatée"} />
              <LigneInfo k="Reçu par" v={active.prise.recuParNom ?? "—"} />
              <LigneInfo k="Installation" v={active.prise.dateInstallation ?? "Non constatée"} />
              <LigneInfo k="Procès-verbal" v={active.prise.referencePV ?? "Aucune pièce"} />
              {active.prise.observations && (
                <LigneInfo k="Observations" v={active.prise.observations} />
              )}
            </Section>

            {active.aVerifier && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-500">
                Attendu depuis {active.anciennete} jours sans arrivée constatée. Ce dossier est à
                vérifier : il ne vaut ni faute, ni abandon de poste, et n'emporte aucune
                conséquence sur la rémunération.
              </p>
            )}
          </>
        )}
      </PanneauDetail>

      <DialogueArrivee
        ouvert={!!arrivee}
        ligne={arrivee}
        aujourdhui={AUJOURDHUI}
        surFermeture={() => setArrivee(null)}
        surValidation={(date) => {
          if (arrivee) {
            enregistrerArrivee.mutate(
              { prise: arrivee.prise, date, utilisateur: user },
              { onError: echec, onSuccess: () => toast({ title: "Arrivée enregistrée" }) }
            );
          }
          setArrivee(null);
        }}
      />

      <DialogueInstallation
        ouvert={!!installation}
        ligne={installation}
        aujourdhui={AUJOURDHUI}
        surFermeture={() => setInstallation(null)}
        surValidation={(date, reference) => {
          if (installation) {
            installer.mutate(
              { prise: installation.prise, date, reference, utilisateur: user },
              { onError: echec, onSuccess: () => toast({ title: "Installation constatée" }) }
            );
          }
          setInstallation(null);
        }}
      />

      <DialogueNonPresentation
        ouvert={!!nonPresentation}
        ligne={nonPresentation}
        surFermeture={() => setNonPresentation(null)}
        surValidation={(justification) => {
          if (nonPresentation) {
            constaterAbsence.mutate(
              { prise: nonPresentation.prise, justification, utilisateur: user },
              {
                onError: echec,
                onSuccess: () => toast({
                  title: "Constat porté",
                  description: "Un dossier est ouvert. Aucune conséquence disciplinaire n'en découle.",
                }),
              }
            );
          }
          setNonPresentation(null);
        }}
      />
    </div>
  );
}
