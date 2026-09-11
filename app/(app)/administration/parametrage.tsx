"use client";

/**
 * Le paramétrage de l'installation.
 *
 * Ce qui vaut pour tout le ministère, et que seul l'administrateur règle. Le
 * panneau lit et écrit lui-même : ces réglages n'intéressent aucun autre
 * onglet, et les faire transiter par l'écran qui les héberge ne ferait
 * qu'allonger la page sans rien clarifier.
 */

import { useState } from "react";
import { toast } from "sonner";
import { useMajParametres, useParametres } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const MODULES_COLLABORATION = [
  ["messagerieActive", "Messagerie interne"],
  ["ticketsActifs", "Réclamations et assistance"],
  ["annoncesActives", "Notes de service et circulaires"],
] as const;

export function Parametrage() {
  const user = useAuth((s) => s.user)!;
  const { data: parametres } = useParametres();
  const majParametres = useMajParametres();
  const [reglages, setReglages] = useState<Record<string, any> | null>(null);

  const reg = { ...(parametres ?? {}), ...(reglages ?? {}) } as any;
  const modifier = (champ: Record<string, any>) => setReglages({ ...(reglages ?? {}), ...champ });

  const enregistrer = async () => {
    if (!parametres || !reglages) return;
    await majParametres.mutateAsync({ parametres: { ...parametres, ...reglages } as any, utilisateur: user });
    toast.success("Paramétrage enregistré");
    setReglages(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Paramétrage de l'installation</CardTitle>
        <CardDescription>Ce qui vaut pour tout le ministère, et que seul l'administrateur règle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Institution</Label>
            <Input value={reg.nomInstitution ?? ""}
                   onChange={(e) => modifier({ nomInstitution: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Exercice</Label>
            <Input type="number" value={reg.exercice ?? 2026}
                   onChange={(e) => modifier({ exercice: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Délai cible d'instruction d'un acte (jours)</Label>
            <Input type="number" value={reg.delaiCibleActe ?? 15}
                   onChange={(e) => modifier({ delaiCibleActe: Number(e.target.value) })} />
            <p className="text-[11px] text-muted-foreground">
              Au-delà, un dossier est signalé en retard dans les bannettes et les rapports (§13).
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Délai de réponse — réclamation critique (heures)</Label>
            <Input type="number" value={reg.delaiTicket?.CRITIQUE ?? 4}
                   onChange={(e) => modifier({
                     delaiTicket: { ...(reg.delaiTicket ?? {}), CRITIQUE: Number(e.target.value) },
                   })} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Modules de collaboration
          </div>
          {MODULES_COLLABORATION.map(([cle, libelle]) => (
            <div key={cle} className="flex items-center justify-between gap-4">
              <span className="text-sm">{libelle}</span>
              <Switch checked={reg[cle] !== false}
                      onCheckedChange={(v: boolean) => modifier({ [cle]: v })} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Dernière modification : {parametres ? fmtDate(parametres.maj) : "—"}
          </p>
          <Button size="sm" disabled={!reglages} onClick={enregistrer}>Enregistrer</Button>
        </div>
      </CardContent>
    </Card>
  );
}
