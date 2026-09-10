"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, ScrollText, Sparkles, Wand2,
} from "lucide-react";
import { LIBELLE_ACTION, messageErreur, useIA, type ActionTexte } from "@/lib/ia";
import { JETONS, ecrireJeton } from "@/lib/redaction";
import { useTextes } from "@/lib/queries";
import { MODELES } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { PoigneeFeuille } from "./feuille";

/** Les champs de fusion, décrits à l'assistant une fois pour toutes. */
const CHAMPS = JETONS.map((j) => `${ecrireJeton(j.cle)} — ${j.libelle}`);

const ACTIONS: ActionTexte[] = [
  "corriger", "reformuler", "raccourcir", "developper", "resumer", "traduire",
];

/**
 * Le panneau d'assistance de l'éditeur.
 *
 * Trois gestes, et pas un de plus : écrire un projet, retoucher un passage
 * choisi, proposer des visas pris dans le fonds. Chacun rend un texte que le
 * rédacteur voit arriver dans sa feuille et qu'il reste libre d'annuler —
 * l'assistant ne sauvegarde rien de lui-même.
 */
export function PanneauIA({
  feuille, surAssistance, actif,
}: {
  feuille: React.RefObject<PoigneeFeuille | null>;
  /** Prévient l'éditeur qu'un passage vient de l'assistant. */
  surAssistance: (resume: string) => void;
  actif: boolean;
}) {
  const { prete, occupe, rediger, retoucher, proposerVisas } = useIA();
  const { data: textes = [] } = useTextes();
  const [consigne, setConsigne] = useState("");
  const [modele, setModele] = useState<string>("");
  const [enCours, setEnCours] = useState<string | null>(null);

  const fonds = useMemo(
    () => textes.map((t) => `${t.reference} — ${t.titre}`).slice(0, 60),
    [textes]
  );

  if (!prete) return null;

  const executer = async (nom: string, travail: () => Promise<void>) => {
    setEnCours(nom);
    try {
      await travail();
    } catch (e) {
      toast.error("L'assistant n'a pas abouti", { description: messageErreur(e) });
    } finally {
      setEnCours(null);
    }
  };

  const ecrire = () => executer("redaction", async () => {
    const texte = consigne.trim();
    if (!texte) return;
    const libelle = MODELES.find((m) => m.cle === modele)?.libelle;
    const html = await rediger(texte, libelle, CHAMPS);
    feuille.current?.ajouter(html);
    surAssistance(`Projet rédigé par l'assistant${libelle ? ` — ${libelle.toLowerCase()}` : ""}.`);
    toast.success("Projet inséré en fin de document", {
      description: "Relisez-le : rien n'est vérifié tant que vous ne l'avez pas relu.",
    });
  });

  const retouche = (action: ActionTexte) => executer(action, async () => {
    const passage = feuille.current?.selection() ?? "";
    if (!passage.trim()) {
      toast.info("Sélectionnez d'abord un passage", {
        description: "La retouche s'applique à ce qui est sélectionné dans la feuille.",
      });
      return;
    }
    const html = await retoucher(action, passage);
    feuille.current?.remplacerSelection(html);
    surAssistance(`${LIBELLE_ACTION[action]} — passage retouché par l'assistant.`);
  });

  const visas = () => executer("visas", async () => {
    const corps = feuille.current?.corps() ?? "";
    const html = await proposerVisas(corps, fonds);
    feuille.current?.ajouter(html);
    surAssistance("Visas proposés depuis le fonds réglementaire.");
    toast.success("Visas proposés", {
      description: "Ils ne viennent que du fonds versé dans la plateforme. Vérifiez leur pertinence.",
    });
  });

  const attente = (nom: string) => enCours === nom && occupe;

  return (
    <Card className="border-primary/25">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Assistant de rédaction</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Type de pièce</Label>
          <Select value={modele} onValueChange={setModele}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Libre" />
            </SelectTrigger>
            <SelectContent>
              {MODELES.map((m) => (
                <SelectItem key={m.cle} value={m.cle} className="text-xs">{m.libelle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs" htmlFor="consigne-ia">Ce qu'il faut écrire</Label>
          <Textarea
            id="consigne-ia"
            value={consigne}
            onChange={(e) => setConsigne(e.target.value)}
            disabled={!actif}
            rows={4}
            placeholder="Ex. : note de service rappelant les horaires de service dans les établissements techniques, effet au 1er octobre."
            className="text-xs"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!actif || !consigne.trim() || occupe}
            onClick={ecrire}
          >
            {attente("redaction")
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <Wand2 className="mr-1.5 h-4 w-4" />}
            Rédiger un projet
          </Button>
        </div>

        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs">Retoucher le passage sélectionné</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {ACTIONS.map((a) => (
              <Button
                key={a}
                variant="outline"
                size="sm"
                className="h-8 justify-start text-[11px]"
                disabled={!actif || occupe}
                onClick={() => retouche(a)}
              >
                {attente(a) && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {LIBELLE_ACTION[a]}
              </Button>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-[11px]"
            disabled={!actif || occupe || !fonds.length}
            onClick={visas}
          >
            {attente("visas")
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <ScrollText className="mr-1.5 h-4 w-4" />}
            Proposer les visas ({fonds.length} textes au fonds)
          </Button>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            L'assistant rédige, il ne décide pas. Aucun texte qu'il produit n'a de portée
            tant qu'il n'a pas été relu, arrêté, signé et notifié.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
