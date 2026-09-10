"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Copy, Download, Eye, Pencil, PenLine, Printer, RotateCcw, Send, X,
} from "lucide-react";
import {
  composer, exporter, LIBELLE_FORMAT, modeleParCle, nomFichier, rendreDocument,
  type CleModele, type ContexteDocument, type Format,
} from "@/lib/documents";
import { copier, telecharger } from "@/lib/export";
import { useEnregistrerDocument } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { peut } from "@/lib/referentiels";
import type { DocumentEmis } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ID_IMPRESSION, useStylesDocument } from "@/components/nexus/styles-document";
import { cn } from "@/lib/utils";

/**
 * Visionneuse et éditeur de document.
 *
 * Le document se compose depuis les données, puis se reprend à la main :
 * un modèle ne couvre jamais tous les cas, et un agent qui ne peut pas
 * corriger une phrase rouvre son traitement de texte et refait la pièce
 * à côté de l'outil. La reprise se fait dans la page même — ce qui est
 * relu est exactement ce qui s'imprime et ce qui s'exporte.
 */

export function VisionneuseDocument({
  ouvert, surFermeture, cle, contexte, surTransfert,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  cle: CleModele | null;
  contexte: ContexteDocument;
  surTransfert?: (texte: string, titre: string) => void;
}) {
  useStylesDocument();
  const [occupe, setOccupe] = useState(false);
  const [modification, setModification] = useState(false);
  const [repris, setRepris] = useState(false);
  const feuille = useRef<HTMLDivElement | null>(null);
  const user = useAuth((st) => st.user);
  const consigner = useEnregistrerDocument();

  const doc = useMemo(() => (cle ? composer(cle, contexte) : null), [cle, contexte]);
  const descripteur = cle ? modeleParCle(cle) : undefined;
  const html = useMemo(() => (doc ? rendreDocument(doc) : ""), [doc]);

  /* Le corps est posé au moment où le nœud entre dans le DOM, puis laissé
     au DOM : React ne doit plus y toucher, sinon la première frappe de
     l'utilisateur serait effacée par un rendu déclenché ailleurs.
     Une ref-callback plutôt qu'un effet — le dialogue monte son contenu dans
     un portail, et l'ordre d'exécution des effets n'y est pas garanti. */
  const poser = (el: HTMLDivElement | null) => {
    feuille.current = el;
    if (el && el.dataset.pose !== html.length.toString()) {
      el.innerHTML = html;
      el.dataset.pose = html.length.toString();
    }
  };

  const retablir = () => {
    const f = feuille.current;
    if (f) f.innerHTML = html;
    setRepris(false);
    setModification(false);
  };

  useEffect(() => {
    const f = feuille.current;
    if (!f) return;
    f.querySelectorAll<HTMLElement>("[data-modifiable]").forEach((el) => {
      el.contentEditable = modification ? "true" : "false";
    });
    f.querySelector(".doc-feuille")?.classList.toggle("doc-modifiable", modification);
  }, [modification, html, repris]);

  if (!doc) return null;

  /* Le modèle et le dossier, portés dans l'adresse de l'éditeur. */
  const lienDossier = new URLSearchParams(
    Object.entries({
      modele: doc.cle,
      agent: contexte.agent?.id, acte: contexte.acte?.id, entite: contexte.entite?.id,
    }).filter(([, v]) => !!v) as [string, string][]
  ).toString();

  /** Le document tel qu'il est à l'écran, reprises comprises. */
  const corpsCourant = () => feuille.current?.innerHTML ?? html;
  const texteCourant = () =>
    (feuille.current?.querySelector(".doc-feuille") as HTMLElement)?.innerText ?? "";

  const consignerEmission = (canal: DocumentEmis["canal"]) => {
    if (!user) return;
    const emis: DocumentEmis = {
      id: `DOC-${Date.now().toString(36).toUpperCase()}`,
      modele: doc.cle,
      intitule: doc.intitule,
      reference: doc.reference,
      objet: doc.objet,
      sujetType: descripteur?.source ?? "libre",
      sujetId: contexte.acte?.id ?? contexte.agent?.id ?? contexte.entite?.id ?? contexte.conge?.id,
      canal,
      emisPar: user.id,
      dateEmission: new Date().toISOString(),
      repris: repris || undefined,
    };
    consigner.mutate({ document: emis, utilisateur: user });
  };

  const imprimer = () => {
    setModification(false);
    consignerEmission("IMPRESSION");
    window.print();
  };

  const enregistrer = async (format: Format) => {
    setOccupe(true);
    const sortie = exporter(doc, format, format === "texte" ? undefined : corpsCourant());
    const contenu = format === "texte" ? texteCourant() || sortie.contenu : sortie.contenu;
    const nom = nomFichier(doc, sortie.extension);
    const r = await telecharger(nom, contenu, sortie.mime);
    setOccupe(false);
    if (r === "enregistre") {
      consignerEmission("TELECHARGEMENT");
      toast.success(`Document enregistré — ${LIBELLE_FORMAT[format]}`, { description: nom });
    } else if (r === "refuse") {
      toast("Enregistrement annulé");
    } else {
      const ok = await copier(contenu);
      toast[ok ? "success" : "error"](
        ok ? "Téléchargement indisponible — document copié" : "Impossible d'enregistrer le document",
        { description: ok ? "Collez-le dans un traitement de texte." : undefined }
      );
    }
  };

  const copierTexte = async () => {
    const ok = await copier(texteCourant());
    if (ok) consignerEmission("COPIE");
    toast[ok ? "success" : "error"](ok ? "Document copié" : "Copie impossible");
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && surFermeture()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-4 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{descripteur?.famille}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">{doc.reference}</Badge>
            {modification && (
              <Badge variant="default" className="gap-1 text-[10px]"><Pencil className="h-2.5 w-2.5" /> Reprise en cours</Badge>
            )}
          </div>
          <DialogTitle className="pr-8 text-lg leading-tight">{descripteur?.libelle ?? doc.intitule}</DialogTitle>
          <DialogDescription>
            {modification
              ? "Cliquez dans le texte encadré pour le reprendre. Ce que vous lisez est ce qui s'imprimera et ce qui sera exporté."
              : descripteur?.usage}
          </DialogDescription>
        </DialogHeader>

        <div className="doc-cadre min-h-0 flex-1 overflow-auto bg-muted/60 p-4">
          <div
            id={ID_IMPRESSION}
            ref={poser}
            onInput={() => setRepris(true)}
            className="doc-echelle mx-auto origin-top shadow-lg"
            /* 210 mm ne tient pas dans le dialogue : on réduit à l'écran seulement. */
            style={{ width: "210mm", transform: "scale(0.78)", marginBottom: "-20%" }}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-muted/30 px-6 py-3">
          {/* La reprise dans le dialogue suffit pour corriger une phrase.
              Au-delà — refondre le plan, ajouter des articles, garder le
              texte pour demain — c'est le traitement de texte qu'il faut,
              et le dossier le suit dans l'adresse. */}
          {user && peut(user.role, "redaction", "W") && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/redaction?${lienDossier}`}>
                <PenLine className="mr-1.5 h-3.5 w-3.5" /> Reprendre au traitement de texte
              </Link>
            </Button>
          )}
          <Button
            variant={modification ? "default" : "outline"}
            size="sm"
            onClick={() => setModification((v) => !v)}
          >
            {modification
              ? <><Eye className="mr-1.5 h-3.5 w-3.5" /> Aperçu</>
              : <><Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier</>}
          </Button>
          {repris && (
            <Button
              variant="ghost" size="sm"
              onClick={retablir}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Rétablir
            </Button>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={surFermeture}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Fermer
            </Button>
            <Button variant="outline" size="sm" onClick={copierTexte}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copier
            </Button>
            {surTransfert && (
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  consignerEmission("TRANSFERT");
                  surTransfert(texteCourant(), `${descripteur?.libelle} — ${doc.reference}`);
                }}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Transférer
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={occupe}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {(Object.keys(LIBELLE_FORMAT) as Format[]).map((f) => (
                  <DropdownMenuItem key={f} onSelect={() => enregistrer(f)}>
                    {LIBELLE_FORMAT[f]}
                    {f === "word" && (
                      <span className="ml-auto text-[10px] text-muted-foreground">modifiable</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={imprimer}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
