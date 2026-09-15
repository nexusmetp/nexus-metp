"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Briefcase, Building2, FileCheck2, GraduationCap, MessageSquare,
  Percent, PenLine, Printer, Timer, UserCog, Users,
} from "lucide-react";
import {
  NIVEAU_LABELS, ROLE_LABELS, entiteById, perimetreVisible, visible,
} from "@/lib/referentiels";
import { fmtNum, fmtPct } from "@/lib/format";
import { useAuth } from "@/lib/store";
import { BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi } from "@/components/nexus/module";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFicheStructure } from "./donnees";
import {
  BlocAttention, BlocAttributions, BlocEffectifs, BlocSousEntites, LienFichier,
} from "./sections";

/* ------------------------------------------------------------------ */
/* La fiche d'une direction, d'un service, d'un bureau                 */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi cette page existe.
 *
 * Le tableau de bord donnait un chiffre par structure et, au clic, renvoyait
 * au fichier du personnel. C'est une réponse à « qui ? » quand la question
 * était « quoi ? ». Un directeur qui ouvre le nom de son service veut savoir
 * **ce dont il est chargé** — l'arrêté le dit, article par article —, **qui le
 * dirige**, **ce qu'il porte** et **ce qui y cloche aujourd'hui** : dossiers
 * qui traînent, postes vacants, entités sans chef, dossiers incomplets.
 *
 * Elle s'imprime. Une fiche de structure se porte en réunion, s'annote, se
 * joint à un rapport ; une page qu'on ne peut pas poser sur une table ne sert
 * qu'à celui qui a l'écran. Les feuilles d'impression sont dans `globals.css`
 * — la barre latérale, la barre du haut et les boutons disparaissent, le reste
 * tient sur du A4.
 *
 * Et elle mène à la rédaction : « Écrire une instruction » ouvre l'éditeur
 * avec cette structure pour sujet, si bien que les champs de fusion se
 * remplissent seuls. C'est le chaînon qui manquait entre constater et agir.
 */
export default function FicheStructurePage() {
  const user = useAuth((s) => s.user)!;
  const params = useParams();
  const id = String(params?.id ?? "");
  const entite = entiteById(id) ?? null;
  const fiche = useFicheStructure(entite);

  const autorise = entite && visible(perimetreVisible(user), entite.id);

  if (!entite) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Cette structure n&apos;existe pas dans l&apos;organigramme.
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dgarh/organisation">Revenir à l&apos;organigramme</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* Hors périmètre, on ne dit pas « introuvable » — ce serait faux — et on
     n'ouvre pas non plus : on dit que la structure existe et relève d'ailleurs. */
  if (!autorise) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-sm font-medium">{entite.sigle} — {entite.nom}</p>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
            Cette structure ne relève pas de votre périmètre. Son personnel et ses dossiers
            sont tenus par la structure dont elle dépend.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dgarh/organisation">Revenir à l&apos;organigramme</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!fiche || !fiche.pret) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Le fil d'Ariane : une structure ne se comprend pas sans sa chaîne. */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground print:text-[10px]">
        <Button variant="ghost" size="sm" className="h-7 px-2 print:hidden" asChild>
          <Link href="/dgarh/organisation"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Organigramme</Link>
        </Button>
        {fiche.chaine.map((e, i) => (
          <span key={e.id} className="flex items-center gap-1">
            {i > 0 && <span className="opacity-50">›</span>}
            {i === fiche.chaine.length - 1
              ? <span className="font-medium text-foreground">{e.sigle}</span>
              : <Link href={`/dgarh/organisation/${e.id}`} className="hover:text-primary hover:underline">{e.sigle}</Link>}
          </span>
        ))}
      </div>

      <PageHeader
        titre={`${entite.sigle} — ${entite.nom}`}
        description={[
          NIVEAU_LABELS[entite.niveau] ?? entite.niveau,
          fiche.parent ? `relève de ${fiche.parent.sigle}` : null,
          entite.ville ? `siège : ${entite.ville}` : null,
          `${fmtNum(fiche.branche.length)} entité${fiche.branche.length > 1 ? "s" : ""} dans la branche`,
        ].filter(Boolean).join(" · ")}
      >
        <BadgeProvenance v={entite.provenance} />
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer la fiche
        </Button>
        <div className="print:hidden"><LienFichier entiteId={entite.id} effectif={fiche.effectif} /></div>
        <Button size="sm" asChild className="print:hidden">
          <Link href={`/redaction?entite=${entite.id}`}>
            <PenLine className="mr-1.5 h-3.5 w-3.5" /> Écrire une instruction
          </Link>
        </Button>
      </PageHeader>

      {/* Qui commande ici. Placé avant les chiffres : c'est la première chose
          qu'on cherche sur une fiche de structure. */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-3.5">
          <div className="flex items-center gap-3">
            <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Responsable
              </div>
              {fiche.chef ? (
                <div className="text-sm">
                  <span className="font-medium">{fiche.chef.nomComplet}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {fiche.chef.fonction || ROLE_LABELS[fiche.chef.role]}
                  </span>
                </div>
              ) : (
                <div className="text-sm italic text-muted-foreground">
                  Aucun responsable désigné — l&apos;acte reste à verser au dossier.
                </div>
              )}
            </div>
            {/* Constater ne suffit pas : depuis la fiche, on écrit à celui qui
                tient la structure, sans avoir à le retrouver dans une liste de
                comptes. */}
            {fiche.chef && fiche.chef.id !== user.id && (
              <Button variant="ghost" size="sm" className="print:hidden" asChild>
                <Link href={`/messagerie?direct=${fiche.chef.id}`}>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Lui écrire
                </Link>
              </Button>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{entite.reference ?? "Fondement non renseigné"}</div>
          </div>
        </CardContent>
      </Card>

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Effectif de la branche", valeur: fiche.effectif, sousTitre: `dont ${fmtNum(fiche.enPropre)} rattachés en propre`, icon: Users },
        { ton: "emeraude", titre: "En activité", valeur: fiche.enActivite, sousTitre: `${fmtNum(fiche.enConge)} en congé aujourd'hui, ${fmtNum(fiche.horsService)} hors service`, icon: Building2 },
        { ton: "cyan", titre: "Dossiers en circulation", valeur: fiche.ouverts, sousTitre: `${fmtNum(fiche.horsDelai)} au-delà de quinze jours`, icon: FileCheck2 },
        { ton: "violet", titre: "Postes", valeur: fiche.postes, sousTitre: `${fmtNum(fiche.vacants)} vacant${fiche.vacants > 1 ? "s" : ""}`, icon: Briefcase },
      ]} />

      <RangeeKpi tuiles={[
        {
          ton: "indigo", titre: "Délai moyen d'instruction", icon: Timer,
          valeur: fiche.delaiMoyen === null ? "—" : `${fiche.delaiMoyen} j`,
          sousTitre: fiche.delaiMoyen === null
            ? "aucun dossier signé dans cette branche"
            : `cible : 15 jours · sur ${fmtNum(fiche.clos)} dossier${fiche.clos > 1 ? "s" : ""} signé${fiche.clos > 1 ? "s" : ""}`,
        },
        {
          ton: "ambre", titre: "Complétude des dossiers", icon: Percent,
          valeur: fiche.completude === null ? "—" : fmtPct(fiche.completude),
          sousTitre: fiche.completude === null
            ? "aucun agent rattaché à cette branche"
            : "pièces attendues effectivement au dossier",
        },
        { ton: "rose", titre: "Départs à préparer", valeur: fiche.departsProches, sousTitre: "agents de 58 ans et plus", icon: Users },
        {
          ton: "cyan", titre: "Personnel enseignant", valeur: fiche.enseignants, icon: GraduationCap,
          sousTitre: fiche.ageMoyen === null
            ? "aucun agent rattaché à cette branche"
            : `âge moyen ${fiche.ageMoyen} ans · ${fmtPct((fiche.femmes / fiche.effectif) * 100)} de femmes`,
        },
      ]} />

      <div className="grid gap-4 xl:grid-cols-2">
        <BlocAttributions entite={entite} />
        <BlocAttention points={fiche.attention} />
      </div>

      <BlocEffectifs fiche={fiche} />
      <BlocSousEntites enfants={fiche.enfants} />

      {/* Une feuille qui circule doit dire d'où elle vient et de quand elle
          date : sans cela, un tirage de la semaine dernière se discute comme
          s'il était d'aujourd'hui. */}
      <div className="hidden border-t pt-2 text-[9pt] text-muted-foreground print:block">
        NEXUS-METP · DGARH — fiche de {entite.sigle}, tirée le{" "}
        {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.
        Les chiffres sont ceux de la plateforme à cette date.
      </div>
    </div>
  );
}
