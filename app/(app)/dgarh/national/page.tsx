"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, GraduationCap, Info, MapPin, Network, School, Users } from "lucide-react";
import { useAgentsProjetes, useBesoins } from "@/lib/queries";
import { NIVEAU_LABELS, cheminDe } from "@/lib/referentiels";
import { fmtNum, fmtPct } from "@/lib/format";
import { FAMILLES, dataUri, svgFamille } from "@/lib/carte/symboles";
import { CarteCongo } from "@/components/nexus/carte";
import { PageHeader } from "@/components/nexus/ui-kit";
import { LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule } from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COLONNES_DEPARTEMENT, useDepartements, type LigneDepartement } from "./departements";
import { FicheImplantation } from "./fiche";
import { pointCarte, useImplantations } from "./implantations";
import { useSituations } from "./situation";

export default function VueNationalePage() {
  const { data: agents, pret } = useAgentsProjetes();
  const { data: besoins = [] } = useBesoins();
  const situationDe = useSituations();
  const implantations = useImplantations();

  const [ouverte, setOuverte] = useState<string | null>(null);
  const [selection, setSelection] = useState<LigneDepartement | null>(null);

  const points = useMemo(() => implantations.map(pointCarte), [implantations]);
  const fiche = implantations.find((i) => i.id === ouverte) ?? null;

  const besoinsParDepartement = useMemo(() => {
    const m = new Map<string, number>();
    besoins.forEach((b) => b.departementId && m.set(b.departementId, (m.get(b.departementId) ?? 0) + 1));
    return m;
  }, [besoins]);

  const departements = useDepartements(implantations, besoinsParDepartement, agents.length, situationDe);

  const stats = useMemo(() => {
    const deploye = departements.reduce((s, d) => s + d.effectif, 0);
    const fort = departements[0];
    const faible = [...departements].reverse().find((d) => d.effectif > 0);
    return {
      deploye,
      central: Math.max(0, agents.length - deploye),
      fort, faible,
      ecart: fort && faible && faible.effectif ? Math.round(fort.effectif / faible.effectif) : 0,
      etablissements: implantations.filter((i) => i.niveau === "ETABLISSEMENT").length,
    };
  }, [departements, agents.length, implantations]);

  if (!pret) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        titre="Vue nationale"
        description="Où le personnel du ministère est réellement déployé. Chaque marqueur est une implantation, posée à ses coordonnées propres quand elles sont renseignées, sinon près du chef-lieu de son département. Sa taille dit l'effectif, sa couleur dit ce qui appelle une décision."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh">Tableau de bord</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/besoins">États de besoins</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Déployés en département", valeur: stats.deploye, sousTitre: `${fmtPct(agents.length ? (stats.deploye / agents.length) * 100 : 0)} de l'effectif`, icon: MapPin, href: "/dgarh/agents" },
        { ton: "cyan", titre: "En administration centrale", valeur: stats.central, sousTitre: "cabinet, directions et inspections", icon: Building2, href: "/dgarh/agents?entite=ENT-DGARH" },
        { ton: "emeraude", titre: "Département le plus doté", valeur: stats.fort?.effectif ?? 0, sousTitre: stats.fort?.nom ?? "—", icon: Users },
        { ton: "ambre", titre: "Écart entre extrêmes", valeur: `× ${stats.ecart}`, sousTitre: `${stats.fort?.nom ?? "—"} face à ${stats.faible?.nom ?? "—"}`, icon: Network, href: "/besoins" },
      ]} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Déploiement du personnel</CardTitle>
            <CardDescription>
              Survolez un marqueur pour la situation, cliquez-le pour la fiche. Le fond se change
              selon ce que vous cherchez : le plan pour situer, l'image aérienne pour reconnaître
              un site, les contours pour travailler sans réseau.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            <CarteCongo points={points} surSelection={setOuverte} className="p-4" />

            {fiche && <FicheImplantation implantation={fiche} surFermeture={() => setOuverte(null)} />}

            <div className="flex items-start gap-2 border-t px-4 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Une structure sans localisation propre est placée près du chef-lieu de son département.
                Renseignez ses coordonnées depuis le pilotage pour qu'elle se pose au bon endroit.
                Les contours sont ceux des douze départements antérieurs à 2024 : les trois créés
                depuis n'ont pas encore de tracé publié.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-w-0 flex-col">
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
                titre: `${fmtNum(stats.etablissements)} établissements pourvus`,
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

            <div className="rounded-xl border bg-muted/20 p-3">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Implantations portées
              </div>
              <div className="mt-1.5 space-y-1">
                {Object.entries(FAMILLES).map(([cle, f]) => {
                  const n = implantations.filter((i) => i.famille === cle).length;
                  if (!n) return null;
                  return (
                    <div key={cle} className="flex items-center gap-2 text-[11px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dataUri(svgFamille(cle as keyof typeof FAMILLES))} alt="" width={13} height={13} />
                      <span className="min-w-0 flex-1 truncate">{f.libelle}</span>
                      <span className="tabular-nums font-semibold">{fmtNum(n)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TableauModule<LigneDepartement>
        titre="Effectifs par département"
        description="Cliquez un département pour voir ce qui y est implanté."
        lignes={departements}
        colonnes={COLONNES_DEPARTEMENT}
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
                {implantations
                  .filter((p) => p.ville === selection.chefLieu)
                  .sort((a, b) => b.situation.effectif - a.situation.effectif)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setOuverte(p.id); setSelection(null); }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dataUri(svgFamille(p.famille))} alt="" width={14} height={14} className="shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium">{p.nom}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {NIVEAU_LABELS[p.niveau]}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs font-semibold">
                        {fmtNum(p.situation.effectif)}
                      </span>
                    </button>
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
