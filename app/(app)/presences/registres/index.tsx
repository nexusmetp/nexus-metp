"use client";

import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BookOpenCheck, BookX, MapPin, UserCog } from "lucide-react";
import {
  useAgentsProjetes, useCloreRegistre, useEnregistrerPoint, useEntites,
  useOuvrirRegistre, usePointsAccueil, useRegistres,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  COULEUR_CAHIER, ETAT_CAHIER_LABELS, MODE_RELEVE_LABELS, NIVEAU_LABELS,
  idRegistre, peut,
} from "@/lib/referentiels";
import { CHART_COLORS, fmtNum, fmtPct } from "@/lib/format";
import {
  Badge, Colonne, LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule,
} from "@/components/nexus/module";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AUJOURDHUI, FENETRE_JOURS, lignesServices, resumerAccueil, serieTenue, type LigneService } from "./calculs";
import { DialogueCloture, DialoguePoint } from "./formulaires";

/* ------------------------------------------------------------------ */
/* Points d'accueil et cahiers d'émargement                            */
/*                                                                     */
/* L'écran qui manquait sous tous les autres. Il répond à une question */
/* qu'aucun tableau de présence ne pouvait poser : ce service tient-il */
/* son cahier ? Sans elle, l'absence de pointage était muette — agent  */
/* absent, ou secrétariat qui n'a rien ouvert ? Les deux appellent une */
/* décision, mais pas la même, et pas du même responsable.             */
/* ------------------------------------------------------------------ */

const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};

export function RegistresEntite() {
  const user = useAuth((s) => s.user)!;
  const redacteur = peut(user.role, "presences", "W");
  const { data: agents, pret } = useAgentsProjetes();
  const { data: entites = [], isLoading: chargeEntites } = useEntites();
  const { data: points = [], isLoading: chargePoints } = usePointsAccueil();
  const { data: registres = [] } = useRegistres();

  const enregistrerPoint = useEnregistrerPoint();
  const ouvrirRegistre = useOuvrirRegistre();
  const cloreRegistre = useCloreRegistre();

  const [date, setDate] = useState(AUJOURDHUI);
  const [filtres, setFiltres] = useState<Record<string, string>>({ etat: "all", niveau: "all" });
  const [selection, setSelection] = useState<string | null>(null);
  const [formulaire, setFormulaire] = useState<LigneService | null>(null);
  const [cloture, setCloture] = useState<LigneService | null>(null);

  const lignes = useMemo(
    () => lignesServices({ entites, points, registres, agents, date }),
    [entites, points, registres, agents, date]
  );
  const resume = useMemo(() => resumerAccueil(lignes), [lignes]);
  const courbe = useMemo(
    () => serieTenue(registres, lignes.filter((l) => l.effectif > 0).length, date),
    [registres, lignes, date]
  );

  const visibles = useMemo(() => lignes.filter((l) => {
    if (filtres.niveau !== "all" && l.entite.niveau !== filtres.niveau) return false;
    if (filtres.etat === "sans-point") return !l.point;
    if (filtres.etat === "sans-responsable") return !!l.point && !l.point.responsableId;
    if (filtres.etat === "jamais-tenu") return l.joursTenus === 0;
    if (filtres.etat === "tenu") return l.joursTenus > 0;
    return true;
  }), [lignes, filtres]);

  const active = lignes.find((l) => l.id === selection) ?? null;

  if (!pret || chargeEntites || chargePoints) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const colonnes: Colonne<LigneService>[] = [
    {
      cle: "service", entete: "Service", visible: "toujours",
      rendu: (l) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{l.entite.sigle}</div>
          <div className="truncate text-xs text-muted-foreground">{l.entite.nom}</div>
        </div>
      ),
    },
    {
      cle: "point", entete: "Point d'accueil", visible: "lg",
      rendu: (l) => (l.point
        ? (
          <div className="min-w-0">
            <div className="truncate text-sm">{l.point.libelle}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {l.point.localisation ?? "Lieu non précisé"}
            </div>
          </div>
        )
        : <span className="text-xs text-muted-foreground">Non déclaré</span>),
    },
    {
      cle: "responsable", entete: "Tenu par", visible: "xl",
      rendu: (l) => (l.responsable
        ? <span className="text-sm">{l.responsable.prenom} {l.responsable.nom.toUpperCase()}</span>
        : <span className="text-xs text-amber-600">Non désigné</span>),
    },
    {
      cle: "effectif", entete: "Effectif", aligne: "droite", visible: "md",
      rendu: (l) => <span className="tabular-nums">{fmtNum(l.effectif)}</span>,
    },
    {
      cle: "regularite", entete: `Cahier sur ${FENETRE_JOURS} j`, aligne: "droite", visible: "md",
      rendu: (l) => (
        <span className={l.joursTenus === 0 ? "text-xs text-rose-600" : "tabular-nums text-sm"}>
          {l.joursTenus === 0 ? "jamais ouvert" : `${l.joursTenus} / ${FENETRE_JOURS}`}
        </span>
      ),
    },
    {
      cle: "etat", entete: "Ce jour", aligne: "droite",
      rendu: (l) => (
        <Badge variant="outline" className={COULEUR_CAHIER[l.etatDuJour]}>
          {ETAT_CAHIER_LABELS[l.etatDuJour]}
        </Badge>
      ),
    },
  ];

  const niveaux = [...new Set(lignes.map((l) => l.entite.niveau))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
          Le pointage de la journée se relève quelque part : dans chaque direction et chaque
          service, un point d&apos;accueil tenu par quelqu&apos;un. Cet onglet dit où il se
          trouve, qui en répond, et si le cahier a été ouvert.{" "}
          <strong className="font-medium text-foreground">Un cahier non tenu ne prouve rien
          sur les agents</strong> : il dit seulement que le service ne l&apos;a pas ouvert ce
          jour-là — ce qui borne la portée de tous les taux de présence affichés ailleurs.
        </p>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Journée</Label>
          <Input
            id="accueil-date" type="date" value={date}
            onChange={(e) => setDate(e.target.value || AUJOURDHUI)}
            className="h-9 w-[150px]"
          />
        </div>
      </div>

      <RangeeKpi tuiles={[
        {
          ton: "indigo", titre: "Points déclarés", valeur: fmtNum(resume.avecPoint), icon: MapPin,
          sousTitre: `sur ${fmtNum(resume.services)} services qui doivent en tenir un`,
        },
        {
          ton: "ambre", titre: "Sans responsable désigné", valeur: fmtNum(resume.avecPoint - resume.avecResponsable),
          icon: UserCog, sousTitre: "personne ne répond du cahier",
        },
        {
          ton: "emeraude", titre: "Cahiers ouverts ce jour", valeur: fmtNum(resume.tenuCeJour), icon: BookOpenCheck,
          sousTitre: `${fmtPct(resume.tauxDuJour)} des services`,
        },
        {
          ton: "rose", titre: "Agents hors de tout cahier", valeur: fmtNum(resume.agentsSansCahier), icon: BookX,
          sousTitre: `${fmtNum(resume.jamaisTenus)} services n'ont rien ouvert en ${FENETRE_JOURS} jours`,
        },
      ]} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">La tenue des cahiers, jour par jour</CardTitle>
          <CardDescription>
            Ce que mesure cette courbe n'est pas la présence des agents, c'est la tenue du registre
            par les services. Elle dit ce que la plateforme est en état d'observer — et donc la
            portée exacte de tous les taux de présence affichés ailleurs.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={courbe} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip {...infobulle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="clos" stackId="c" name="Cahiers clos" fill={CHART_COLORS[0]} />
              <Bar dataKey="ouverts" stackId="c" name="Ouverts, non clos" fill={CHART_COLORS[3]} />
              <Bar dataKey="manquants" stackId="c" name="Non ouverts" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <TableauModule<LigneService>
        titre="Les services et leur cahier"
        description="Une ligne par entité tenue d'avoir un point d'accueil. Cliquer ouvre la fiche."
        lignes={visibles}
        colonnes={colonnes}
        recherche={(l, t) =>
          `${l.entite.sigle} ${l.entite.nom} ${l.point?.libelle ?? ""}`.toLowerCase().includes(t.toLowerCase())}
        placeholderRecherche="Rechercher une direction, un service…"
        filtres={[
          {
            cle: "etat", libelle: "Tous les services",
            options: [
              { valeur: "sans-point", libelle: "Sans point déclaré" },
              { valeur: "sans-responsable", libelle: "Sans responsable" },
              { valeur: "jamais-tenu", libelle: "Cahier jamais ouvert" },
              { valeur: "tenu", libelle: "Cahier tenu" },
            ],
          },
          {
            cle: "niveau", libelle: "Tous les niveaux",
            options: niveaux.map((n) => ({ valeur: n, libelle: NIVEAU_LABELS[n] })),
          },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(cle, valeur) => setFiltres((f) => ({ ...f, [cle]: valeur }))}
        surSelection={(l) => setSelection(l.id)}
        ligneActive={selection}
        vide="Aucun service ne correspond à ce filtre."
      />

      <PanneauDetail
        ouvert={!!active}
        surFermeture={() => setSelection(null)}
        titre={active ? `${active.entite.sigle} — ${active.entite.nom}` : ""}
        sousTitre={active ? NIVEAU_LABELS[active.entite.niveau] : undefined}
        etiquette={active && (
          <Badge variant="outline" className={COULEUR_CAHIER[active.etatDuJour]}>
            {ETAT_CAHIER_LABELS[active.etatDuJour]}
          </Badge>
        )}
        actions={active && redacteur && (
          <>
            <Button variant="outline" onClick={() => setFormulaire(active)}>
              {active.point ? "Corriger le point" : "Déclarer le point"}
            </Button>
            {active.point && active.etatDuJour === "NON_TENU" && (
              <Button onClick={() => {
                ouvrirRegistre.mutate({
                  entiteId: active.entite.id,
                  pointAccueilId: active.point!.id,
                  date,
                  utilisateur: user,
                });
              }}>
                Ouvrir le cahier du {date}
              </Button>
            )}
            {active.etatDuJour === "OUVERT" && (
              <Button onClick={() => setCloture(active)}>Clore le cahier</Button>
            )}
          </>
        )}
      >
        {active && (
          <>
            <Section titre="Le point d'accueil">
              <LigneInfo k="Intitulé" v={active.point?.libelle ?? "Non déclaré"} />
              <LigneInfo k="Où" v={active.point?.localisation ?? "Lieu non renseigné"} />
              <LigneInfo
                k="Responsable du registre"
                v={active.responsable
                  ? `${active.responsable.prenom} ${active.responsable.nom.toUpperCase()}`
                  : "Non désigné"}
              />
              <LigneInfo
                k="Mode de relevé"
                v={active.point ? MODE_RELEVE_LABELS[active.point.modeReleve] : "—"}
              />
              <LigneInfo
                k="Heures d'ouverture"
                v={active.point?.heureOuverture
                  ? `${active.point.heureOuverture} — ${active.point.heureFermeture ?? "non renseignée"}`
                  : "Donnée non renseignée"}
              />
            </Section>

            <Section titre={`Le cahier sur ${FENETRE_JOURS} jours ouvrés`}>
              <LigneInfo k="Jours ouverts" v={`${active.joursTenus} / ${FENETRE_JOURS}`} />
              <LigneInfo
                k="Jours clos"
                v={`${active.joursClos} — seuls les cahiers clos attestent`}
              />
              <LigneInfo k="Effectif servant ici" v={fmtNum(active.effectif)} />
            </Section>

            {active.manques.length > 0 && (
              <Section titre="Ce qui manque">
                <ul className="space-y-1.5 text-sm">
                  {active.manques.map((m) => (
                    <li key={m} className="flex gap-2 text-amber-700 dark:text-amber-500">
                      <span aria-hidden>•</span>{m}
                    </li>
                  ))}
                </ul>
                <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Aucune de ces mentions ne met en cause un agent : ce sont des lacunes
                  d'organisation, à combler par le service lui-même.
                </p>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>

      <DialoguePoint
        ouvert={!!formulaire}
        ligne={formulaire}
        agents={agents}
        surFermeture={() => setFormulaire(null)}
        surValidation={(point, creation) => {
          enregistrerPoint.mutate({ point, utilisateur: user, creation });
          setFormulaire(null);
        }}
      />

      <DialogueCloture
        ouvert={!!cloture}
        ligne={cloture}
        surFermeture={() => setCloture(null)}
        surValidation={(attendus, emarges, observations) => {
          const registre = registres.find((r) => r.id === idRegistre(cloture!.entite.id, date));
          if (registre) {
            cloreRegistre.mutate({ registre, attendus, emarges, utilisateur: user, observations });
          }
          setCloture(null);
        }}
      />
    </div>
  );
}
