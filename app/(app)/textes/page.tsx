"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookMarked, FileWarning, Landmark, Plus, ScrollText, Scale } from "lucide-react";
import { useActes, useEnregistrerTexte, useTextes } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { ENTITES, NIVEAU_LABELS, entiteById, peut } from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { BadgeProvenance, PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, LigneInfo,
  PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { NatureTexte, TexteReglementaire } from "@/lib/types";

const NATURE_LABELS: Record<NatureTexte, string> = {
  LOI: "Loi", DECRET: "Décret", ARRETE: "Arrêté",
  CIRCULAIRE: "Circulaire", NOTE_SERVICE: "Note de service", CONVENTION: "Convention",
};

/** Hiérarchie des normes : elle décide laquelle l'emporte. */
const RANG: Record<NatureTexte, number> = {
  LOI: 1, DECRET: 2, ARRETE: 3, CIRCULAIRE: 4, NOTE_SERVICE: 5, CONVENTION: 6,
};

const vide = {
  reference: "", titre: "", nature: "ARRETE" as NatureTexte,
  dateSignature: new Date().toISOString().slice(0, 10),
  datePublication: "", journalOfficiel: "", resume: "", motsCles: "", entiteId: "",
};

export default function FondsReglementairePage() {
  const user = useAuth((s) => s.user)!;
  const { data: textes = [], isLoading } = useTextes();
  const { data: actes = [] } = useActes();
  const enregistrer = useEnregistrerTexte();

  const [selection, setSelection] = useState<TexteReglementaire | null>(null);
  const [formulaire, setFormulaire] = useState<typeof vide | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ nature: "all", provenance: "all" });

  const redacteur = peut(user.role, "textes", "W");

  const lignes = useMemo(() => textes
    .filter((t) => filtres.nature === "all" || t.nature === filtres.nature)
    .filter((t) => filtres.provenance === "all" || t.provenance === filtres.provenance)
    .sort((a, b) => RANG[a.nature] - RANG[b.nature] || b.dateSignature.localeCompare(a.dateSignature)),
    [textes, filtres]);

  const stats = useMemo(() => ({
    total: textes.length,
    publies: textes.filter((t) => t.journalOfficiel && !/non consult/i.test(t.journalOfficiel)).length,
    aVerifier: textes.filter((t) => t.provenance !== "TEXTE").length,
    organisent: textes.filter((t) => t.entiteId).length,
  }), [textes]);

  /* Combien d'actes citent chaque texte : un texte que personne ne cite
     n'a pas encore trouvé son usage. */
  const citations = useMemo(() => {
    const m = new Map<string, number>();
    textes.forEach((t) => {
      const n = actes.filter((a) => (a as any).reference?.includes(t.reference.split(" ")[2] ?? "§§")).length;
      m.set(t.id, n);
    });
    return m;
  }, [textes, actes]);

  const valide = !!formulaire
    && formulaire.reference.trim().length > 5
    && formulaire.titre.trim().length > 10
    && formulaire.resume.trim().length > 20;

  const verser = async () => {
    if (!formulaire || !valide) return;
    const texte: TexteReglementaire = {
      id: `TXT-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      reference: formulaire.reference.trim(),
      titre: formulaire.titre.trim(),
      nature: formulaire.nature,
      dateSignature: formulaire.dateSignature,
      datePublication: formulaire.datePublication || undefined,
      journalOfficiel: formulaire.journalOfficiel.trim() || undefined,
      resume: formulaire.resume.trim(),
      motsCles: formulaire.motsCles.split(",").map((m) => m.trim()).filter(Boolean),
      entiteId: formulaire.entiteId || null,
      // Un texte versé avec sa référence au Journal officiel est établi ;
      // sans elle, il reste une pièce à confirmer.
      provenance: formulaire.journalOfficiel.trim() ? "TEXTE" : "A_VERIFIER",
    };
    await enregistrer.mutateAsync({ texte, utilisateur: user, creation: true });
    toast.success("Texte versé au fonds", { description: texte.reference });
    setFormulaire(null);
    setSelection(texte);
  };

  const colonnes: Colonne<TexteReglementaire>[] = [
    {
      cle: "texte", entete: "Texte",
      rendu: (t) => (
        <div className="min-w-0">
          <div className="text-sm font-medium">{t.reference}</div>
          <div className="max-w-[420px] truncate text-[11px] text-muted-foreground" title={t.titre}>{t.titre}</div>
        </div>
      ),
    },
    {
      cle: "nature", entete: "Nature", visible: "md",
      rendu: (t) => <Badge variant="secondary" className="text-[10px]">{NATURE_LABELS[t.nature]}</Badge>,
    },
    {
      cle: "organise", entete: "Organise", visible: "xl",
      rendu: (t) => t.entiteId
        ? <span className="text-xs text-muted-foreground">{entiteById(t.entiteId)?.sigle ?? "—"}</span>
        : <span className="text-xs text-muted-foreground/50">—</span>,
    },
    { cle: "date", entete: "Signé le", visible: "lg", rendu: (t) => <span className="text-xs tabular-nums">{fmtDate(t.dateSignature)}</span> },
    {
      cle: "jo", entete: "Publication", visible: "lg",
      rendu: (t) => t.journalOfficiel
        ? <span className="text-[11px] text-muted-foreground">{t.journalOfficiel}</span>
        : <span className="text-[11px] italic text-muted-foreground/60">non publiée</span>,
    },
    { cle: "provenance", entete: "Provenance", aligne: "droite", rendu: (t) => <BadgeProvenance v={t.provenance} /> },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Fonds réglementaire"
        description="Le second corpus du §14 : les textes qui fondent les décisions. Sans lui, un acte cite une référence que personne ne peut ouvrir."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/documents">Pièces des dossiers</Link>
        </Button>
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...vide })}>
            <Plus className="mr-1.5 h-4 w-4" /> Verser un texte
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "indigo", titre: "Textes au fonds", valeur: stats.total, sousTitre: "lois, décrets, arrêtés, circulaires", icon: BookMarked },
        { ton: "emeraude", titre: "Publiés au Journal officiel", valeur: stats.publies, sousTitre: "référence de publication connue", icon: Scale },
        { ton: "bleu", titre: "Organisent une entité", valeur: stats.organisent, sousTitre: "rattachés à l'organigramme", icon: Landmark, href: "/dgarh/organigramme" },
        { ton: "ambre", titre: "À confirmer", valeur: stats.aVerifier, sousTitre: "texte non consulté intégralement", icon: FileWarning },
      ]} />

      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="flex flex-row items-start gap-3 pb-3">
          <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <CardTitle className="text-base">Un fonds amorcé, pas constitué</CardTitle>
            <CardDescription>
              Les textes recensés ici le sont par leur référence et leur portée ; leur contenu intégral
              n'a pas pu être consulté depuis cet environnement. Le Journal officiel n° 44 de 2022, qui
              porte les arrêtés d'organisation, reste la pièce maîtresse à verser.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <TableauModule<TexteReglementaire>
        titre="Textes"
        description="Classés par rang dans la hiérarchie des normes : la loi avant le décret, le décret avant l'arrêté."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(t, q) =>
          t.reference.toLowerCase().includes(q) || t.titre.toLowerCase().includes(q)
          || t.resume.toLowerCase().includes(q) || t.motsCles.some((m) => m.toLowerCase().includes(q))}
        placeholderRecherche="Référence, titre, mot-clé…"
        filtres={[
          { cle: "nature", libelle: "Toutes natures", options: (Object.keys(NATURE_LABELS) as NatureTexte[]).map((n) => ({ valeur: n, libelle: NATURE_LABELS[n] })) },
          { cle: "provenance", libelle: "Toutes provenances", options: [
            { valeur: "TEXTE", libelle: "Établi par un texte" },
            { valeur: "A_VERIFIER", libelle: "À vérifier" },
            { valeur: "RECOMMANDATION", libelle: "Recommandation" },
          ] },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={14}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.titre ?? ""}
        sousTitre={selection?.reference}
        etiquette={selection && (
          <>
            <Badge variant="secondary" className="text-[10px]">{NATURE_LABELS[selection.nature]}</Badge>
            <BadgeProvenance v={selection.provenance} />
          </>
        )}
        actions={selection?.entiteId && (
          <Button size="sm" asChild>
            <Link href="/dgarh/organigramme">Voir l'entité qu'il organise</Link>
          </Button>
        )}
      >
        {selection && (
          <>
            <Section titre="Objet">
              <p className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">{selection.resume}</p>
            </Section>

            <Section titre="Identification">
              <LigneInfo k="Référence" v={selection.reference} />
              <LigneInfo k="Nature" v={NATURE_LABELS[selection.nature]} />
              <LigneInfo k="Rang dans la hiérarchie" v={`${RANG[selection.nature]} sur 6`} />
              <LigneInfo k="Signé le" v={fmtDate(selection.dateSignature)} />
              {selection.datePublication && <LigneInfo k="Publié le" v={fmtDate(selection.datePublication)} />}
              <LigneInfo k="Journal officiel" v={selection.journalOfficiel ?? "non publiée"} />
            </Section>

            {selection.entiteId && (
              <Section titre="Portée organique">
                <LigneInfo k="Entité organisée" v={entiteById(selection.entiteId)?.nom ?? "—"} />
                <LigneInfo k="Niveau" v={NIVEAU_LABELS[entiteById(selection.entiteId)?.niveau ?? "DIRECTION"]} />
              </Section>
            )}

            <Section titre="Mots-clés">
              <div className="flex flex-wrap gap-1.5">
                {selection.motsCles.map((m) => (
                  <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                ))}
                {selection.motsCles.length === 0 && (
                  <span className="text-xs text-muted-foreground">Aucun mot-clé.</span>
                )}
              </div>
            </Section>

            <Section titre="Usage">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {citations.get(selection.id)
                  ? `${fmtNum(citations.get(selection.id)!)} actes portent une référence apparentée.`
                  : "Aucun acte ne cite encore ce texte. Un texte qui ne fonde rien n'a pas trouvé son usage."}
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Verser un texte au fonds"
        description="Un texte versé avec sa référence de publication est marqué comme établi ; sans elle, il reste à confirmer."
        surValidation={verser}
        validationPossible={valide}
        libelleValidation="Verser"
        large
      >
        {formulaire && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Nature" obligatoire valeur={formulaire.nature}
                surChangement={(v) => setFormulaire({ ...formulaire, nature: v as NatureTexte })}
                options={(Object.keys(NATURE_LABELS) as NatureTexte[]).map((n) => ({ valeur: n, libelle: NATURE_LABELS[n] }))} />
              <ChampTexte label="Référence" obligatoire valeur={formulaire.reference}
                surChangement={(v) => setFormulaire({ ...formulaire, reference: v })}
                placeholder="Arrêté n° 25567 du 30 décembre 2022" />
            </div>
            <ChampTexte label="Titre" obligatoire valeur={formulaire.titre}
              surChangement={(v) => setFormulaire({ ...formulaire, titre: v })}
              placeholder="Portant attributions et organisation de…" />
            <div className="grid gap-4 sm:grid-cols-3">
              <ChampTexte label="Signé le" type="date" obligatoire valeur={formulaire.dateSignature}
                surChangement={(v) => setFormulaire({ ...formulaire, dateSignature: v })} />
              <ChampTexte label="Publié le" type="date" valeur={formulaire.datePublication}
                surChangement={(v) => setFormulaire({ ...formulaire, datePublication: v })} />
              <ChampTexte label="Journal officiel" valeur={formulaire.journalOfficiel}
                surChangement={(v) => setFormulaire({ ...formulaire, journalOfficiel: v })}
                placeholder="JO n° 44 de 2022" />
            </div>
            <ChampSelect label="Entité organisée" valeur={formulaire.entiteId}
              surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
              options={[{ valeur: "", libelle: "Aucune — texte général" },
                ...ENTITES.map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))]} />
            <ChampZone label="Objet" obligatoire lignes={4} valeur={formulaire.resume}
              surChangement={(v) => setFormulaire({ ...formulaire, resume: v })}
              placeholder="Ce que le texte crée, organise ou fixe, en quelques phrases." />
            <ChampTexte label="Mots-clés" valeur={formulaire.motsCles}
              surChangement={(v) => setFormulaire({ ...formulaire, motsCles: v })}
              placeholder="organisation, directions, carrière"
              aide="Séparés par des virgules ; ils servent la recherche." />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
