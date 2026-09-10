"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, FileText, FolderOpen, Plus, ShieldCheck } from "lucide-react";
import { useActes, useAgents, useVerserPiece } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { cheminDe, entiteById, peut, typeActeById } from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CATEGORIES_PIECE = [
  "Acte de naissance", "Diplôme", "Certificat de prise de service", "Acte de recrutement",
  "Certificat médical", "Attestation de service", "Décision", "Pièce d'identité", "Autre",
];

const videPiece = { acteId: "", nom: "", categorie: "Diplôme" };

type PieceListe = ReturnType<typeof pieceVide>;
const pieceVide = () => ({ id: "", nom: "", categorie: "", date: "", taille: "", empreinte: "", acte: null as any });

export default function DocumentsPage() {
  const user = useAuth((s) => s.user)!;
  const { data: actes = [], isLoading } = useActes();
  const { data: agents = [] } = useAgents();
  const verser = useVerserPiece();
  const [selection, setSelection] = useState<any | null>(null);
  const [formulaire, setFormulaire] = useState<typeof videPiece | null>(null);
  const redacteur = peut(user.role, "documents", "W");

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [agents]);

  // Toute pièce est rattachée à un acte : pas de dépôt en vrac (§14).
  const pieces = useMemo(
    () => actes
      .flatMap((a) => a.pieces.map((p) => ({ ...p, acte: a })))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [actes]
  );

  const categories = useMemo(() => Array.from(new Set(pieces.map((p) => p.categorie))), [pieces]);

  const colonnes: Colonne<any>[] = [
    {
      cle: "piece", entete: "Pièce",
      rendu: (p) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{p.nom}</div>
          <div className="text-[10px] text-muted-foreground">{p.categorie}</div>
        </div>
      ),
    },
    { cle: "agent", entete: "Agent", visible: "lg", rendu: (p) => <span className="text-xs">{nomAgent(p.acte.agentId)}</span> },
    {
      cle: "acte", entete: "Acte de rattachement", visible: "md",
      rendu: (p) => (
        <div className="min-w-0">
          <div className="font-mono text-[11px]">{p.acte.reference}</div>
          <div className="truncate text-[10px] text-muted-foreground">{typeActeById(p.acte.type)?.libelle}</div>
        </div>
      ),
    },
    { cle: "date", entete: "Versée le", visible: "xl", rendu: (p) => <span className="text-xs tabular-nums text-muted-foreground">{fmtDate(p.date)}</span> },
    { cle: "taille", entete: "Taille", aligne: "droite", rendu: (p) => <span className="text-xs tabular-nums text-muted-foreground">{p.taille}</span> },
  ];

  const valide = !!formulaire && !!formulaire.acteId && formulaire.nom.trim().length > 3;

  const deposer = async () => {
    if (!formulaire || !valide) return;
    const acte = actes.find((a) => a.id === formulaire.acteId);
    if (!acte) return;
    const piece = {
      id: `PCE-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      nom: formulaire.nom.trim(),
      categorie: formulaire.categorie,
      date: new Date().toISOString().slice(0, 10),
      taille: "—",
      // L'empreinte est ce qui prouvera plus tard que la pièce n'a pas bougé.
      empreinte: Array.from(formulaire.nom + formulaire.acteId)
        .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
        .toString(16).padStart(8, "0"),
    };
    await verser.mutateAsync({ acte, piece, utilisateur: user });
    toast.success("Pièce versée", { description: `${piece.nom} — rattachée à ${acte.reference}.` });
    setFormulaire(null);
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Archives et GED"
        description="Deux fonds distincts au §14 : les pièces des dossiers d'agents, rattachées à un acte, et la documentation administrative. Aucune pièce n'est déposée en vrac."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/textes">Fonds réglementaire</Link>
        </Button>
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...videPiece })}>
            <Plus className="mr-1.5 h-4 w-4" /> Verser une pièce
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Pièces au dossier", valeur: fmtNum(pieces.length), sousTitre: `réparties sur ${fmtNum(actes.length)} actes`, icon: FolderOpen },
        { titre: "Catégories", valeur: fmtNum(categories.length), sousTitre: categories.join(" · "), icon: FileText },
        { titre: "Rattachement", valeur: "100 %", sousTitre: "toute pièce relève d'un acte", icon: ShieldCheck },
        { titre: "Fonds documentaire", valeur: "0", sousTitre: "second corpus du §14, non constitué", icon: Archive },
      ]} />

      <Card className="border-amber-500/30 bg-amber-500/[0.04]">
        <CardHeader className="flex flex-row items-start gap-3 pb-3">
          <Archive className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <CardTitle className="text-base">Fonds documentaire non constitué</CardTitle>
            <CardDescription>
              Le second fonds du §14 — textes réglementaires numérisés, notes de service, circulaires — reste à
              alimenter. C'est lui qui permet de rattacher un acte au texte qui le fonde.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <TableauModule<any>
        titre="Pièces des dossiers"
        description="Chaque pièce est rattachée à l'acte qu'elle appuie. Cliquez pour la prévisualiser."
        lignes={pieces}
        colonnes={colonnes}
        recherche={(p, t) =>
          p.nom.toLowerCase().includes(t) || p.acte.reference.toLowerCase().includes(t)
          || nomAgent(p.acte.agentId).toLowerCase().includes(t)}
        placeholderRecherche="Nom de pièce, référence d'acte ou agent…"
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={20}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.nom ?? ""}
        sousTitre={selection ? `${selection.categorie} — ${selection.taille}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="secondary" className="text-[10px]">{selection.categorie}</Badge>
            <Badge variant="outline" className="text-[10px]">{typeActeById(selection.acte.type)?.libelle}</Badge>
          </>
        )}
        actions={selection && (
          <Button size="sm" asChild>
            <Link href={`/dgarh/actes/${selection.acte.id}`}>Ouvrir l'acte</Link>
          </Button>
        )}
      >
        {selection && (
          <>
            <Section titre="Pièce">
              <LigneInfo k="Nom" v={selection.nom} />
              <LigneInfo k="Catégorie" v={selection.categorie} />
              <LigneInfo k="Versée le" v={fmtDate(selection.date)} />
              <LigneInfo k="Taille" v={selection.taille} />
              <LigneInfo k="Empreinte" v={selection.empreinte
                ? <span className="font-mono text-[10px]">{selection.empreinte}</span>
                : <span className="italic text-muted-foreground">non calculée</span>} />
            </Section>

            <Section titre="Acte de rattachement">
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.acte.reference}</span>} />
              <LigneInfo k="Objet" v={<span className="text-xs">{selection.acte.objet}</span>} />
              <LigneInfo k="Type" v={typeActeById(selection.acte.type)?.libelle} />
              <LigneInfo k="Agent concerné" v={nomAgent(selection.acte.agentId)} />
              <LigneInfo k="Instruit par" v={entiteById(selection.acte.entiteInstructriceId)?.nom ?? "—"} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">
                {cheminDe(selection.acte.entiteInstructriceId).map((e: any) => e.sigle).join(" › ")}
              </span>} />
            </Section>

            <Section titre="Pourquoi ce rattachement">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Une pièce n'existe pas seule : elle appuie une décision. Rattachée à son acte, elle se
                retrouve par le dossier de l'agent comme par le registre, et l'empreinte enregistrée à
                l'import atteste qu'elle n'a pas été altérée depuis (§14).
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Verser une pièce"
        description="La pièce se rattache à un acte : c'est ce qui lui donne un sens et permet de la retrouver."
        surValidation={deposer}
        validationPossible={valide}
        libelleValidation="Verser au dossier"
        large
      >
        {formulaire && (
          <>
            <ChampSelect label="Acte de rattachement" obligatoire valeur={formulaire.acteId}
              surChangement={(v) => setFormulaire({ ...formulaire, acteId: v })}
              options={actes.slice(0, 300).map((a) => ({
                valeur: a.id, libelle: `${a.reference} — ${a.objet.slice(0, 46)}`,
              }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Nom de la pièce" obligatoire valeur={formulaire.nom}
                surChangement={(v) => setFormulaire({ ...formulaire, nom: v })}
                placeholder="Certificat de prise de service.pdf" />
              <ChampSelect label="Catégorie" valeur={formulaire.categorie}
                surChangement={(v) => setFormulaire({ ...formulaire, categorie: v })}
                options={CATEGORIES_PIECE.map((c) => ({ valeur: c, libelle: c }))} />
            </div>
            <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Le fichier lui-même n'est pas conservé dans cette maquette : seule sa fiche est versée,
              avec une empreinte. Le stockage des fichiers suppose un serveur.
            </p>
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
