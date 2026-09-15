"use client";

import { entiteById, gradeById } from "@/lib/referentiels";
import { fmtPct } from "@/lib/format";
import { BadgeCategorie, BadgePosition } from "@/components/nexus/ui-kit";
import { Jauge, type Colonne } from "@/components/nexus/module";
import { Portrait } from "@/components/nexus/portrait";
import type { AgentProjete } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Les colonnes du fichier du personnel                                */
/* ------------------------------------------------------------------ */

/**
 * Sorties de la page pour la garder sous la barre des cinq cents lignes.
 *
 * Elles ne dépendent de rien de la page : un agent, et ce qu'on en montre.
 * Les mettre ici les rend aussi disponibles à tout écran qui listerait du
 * personnel — il y en aura d'autres.
 */
export const COLONNES_AGENTS: Colonne<AgentProjete>[] = [
  {
    cle: "agent", entete: "Agent",
    /* On trie sur le nom puis le prénom, comme un fichier de personnel se
       range depuis toujours — et non sur « prénom nom », qui est l'ordre de
       l'affichage. */
    valeurTri: (a) => `${a.nom} ${a.prenom}`,
    rendu: (a) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <Portrait photo={a.photo} prenom={a.prenom} nom={a.nom} cle={a.matricule} taille="sm" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{a.prenom} {a.nom}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{a.matricule}</div>
        </div>
      </div>
    ),
  },
  {
    cle: "categorie", entete: "Régime", visible: "md",
    valeurTri: (a) => a.categorie,
    rendu: (a) => <BadgeCategorie v={a.categorie} />,
  },
  {
    cle: "grade", entete: "Grade et échelon", visible: "lg",
    /* L'indice, et non le libellé : un tri par grade sert à voir qui est le
       plus haut placé, ce que l'alphabet ne dit pas. */
    valeurTri: (a) => a.indice ?? 0,
    rendu: (a) => a.gradeId
      ? (
        <div>
          <div className="text-xs">{gradeById(a.gradeId)?.libelle ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">
            {a.echelon ? `échelon ${a.echelon}` : ""}{a.indice ? ` — indice ${a.indice}` : ""}
          </div>
        </div>
      )
      : <span className="text-xs text-muted-foreground">hors carrière statutaire</span>,
  },
  {
    cle: "entite", entete: "Affectation", visible: "lg",
    valeurTri: (a) => entiteById(a.entiteId)?.sigle ?? "",
    rendu: (a) => (
      <span className="text-xs text-muted-foreground" title={entiteById(a.entiteId)?.nom}>
        {entiteById(a.entiteId)?.sigle ?? "—"}
      </span>
    ),
  },
  {
    cle: "position", entete: "Position", visible: "xl",
    valeurTri: (a) => a.nature,
    rendu: (a) => <BadgePosition v={a.nature} />,
  },
  {
    cle: "completude", entete: "Dossier", aligne: "droite",
    valeurTri: (a) => a.tauxCompletude,
    rendu: (a) => (
      <div className="ml-auto w-20">
        <div className="mb-1 text-right text-[11px] tabular-nums">{fmtPct(a.tauxCompletude)}</div>
        <Jauge
          valeur={a.tauxCompletude}
          teinte={a.tauxCompletude >= 75 ? "bg-emerald-500" : a.tauxCompletude >= 50 ? "bg-amber-500" : "bg-rose-500"}
        />
      </div>
    ),
  },
];
