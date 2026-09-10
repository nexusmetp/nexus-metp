"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { jetonsDe } from "@/lib/redaction";
import { useEnregistrerModeleMaison } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import type { FamilleModele, ModeleMaison } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const FAMILLES: FamilleModele[] = ["Actes", "Attestations", "États", "Correspondance", "Archives"];

/**
 * Déposer le texte courant comme modèle de la maison.
 *
 * On montre au rédacteur les champs de fusion que son texte contient : un
 * modèle sans aucun jeton n'est qu'une copie, et il vaut mieux le lui dire
 * avant qu'il ne le découvre sur la pièce suivante.
 */
export function DeposerModele({ ouvert, surFermeture, contenu, existant, titreParDefaut, base }: {
  ouvert: boolean;
  surFermeture: () => void;
  contenu: string;
  /** Modèle repris, pour le modifier au lieu d'en créer un second. */
  existant?: ModeleMaison | null;
  titreParDefaut: string;
  base?: string;
}) {
  const user = useAuth((s) => s.user)!;
  const enregistrer = useEnregistrerModeleMaison();
  const [libelle, setLibelle] = useState(existant?.libelle ?? titreParDefaut);
  const [usage, setUsage] = useState(existant?.usage ?? "");
  const [famille, setFamille] = useState<FamilleModele>(existant?.famille ?? "Correspondance");
  const [partage, setPartage] = useState(existant?.partage ?? true);

  const champs = jetonsDe(contenu);
  const valide = libelle.trim().length > 2 && usage.trim().length > 5;

  const deposer = async () => {
    const maintenant = new Date().toISOString();
    const modele: ModeleMaison = {
      id: existant?.id ?? `MOD-${Date.now().toString(36).toUpperCase()}`,
      libelle: libelle.trim(),
      usage: usage.trim(),
      famille,
      base: existant?.base ?? base,
      contenu,
      auteurId: existant?.auteurId ?? user.id,
      auteur: existant?.auteur ?? user.nomComplet,
      entiteId: existant?.entiteId ?? user.entiteId,
      dateCreation: existant?.dateCreation ?? maintenant,
      dateMaj: maintenant,
      partage,
      versions: existant?.versions ?? [],
    };
    await enregistrer.mutateAsync({
      modele, utilisateur: user, creation: !existant,
      resume: existant ? "Modèle repris depuis l'éditeur." : "Modèle déposé à la bibliothèque.",
    });
    toast.success(existant ? "Modèle mis à jour" : "Modèle déposé à la bibliothèque", {
      description: partage
        ? "Il est proposé à tous les rédacteurs du ministère."
        : "Il n'est proposé qu'à vous.",
    });
    surFermeture();
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && surFermeture()}>
      <DialogContent className="w-[min(34rem,94vw)]">
        <DialogHeader className="text-left">
          <DialogTitle>{existant ? "Mettre à jour le modèle" : "Déposer comme modèle"}</DialogTitle>
          <DialogDescription>
            Le texte tel qu'il est à l'écran devient un modèle de la bibliothèque.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Intitulé</Label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">À quoi il sert</Label>
            <Textarea
              rows={2}
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              placeholder="Une phrase : ce que ce document établit, et quand on l'établit."
              className="text-xs"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Famille</Label>
            <Select value={famille} onValueChange={(v: string) => setFamille(v as FamilleModele)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FAMILLES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <Label className="text-xs">Ouvrir à tout le ministère</Label>
              <p className="text-[10px] text-muted-foreground">
                Sinon, le modèle ne vous est proposé qu'à vous.
              </p>
            </div>
            <Switch checked={partage} onCheckedChange={(v: boolean) => setPartage(v)} />
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-[11px] font-semibold">
              Champs de fusion repérés : {champs.length}
            </div>
            {champs.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {champs.map((j) => (
                  <Badge key={j.cle} variant="outline" className="text-[10px]">{j.libelle}</Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Aucun champ de fusion : ce modèle rendra toujours le même texte, noms compris.
                Posez des champs avec le bouton « Champ de fusion » si le document doit
                s'adapter au dossier.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={surFermeture}>Annuler</Button>
          <Button onClick={deposer} disabled={!valide || enregistrer.isPending}>
            {enregistrer.isPending
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <Save className="mr-1.5 h-4 w-4" />}
            {existant ? "Mettre à jour" : "Déposer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
