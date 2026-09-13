"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldQuestion } from "lucide-react";
import {
  COULEUR_ETAT, ETATS_PRESENCE, ETAT_PRESENCE_LABELS, SEUIL_ABSENCE_PROLONGEE,
  entiteById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { BadgeProvenance } from "@/components/nexus/ui-kit";
import { TableauModule, type Colonne } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AgentProjete, Pointage } from "@/lib/types";
import { anomalies, type Anomalie } from "./calculs";

/* ------------------------------------------------------------------ */
/* Historique, et les dossiers qui appellent un contrôle              */
/* ------------------------------------------------------------------ */

export function Historique({ agents, pointages }: { agents: AgentProjete[]; pointages: Pointage[] }) {
  const [filtres, setFiltres] = useState<Record<string, string>>({ etat: "all" });
  const agentDe = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const lignes = useMemo(() => pointages
    .filter((p) => agentDe.has(p.agentId))
    .filter((p) => filtres.etat === "all" || p.etat === filtres.etat)
    .sort((a, b) => b.date.localeCompare(a.date) || a.agentId.localeCompare(b.agentId)),
    [pointages, agentDe, filtres.etat]);

  const colonnes: Colonne<Pointage>[] = [
    { cle: "date", entete: "Jour", rendu: (p) => <span className="tabular-nums text-sm">{fmtDate(p.date)}</span> },
    {
      cle: "agent", entete: "Agent",
      rendu: (p) => {
        const a = agentDe.get(p.agentId);
        return (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{a ? `${a.prenom} ${a.nom}` : p.agentId}</div>
            <div className="truncate text-[11px] text-muted-foreground">{a?.matricule}</div>
          </div>
        );
      },
    },
    {
      cle: "entite", entete: "Service", visible: "lg",
      rendu: (p) => <span className="text-xs text-muted-foreground">{entiteById(p.entiteId)?.sigle ?? "—"}</span>,
    },
    {
      cle: "etat", entete: "Constat",
      rendu: (p) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR_ETAT[p.etat])}>
          {ETAT_PRESENCE_LABELS[p.etat]}
        </Badge>
      ),
    },
    {
      cle: "heures", entete: "Arrivée / départ", aligne: "droite", visible: "md",
      rendu: (p) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {p.heureArrivee || "—"} · {p.heureDepart || "—"}
        </span>
      ),
    },
    {
      cle: "saisi", entete: "Constaté par", visible: "xl",
      rendu: (p) => <span className="text-[11px] text-muted-foreground">{p.saisiParNom}</span>,
    },
  ];

  return (
    <TableauModule<Pointage>
      titre="Historique des pointages"
      description="Chaque constat porte le nom de celui qui l'a posé. Une correction ne l'effface pas : elle s'inscrit au journal d'audit."
      lignes={lignes}
      colonnes={colonnes}
      recherche={(p, t) => {
        const a = agentDe.get(p.agentId);
        return !!a && (a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.toLowerCase().includes(t));
      }}
      placeholderRecherche="Nom, prénom ou matricule…"
      filtres={[{
        cle: "etat", libelle: "Tous les constats",
        options: ETATS_PRESENCE.map((e) => ({ valeur: e, libelle: ETAT_PRESENCE_LABELS[e] })),
      }]}
      valeursFiltres={filtres}
      surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
      vide="Aucun pointage enregistré dans ce périmètre."
      parPage={20}
    />
  );
}

/**
 * Les dossiers à contrôler.
 *
 * Le ton de cet écran est le point le plus délicat du module. Une absence
 * prolongée n'établit rien : elle peut couvrir une hospitalisation, un ordre
 * de mission jamais transmis, un agent réaffecté sans acte. L'écran dit donc
 * « à vérifier », jamais « en faute », et il n'ouvre aucune procédure — il
 * propose d'aller voir le dossier.
 */
export function AVerifier({
  agents, pointages, seuil,
}: { agents: AgentProjete[]; pointages: Pointage[]; seuil: number }) {
  const lignes = useMemo(() => anomalies(agents, pointages, seuil), [agents, pointages, seuil]);

  const colonnes: Colonne<Anomalie>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (a) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{a.agent.prenom} {a.agent.nom}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {a.agent.matricule} · {entiteById(a.agent.entiteId)?.sigle ?? "affectation inconnue"}
          </div>
        </div>
      ),
    },
    {
      cle: "jours", entete: "Jours ouvrés", aligne: "droite",
      rendu: (a) => (
        <span className={cn("tabular-nums text-sm font-semibold", a.justifiee ? "text-amber-600" : "text-rose-600")}>
          {a.jours}
        </span>
      ),
    },
    {
      cle: "debut", entete: "Depuis le", visible: "md",
      rendu: (a) => <span className="tabular-nums text-xs text-muted-foreground">{fmtDate(a.debut)}</span>,
    },
    {
      cle: "libelle", entete: "Ce qui est constaté", visible: "lg",
      rendu: (a) => <span className="text-xs text-muted-foreground">{a.libelle}</span>,
    },
    {
      cle: "action", entete: "", aligne: "droite",
      rendu: (a) => (
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <Link href={`/dgarh/agents/${a.agent.id}`} onClick={(e) => e.stopPropagation()}>Ouvrir le dossier</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldQuestion className="h-4 w-4 text-amber-600" />
            Ce que cette liste dit — et ce qu'elle ne dit pas
          </CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Elle relève les agents dont le pointage n'a marqué aucun service depuis au moins{" "}
              <strong>{seuil} jours ouvrés</strong>. C'est une invitation à ouvrir un dossier, pas un
              constat de faute : une absence prolongée peut couvrir une hospitalisation, un ordre de
              mission jamais transmis, ou une affectation faite sans acte.
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <BadgeProvenance v={SEUIL_ABSENCE_PROLONGEE.provenance} />
              <span className="text-xs">
                Le seuil de {SEUIL_ABSENCE_PROLONGEE.jours} jours est une proposition de l'outil. Aucun
                texte ne nous a été communiqué ; la DGARH le fixera dans Système.
              </span>
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <TableauModule<Anomalie>
        titre={`Dossiers à contrôler (${fmtNum(lignes.length)})`}
        description="Triés par durée d'absence continue. Un jour non pointé interrompt le comptage : il ne prouve rien."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) =>
          a.agent.nom.toLowerCase().includes(t)
          || a.agent.prenom.toLowerCase().includes(t)
          || a.agent.matricule.toLowerCase().includes(t)}
        placeholderRecherche="Nom, prénom ou matricule…"
        vide="Aucune absence continue au-delà du seuil dans ce périmètre."
        parPage={14}
      />
    </div>
  );
}
