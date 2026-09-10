"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Printer, Send, X } from "lucide-react";
import {
  composer, modeleParCle, nomFichier, rendreDocument, rendreFichier, rendreTexte,
  STYLES_DOCUMENT, type CleModele, type ContexteDocument,
} from "@/lib/documents";
import { copier, telecharger } from "@/lib/export";
import { useEnregistrerDocument } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import type { DocumentEmis } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/**
 * Visionneuse de document.
 *
 * Le même HTML sert l'écran, l'imprimante et le fichier : on ne peut pas
 * relire une chose et en imprimer une autre. À l'écran la feuille A4 est
 * mise à l'échelle du dialogue ; à l'impression elle reprend sa taille.
 */

const ID_IMPRESSION = "document-a-imprimer";

/** Styles d'impression : n'imprimer que la feuille, jamais l'application autour. */
function useStylesImpression() {
  useEffect(() => {
    const cle = "styles-document-administratif";
    if (document.getElementById(cle)) return;
    const el = document.createElement("style");
    el.id = cle;
    // `visibility` plutôt que `display` : la feuille est rendue dans un portail,
    // masquer les enfants de `body` masquerait aussi ses ancêtres.
    el.textContent = `${STYLES_DOCUMENT}
@media print {
  body * { visibility: hidden !important; }
  #${ID_IMPRESSION}, #${ID_IMPRESSION} * { visibility: visible !important; }
  #${ID_IMPRESSION} {
    position: absolute !important; left: 0; top: 0;
    transform: none !important; margin: 0 !important; box-shadow: none !important;
  }
}`;
    document.head.appendChild(el);
  }, []);
}

export function VisionneuseDocument({
  ouvert, surFermeture, cle, contexte, surTransfert,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  cle: CleModele | null;
  contexte: ContexteDocument;
  /** Proposé seulement si le parent sait où transférer (messagerie interne). */
  surTransfert?: (texte: string, titre: string) => void;
}) {
  useStylesImpression();
  const [occupe, setOccupe] = useState(false);
  const user = useAuth((st) => st.user);
  const consigner = useEnregistrerDocument();

  const doc = useMemo(
    () => (cle ? composer(cle, contexte) : null),
    [cle, contexte]
  );
  const descripteur = cle ? modeleParCle(cle) : undefined;

  if (!doc) return null;

  /**
   * Consigne l'édition au registre. Prévisualiser ne laisse pas de trace ;
   * sortir le document de l'écran en laisse une, car c'est ce geste-là qui
   * met une pièce en circulation.
   */
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
    };
    consigner.mutate({ document: emis, utilisateur: user });
  };

  const imprimer = () => {
    consignerEmission("IMPRESSION");
    // L'impression est synchrone : le navigateur rend ce qui est déjà au DOM.
    window.print();
  };

  const enregistrer = async () => {
    setOccupe(true);
    const r = await telecharger(nomFichier(doc), rendreFichier(doc), "text/html;charset=utf-8");
    setOccupe(false);
    if (r === "enregistre") {
      consignerEmission("TELECHARGEMENT");
      toast.success("Document enregistré", { description: nomFichier(doc) });
    }
    else if (r === "refuse") toast("Enregistrement annulé");
    else {
      const ok = await copier(rendreTexte(doc));
      toast[ok ? "success" : "error"](
        ok ? "Téléchargement indisponible — document copié" : "Impossible d'enregistrer le document",
        { description: ok ? "Collez-le dans un traitement de texte." : undefined }
      );
    }
  };

  const copierTexte = async () => {
    const ok = await copier(rendreTexte(doc));
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
          </div>
          <DialogTitle className="pr-8 text-lg leading-tight">{descripteur?.libelle ?? doc.intitule}</DialogTitle>
          {descripteur && <DialogDescription>{descripteur.usage}</DialogDescription>}
        </DialogHeader>

        <div className="doc-cadre min-h-0 flex-1 overflow-auto bg-muted/60 p-4">
          <div
            id={ID_IMPRESSION}
            className="doc-echelle mx-auto origin-top shadow-lg"
            /* 210 mm ne tient pas dans le dialogue : on réduit à l'écran seulement. */
            style={{ width: "210mm", transform: "scale(0.78)", marginBottom: "-20%" }}
            dangerouslySetInnerHTML={{ __html: rendreDocument(doc) }}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-6 py-3">
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
                surTransfert(rendreTexte(doc), `${descripteur?.libelle} — ${doc.reference}`);
              }}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" /> Transférer
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={enregistrer} disabled={occupe}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Télécharger
          </Button>
          <Button size="sm" onClick={imprimer}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
