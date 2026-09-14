"use client";

import { useMemo, useState } from "react";
import { Repeat2, ShieldCheck, UserPlus } from "lucide-react";
import type { Entite, Habilitation, Utilisateur } from "@/lib/types";
import {
  NIVEAUX_DE_COMMANDEMENT as NIVEAUX_COMMANDES, NIVEAU_LABELS, RANG_COMMANDEMENT,
  RANG_HIERARCHIQUE, cheminDe, habilitationsEnVigueur, libelleProfil,
} from "@/lib/referentiels";
import type { Sortant } from "@/components/nexus/entite-constantes";
import { fmtDate, fmtNum } from "@/lib/format";
import { Badge, type Colonne, TableauModule } from "@/components/nexus/module";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Qui dirige quoi — la liste de travail de l'administrateur           */
/* ------------------------------------------------------------------ */

/**
 * L'écran qui manquait au bout de la chaîne.
 *
 * L'administrateur système crée les entités et y désigne une tête ; tout le
 * reste — le secrétariat, le personnel, les profils — est fait par cette tête
 * dans son périmètre. Il lui fallait donc un endroit qui réponde à deux
 * questions, et à deux seulement : **qui dirige quoi aujourd'hui**, et **où la
 * chaîne est interrompue** faute de responsable.
 *
 * La seconde est la plus utile. Une entité sans responsable n'est pas un vide
 * théorique : personne n'y inscrit d'agent, personne n'y attribue de profil, et
 * comme l'administrateur ne désigne que la tête, personne d'autre que lui ne
 * peut débloquer la situation. C'est sa liste de travail.
 */
export interface LigneResponsable {
  id: string;
  entite: Entite;
  chemin: string;
  compte: Utilisateur | null;
  habilitation: Habilitation | null;
  effectif: number;
}

/**
 * Les niveaux que ce registre montre.
 *
 * Ceux qui portent un chef — la table du référentiel, celle que lisent aussi
 * le semis et le tableau de bord — plus le **ministère** lui-même. Il ne se
 * crée pas et ne se désigne pas depuis la plateforme, mais il a une tête, et
 * un registre qui prétend dire qui dirige quoi ne peut pas commencer en
 * dessous d'elle.
 */
export const NIVEAUX_DE_COMMANDEMENT: Entite["niveau"][] = [
  "MINISTERE", ...NIVEAUX_COMMANDES,
];

export function lignesResponsables({ entites, comptes, habilitations, effectifs, aujourdhui }: {
  entites: Entite[];
  comptes: Utilisateur[];
  habilitations: Habilitation[];
  effectifs: Map<string, number>;
  aujourdhui: string;
}): LigneResponsable[] {
  /* Le responsable d'une entité est celui dont le profil **commande** — un
     secrétaire sert dans l'entité sans la diriger, et l'afficher comme
     responsable faisait passer pour pourvus des services qui ne l'étaient
     pas — et dont l'habilitation est en vigueur. À plusieurs, le rang le plus
     élevé l'emporte : c'est le cas normal d'une direction où servent aussi un
     chef de service et un chef de bureau. */
  const tete = new Map<string, { compte: Utilisateur; habilitation: Habilitation | null }>();
  comptes
    .filter((c) => c.actif && (RANG_HIERARCHIQUE[c.role] ?? 0) >= RANG_COMMANDEMENT)
    .forEach((c) => {
      const [courante] = habilitationsEnVigueur(habilitations, c.id, aujourdhui);
      if (!courante) return;
      const tenant = tete.get(c.entiteId);
      if (!tenant || (RANG_HIERARCHIQUE[c.role] ?? 0) > (RANG_HIERARCHIQUE[tenant.compte.role] ?? 0)) {
        tete.set(c.entiteId, { compte: c, habilitation: courante });
      }
    });

  return entites
    .filter((e) => e.actif !== false && NIVEAUX_DE_COMMANDEMENT.includes(e.niveau))
    .map((e) => {
      const t = tete.get(e.id);
      return {
        id: e.id,
        entite: e,
        chemin: cheminDe(e.id).map((x) => x.sigle).join(" › "),
        compte: t?.compte ?? null,
        habilitation: t?.habilitation ?? null,
        effectif: effectifs.get(e.id) ?? 0,
      };
    })
    .sort((a, b) => {
      // Les entités sans tête d'abord : c'est ce qu'on vient corriger.
      if (!a.compte !== !b.compte) return a.compte ? 1 : -1;
      return a.chemin.length - b.chemin.length || a.entite.sigle.localeCompare(b.entite.sigle);
    });
}

export function Responsables({ lignes, surDesignation }: {
  lignes: LigneResponsable[];
  /** Absent = ce profil lit le registre sans y désigner personne. */
  surDesignation?: (e: Entite, sortant?: Sortant) => void;
}) {
  const [filtres, setFiltres] = useState<Record<string, string>>({ etat: "all", niveau: "all" });

  const visibles = useMemo(() => lignes.filter((l) => {
    if (filtres.niveau !== "all" && l.entite.niveau !== filtres.niveau) return false;
    if (filtres.etat === "sans") return !l.compte;
    if (filtres.etat === "avec") return !!l.compte;
    return true;
  }), [lignes, filtres]);

  const niveaux = [...new Set(lignes.map((l) => l.entite.niveau))];
  const sans = lignes.filter((l) => !l.compte).length;

  const colonnes: Colonne<LigneResponsable>[] = [
    {
      cle: "entite", entete: "Entité", visible: "toujours",
      rendu: (l) => (
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-semibold">{l.entite.sigle}</div>
          <div className="max-w-[320px] truncate text-xs text-muted-foreground" title={l.entite.nom}>
            {l.entite.nom}
          </div>
        </div>
      ),
    },
    {
      cle: "niveau", entete: "Niveau", visible: "lg",
      rendu: (l) => <Badge variant="outline" className="text-[10px]">{NIVEAU_LABELS[l.entite.niveau]}</Badge>,
    },
    {
      cle: "responsable", entete: "Responsable",
      rendu: (l) => (l.compte
        ? (
          <div className="min-w-0 space-y-1">
            <div className="truncate text-sm font-medium">{l.compte.nomComplet}</div>
            <div className="truncate text-[11px] text-muted-foreground">{l.compte.email}</div>
            {/* La relève se déclenche d'ici : c'est la ligne où l'on constate
                qu'un chef est parti, pas trois écrans plus loin. */}
            {surDesignation && (
              <Button
                size="sm" variant="ghost"
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => surDesignation(l.entite, {
                  nom: l.compte!.nomComplet,
                  profil: libelleProfil(l.compte!.role),
                  agentId: l.compte!.agentId,
                })}
              >
                <Repeat2 className="mr-1 h-3 w-3" /> Remplacer
              </Button>
            )}
          </div>
        )
        : surDesignation
          ? (
            <Button size="sm" variant="outline" className="h-7 text-[11px]"
              onClick={() => surDesignation(l.entite)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Désigner
            </Button>
          )
          : <span className="text-[11px] text-muted-foreground">Aucun responsable désigné</span>),
    },
    {
      cle: "profil", entete: "Profil", visible: "md",
      rendu: (l) => (l.compte
        ? (
          <Badge variant="outline" className="whitespace-nowrap bg-emerald-500/12 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
            <ShieldCheck className="mr-1 h-3 w-3" /> {libelleProfil(l.compte.role)}
          </Badge>
        )
        : <span className="text-xs italic text-muted-foreground">la chaîne s&apos;arrête ici</span>),
    },
    {
      cle: "source", entete: "Le tient de", visible: "xl",
      rendu: (l) => (l.habilitation
        ? (
          <div className="min-w-0">
            <div className="truncate text-xs">
              {l.habilitation.accordePar ? l.habilitation.accordeParNom : "l'installation"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              depuis le {fmtDate(l.habilitation.dateDebut)}
            </div>
          </div>
        )
        : <span className="text-xs text-muted-foreground">—</span>),
    },
    {
      cle: "effectif", entete: "Effectif", aligne: "droite", visible: "md",
      rendu: (l) => <span className="tabular-nums text-sm">{fmtNum(l.effectif)}</span>,
    },
  ];

  return (
    <TableauModule<LigneResponsable>
      titre="Qui dirige quoi"
      description={sans > 0
        ? `${fmtNum(sans)} entité(s) n'ont personne à leur tête. Tant qu'il n'y en a pas, aucun agent ne peut y être inscrit : c'est à vous de les désigner, et à personne d'autre.`
        : "Chaque entité de commandement a un responsable en fonction. Le personnel s'y inscrit désormais sans vous."}
      lignes={visibles}
      colonnes={colonnes}
      recherche={(l, t) =>
        `${l.entite.sigle} ${l.entite.nom} ${l.compte?.nomComplet ?? ""}`.toLowerCase().includes(t.toLowerCase())}
      placeholderRecherche="Entité, sigle ou nom du responsable…"
      filtres={[
        {
          cle: "etat", libelle: "Toutes les entités",
          options: [
            { valeur: "sans", libelle: "Sans responsable" },
            { valeur: "avec", libelle: "Pourvues" },
          ],
        },
        {
          cle: "niveau", libelle: "Tous les niveaux",
          options: niveaux.map((n) => ({ valeur: n, libelle: NIVEAU_LABELS[n] })),
        },
      ]}
      valeursFiltres={filtres}
      surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
      vide="Aucune entité ne correspond à ce filtre."
      parPage={14}
    />
  );
}
