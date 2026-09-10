"use client";

/**
 * Matrice des droits — rôle × module.
 *
 * Le tableau est la seule représentation honnête d'un modèle à deux
 * dimensions : une liste par rôle cacherait les trous, et c'est précisément
 * les trous qu'on vient vérifier ici. Le périmètre n'y figure pas — il ne
 * dépend pas du rôle mais de l'entité de rattachement (§11).
 */

import { DROITS, MODULE_LABELS, ROLE_LABELS, type ModuleKey } from "@/lib/referentiels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Role } from "@/lib/types";

const MODULES = Object.keys(MODULE_LABELS) as ModuleKey[];
const ROLES = Object.keys(ROLE_LABELS) as Role[];

export function MatriceDroits() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Matrice des droits</CardTitle>
        <CardDescription>
          Un droit se lit rôle × module. Le périmètre, lui, vient de l'entité : deux chefs de bureau
          ont les mêmes droits sur des populations différentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card">Module</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="min-w-[92px] text-center text-[10px] leading-tight">
                    {ROLE_LABELS[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map((m) => (
                <TableRow key={m}>
                  <TableCell className="sticky left-0 z-10 bg-card text-xs font-medium">{MODULE_LABELS[m]}</TableCell>
                  {ROLES.map((r) => {
                    const d = DROITS[r]?.[m];
                    return (
                      <TableCell key={r} className="text-center">
                        {d === "W" ? <Badge variant="default" className="h-5 text-[10px]">écriture</Badge>
                          : d === "R" ? <Badge variant="secondary" className="h-5 text-[10px]">lecture</Badge>
                          : <span className="text-muted-foreground/30">—</span>}
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
  );
}
