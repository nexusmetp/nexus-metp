"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, BookOpen, CheckCircle2, CircleHelp, FileCheck2, KeyRound,
  LifeBuoy, Lock, ScrollText, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import {
  CIRCUIT_ACTE, DROITS, MODULE_LABELS, ROLE_LABELS, cheminDe, entiteById,
  perimetreVisible, type ModuleKey,
} from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi } from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Les règles qui expliquent la plupart des « pourquoi je ne peux pas ». */
const REGLES = [
  {
    id: "acte",
    titre: "Rien ne change dans un dossier sans acte signé",
    icon: FileCheck2,
    texte:
      "Une affectation, un grade, une position ne se corrigent pas à la main. Il faut ouvrir un acte, "
      + "le faire instruire, le faire signer, puis le notifier : les effets ne sont reportés qu'à la "
      + "notification. C'est ce qui permet, des années plus tard, de dire par quelle décision un agent "
      + "se trouve où il est.",
    voir: { libelle: "Le registre des actes", href: "/dgarh/actes" },
  },
  {
    id: "separation",
    titre: "Qui instruit ne valide pas",
    icon: ShieldCheck,
    texte:
      "L'agent qui a instruit un dossier ne peut pas le valider. Ce n'est pas une gêne, c'est la "
      + "garantie qu'un second regard s'est posé sur la décision. Si un bouton vous est refusé sur un "
      + "dossier que vous avez traité, c'est cette règle qui s'applique.",
    voir: { libelle: "Ma bannette", href: "/dgarh/bannette" },
  },
  {
    id: "perimetre",
    titre: "Votre rôle dit ce que vous faites, votre entité dit sur qui",
    icon: Lock,
    texte:
      "Les droits se lisent rôle × module ; le périmètre, lui, se déduit du rattachement dans "
      + "l'organigramme. Deux chefs de bureau ont exactement les mêmes droits sur des populations "
      + "différentes. Rien ne se saisit : rattacher quelqu'un suffit à calculer ce qu'il voit.",
    voir: { libelle: "L'organigramme", href: "/dgarh/organigramme" },
  },
  {
    id: "journal",
    titre: "Le journal s'écrit en ajout seul",
    icon: ScrollText,
    texte:
      "Aucune écriture ne peut être modifiée ni supprimée, y compris par l'administrateur. Une "
      + "correction est une nouvelle écriture. Une modification sans acte de référence y apparaît comme "
      + "une anomalie, et c'est voulu.",
    voir: { libelle: "Le journal d'audit", href: "/journal" },
  },
  {
    id: "provenance",
    titre: "Ce qui n'est pas établi par un texte est signalé",
    icon: BookOpen,
    texte:
      "Chaque entité de l'organigramme porte sa provenance : établie par un texte, à vérifier, ou "
      + "décision d'organisation. L'outil ne fait pas passer une hypothèse pour du droit. Les lacunes "
      + "sont listées, pour qu'on sache ce qu'il reste à obtenir.",
    voir: { libelle: "Les référentiels", href: "/referentiels" },
  },
  {
    id: "delegation",
    titre: "Une absence ne doit pas arrêter un dossier",
    icon: KeyRound,
    texte:
      "Quand le signataire est absent, une délégation de signature ou un intérim permet à un autre de "
      + "signer en ses lieu et place, dans une fenêtre bornée et sur des types d'acte nommés. Hors de "
      + "cette fenêtre, la délégation ne produit rien.",
    voir: { libelle: "Délégations et intérims", href: "/delegations" },
  },
];

/** Ce qu'un rôle fait au quotidien, en une phrase et trois gestes. */
const PARCOURS: Partial<Record<string, { resume: string; gestes: { texte: string; href: string }[] }>> = {
  DIRECTEUR_GENERAL: {
    resume: "Vous répondez du personnel de tout le ministère, cabinet et inspections compris.",
    gestes: [
      { texte: "Ouvrir le tableau de bord pour voir ce qui remonte", href: "/dgarh" },
      { texte: "Regarder les directions sous tension", href: "/dgarh/pilotage" },
      { texte: "Signer les dossiers qui vous attendent", href: "/dgarh/bannette" },
    ],
  },
  ADMIN_SYSTEME: {
    resume: "Vous ouvrez les accès et réglez l'outil ; vous n'instruisez ni ne signez.",
    gestes: [
      { texte: "Ouvrir un compte et lui donner un rattachement", href: "/administration" },
      { texte: "Vérifier la matrice des droits", href: "/administration" },
      { texte: "Surveiller le journal d'audit", href: "/journal" },
    ],
  },
  DIRECTEUR_CENTRAL: {
    resume: "Vous conduisez votre direction et instruisez les dossiers de son périmètre.",
    gestes: [
      { texte: "Traiter votre bannette", href: "/dgarh/bannette" },
      { texte: "Inscrire le personnel de votre direction", href: "/dgarh/agents" },
      { texte: "Suivre le tableau des emplois", href: "/postes" },
    ],
  },
  CHEF_SERVICE: {
    resume: "Vous validez ce que vos bureaux instruisent.",
    gestes: [
      { texte: "Traiter votre bannette", href: "/dgarh/bannette" },
      { texte: "Suivre les réclamations de votre service", href: "/tickets" },
      { texte: "Consulter les textes qui fondent vos décisions", href: "/textes" },
    ],
  },
  CHEF_BUREAU: {
    resume: "Vous ouvrez et instruisez les dossiers, sans les valider vous-même.",
    gestes: [
      { texte: "Ouvrir un acte", href: "/dgarh/actes/nouveau" },
      { texte: "Suivre vos dossiers", href: "/dgarh/bannette" },
      { texte: "Répondre aux réclamations", href: "/tickets" },
    ],
  },
  AGENT_INSTRUCTEUR: {
    resume: "Vous instruisez les dossiers qui vous sont confiés.",
    gestes: [
      { texte: "Traiter votre bannette", href: "/dgarh/bannette" },
      { texte: "Rattacher les pièces aux dossiers", href: "/documents" },
      { texte: "Consulter un dossier d'agent", href: "/dgarh/agents" },
    ],
  },
  DIRECTEUR_DEPARTEMENTAL: {
    resume: "Vous gérez le personnel de votre département et remontez ses besoins.",
    gestes: [
      { texte: "Remonter vos états de besoins", href: "/besoins" },
      { texte: "Inscrire le personnel de votre département", href: "/dgarh/agents" },
      { texte: "Situer vos implantations", href: "/dgarh/national" },
    ],
  },
  CHEF_ETABLISSEMENT: {
    resume: "Vous exprimez les besoins de votre établissement et suivez son personnel.",
    gestes: [
      { texte: "Exprimer un état de besoins", href: "/besoins" },
      { texte: "Consulter le personnel affecté", href: "/dgarh/agents" },
      { texte: "Lire les notes de service", href: "/annonces" },
    ],
  },
  AGENT: {
    resume: "Vous consultez votre dossier et faites valoir vos droits.",
    gestes: [
      { texte: "Ouvrir votre dossier", href: "/mon-dossier" },
      { texte: "Déposer une réclamation", href: "/tickets" },
      { texte: "Accuser réception des circulaires", href: "/annonces" },
    ],
  },
};

const QUESTIONS = [
  {
    q: "Pourquoi un bouton m'est-il refusé sur un dossier ?",
    r: "Trois raisons possibles : vous avez instruit ce dossier et sa validation revient à un autre "
      + "agent ; le dossier n'est pas dans votre périmètre ; ou son étape en cours relève d'un autre "
      + "service. La fiche du dossier indique laquelle s'applique.",
  },
  {
    q: "J'ai signé un acte de mutation, pourquoi le dossier de l'agent n'a pas changé ?",
    r: "La signature ne suffit pas : les effets sont reportés à la notification. Et si la date d'effet "
      + "est postérieure à aujourd'hui, le dossier affiche l'affectation en vigueur, avec un bandeau "
      + "annonçant la décision à venir.",
  },
  {
    q: "Comment corriger une erreur dans un dossier ?",
    r: "Par un nouvel acte. Rien ne se corrige à la main, et le journal garde trace de l'erreur comme "
      + "de sa correction — c'est ce qui rend le dossier opposable.",
  },
  {
    q: "Je pars en mission, qui signe à ma place ?",
    r: "Consentez une délégation de signature ou un intérim, borné dans le temps et sur les types "
      + "d'acte que vous choisissez. Sans cela, vos dossiers attendent votre retour.",
  },
  {
    q: "Pourquoi certaines entités sont-elles marquées « à vérifier » ?",
    r: "Parce que le texte qui les fonde n'a pas pu être consulté intégralement. Elles sont "
      + "vraisemblables mais non établies, et l'outil préfère le dire plutôt que de faire passer une "
      + "hypothèse pour du droit.",
  },
  {
    q: "Mes données sont-elles partagées avec mes collègues ?",
    r: "Non, pas encore : la base vit dans votre navigateur. Deux personnes sur deux postes ne "
      + "partagent pas les mêmes données. Pour jouer le circuit à plusieurs rôles, changez de compte "
      + "dans le même navigateur. Un usage réel demande un serveur.",
  },
];

export default function AidePage() {
  const user = useAuth((s) => s.user)!;
  const monPerimetre = useMemo(() => perimetreVisible(user), [user]);
  const [ouvert, setOuvert] = useState<string | undefined>(REGLES[0].id);

  const mesModules = useMemo(
    () => (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((m) => DROITS[user.role]?.[m]),
    [user.role]
  );
  const enEcriture = mesModules.filter((m) => DROITS[user.role]?.[m] === "W");
  const parcours = PARCOURS[user.role];

  return (
    <>
      <PageHeader
        titre="Aide"
        description={`${ROLE_LABELS[user.role]} — ce que vous pouvez faire, pourquoi certaines choses vous sont refusées, et à qui vous adresser.`}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/tickets">Demander de l'assistance</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Modules ouverts", valeur: mesModules.length, sousTitre: `dont ${fmtNum(enEcriture.length)} en écriture`, icon: CheckCircle2 },
        { ton: "bleu", titre: "Votre périmètre", valeur: monPerimetre === null ? "Tout le ministère" : monPerimetre.size, sousTitre: "entités que vous couvrez", icon: Lock, href: "/dgarh/organigramme" },
        { ton: "indigo", titre: "Étapes du circuit", valeur: CIRCUIT_ACTE.length, sousTitre: "de l'ouverture à la notification", icon: FileCheck2, href: "/dgarh/actes" },
        { ton: "emeraude", titre: "Assistance", valeur: "24 h", sousTitre: "délai de réponse d'une demande normale", icon: LifeBuoy, href: "/tickets" },
      ]} />

      {parcours && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Votre poste de travail</CardTitle>
            <CardDescription>{parcours.resume}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {parcours.gestes.map((g, i) => (
              <motion.div
                key={g.href + i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.15 + i * 0.06 }}
              >
                <Link
                  href={g.href}
                  className="flex h-full items-start justify-between gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Étape {i + 1}
                    </div>
                    <div className="mt-1 text-sm font-medium leading-snug">{g.texte}</div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Six règles qui expliquent tout le reste</CardTitle>
            <CardDescription>
              La plupart des « pourquoi je ne peux pas » trouvent ici leur réponse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible value={ouvert} onValueChange={setOuvert}>
              {REGLES.map((r) => (
                <AccordionItem key={r.id} value={r.id}>
                  <AccordionTrigger className="text-left text-sm hover:no-underline">
                    <span className="flex items-center gap-2.5">
                      <r.icon className="h-4 w-4 shrink-0 text-primary" />
                      {r.titre}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{r.texte}</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href={r.voir.href}>{r.voir.libelle} <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Le circuit d'un acte</CardTitle>
              <CardDescription>Les mêmes étapes pour tous les types de décision.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {CIRCUIT_ACTE.map((e, i) => (
                <div key={e.ordre ?? i} className="flex items-start gap-3 rounded-lg border px-3 py-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{(e as any).libelle}</div>
                    {(e as any).acteur && (
                      <div className="text-[10px] text-muted-foreground">{(e as any).acteur}</div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ce que votre rôle ouvre</CardTitle>
              <CardDescription>Écriture en foncé, lecture seule en clair.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {mesModules.map((m) => (
                  <Badge
                    key={m}
                    variant={DROITS[user.role]?.[m] === "W" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {MODULE_LABELS[m]}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Votre rattachement — {cheminDe(user.entiteId).map((e) => e.sigle).join(" › ")} — décide de
                la population sur laquelle ces droits s'exercent.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Questions fréquentes</CardTitle>
          <CardDescription>Ce qu'on nous demande le plus souvent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {QUESTIONS.map((q, i) => (
              <AccordionItem key={i} value={`q-${i}`}>
                <AccordionTrigger className="text-left text-sm hover:no-underline">
                  <span className="flex items-center gap-2.5">
                    <CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {q.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{q.r}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
}
