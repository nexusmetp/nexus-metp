"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Database, Minus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useResetData, useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { DROITS, ROLE_LABELS, cheminDe, entiteById, descendantsDe } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ModuleKey } from "@/lib/referentiels";
import type { Role } from "@/lib/types";

const MODULES: ModuleKey[] = [
  "dgarh", "organigramme", "agents", "actes", "carrieres", "conges",
  "formations", "contentieux", "besoins", "referentiels", "documents",
  "rapports", "journal", "administration", "mon-dossier",
];

const ROLES: Role[] = [
  "ADMIN_SYSTEME", "DIRECTEUR_GENERAL", "DIRECTEUR_CENTRAL", "CHEF_SERVICE",
  "CHEF_BUREAU", "AGENT_INSTRUCTEUR", "DIRECTEUR_DEPARTEMENTAL", "CHEF_ETABLISSEMENT", "AGENT",
];

export default function AdministrationPage() {
  const user = useAuth((s) => s.user)!;
  const { data: utilisateurs = [], isLoading } = useUtilisateurs();
  const reset = useResetData();
  const [confirme, setConfirme] = useState(false);

  const actifs = utilisateurs.filter((u) => u.actif).length;

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Administration"
        description="Comptes, matrice des droits et maintenance du cache local. L'administrateur système paramètre : il n'instruit ni ne signe (§11)."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard titre="Comptes" valeur={fmtNum(utilisateurs.length)} sousTitre={`${actifs} actifs`} icon={Users} />
        <KpiCard titre="Rôles" valeur={ROLES.length} sousTitre="croisés avec un périmètre" icon={ShieldCheck} />
        <KpiCard titre="Modules" valeur={MODULES.length} sousTitre="soumis au contrôle d'accès" icon={Database} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comptes</CardTitle>
          <CardDescription>
            Le périmètre se déduit du rattachement : rattacher un utilisateur à une entité suffit à calculer ce qu'il voit.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden lg:table-cell">Rattachement</TableHead>
                <TableHead className="hidden xl:table-cell text-right">Périmètre</TableHead>
                <TableHead className="text-right">État</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {utilisateurs.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{u.nomComplet}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[u.role]}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="max-w-[240px] truncate text-sm" title={entiteById(u.entiteId)?.nom}>
                        {entiteById(u.entiteId)?.sigle}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {cheminDe(u.entiteId).map((e) => e.sigle).join(" › ")}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-right text-sm tabular-nums text-muted-foreground">
                      {descendantsDe(u.entiteId).length} entités
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={u.actif
                        ? "border-emerald-500/25 bg-emerald-500/12 text-[10px] text-emerald-600"
                        : "border-rose-500/25 bg-rose-500/12 text-[10px] text-rose-600"}>
                        {u.actif ? "Actif" : "Désactivé"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Matrice des droits</CardTitle>
          <CardDescription>
            Lecture, écriture ou aucun accès, par rôle et par module — appliquée par le layout, pas seulement par le menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="sticky left-0 bg-muted/50">Module</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="whitespace-nowrap text-center text-[10px]">
                    {ROLE_LABELS[r].split(" ").map((m) => m.slice(0, 12)).join(" ")}
                  </TableHead>
                ))}
              </TableRow></TableHeader>
              <TableBody>
                {MODULES.map((m) => (
                  <TableRow key={m}>
                    <TableCell className="sticky left-0 bg-card text-xs font-medium">{m}</TableCell>
                    {ROLES.map((r) => {
                      const d = DROITS[r]?.[m];
                      return (
                        <TableCell key={r} className="text-center">
                          {d === "W" ? <span className="text-[10px] font-bold text-emerald-600">W</span>
                            : d === "R" ? <span className="text-[10px] font-semibold text-sky-600">R</span>
                            : <Minus className="mx-auto h-3 w-3 text-muted-foreground/30" />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cache local</CardTitle>
          <CardDescription>
            Les données vivent dans IndexedDB, propre à ce navigateur. La réinitialisation efface tout, y compris
            les actes que vous avez instruits pendant cette session.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {!confirme ? (
            <Button variant="outline" onClick={() => setConfirme(true)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Réinitialiser les données
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                disabled={reset.isPending}
                onClick={() =>
                  reset.mutate(undefined, {
                    onSuccess: () => {
                      setConfirme(false);
                      toast.success("Cache réinitialisé", { description: "Les données fictives ont été régénérées." });
                    },
                  })
                }
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Confirmer l'effacement
              </Button>
              <Button variant="ghost" onClick={() => setConfirme(false)}>Annuler</Button>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
