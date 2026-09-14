"use client";

import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { AgentProjete } from "@/lib/types";
import { POSITION_LABELS, REGLES_CATEGORIE, entiteById } from "@/lib/referentiels";
import { CHART_COLORS, fmtNum, fmtPct } from "@/lib/format";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/* Ce que dit la sélection courante                                    */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi ces courbes-ci, alors que le tableau de bord en porte déjà.
 *
 * Celles du tableau de bord décrivent le ministère entier, une fois pour
 * toutes. Celles-ci décrivent **ce que le filtre vient de retenir** : elles
 * se recalculent à chaque changement d'entité, de catégorie ou de position.
 * C'est ce qui les rend utiles et non redondantes — le tableau de bord répond
 * à « de quoi le ministère est-il fait », cet écran à « de quoi cette
 * direction-ci est-elle faite », question qu'on ne peut pas poser ailleurs.
 *
 * Les recopier à l'identique aurait été le doublon le plus coûteux : deux
 * endroits à corriger, et deux chiffres qui finissent par diverger.
 */
const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

/** Les tranches d'âge du rapport social, et non un découpage inventé. */
const TRANCHES = [
  { cle: "— 30", test: (a: number) => a < 30 },
  { cle: "30-39", test: (a: number) => a >= 30 && a < 40 },
  { cle: "40-49", test: (a: number) => a >= 40 && a < 50 },
  { cle: "50-59", test: (a: number) => a >= 50 && a < 60 },
  { cle: "60 +", test: (a: number) => a >= 60 },
];

export function GraphiquesAgents({ lignes }: { lignes: AgentProjete[] }) {
  const vue = useMemo(() => {
    const compter = <T extends string>(cle: (a: AgentProjete) => T | undefined) => {
      const m = new Map<string, number>();
      lignes.forEach((a) => {
        const k = cle(a);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      });
      return m;
    };

    const parEntite = compter((a) => a.entiteId);
    const directions = [...parEntite.entries()]
      .map(([id, n]) => ({ nom: entiteById(id)?.sigle ?? id, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);

    const parCategorie = compter((a) => a.categorie);
    const categories = [...parCategorie.entries()]
      .map(([c, n]) => ({ nom: REGLES_CATEGORIE[c as keyof typeof REGLES_CATEGORIE]?.libelle ?? c, n }))
      .sort((a, b) => b.n - a.n);

    const parPosition = compter((a) => a.nature);
    const positions = [...parPosition.entries()]
      .map(([p, n]) => ({ nom: (POSITION_LABELS as Record<string, string>)[p] ?? p, n }))
      .sort((a, b) => b.n - a.n);

    const ages = TRANCHES.map((t) => ({
      nom: t.cle,
      hommes: lignes.filter((a) => a.sexe === "M" && t.test(a.age)).length,
      femmes: lignes.filter((a) => a.sexe === "F" && t.test(a.age)).length,
    }));

    const femmes = lignes.filter((a) => a.sexe === "F").length;

    return {
      directions, categories, positions, ages, femmes,
      partFemmes: lignes.length ? (femmes / lignes.length) * 100 : 0,
      entites: parEntite.size,
    };
  }, [lignes]);

  if (lignes.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloc
        titre={`Où ils servent — ${fmtNum(vue.entites)} entités`}
        description="Les huit premières de la sélection. Une direction absente n'a personne dans ce filtre."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vue.directions} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis dataKey="nom" type="category" width={78} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip {...infobulle} />
            <Bar dataKey="n" name="Agents" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Bloc>

      <Bloc
        titre="Catégories de personnel"
        description="Fonctionnaires, contractuels et autres : ce qui décide du régime applicable."
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={vue.categories} dataKey="n" nameKey="nom"
              cx="50%" cy="50%" innerRadius={48} outerRadius={82} paddingAngle={2}
            >
              {vue.categories.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...infobulle} />
          </PieChart>
        </ResponsiveContainer>
        <Legende entrees={vue.categories} total={lignes.length} />
      </Bloc>

      <Bloc
        titre={`Pyramide des âges — ${fmtPct(vue.partFemmes)} de femmes`}
        description="Par tranche et par sexe. C'est elle qui annonce les départs à la retraite des dix prochaines années."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vue.ages} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip {...infobulle} />
            <Bar dataKey="hommes" name="Hommes" stackId="a" fill={CHART_COLORS[1]} />
            <Bar dataKey="femmes" name="Femmes" stackId="a" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Bloc>

      <Bloc
        titre="Positions administratives"
        description="Activité, détachement, disponibilité… Chacune naît d'un acte, aucune n'est saisie à la main."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vue.positions} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="nom" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip {...infobulle} />
            <Bar dataKey="n" name="Agents" fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Bloc>
    </div>
  );
}

function Bloc({ titre, description, children }: {
  titre: string; description: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{titre}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px] pt-2">{children}</CardContent>
    </Card>
  );
}

function Legende({ entrees, total }: { entrees: { nom: string; n: number }[]; total: number }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px]">
      {entrees.map((e, i) => (
        <span key={e.nom} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
          />
          {e.nom} · <span className="tabular-nums text-foreground">{fmtNum(e.n)}</span>
          {total > 0 && ` (${fmtPct((e.n / total) * 100)})`}
        </span>
      ))}
    </div>
  );
}
