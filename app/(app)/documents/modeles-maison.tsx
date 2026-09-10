"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { History, Library, Pencil, Trash2, Users } from "lucide-react";
import { jetonsDe } from "@/lib/redaction";
import { useModelesMaison, useSupprimerModeleMaison } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { peut } from "@/lib/referentiels";
import { fmtDateHeure } from "@/lib/format";
import type { ModeleMaison } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Les modèles que la DGARH a écrits elle-même.
 *
 * Ils se distinguent des modèles livrés par un liseré : les premiers sont
 * du code et garantissent une forme réglementaire, les seconds sont
 * l'ouvrage de la maison et se corrigent depuis l'écran. Confondre les
 * deux exposerait à croire qu'un modèle maison a été relu par un juriste.
 */
export function ModelesMaison() {
  const user = useAuth((s) => s.user)!;
  const { data: modeles = [] } = useModelesMaison();
  const supprimer = useSupprimerModeleMaison();
  const [aRetirer, setARetirer] = useState<string | null>(null);

  const redacteur = peut(user.role, "redaction", "W");
  const visibles = modeles.filter((m) => m.partage || m.auteurId === user.id);

  const retirer = async (m: ModeleMaison) => {
    if (aRetirer !== m.id) { setARetirer(m.id); return; }
    await supprimer.mutateAsync({ modele: m, utilisateur: user });
    setARetirer(null);
    toast.success("Modèle retiré de la bibliothèque", { description: m.libelle });
  };

  if (!visibles.length) {
    return redacteur ? (
      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 py-4 text-xs text-muted-foreground">
          <Library className="h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1">
            Aucun modèle de la maison. Ouvrez une pièce dans la <Link href="/redaction" className="font-medium text-primary underline-offset-2 hover:underline">Rédaction</Link>,
            posez-y des champs de fusion, puis déposez-la comme modèle : elle sera proposée
            ici à tous les rédacteurs.
          </p>
        </CardContent>
      </Card>
    ) : null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Library className="h-3.5 w-3.5" /> Modèles de la maison ({visibles.length})
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((m) => {
          const champs = jetonsDe(m.contenu);
          const sien = m.auteurId === user.id;
          return (
            <Card key={m.id} className="border-primary/25 bg-primary/[0.03]">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Library className="h-4 w-4 shrink-0 text-primary" />
                  <Badge variant="outline" className="text-[10px]">{m.famille}</Badge>
                </div>
                <div className="text-sm font-semibold leading-tight">{m.libelle}</div>
                <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{m.usage}</p>
                <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] text-muted-foreground/80">
                  {m.partage && <Users className="h-3 w-3" />}
                  <span>{m.auteur}</span>
                  <span aria-hidden>·</span>
                  <span>{fmtDateHeure(m.dateMaj)}</span>
                  <span aria-hidden>·</span>
                  <span>{champs.length} champ{champs.length > 1 ? "s" : ""} de fusion</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-1.5 text-[11px] text-muted-foreground">
                        <History className="mr-1 h-3 w-3" />
                        {(m.versions?.length ?? 0)} état{(m.versions?.length ?? 0) > 1 ? "s" : ""}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-0">
                      <div className="border-b px-3 py-2">
                        <div className="text-xs font-semibold">États successifs du modèle</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                          Les pièces déjà établies ne changent pas quand le modèle change :
                          chaque emploi en fait une copie.
                        </p>
                      </div>
                      <div className="max-h-64 divide-y overflow-y-auto">
                        {(m.versions ?? []).map((v) => (
                          <div key={v.horodatage} className="px-3 py-2">
                            <div className="text-[11px] font-medium">{v.resume}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {fmtDateHeure(v.horodatage)} — {v.auteur}
                            </div>
                          </div>
                        ))}
                        {!(m.versions?.length) && (
                          <p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                            Modèle déposé avant la tenue de l'historique.
                          </p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {redacteur && (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
                      <Link href={`/redaction?maison=${m.id}`}>
                        <Pencil className="mr-1 h-3 w-3" /> Modifier
                      </Link>
                    </Button>
                    {sien && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                        onClick={() => retirer(m)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {aRetirer === m.id ? "Confirmer" : "Retirer"}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
