"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarCheck2, Globe2, PlaneTakeoff, Plus, TimerOff } from "lucide-react";
import {
  useAgentsProjetes, useConstaterRetour, useEnregistrerSortie, useEntites, useSorties,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  COULEUR_SORTIE, ENTITES, NATURE_SORTIE_LABELS, STATUT_SORTIE_LABELS,
  bornerPerimetre, descendantsDe, perimetreVisible, entiteById, peut, statutEffectif,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SortieTerritoire, StatutSortie } from "@/lib/types";

/** Une sortie telle qu'on la lit : avec sa situation recalculée du jour. */
type SortieVue = SortieTerritoire & { effectif: StatutSortie };

/* ------------------------------------------------------------------ */
/* Sorties du territoire                                               */
/*                                                                     */
/* Trois dates, et jamais une seule : ce qu'autorise l'acte, ce que     */
/* l'agent a fait, et l'écart entre les deux. C'est l'écart qui         */
/* intéresse un ministère, et il ne se lit nulle part si l'on garde     */
/* une seule date de retour.                                           */
/* ------------------------------------------------------------------ */

const AUJOURDHUI = "2026-09-10";

const videSortie = {
  agentId: "",
  destination: "",
  pays: "",
  motif: "",
  nature: "MISSION" as SortieTerritoire["nature"],
  dateDepart: AUJOURDHUI,
  dateRetourPrevue: "",
  typeActe: "Ordre de mission",
  referenceActe: "",
  autoriteSignataire: "",
};

export default function SortiesPage() {
  const user = useAuth((s) => s.user)!;
  const redacteur = peut(user.role, "sorties", "W");
  const { data: sorties = [], isLoading } = useSorties();
  const { data: agents, pret } = useAgentsProjetes();
  const { data: entitesDb = [] } = useEntites();
  const enregistrer = useEnregistrerSortie();
  const constater = useConstaterRetour();

  const [selection, setSelection] = useState<SortieTerritoire | null>(null);
  const [formulaire, setFormulaire] = useState<typeof videSortie | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "all", nature: "all", entite: "all" });

  const agentDe = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  /* Ce que ce profil a le droit de voir, quel que soit le filtre. Le
     filtre d'entité réduit à l'intérieur de cette borne ; il ne l'élargit
     jamais, et « toutes les entités » veut dire « toutes celles que je
     vois ». Une règle de confidentialité laissée au menu déroulant se
     contourne en changeant le menu déroulant. */
  const perimetreDroit = useMemo(
    () => perimetreVisible(user),
    [user.role, user.entiteId, entitesDb]
  );

  const perimetre = useMemo(
    () => bornerPerimetre(
      perimetreDroit,
      filtres.entite === "all" ? null : new Set(descendantsDe(filtres.entite).map((e) => e.id))
    ),
    [perimetreDroit, filtres.entite, entitesDb]
  );

  /* Le statut est recalculé à l'affichage. Un enregistrement vieillit : une
     sortie « autorisée » dont le retour était prévu la semaine dernière est
     un retard, et personne n'est venu le déclarer. */
  const vues = useMemo<SortieVue[]>(() => sorties
    /* Bornées dès la projection : les tuiles comptent sur `vues`, et les
       laisser compter le ministère entier au-dessus d'une liste bornée
       apprendrait au lecteur, par le compteur, ce que la liste lui cache. */
    .filter((s) => {
      if (!perimetreDroit) return true;
      const a = agentDe.get(s.agentId);
      return !!a?.entiteId && perimetreDroit.has(a.entiteId);
    })
    .map((s) => ({ ...s, effectif: statutEffectif(s, AUJOURDHUI) })),
    [sorties, perimetreDroit, agentDe]);

  /* On n'autorise une sortie que pour un agent qu'on administre : proposer
     tout le ministère dans la liste déroulante ferait écrire, depuis un
     service, une autorisation au nom d'une direction voisine. */
  const agentsVus = useMemo(
    () => agents.filter((a) => !perimetreDroit || (a.entiteId && perimetreDroit.has(a.entiteId))),
    [agents, perimetreDroit]
  );

  const lignes = useMemo(() => vues
    .filter((s) => filtres.statut === "all" || s.effectif === filtres.statut)
    .filter((s) => filtres.nature === "all" || s.nature === filtres.nature)
    .filter((s) => {
      if (!perimetre) return true;
      const a = agentDe.get(s.agentId);
      return !!a?.entiteId && perimetre.has(a.entiteId);
    })
    .sort((a, b) => b.dateDepart.localeCompare(a.dateDepart)), [vues, filtres, perimetre, agentDe]);

  const stats = useMemo(() => {
    const dehors = vues.filter((s) => s.effectif === "EN_COURS");
    const retards = vues.filter((s) => s.effectif === "RETARD_RETOUR");
    const aVenir = vues.filter((s) => s.effectif === "AUTORISEE");
    /* Les retours attendus dans les quinze jours : ce qu'un chef de service
       doit anticiper pour réorganiser son bureau. */
    const bientot = dehors.filter((s) => {
      const j = Math.round((new Date(s.dateRetourPrevue).getTime() - new Date(AUJOURDHUI).getTime()) / 864e5);
      return j >= 0 && j <= 15;
    });
    return { dehors: dehors.length, retards: retards.length, aVenir: aVenir.length, bientot: bientot.length };
  }, [vues]);

  const colonnes: Colonne<SortieVue>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (s) => {
        const a = agentDe.get(s.agentId);
        return (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{a ? `${a.prenom} ${a.nom}` : s.agentId}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {a?.matricule} · {entiteById(a?.entiteId)?.sigle ?? "—"}
            </div>
          </div>
        );
      },
    },
    {
      cle: "destination", entete: "Destination",
      rendu: (s) => (
        <div className="min-w-0">
          <div className="truncate text-sm">{s.destination}</div>
          <div className="truncate text-[11px] text-muted-foreground">{s.pays}</div>
        </div>
      ),
    },
    {
      cle: "nature", entete: "Motif", visible: "xl",
      rendu: (s) => <span className="text-xs text-muted-foreground">{NATURE_SORTIE_LABELS[s.nature]}</span>,
    },
    {
      cle: "depart", entete: "Départ", aligne: "droite", visible: "md",
      rendu: (s) => <span className="tabular-nums text-xs">{fmtDate(s.dateDepart)}</span>,
    },
    {
      cle: "retour", entete: "Retour", aligne: "droite", visible: "md",
      rendu: (s) => (
        <div className="text-right">
          <div className="tabular-nums text-xs">{fmtDate(s.dateRetourReelle ?? s.dateRetourPrevue)}</div>
          {!s.dateRetourReelle && (
            <div className="text-[10px] text-muted-foreground">prévu</div>
          )}
        </div>
      ),
    },
    {
      cle: "statut", entete: "Situation",
      rendu: (s) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR_SORTIE[s.effectif])}>
          {STATUT_SORTIE_LABELS[s.effectif]}
        </Badge>
      ),
    },
  ];

  const valider = async () => {
    if (!formulaire) return;
    if (!formulaire.agentId || !formulaire.dateRetourPrevue || !formulaire.destination) {
      toast.error("Agent, destination et date de retour prévue sont requis.");
      return;
    }
    const a = agentDe.get(formulaire.agentId);
    await enregistrer.mutateAsync({
      creation: true,
      utilisateur: user,
      sortie: {
        id: "",
        agentId: formulaire.agentId,
        entiteId: a?.entiteId,
        destination: formulaire.destination,
        pays: formulaire.pays || formulaire.destination,
        motif: formulaire.motif,
        nature: formulaire.nature,
        dateDepart: formulaire.dateDepart,
        dateRetourPrevue: formulaire.dateRetourPrevue,
        dateRetourReelle: null,
        statut: "AUTORISEE",
        typeActe: formulaire.typeActe,
        referenceActe: formulaire.referenceActe || undefined,
        autoriteSignataire: formulaire.autoriteSignataire || undefined,
        priseEnCharge: null,
      },
    });
    toast.success("Autorisation enregistrée", {
      description: `${a?.prenom} ${a?.nom} — ${formulaire.destination}.`,
    });
    setFormulaire(null);
  };

  const retour = async (s: SortieTerritoire) => {
    await constater.mutateAsync({ sortie: s, date: AUJOURDHUI, utilisateur: user });
    toast.success("Retour constaté", { description: `Le ${fmtDate(AUJOURDHUI)}.` });
    setSelection(null);
  };

  if (!pret || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const agentSelection = selection ? agentDe.get(selection.agentId) : null;
  const statutSelection = selection ? statutEffectif(selection, AUJOURDHUI) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Sorties du territoire"
        description={
          "Qui est autorisé à sortir, qui est actuellement hors du pays, jusqu'à quand, et sous quel "
          + "acte. La situation affichée est recalculée d'après les dates : une autorisation dont le "
          + "retour est dépassé se présente comme un retard, même si personne ne l'a déclaré."
        }
      >
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...videSortie, agentId: agentsVus[0]?.id ?? "" })}>
            <Plus className="mr-1.5 h-4 w-4" /> Enregistrer une autorisation
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Hors du territoire", valeur: fmtNum(stats.dehors), sousTitre: "agents actuellement à l'étranger", icon: Globe2 },
        { ton: "rose", titre: "Retards de retour", valeur: fmtNum(stats.retards), sousTitre: "au-delà de la date autorisée", icon: TimerOff },
        { ton: "ambre", titre: "Retours sous 15 jours", valeur: fmtNum(stats.bientot), sousTitre: "à anticiper dans les services", icon: CalendarCheck2 },
        { ton: "bleu", titre: "Départs à venir", valeur: fmtNum(stats.aVenir), sousTitre: "autorisations non encore entamées", icon: PlaneTakeoff },
      ]} />

      {stats.retards > 0 && (
        <Card className="border-rose-500/30 bg-rose-500/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {fmtNum(stats.retards)} agents n'ont pas de retour constaté au-delà de l'autorisation
            </CardTitle>
            <CardDescription className="text-xs">
              Un retard de retour n'établit rien à lui seul : l'agent peut être rentré sans que le
              service l'ait consigné, ou son autorisation avoir été prolongée par un acte qui n'est pas
              remonté. Constatez le retour ici, ou versez l'acte de prolongation au dossier.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <TableauModule<SortieVue>
        titre="Autorisations de sortie"
        description="Cliquez une ligne pour voir l'acte qui l'autorise et constater le retour."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(s, t) => {
          const a = agentDe.get(s.agentId);
          return s.destination.toLowerCase().includes(t)
            || s.pays.toLowerCase().includes(t)
            || (!!a && (a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.toLowerCase().includes(t)));
        }}
        placeholderRecherche="Agent, destination ou pays…"
        filtres={[
          { cle: "statut", libelle: "Toutes situations", options: (Object.keys(STATUT_SORTIE_LABELS) as (keyof typeof STATUT_SORTIE_LABELS)[]).map((s) => ({ valeur: s, libelle: STATUT_SORTIE_LABELS[s] })) },
          { cle: "nature", libelle: "Tous motifs", options: (Object.keys(NATURE_SORTIE_LABELS) as (keyof typeof NATURE_SORTIE_LABELS)[]).map((n) => ({ valeur: n, libelle: NATURE_SORTIE_LABELS[n] })) },
          { cle: "entite", libelle: "Toutes les entités", options: ENTITES
            .filter((e) => ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "DIRECTION_DEPARTEMENTALE", "SERVICE"].includes(e.niveau))
            .slice(0, 70).map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 38)}` })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        vide="Aucune autorisation enregistrée pour ce périmètre."
        parPage={16}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={agentSelection ? `${agentSelection.prenom} ${agentSelection.nom}` : ""}
        sousTitre={selection ? `${selection.destination} (${selection.pays}) — ${NATURE_SORTIE_LABELS[selection.nature]}` : ""}
        etiquette={statutSelection && (
          <Badge variant="outline" className={cn("text-[10px]", COULEUR_SORTIE[statutSelection])}>
            {STATUT_SORTIE_LABELS[statutSelection]}
          </Badge>
        )}
        actions={selection && redacteur && !selection.dateRetourReelle ? (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dgarh/agents/${selection.agentId}`}>Ouvrir le dossier</Link>
            </Button>
            <Button size="sm" onClick={() => retour(selection)} disabled={constater.isPending}>
              Constater le retour aujourd'hui
            </Button>
          </>
        ) : undefined}
      >
        {selection && (
          <>
            <Section titre="L'autorisation">
              <LigneInfo k="Type d'acte" v={selection.typeActe} />
              <LigneInfo k="Référence" v={selection.referenceActe ?? "Donnée non renseignée"} />
              <LigneInfo k="Autorité signataire" v={selection.autoriteSignataire ?? "Donnée non renseignée"} />
              <LigneInfo k="Motif" v={selection.motif || "—"} />
              <LigneInfo
                k="Prise en charge"
                v={selection.priseEnCharge === "ETAT" ? "État"
                  : selection.priseEnCharge === "PARTENAIRE" ? "Partenaire"
                  : selection.priseEnCharge === "AGENT" ? "Agent"
                  : "Donnée non renseignée"}
              />
            </Section>
            <Section titre="Les trois dates">
              <LigneInfo k="Départ" v={fmtDate(selection.dateDepart)} />
              <LigneInfo k="Retour autorisé" v={fmtDate(selection.dateRetourPrevue)} />
              <LigneInfo
                k="Retour constaté"
                v={selection.dateRetourReelle
                  ? fmtDate(selection.dateRetourReelle)
                  : <span className="text-muted-foreground/70">non constaté</span>}
              />
              <LigneInfo
                k="Écart"
                v={selection.dateRetourReelle
                  ? `${Math.round((new Date(selection.dateRetourReelle).getTime() - new Date(selection.dateRetourPrevue).getTime()) / 864e5)} jour(s)`
                  : statutSelection === "RETARD_RETOUR"
                    ? `${Math.round((new Date(AUJOURDHUI).getTime() - new Date(selection.dateRetourPrevue).getTime()) / 864e5)} jour(s) au-delà, à ce jour`
                    : "—"}
              />
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Enregistrer une autorisation de sortie"
        description="L'autorisation existe par l'acte qui la porte. Sans référence ni signataire, elle reste incomplète — et l'écran le dira."
        surValidation={valider}
        validationPossible={!enregistrer.isPending}
        large
      >
        {formulaire && (
          <>
            <ChampSelect
              label="Agent" obligatoire valeur={formulaire.agentId}
              surChangement={(v) => setFormulaire({ ...formulaire, agentId: v })}
              options={agentsVus.slice(0, 400).map((a) => ({ valeur: a.id, libelle: `${a.matricule} — ${a.prenom} ${a.nom}` }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ChampTexte label="Ville de destination" obligatoire valeur={formulaire.destination}
                surChangement={(v) => setFormulaire({ ...formulaire, destination: v })} placeholder="Paris" />
              <ChampTexte label="Pays" valeur={formulaire.pays}
                surChangement={(v) => setFormulaire({ ...formulaire, pays: v })} placeholder="France" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChampTexte label="Date de départ" type="date" obligatoire valeur={formulaire.dateDepart}
                surChangement={(v) => setFormulaire({ ...formulaire, dateDepart: v })} />
              <ChampTexte label="Retour autorisé" type="date" obligatoire valeur={formulaire.dateRetourPrevue}
                surChangement={(v) => setFormulaire({ ...formulaire, dateRetourPrevue: v })} />
            </div>
            <ChampSelect
              label="Motif" valeur={formulaire.nature}
              surChangement={(v) => setFormulaire({ ...formulaire, nature: v as SortieTerritoire["nature"] })}
              options={(Object.keys(NATURE_SORTIE_LABELS) as (keyof typeof NATURE_SORTIE_LABELS)[])
                .map((n) => ({ valeur: n, libelle: NATURE_SORTIE_LABELS[n] }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ChampTexte label="Type d'acte" valeur={formulaire.typeActe}
                surChangement={(v) => setFormulaire({ ...formulaire, typeActe: v })} />
              <ChampTexte label="Référence de l'acte" valeur={formulaire.referenceActe}
                surChangement={(v) => setFormulaire({ ...formulaire, referenceActe: v })}
                placeholder="0142/METP-CAB/2026" />
            </div>
            <ChampTexte label="Autorité signataire" valeur={formulaire.autoriteSignataire}
              surChangement={(v) => setFormulaire({ ...formulaire, autoriteSignataire: v })}
              placeholder="Le Ministre de l'enseignement technique et professionnel" />
            <ChampZone label="Objet" lignes={3} valeur={formulaire.motif}
              surChangement={(v) => setFormulaire({ ...formulaire, motif: v })} />
          </>
        )}
      </DialogueFormulaire>
    </div>
  );
}
