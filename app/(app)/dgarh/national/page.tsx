"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2, GraduationCap, Info, MapPin, Network, School, Users,
} from "lucide-react";
import { useAgentsProjetes, useBesoins, useEntites } from "@/lib/queries";
import {
  DEPARTEMENTS, ENTITES, NIVEAU_LABELS, cheminDe, coordonneesDe,
  departementDe, descendantsDe, entiteById,
} from "@/lib/referentiels";
import { fmtNum, fmtPct } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  Jauge, LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Emprise du territoire congolais, arrondie au demi-degré. */
const CADRE = { lonMin: 10.8, lonMax: 18.9, latMin: -5.3, latMax: 3.9 };
const LARGEUR = 760;
const HAUTEUR = Math.round(LARGEUR * ((CADRE.latMax - CADRE.latMin) / (CADRE.lonMax - CADRE.lonMin)));

/** Projection équirectangulaire : suffisante à l'échelle d'un pays. */
const projeter = (lat: number, lon: number) => ({
  x: ((lon - CADRE.lonMin) / (CADRE.lonMax - CADRE.lonMin)) * LARGEUR,
  y: ((CADRE.latMax - lat) / (CADRE.latMax - CADRE.latMin)) * HAUTEUR,
});

type Famille = "DIRECTION_DEPARTEMENTALE" | "ETABLISSEMENT" | "ANTENNE_DEPARTEMENTALE" | "AUTRE";

const FAMILLES: Record<Famille, { libelle: string; couleur: string; anneau: string }> = {
  DIRECTION_DEPARTEMENTALE: { libelle: "Directions départementales", couleur: "#0077B6", anneau: "rgba(0,119,182,.22)" },
  ETABLISSEMENT: { libelle: "Établissements", couleur: "#00B4D8", anneau: "rgba(0,180,216,.22)" },
  ANTENNE_DEPARTEMENTALE: { libelle: "Antennes de contrôle", couleur: "#F4A261", anneau: "rgba(244,162,97,.24)" },
  AUTRE: { libelle: "Autres implantations", couleur: "#8D99AE", anneau: "rgba(141,153,174,.22)" },
};

const familleDe = (niveau: string): Famille =>
  niveau === "DIRECTION_DEPARTEMENTALE" || niveau === "ETABLISSEMENT" || niveau === "ANTENNE_DEPARTEMENTALE"
    ? (niveau as Famille) : "AUTRE";

interface Point {
  id: string; sigle: string; nom: string; niveau: string; ville: string;
  famille: Famille; effectif: number; lat: number; lon: number;
  departement?: string; besoins: number;
}

interface LigneDepartement {
  id: string; nom: string; chefLieu: string; effectif: number;
  implantations: number; etablissements: number; besoins: number; part: number;
}

export default function VueNationalePage() {
  const { data: agents, pret } = useAgentsProjetes();
  const { data: besoins = [] } = useBesoins();
  const { data: entitesDb = [] } = useEntites();

  const [famillesVues, setFamillesVues] = useState<Famille[]>(
    Object.keys(FAMILLES) as Famille[]
  );
  const [survol, setSurvol] = useState<Point | null>(null);
  const [selection, setSelection] = useState<LigneDepartement | null>(null);

  const effectifDirect = useMemo(() => {
    const m = new Map<string, number>();
    agents.forEach((a) => a.entiteId && m.set(a.entiteId, (m.get(a.entiteId) ?? 0) + 1));
    return m;
  }, [agents]);

  const effectifTotal = (id: string) =>
    descendantsDe(id).reduce((s, e) => s + (effectifDirect.get(e.id) ?? 0), 0);

  /* Tout ce qui a un chef-lieu connu se place sur la carte. */
  const points = useMemo<Point[]>(() => ENTITES
    .filter((e) => e.actif !== false)
    .map((e) => {
      const c = coordonneesDe(e);
      if (!c) return null;
      const effectif = effectifTotal(e.id);
      if (!effectif) return null;
      return {
        id: e.id, sigle: e.sigle, nom: e.nom, niveau: e.niveau, ville: e.ville ?? "",
        famille: familleDe(e.niveau), effectif, lat: c.lat, lon: c.lon,
        departement: departementDe(e.id)?.nom,
        besoins: besoins.filter((b) => b.etablissementId === e.id).length,
      } as Point;
    })
    .filter(Boolean) as Point[], [entitesDb, effectifDirect, besoins]);

  const visibles = points.filter((p) => famillesVues.includes(p.famille));
  const maxEffectif = Math.max(1, ...visibles.map((p) => p.effectif));
  const rayon = (n: number) => 5 + Math.sqrt(n / maxEffectif) * 22;

  const departements = useMemo<LigneDepartement[]>(() => {
    const total = agents.length || 1;
    return DEPARTEMENTS.map((d, i) => {
      const dd = `ENT-DD-${String(i + 1).padStart(2, "0")}`;
      const dansDepartement = points.filter((p) => p.ville === d.chefLieu);
      const effectif = effectifTotal(dd)
        + points.filter((p) => p.ville === d.chefLieu && p.famille === "ANTENNE_DEPARTEMENTALE")
            .reduce((s, p) => s + p.effectif, 0);
      return {
        id: dd, nom: d.nom, chefLieu: d.chefLieu, effectif,
        implantations: dansDepartement.length,
        etablissements: dansDepartement.filter((p) => p.famille === "ETABLISSEMENT").length,
        besoins: besoins.filter((b) => b.departementId === dd).length,
        part: (effectif / total) * 100,
      };
    }).sort((a, b) => b.effectif - a.effectif);
  }, [points, agents.length, besoins, effectifDirect]);

  const stats = useMemo(() => {
    const deploye = departements.reduce((s, d) => s + d.effectif, 0);
    const fort = departements[0];
    const faible = [...departements].reverse().find((d) => d.effectif > 0);
    return {
      deploye,
      central: Math.max(0, agents.length - deploye),
      fort, faible,
      ecart: fort && faible && faible.effectif ? Math.round(fort.effectif / faible.effectif) : 0,
    };
  }, [departements, agents.length]);

  const basculer = (f: Famille) =>
    setFamillesVues((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));

  const colonnes: Colonne<LigneDepartement>[] = [
    {
      cle: "departement", entete: "Département",
      rendu: (d) => (
        <div className="min-w-0">
          <div className="text-sm font-medium">{d.nom}</div>
          <div className="text-[11px] text-muted-foreground">chef-lieu : {d.chefLieu}</div>
        </div>
      ),
    },
    { cle: "effectif", entete: "Effectif", aligne: "droite", rendu: (d) => <span className="tabular-nums text-sm font-medium">{fmtNum(d.effectif)}</span> },
    {
      cle: "part", entete: "Part nationale", aligne: "droite", visible: "md",
      rendu: (d) => (
        <div className="ml-auto w-24">
          <div className="mb-1 text-right text-[11px] tabular-nums">{fmtPct(d.part)}</div>
          <Jauge valeur={d.part * 5} />
        </div>
      ),
    },
    { cle: "etablissements", entete: "Établissements", aligne: "droite", visible: "lg", rendu: (d) => <span className="tabular-nums text-sm">{fmtNum(d.etablissements)}</span> },
    { cle: "implantations", entete: "Implantations", aligne: "droite", visible: "xl", rendu: (d) => <span className="tabular-nums text-sm">{fmtNum(d.implantations)}</span> },
    { cle: "besoins", entete: "États de besoins", aligne: "droite", visible: "lg", rendu: (d) => <span className="tabular-nums text-sm">{fmtNum(d.besoins)}</span> },
  ];

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-[420px] w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Vue nationale"
        description="Où le personnel du ministère est réellement déployé. Chaque cercle est une implantation, placée aux coordonnées de son chef-lieu ; sa taille dit son effectif."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh">Tableau de bord</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/besoins">États de besoins</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { titre: "Déployés en département", valeur: stats.deploye, sousTitre: `${fmtPct(agents.length ? (stats.deploye / agents.length) * 100 : 0)} de l'effectif`, icon: MapPin, href: "/dgarh/agents" },
        { titre: "En administration centrale", valeur: stats.central, sousTitre: "cabinet, directions et inspections", icon: Building2, href: "/dgarh/agents?entite=ENT-DGARH" },
        { titre: "Département le plus doté", valeur: stats.fort?.effectif ?? 0, sousTitre: stats.fort?.nom ?? "—", icon: Users },
        { titre: "Écart entre extrêmes", valeur: `× ${stats.ecart}`, sousTitre: `${stats.fort?.nom ?? "—"} face à ${stats.faible?.nom ?? "—"}`, icon: Network, href: "/besoins" },
      ]} />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Déploiement du personnel</CardTitle>
              <CardDescription>
                Survolez un cercle pour l'identifier. Les familles peuvent être masquées.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FAMILLES) as Famille[]).map((f) => {
                const actif = famillesVues.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => basculer(f)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                      actif ? "bg-background" : "opacity-45"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: FAMILLES[f].couleur }} />
                    {FAMILLES[f].libelle}
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="relative p-0">
            <svg
              viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
              className="h-auto w-full bg-muted/25"
              role="img"
              aria-label="Déploiement du personnel du ministère sur le territoire congolais"
            >
              {/* Graticule : des degrés, pas une frontière tracée de mémoire. */}
              {Array.from({ length: 9 }, (_, i) => CADRE.lonMin + i).map((lon) => {
                const { x } = projeter(0, lon);
                return (
                  <g key={`lon-${lon}`}>
                    <line x1={x} y1={0} x2={x} y2={HAUTEUR} stroke="hsl(var(--border))" strokeDasharray="2 5" />
                    <text x={x + 3} y={HAUTEUR - 6} fontSize={9} fill="hsl(var(--muted-foreground))">{lon.toFixed(0)}° E</text>
                  </g>
                );
              })}
              {Array.from({ length: 10 }, (_, i) => Math.ceil(CADRE.latMin) + i).map((lat) => {
                const { y } = projeter(lat, 0);
                if (y < 0 || y > HAUTEUR) return null;
                return (
                  <g key={`lat-${lat}`}>
                    <line x1={0} y1={y} x2={LARGEUR} y2={y} stroke="hsl(var(--border))" strokeDasharray="2 5" />
                    <text x={4} y={y - 4} fontSize={9} fill="hsl(var(--muted-foreground))">
                      {lat === 0 ? "équateur" : `${Math.abs(lat)}° ${lat > 0 ? "N" : "S"}`}
                    </text>
                  </g>
                );
              })}

              {/* Les chefs-lieux, repères de lecture. */}
              {DEPARTEMENTS.map((d) => {
                const { x, y } = projeter(d.lat, d.lon);
                return (
                  <text key={d.nom} x={x} y={y - 26} fontSize={9.5} textAnchor="middle"
                        fill="hsl(var(--muted-foreground))" className="pointer-events-none">
                    {d.chefLieu}
                  </text>
                );
              })}

              {/* Les implantations, de la plus grande à la plus petite pour que
                  les petites restent cliquables au-dessus. */}
              {[...visibles].sort((a, b) => b.effectif - a.effectif).map((p, i) => {
                const { x, y } = projeter(p.lat, p.lon);
                const r = rayon(p.effectif);
                const f = FAMILLES[p.famille];
                return (
                  <motion.g
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: Math.min(i, 30) * 0.012, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: `${x}px ${y}px`, cursor: "pointer" }}
                    onMouseEnter={() => setSurvol(p)}
                    onMouseLeave={() => setSurvol(null)}
                  >
                    <circle cx={x} cy={y} r={r + 4} fill={f.anneau} />
                    <circle
                      cx={x} cy={y} r={r} fill={f.couleur}
                      fillOpacity={survol && survol.id !== p.id ? 0.35 : 0.85}
                      stroke="white" strokeWidth={1.2}
                    />
                    {r > 13 && (
                      <text x={x} y={y + 3.5} fontSize={10} fontWeight={700} textAnchor="middle"
                            fill="white" className="pointer-events-none">
                        {p.effectif}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </svg>

            {survol && (
              <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: FAMILLES[survol.famille].couleur }} />
                  <span className="font-mono text-[11px] font-bold">{survol.sigle}</span>
                  <Badge variant="outline" className="text-[9px]">{NIVEAU_LABELS[survol.niveau as keyof typeof NIVEAU_LABELS]}</Badge>
                </div>
                <div className="mt-1 text-xs font-medium leading-snug">{survol.nom}</div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{survol.ville}</span>
                  <span className="font-semibold text-foreground">{fmtNum(survol.effectif)} agents</span>
                  {survol.besoins > 0 && <span>{survol.besoins} besoin(s)</span>}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 border-t px-4 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Positions relevées au chef-lieu du département, à quelques kilomètres près : la carte situe
                les implantations, elle ne délimite pas les départements. Un fond cartographique
                OpenStreetMap suppose un serveur de tuiles, que le cadre de publication n'autorise pas.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ce que la carte montre</CardTitle>
            <CardDescription>Les déséquilibres se voient avant de se démontrer.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {[
              {
                icon: Users,
                titre: `${fmtNum(stats.deploye)} agents en département`,
                texte: `Contre ${fmtNum(stats.central)} en administration centrale, cabinet et inspections comprises.`,
              },
              {
                icon: MapPin,
                titre: `${stats.fort?.nom ?? "—"} concentre ${fmtPct(stats.fort?.part ?? 0)}`,
                texte: `Soit ${stats.ecart} fois l'effectif de ${stats.faible?.nom ?? "—"}, le moins doté.`,
              },
              {
                icon: School,
                titre: `${fmtNum(points.filter((p) => p.famille === "ETABLISSEMENT").length)} établissements pourvus`,
                texte: "Chacun remonte ses états de besoins par sa direction départementale.",
              },
              {
                icon: GraduationCap,
                titre: `${fmtNum(besoins.length)} états de besoins ouverts`,
                texte: "Les rapprocher de la carte, c'est arbitrer là où le manque est réel.",
              },
            ].map((b, i) => (
              <motion.div
                key={b.titre}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.2 + i * 0.06 }}
                className="flex items-start gap-3 rounded-xl border p-3"
              >
                <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-snug">{b.titre}</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{b.texte}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      <TableauModule<LigneDepartement>
        titre="Effectifs par département"
        description="Cliquez un département pour voir ce qui y est implanté."
        lignes={departements}
        colonnes={colonnes}
        recherche={(d, t) => d.nom.toLowerCase().includes(t) || d.chefLieu.toLowerCase().includes(t)}
        placeholderRecherche="Département ou chef-lieu…"
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={15}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection ? `Département ${selection.nom}` : ""}
        sousTitre={selection ? `Chef-lieu : ${selection.chefLieu}` : undefined}
        etiquette={selection && (
          <Badge variant="secondary" className="text-[10px]">{fmtNum(selection.effectif)} agents</Badge>
        )}
        actions={selection && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dgarh/agents?entite=${selection.id}`}>Voir les agents</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/besoins">États de besoins</Link>
            </Button>
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Poids national">
              <LigneInfo k="Effectif" v={fmtNum(selection.effectif)} />
              <LigneInfo k="Part de l'effectif du ministère" v={fmtPct(selection.part)} />
              <LigneInfo k="Implantations" v={fmtNum(selection.implantations)} />
              <LigneInfo k="Établissements" v={fmtNum(selection.etablissements)} />
              <LigneInfo k="États de besoins" v={fmtNum(selection.besoins)} />
            </Section>

            <Section titre="Implantations">
              <div className="space-y-1">
                {points
                  .filter((p) => p.ville === selection.chefLieu)
                  .sort((a, b) => b.effectif - a.effectif)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: FAMILLES[p.famille].couleur }} />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium">{p.nom}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {NIVEAU_LABELS[p.niveau as keyof typeof NIVEAU_LABELS]}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 tabular-nums text-xs font-semibold">{fmtNum(p.effectif)}</span>
                    </div>
                  ))}
              </div>
            </Section>

            <Section titre="Rattachement">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {cheminDe(selection.id).map((e) => e.sigle).join(" › ")} — la direction départementale
                relève du ministère, l'antenne de contrôle relève de l'inspection interdépartementale.
                Le personnel des deux est géré par la direction générale.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>
    </>
  );
}
