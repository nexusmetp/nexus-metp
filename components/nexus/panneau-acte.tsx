"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, FileText } from "lucide-react";
import { useAgentsProjetes, useTransitionActe } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { transitionsPour } from "@/lib/actes";
import {
  CIRCUIT_ACTE, STATUT_ACTE_LABELS, cheminDe, entiteById, gradeById, typeActeById,
} from "@/lib/referentiels";
import { fmtDate, joursDepuis } from "@/lib/format";
import { BadgeStatutActe } from "@/components/nexus/ui-kit";
import { LigneInfo, PanneauDetail, Section } from "@/components/nexus/module";
import { DocumentsLies } from "@/components/nexus/documents-lies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Acte } from "@/lib/types";

/** Le circuit, étape par étape, avec l'horodatage qui mesure les délais réels. */
function Circuit({ acte }: { acte: Acte }) {
  return (
    <div className="space-y-2 border-l-2 border-primary/20 py-1 pl-4">
      {acte.etapes.map((e) => (
        <div key={e.id} className="flex items-start gap-3 text-xs">
          <span
            className={cn(
              "mt-1 h-2 w-2 shrink-0 rounded-full",
              e.statut === "TERMINEE" ? "bg-emerald-500"
                : e.statut === "EN_COURS" ? "bg-primary ring-4 ring-primary/15"
                : "bg-muted-foreground/25"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className={cn("font-medium", e.statut === "A_VENIR" && "text-muted-foreground")}>
                {e.libelle}
              </span>
              <span className="text-[10px] text-muted-foreground">{entiteById(e.entiteId)?.sigle}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {e.dateEntree ? fmtDate(e.dateEntree) : "—"}
              {e.utilisateur && ` · ${e.utilisateur}`}
            </div>
            {e.commentaire && <div className="mt-0.5 text-[11px] font-medium text-amber-600">{e.commentaire}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Fiche de l'acte, en panneau centré.
 *
 * Le registre est fait pour le coup d'œil : la fiche apporte ce qu'on vient
 * y chercher — où en est le dossier, ce qu'il changera, et le geste suivant.
 * Les transitions sont ici plutôt que sur la ligne du tableau : agir sur un
 * acte demande de l'avoir sous les yeux.
 */
export function PanneauActe({
  acte, surFermeture, surTransfert,
}: {
  acte: Acte | null;
  surFermeture: () => void;
  surTransfert?: (texte: string, titre: string) => void;
}) {
  const user = useAuth((s) => s.user)!;
  const { data: agents = [] } = useAgentsProjetes();
  const transition = useTransitionActe();
  const [motif, setMotif] = useState("");

  const agent = useMemo(() => agents.find((a) => a.id === acte?.agentId), [agents, acte]);
  const actions = useMemo(() => (acte ? transitionsPour(acte, user) : []), [acte, user]);
  const motifAttendu = actions.some((a) => a.motifRequis && !a.blocage);

  if (!acte) return null;

  const lancer = (code: any, libelle: string, motifRequis?: boolean) => {
    if (motifRequis && !motif.trim()) {
      toast.info("Motif requis", { description: "Indiquez ce qui manque avant de renvoyer le dossier." });
      return;
    }
    transition.mutate(
      { acte, code, utilisateur: user, motif: motif.trim() || undefined },
      {
        onSuccess: (suivant) => {
          setMotif("");
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

  const cible = acte.cible;
  const cibleEntite = entiteById(cible?.entiteId ?? "");
  const age = joursDepuis(acte.dateCreation);
  const etapeEnCours = acte.etapes.find((e) => e.statut === "EN_COURS");

  return (
    <PanneauDetail
      ouvert={!!acte}
      surFermeture={surFermeture}
      titre={acte.objet}
      sousTitre={`${typeActeById(acte.type)?.libelle} — créé le ${fmtDate(acte.dateCreation)}`}
      large
      etiquette={
        <>
          <Badge variant="outline" className="font-mono text-[10px]">{acte.reference}</Badge>
          <BadgeStatutActe v={acte.statut} />
          {age > 15 && acte.statut !== "NOTIFIE" && acte.statut !== "ARCHIVE" && (
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">
              {age} jours d'ouverture
            </Badge>
          )}
        </>
      }
      actions={
        <>
          <DocumentsLies
            source="acte"
            contexte={{ acte, agent, signataire: { nom: user.nomComplet } }}
            surTransfert={surTransfert}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dgarh/actes/${acte.id}`}>
              Fiche complète <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          {actions.filter((a) => !a.blocage).map((a) => (
            <Button
              key={a.code}
              size="sm"
              variant={a.ton === "danger" ? "destructive" : a.ton === "neutre" ? "outline" : "default"}
              disabled={transition.isPending}
              onClick={() => lancer(a.code, a.libelle, a.motifRequis)}
            >
              {a.libelle}
            </Button>
          ))}
        </>
      }
    >
      <Section titre="L'acte">
        <LigneInfo k="Référence" v={<span className="font-mono text-xs">{acte.reference}</span>} />
        <LigneInfo k="Type" v={typeActeById(acte.type)?.libelle} />
        <LigneInfo k="Objet" v={<span className="text-xs">{acte.objet}</span>} />
        <LigneInfo k="Agent concerné" v={agent ? (
          <Link href={`/dgarh/agents/${agent.id}`} className="hover:text-primary hover:underline">
            {agent.prenom} {agent.nom} · {agent.matricule}
          </Link>
        ) : "—"} />
        <LigneInfo k="Bureau instructeur" v={entiteById(acte.entiteInstructriceId)?.nom} />
        <LigneInfo k="Chaîne" v={<span className="text-[11px]">
          {cheminDe(acte.entiteInstructriceId).map((e) => e.sigle).join(" › ")}
        </span>} />
        <LigneInfo k="Initiateur" v={acte.initiateur} />
        <LigneInfo k="Créé le" v={fmtDate(acte.dateCreation)} />
        <LigneInfo k="Échéance" v={fmtDate(acte.dateEcheance)} />
        <LigneInfo k="Signé le" v={acte.dateSignature ? fmtDate(acte.dateSignature) : <span className="italic text-muted-foreground">non signé</span>} />
      </Section>

      <Section titre="Circuit d'instruction" action={
        <span className="text-[11px] text-muted-foreground">
          {etapeEnCours ? `Étape ${etapeEnCours.ordre} sur ${CIRCUIT_ACTE.length}` : "Circuit clos"}
        </span>
      }>
        <Circuit acte={acte} />
      </Section>

      <Section titre="Ce que l'acte changera">
        {cible ? (
          <>
            {cibleEntite && <LigneInfo k="Nouvelle affectation" v={cibleEntite.nom} />}
            {cible.fonction && <LigneInfo k="Fonction" v={cible.fonction} />}
            {cible.gradeId && <LigneInfo k="Grade" v={gradeById(cible.gradeId)?.libelle} />}
            {cible.classe != null && <LigneInfo k="Classe" v={cible.classe} />}
            {cible.echelon != null && <LigneInfo k="Échelon" v={cible.echelon} />}
            {cible.nature && <LigneInfo k="Position" v={cible.nature} />}
            {cible.motif && <LigneInfo k="Motif" v={<span className="text-xs">{cible.motif}</span>} />}
            <LigneInfo k="Date d'effet" v={fmtDate(cible.dateEffet)} />
            <p className="mt-2 rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {acte.effetsAppliques
                ? "Ces effets ont été reportés au dossier lors de la notification."
                : "Rien n'est encore reporté au dossier : les effets ne s'appliquent qu'à la notification (§09, étape 10)."}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Cet acte ne porte pas de cible : il constate sans modifier la situation administrative.
          </p>
        )}
      </Section>

      <Section titre={`Pièces du dossier (${acte.pieces.length})`}>
        {acte.pieces.length ? (
          <div className="space-y-1.5">
            {acte.pieces.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{p.nom}</div>
                    <div className="text-[10px] text-muted-foreground">{p.categorie} · {fmtDate(p.date)}</div>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{p.empreinte ?? p.taille}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aucune pièce versée. Un dossier sans pièce d'appui se retournera à l'instruction.
          </p>
        )}
      </Section>

      {actions.some((a) => a.blocage) && (
        <Section titre="Gestes indisponibles">
          <div className="space-y-1.5">
            {actions.filter((a) => a.blocage).map((a) => (
              <div key={a.code} className="rounded-lg border border-dashed px-3 py-2">
                <div className="text-xs font-medium">{a.libelle}</div>
                <div className="text-[11px] text-muted-foreground">{a.blocage}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {motifAttendu && (
        <Section titre="Motif">
          <Textarea
            value={motif}
            onChange={(e: any) => setMotif(e.target.value)}
            rows={3}
            placeholder="Ce qui manque, ou la raison du rejet. Le motif est journalisé et suit le dossier."
          />
        </Section>
      )}
    </PanneauDetail>
  );
}
