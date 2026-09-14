"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart3, Clipboard, Download, FileSpreadsheet, Timer, Users } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useActes, useAgentsProjetes } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  DGARH_ID, POSITION_LABELS, REGLES_CATEGORIE, STATUTS_EN_COURS,
  cheminDe, departementDe, descendantsDe, entiteById, gradeById, typeActeById,
  perimetreVisible,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtDate, fmtNum, joursDepuis } from "@/lib/format";
import { copier, telecharger, versCSV } from "@/lib/export";
import { KpiCard, PageHeader } from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const infobulle = {
  contentStyle: { borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 },
};

export default function RapportsPage() {
  const user = useAuth((s) => s.user)!;
  const { data: tousAgents, pret } = useAgentsProjetes();
  const { data: tousActes = [] } = useActes();
  const [enCours, setEnCours] = useState<string | null>(null);

  /* C'est ici que la borne compte le plus : un état nominatif s'exporte en
     un clic, et un fichier parti n'est plus administrable. Tout le reste de
     la page — tuiles, graphiques, quatre états — se calcule sur `agents` et
     `actes` ; on les borne donc une seule fois, à la source, plutôt que de
     compter sur quatre filtres posés au bon endroit. */
  const perimetreDroit = useMemo(() => perimetreVisible(user), [user.role, user.entiteId]);

  const agents = useMemo(
    () => tousAgents.filter((a) => !perimetreDroit || (a.entiteId && perimetreDroit.has(a.entiteId))),
    [tousAgents, perimetreDroit]
  );

  const actes = useMemo(
    () => tousActes.filter((a) => !perimetreDroit
      || (a.entiteInstructriceId && perimetreDroit.has(a.entiteInstructriceId))),
    [tousActes, perimetreDroit]
  );

  const dgarh = useMemo(() => new Set(descendantsDe(DGARH_ID).map((e) => e.id)), []);

  const stats = useMemo(() => {
    const clos = actes.filter((a) => a.dateSignature);
    const delaiMoyen = clos.length
      ? Math.round(clos.reduce((s, a) =>
          s + (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5, 0) / clos.length)
      : 0;

    // Délai par type d'acte — la restitution du §13.
    const parType = Object.values(
      clos.reduce<Record<string, { type: string; libelle: string; n: number; total: number }>>((acc, a) => {
        acc[a.type] ??= { type: a.type, libelle: typeActeById(a.type)?.libelle ?? a.type, n: 0, total: 0 };
        acc[a.type].n++;
        acc[a.type].total += (new Date(a.dateSignature!).getTime() - new Date(a.dateCreation).getTime()) / 864e5;
        return acc;
      }, {})
    ).map((x) => ({ ...x, moyenne: Math.round(x.total / x.n) })).sort((a, b) => b.moyenne - a.moyenne);

    const parDepartement = Object.values(
      agents.reduce<Record<string, { nom: string; effectif: number; enseignants: number }>>((acc, a) => {
        const d = departementDe(a.entiteId);
        if (!d) return acc;
        acc[d.id] ??= { nom: d.nom.replace("Direction départementale de l'enseignement technique — ", ""), effectif: 0, enseignants: 0 };
        acc[d.id].effectif++;
        if (a.enseignant) acc[d.id].enseignants++;
        return acc;
      }, {})
    ).sort((a, b) => b.effectif - a.effectif);

    const parCategorie = (Object.keys(REGLES_CATEGORIE) as (keyof typeof REGLES_CATEGORIE)[])
      .map((c) => ({ name: REGLES_CATEGORIE[c].libelle, value: agents.filter((a) => a.categorie === c).length }))
      .filter((x) => x.value > 0);

    const parPosition = Object.entries(POSITION_LABELS)
      .map(([k, v]) => ({ name: v, value: agents.filter((a) => a.nature === k).length }))
      .filter((x) => x.value > 0);

    return {
      delaiMoyen, parType, parDepartement, parCategorie, parPosition,
      dgarhEffectif: agents.filter((a) => a.entiteId && dgarh.has(a.entiteId)).length,
      enseignants: agents.filter((a) => a.enseignant).length,
      ouverts: actes.filter((a) => STATUTS_EN_COURS.includes(a.statut)).length,
    };
  }, [agents, actes, dgarh]);

  const etats = useMemo(() => [
    {
      id: "nominatif",
      titre: "État nominatif du personnel",
      description: "Identité, affectation, grade et position de chaque agent",
      lignes: () => ({
        colonnes: ["Matricule", "Nom", "Prénom", "Sexe", "Né(e) le", "Catégorie", "Grade", "Échelon", "Indice", "Entité", "Département", "Position", "Recruté le"],
        donnees: agents.map((a) => [
          a.matricule, a.nom, a.prenom, a.sexe, a.dateNaissance,
          REGLES_CATEGORIE[a.categorie].libelle, gradeById(a.gradeId)?.libelle ?? "",
          a.echelon ?? "", a.indice ?? "", entiteById(a.entiteId)?.nom ?? "",
          departementDe(a.entiteId)?.sigle ?? "", POSITION_LABELS[a.nature], a.dateRecrutement,
        ]),
      }),
    },
    {
      id: "effectifs",
      titre: "Tableau des effectifs par département",
      description: "Effectif total et part enseignante",
      lignes: () => ({
        colonnes: ["Département", "Effectif", "Enseignants", "Part enseignante"],
        donnees: stats.parDepartement.map((d) => [
          d.nom, d.effectif, d.enseignants, `${Math.round((d.enseignants / d.effectif) * 100)} %`,
        ]),
      }),
    },
    {
      id: "mouvements",
      titre: "État des mouvements",
      description: "Actes en circulation et actes signés",
      lignes: () => ({
        colonnes: ["Référence", "Type", "Objet", "Bureau instructeur", "Statut", "Créé le", "Signé le", "Âge (jours)"],
        donnees: actes.map((a) => [
          a.reference, typeActeById(a.type)?.libelle ?? a.type, a.objet,
          entiteById(a.entiteInstructriceId)?.sigle ?? "", a.statut,
          a.dateCreation, a.dateSignature ?? "", joursDepuis(a.dateCreation),
        ]),
      }),
    },
    {
      id: "delais",
      titre: "Délais d'instruction par type d'acte",
      description: "Le chiffre que l'administration ne produit pas aujourd'hui",
      lignes: () => ({
        colonnes: ["Type d'acte", "Dossiers clos", "Délai moyen (jours)", "Cible (jours)", "Écart"],
        donnees: stats.parType.map((t) => [t.libelle, t.n, t.moyenne, 15, t.moyenne - 15]),
      }),
    },
  ], [agents, actes, stats]);

  const produire = async (etat: (typeof etats)[number], mode: "fichier" | "copie") => {
    setEnCours(etat.id + mode);
    const { colonnes, donnees } = etat.lignes();
    const csv = versCSV(colonnes, donnees as any);
    if (mode === "copie") {
      const ok = await copier(csv);
      toast[ok ? "success" : "error"](
        ok ? "Copié dans le presse-papiers" : "Copie impossible",
        { description: ok ? `${donnees.length} lignes, séparateur point-virgule.` : "Le navigateur a refusé l'accès au presse-papiers." }
      );
    } else {
      const r = await telecharger(`${etat.id}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      if (r === "enregistre") {
        toast.success("Fichier enregistré", { description: `${donnees.length} lignes, séparateur point-virgule.` });
      } else if (r === "refuse") {
        toast.info("Enregistrement annulé");
      } else {
        toast.error("Téléchargement indisponible", { description: "Utilisez « Copier » : le fichier ira dans le presse-papiers." });
      }
    }
    setEnCours(null);
  };

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Rapports et états"
        description="Restitutions du §13 : états réglementaires exportables et indicateurs de pilotage. Les axes obligatoires sont le département, l'entité, le corps, le grade, la catégorie, le sexe et la position."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          ton="bleu"
          titre={perimetreDroit ? "Effectif de votre périmètre" : "Effectif ministère"}
          valeur={fmtNum(agents.length)}
          sousTitre={`dont ${fmtNum(stats.enseignants)} enseignants`}
          icon={Users}
        />
        <KpiCard
          ton="cyan"
          /* Borné, ce chiffre est l'intersection du périmètre et de la DGARH :
             le dire évite de lire deux fois le même nombre sans comprendre
             pourquoi il se répète quand on sert déjà à la DGARH. */
          titre={perimetreDroit ? "Dont rattachés à la DGARH" : "Effectif DGARH"}
          valeur={fmtNum(stats.dgarhEffectif)}
          sousTitre={perimetreDroit ? "part de votre périmètre" : "périmètre de la direction générale"}
          icon={BarChart3}
        />
        <KpiCard ton="ambre" titre="Délai moyen" valeur={`${stats.delaiMoyen} j`} sousTitre="tous actes signés confondus" icon={Timer} />
        <KpiCard ton="violet" titre="Dossiers ouverts" valeur={fmtNum(stats.ouverts)} sousTitre="en circulation" icon={FileSpreadsheet} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">États réglementaires</CardTitle>
          <CardDescription>
            Format CSV, séparateur point-virgule, encodage UTF-8 avec BOM — ouvrable directement dans un tableur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {etats.map((e) => (
            <div key={e.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium">{e.titre}</div>
                <div className="text-xs text-muted-foreground">{e.description}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" disabled={!!enCours} onClick={() => produire(e, "copie")}>
                  <Clipboard className="mr-1.5 h-3.5 w-3.5" /> Copier
                </Button>
                <Button size="sm" disabled={!!enCours} onClick={() => produire(e, "fichier")}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Délai moyen d'instruction par type d'acte</CardTitle>
          <CardDescription>Cible réglementaire : 15 jours</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Type d'acte</TableHead>
                <TableHead className="text-right">Dossiers clos</TableHead>
                <TableHead className="text-right">Délai moyen</TableHead>
                <TableHead className="text-right">Écart à la cible</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {stats.parType.map((t) => (
                  <TableRow key={t.type}>
                    <TableCell className="text-sm font-medium">{t.libelle}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{t.n}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{t.moyenne} j</TableCell>
                    <TableCell className={`text-right text-sm font-semibold tabular-nums ${t.moyenne > 15 ? "text-amber-600" : "text-emerald-600"}`}>
                      {t.moyenne > 15 ? "+" : ""}{t.moyenne - 15} j
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Effectifs par département</CardTitle>
            <CardDescription>Les 15 directions départementales et leurs établissements</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.parDepartement} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <Tooltip {...infobulle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="enseignants" stackId="a" fill="#00B4D8" name="Enseignants" radius={[0, 0, 0, 0]} />
                <Bar dataKey="effectif" stackId="b" fill="#0077B6" name="Effectif total" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Positions administratives</CardTitle>
            <CardDescription>Répartition de l'effectif</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.parPosition} dataKey="value" nameKey="name" innerRadius={44} outerRadius={80} paddingAngle={3}>
                  {stats.parPosition.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip {...infobulle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
