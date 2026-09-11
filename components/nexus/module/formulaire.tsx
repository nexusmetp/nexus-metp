"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/** Boîte de dialogue de saisie — création et modification. */
export function DialogueFormulaire({
  ouvert, surFermeture, titre, description, children, surValidation,
  libelleValidation = "Enregistrer", validationPossible = true, large = false,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  titre: string;
  description?: string;
  children: React.ReactNode;
  surValidation: () => void;
  libelleValidation?: string;
  validationPossible?: boolean;
  large?: boolean;
}) {
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && surFermeture()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", large ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader className="space-y-1.5">
          <DialogTitle>{titre}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-2">{children}</div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={surFermeture}>Annuler</Button>
          <Button onClick={surValidation} disabled={!validationPossible}>{libelleValidation}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* — Champs de formulaire — */

export function Champ({ label, aide, children, obligatoire }: {
  label: string; aide?: string; children: React.ReactNode; obligatoire?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium">
        {label}
        {obligatoire && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {aide && <p className="text-[11px] leading-relaxed text-muted-foreground">{aide}</p>}
    </div>
  );
}

export function ChampTexte({ label, valeur, surChangement, aide, obligatoire, placeholder, type = "text" }: {
  label: string; valeur: string; surChangement: (v: string) => void;
  aide?: string; obligatoire?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <Champ label={label} aide={aide} obligatoire={obligatoire}>
      <Input type={type} value={valeur} placeholder={placeholder} onChange={(e) => surChangement(e.target.value)} />
    </Champ>
  );
}

export function ChampZone({ label, valeur, surChangement, aide, obligatoire, placeholder, lignes = 4 }: {
  label: string; valeur: string; surChangement: (v: string) => void;
  aide?: string; obligatoire?: boolean; placeholder?: string; lignes?: number;
}) {
  return (
    <Champ label={label} aide={aide} obligatoire={obligatoire}>
      <Textarea value={valeur} rows={lignes} placeholder={placeholder} onChange={(e) => surChangement(e.target.value)} />
    </Champ>
  );
}

export function ChampSelect({ label, valeur, surChangement, options, aide, obligatoire, placeholder }: {
  label: string; valeur: string; surChangement: (v: string) => void;
  options: { valeur: string; libelle: string }[];
  aide?: string; obligatoire?: boolean; placeholder?: string;
}) {
  return (
    <Champ label={label} aide={aide} obligatoire={obligatoire}>
      <Select value={valeur} onValueChange={surChangement}>
        <SelectTrigger><SelectValue placeholder={placeholder ?? "Choisir…"} /></SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => <SelectItem key={o.valeur} value={o.valeur}>{o.libelle}</SelectItem>)}
        </SelectContent>
      </Select>
    </Champ>
  );
}

/**
 * Dépôt d'une photographie d'identité.
 *
 * Le cliché est lu dans le navigateur et conservé en données incorporées :
 * il n'y a pas de serveur de fichiers, et une photographie qui pointerait
 * ailleurs se briserait au premier changement d'hébergement.
 */
export function ChampPhoto({
  label, valeur, surChangement, aide, apercu,
}: {
  label: string;
  valeur?: string | null;
  surChangement: (v: string | null) => void;
  aide?: string;
  apercu: React.ReactNode;
}) {
  const lire = (fichier?: File) => {
    if (!fichier) return;
    if (fichier.size > 1_500_000) {
      alert("Photographie trop lourde : 1,5 Mo au maximum.");
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => surChangement(String(lecteur.result));
    lecteur.readAsDataURL(fichier);
  };

  return (
    <Champ label={label} aide={aide}>
      <div className="flex items-center gap-4 rounded-lg border p-3">
        {apercu}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file" accept="image/*" className="sr-only"
              onChange={(e) => lire(e.target.files?.[0])}
            />
            <span className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-medium transition hover:bg-muted">
              Choisir une photographie
            </span>
          </label>
          {valeur && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => surChangement(null)}>
              Retirer
            </Button>
          )}
        </div>
      </div>
    </Champ>
  );
}
