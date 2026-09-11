"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, ScrollText, ShieldAlert, User,
} from "lucide-react";
import {
  useActes, useAffectations, useAgents, useJournal, usePositions, useSituations, useTransitionActe,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { calculerEffets, effetsVides, transitionsPour } from "@/lib/actes";
import { STATUT_ACTE_LABELS, cheminDe, entiteById, gradeById, typeActeById } from "@/lib/referentiels";
import { fmtDate, joursDepuis } from "@/lib/format";
import { BadgeStatutActe, PageHeader } from "@/components/nexus/ui-kit";
import { DocumentsLies } from "@/components/nexus/documents-lies";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ActePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const user = useAuth((s) => s.user)!;

  const { data: actes = [], isLoading } = useActes();
  const { data: agents = [] } = useAgents();
  const { data: affectations = [] } = useAffectations();
  const { data: situations = [] } = useSituations();
  const { data: positions = [] } = usePositions();
  const { data: journal = [] } = useJournal();
  const transition = useTransitionActe();

  const [motif, setMotif] = useState("");
  const [demandeMotif, setDemandeMotif] = useState<string | null>(null);

  const acte = useMemo(() => actes.find((a) => a.id === id), [actes, id]);
  const agent = useMemo(() => agents.find((a) => a.id === acte?.agentId), [agents, acte]);

  const effets = useMemo(
    () => (acte ? calculerEffets(acte, { affectations, situations, positions }) : null),
    [acte, affectations, situations, positions]
  );

  const entreesJournal = useMemo(
    () => journal.filter((j) => j.acteId === id).sort((a, b) => b.horodatage.localeCompare(a.horodatage)),
    [journal, id]
  );

  const actions = useMemo(() => (acte ? transitionsPour(acte, user) : []), [acte, user]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (!acte) {
    return (
      <>
        <PageHeader titre="Acte introuvable" />
        <Button variant="outline" asChild><Link href="/dgarh/actes"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link></Button>
      </>
    );
  }

  const lancer = (code: any, libelle: string, motifRequis?: boolean) => {
    if (motifRequis && !motif.trim()) {
      setDemandeMotif(code);
      toast.info("Motif requis", { description: "Indiquez ce qui manque avant de renvoyer le dossier." });
      return;
    }
    transition.mutate(
      { acte, code, utilisateur: user, motif: motif.trim() || undefined },
      {
        onSuccess: (suivant) => {
          setMotif(""); setDemandeMotif(null);
          toast.success(libelle, {
            description: code === "notifier"
              ? "Dossier mis à jour : l'acte est reporté dans la carrière de l'agent."
              : `Statut : ${STATUT_ACTE_LABELS[suivant.statut]}`,
          });
        },
        onError: () => toast.error("La transition a échoué"),
      }
    );
  };

  const cibleEntite = entiteById(acte.cible?.entiteId);

  return (
    <>
      <PageHeader
        titre={acte.reference}
        description={`${typeActeById(acte.type)?.libelle} — ${acte.objet}. Créé le ${fmtDate(acte.dateCreation)}, instruit par ${entiteById(acte.entiteInstructriceId)?.sigle}.`}
      >
        <BadgeStatutActe v={acte.statut} />
        <DocumentsLies
          source="acte"
          contexte={{ acte, agent: agent as any, signataire: { nom: user.nomComplet } }}
        />
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh/actes"><ArrowLeft className="mr-2 h-4 w-4" /> Tous les actes</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Circuit d'instruction</CardTitle>
              <CardDescription>
                Chaque étape est horodatée et attribuée — c'est ce qui mesure les délais réels (§09).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 border-l-2 border-primary/20 pl-5">
                {acte.etapes.map((e) => (
                  <div key={e.id} className="relative">
                    <span className={cn(
                      "absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full",
                      e.statut === "TERMINEE" ? "bg-emerald-500"
                        : e.statut === "EN_COURS" ? "bg-primary ring-4 ring-primary/15"
                        : "bg-muted-foreground/25"
                    )} />
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className={cn("text-sm font-medium", e.statut === "A_VENIR" && "text-muted-foreground")}>
                        {e.libelle}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {entiteById(e.entiteId)?.sigle}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.dateEntree ? fmtDate(e.dateEntree) : "—"}{e.utilisateur && ` · ${e.utilisateur}`}
                    </div>
                    {e.commentaire && (
                      <div className="mt-1 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                        {e.commentaire}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ce que l'acte changera — visible avant d'agir, pas après. */}
          {acte.cible && (
            <Card className={cn(acte.effetsAppliques && "border-emerald-500/30 bg-emerald-500/[0.03]")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {acte.effetsAppliques ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ArrowRight className="h-4 w-4 text-primary" />}
                  {acte.effetsAppliques ? "Effets reportés dans le dossier" : "Effets en attente"}
                </CardTitle>
                <CardDescription>
                  {acte.effetsAppliques
                    ? "L'acte a été notifié : la carrière de l'agent porte désormais cette décision."
                    : "Le dossier ne bougera qu'à la notification — étape 10 du circuit (§09)."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {acte.cible.entiteId && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">Nouvelle affectation</span>
                    <span className="font-medium">{cibleEntite?.nom}</span>
                    <span className="text-xs text-muted-foreground">
                      {cheminDe(acte.cible.entiteId).map((e) => e.sigle).join(" › ")}
                    </span>
                  </div>
                )}
                {acte.cible.fonction && (
                  <div className="flex gap-2"><span className="text-xs text-muted-foreground">Fonction</span><span className="font-medium">{acte.cible.fonction}</span></div>
                )}
                {acte.cible.dateEffet && (
                  <div className="flex gap-2"><span className="text-xs text-muted-foreground">Date d'effet</span><span className="font-medium">{fmtDate(acte.cible.dateEffet)}</span></div>
                )}
                {acte.cible.motif && (
                  <div className="flex gap-2"><span className="text-xs text-muted-foreground">Motif</span><span>{acte.cible.motif}</span></div>
                )}
                {effets && !effetsVides(effets) && !acte.effetsAppliques && (
                  <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                    À la notification : {effets.affectationsFermees.length} affectation(s) clôturée(s),
                    {" "}{effets.affectationsCreees.length} ouverte(s).
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4 text-primary" /> Journal de l'acte
              </CardTitle>
              <CardDescription>Écriture en ajout seul, rattachée à l'acte (§12)</CardDescription>
            </CardHeader>
            <CardContent>
              {entreesJournal.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune écriture depuis l'ouverture de cette session.</p>
              ) : (
                <div className="space-y-2.5">
                  {entreesJournal.map((j) => (
                    <div key={j.id} className="flex flex-wrap items-baseline gap-x-2 border-b pb-2 text-xs last:border-0">
                      <Badge variant="secondary" className="text-[10px]">{j.action}</Badge>
                      <span className="font-medium">{j.utilisateur}</span>
                      <span className="text-muted-foreground">
                        {j.ancienneValeur} → {j.nouvelleValeur}
                      </span>
                      <span className="ml-auto tabular-nums text-muted-foreground/70">
                        {j.horodatage.slice(0, 16).replace("T", " ")}
                      </span>
                      {j.justification && <div className="w-full text-muted-foreground">{j.justification}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
              <CardDescription>
                Ouvertes selon votre rôle, {" "}
                <span className="font-medium">{acte.instruitPar === user.id ? "et vous avez instruit ce dossier" : "et le circuit"}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ce dossier est clos : aucune transition n'est ouverte.
                </p>
              )}

              {(demandeMotif || actions.some((a) => a.motifRequis)) && actions.length > 0 && (
                <Textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Motif — obligatoire pour un retour ou un rejet"
                  className="min-h-[72px] text-sm"
                />
              )}

              {actions.map((a) => (
                <div key={a.code}>
                  <Button
                    className="w-full"
                    variant={a.ton === "principal" ? "default" : a.ton === "danger" ? "destructive" : "outline"}
                    disabled={!!a.blocage || transition.isPending}
                    onClick={() => lancer(a.code, a.libelle, a.motifRequis)}
                  >
                    {transition.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {a.libelle}
                  </Button>
                  {a.blocage && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                      <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />{a.blocage}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" /> Agent concerné</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {agent ? (
                <>
                  <div className="font-medium">{agent.prenom} {agent.nom}</div>
                  <div className="font-mono text-xs text-muted-foreground">{agent.matricule}</div>
                  <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                    <Link href={`/dgarh/agents/${agent.id}`}>Ouvrir le dossier <ArrowRight className="ml-2 h-3.5 w-3.5" /></Link>
                  </Button>
                </>
              ) : <span className="text-muted-foreground">—</span>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Pièces</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {acte.pieces.map((p) => (
                <div key={p.id} className="flex items-baseline justify-between gap-2 border-b pb-1.5 text-xs last:border-0">
                  <span className="truncate">{p.nom}</span>
                  <span className="shrink-0 text-muted-foreground">{p.taille}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1.5 p-4 text-xs">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Ouvert depuis</span><span className="font-medium tabular-nums">{joursDepuis(acte.dateCreation)} jours</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Échéance</span><span className="font-medium">{fmtDate(acte.dateEcheance)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Signature</span><span className="font-medium">{fmtDate(acte.dateSignature)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Initiateur</span><span className="font-medium">{acte.initiateur}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
