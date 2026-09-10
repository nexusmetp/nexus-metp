"use client";

/**
 * Santé et maintenance.
 *
 * Le panneau dit d'abord ce que contient la base de CE navigateur, puis la
 * limite que cela impose. Elle n'est pas cachée en bas d'une page d'aide :
 * elle conditionne tout usage réel, et l'administrateur doit la lire là où il
 * décide.
 */

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  useAnnonces, useConversations, useJournal, useMessages, useResetData,
  useTickets, useUtilisateurs,
} from "@/lib/queries";
import { ENTITES } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { LigneInfo } from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SanteInstallation() {
  const { data: comptes = [] } = useUtilisateurs();
  const { data: journal = [] } = useJournal();
  const { data: tickets = [] } = useTickets();
  const { data: messages = [] } = useMessages();
  const { data: conversations = [] } = useConversations();
  const { data: annonces = [] } = useAnnonces();
  const reset = useResetData();
  const [confirme, setConfirme] = useState(false);

  const actifs = comptes.filter((c) => c.actif).length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">État de l'installation</CardTitle>
          <CardDescription>Ce que contient la base de ce navigateur.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <LigneInfo k="Entités" v={fmtNum(ENTITES.length)} />
          <LigneInfo k="Comptes" v={`${fmtNum(comptes.length)} — ${fmtNum(actifs)} actifs`} />
          <LigneInfo k="Écritures d'audit" v={fmtNum(journal.length)} />
          <LigneInfo k="Réclamations" v={fmtNum(tickets.length)} />
          <LigneInfo k="Conversations" v={`${fmtNum(conversations.length)} — ${fmtNum(messages.length)} messages`} />
          <LigneInfo k="Notes et circulaires" v={fmtNum(annonces.length)} />
        </CardContent>
      </Card>

      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Limite connue — persistance locale</CardTitle>
          <CardDescription>Ce point conditionne tout usage réel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Les données vivent dans le navigateur de ce poste. Deux agents ne partagent donc pas la
            même base : le circuit ne se joue à plusieurs rôles qu'en changeant de compte dans le
            même navigateur. Une exploitation réelle demande un serveur.
          </p>
          <div className="rounded-lg border border-dashed p-3">
            <div className="text-xs font-semibold">Reprise du jeu de données</div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Efface la base de ce navigateur et la resème. Les créations faites ici — entités,
              comptes, agents — sont perdues. Les brouillons et modèles écrits par un rédacteur,
              eux, sont conservés.
            </p>
            <div className="mt-3 flex items-center gap-2">
              {!confirme ? (
                <Button variant="outline" size="sm" onClick={() => setConfirme(true)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Réinitialiser
                </Button>
              ) : (
                <>
                  <Button
                    variant="destructive" size="sm" disabled={reset.isPending}
                    onClick={() => reset.mutate(undefined, {
                      onSuccess: () => { setConfirme(false); toast.success("Base resemée"); },
                    })}
                  >
                    Confirmer l'effacement
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirme(false)}>Annuler</Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
