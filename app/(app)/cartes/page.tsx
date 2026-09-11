"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck, CreditCard, Printer, RefreshCw, ShieldX, TriangleAlert,
} from "lucide-react";
import {
  useAgentsProjetes, useCartes, useEnregistrerCarte, useEntites,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  APP_NAME, ENTITES, MINISTERE_NOM, REGLES_CATEGORIE, cheminDe,
  descendantsDe, entiteById, gradeById, peut,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { BadgeCategorie, PageHeader } from "@/components/nexus/ui-kit";
import { Portrait } from "@/components/nexus/portrait";
import { CarteRecto, CarteVerso, VALIDITE_ANS } from "./carte";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AgentProjete, CarteProfessionnelle, StatutCarte } from "@/lib/types";

const STATUT_LABELS: Record<StatutCarte, string> = {
  A_EDITER: "À éditer", EDITEE: "Éditée", REMISE: "Remise",
  PERDUE: "Déclarée perdue", EXPIREE: "Expirée",
};

const COULEUR: Record<StatutCarte, string> = {
  A_EDITER: "bg-slate-500/12 text-slate-600 border-slate-500/20",
  EDITEE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  REMISE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  PERDUE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
  EXPIREE: "bg-amber-500/12 text-amber-600 border-amber-500/20",
};

const vide = { agentId: "", fonction: "", motif: "" };

export default function CartesPage() {
  const user = useAuth((s) => s.user)!;
  const { data: cartes = [], isLoading } = useCartes();
  const { data: agents, pret } = useAgentsProjetes();
  const { data: entitesDb = [] } = useEntites();
  const enregistrer = useEnregistrerCarte();

  const [selection, setSelection] = useState<CarteProfessionnelle | null>(null);
  const [formulaire, setFormulaire] = useState<typeof vide | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "all", entite: "all" });

  const redacteur = peut(user.role, "cartes", "W");
  const agentDe = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const carteDe = useMemo(() => new Map(cartes.map((c) => [c.agentId, c])), [cartes]);

  const perimetre = useMemo(
    () => (filtres.entite === "all" ? null : new Set(descendantsDe(filtres.entite).map((e) => e.id))),
    [filtres.entite, entitesDb]
  );

  const lignes = useMemo(() => cartes
    .filter((c) => filtres.statut === "all" || c.statut === filtres.statut)
    .filter((c) => !perimetre || perimetre.has(c.entiteId))
    .sort((a, b) => b.dateEmission.localeCompare(a.dateEmission)), [cartes, filtres, perimetre]);

  const stats = useMemo(() => {
    const sans = agents.filter((a) => !carteDe.has(a.id)).length;
    return {
      valides: cartes.filter((c) => c.statut === "REMISE" || c.statut === "EDITEE").length,
      sans,
      expirees: cartes.filter((c) => c.statut === "EXPIREE").length,
      perdues: cartes.filter((c) => c.statut === "PERDUE").length,
      couverture: agents.length ? ((agents.length - sans) / agents.length) * 100 : 0,
    };
  }, [cartes, agents, carteDe]);

  const sansCarte = useMemo(
    () => agents.filter((a) => !carteDe.has(a.id)).slice(0, 400),
    [agents, carteDe]
  );

  const valide = !!formulaire && !!formulaire.agentId;

  const editer = async () => {
    if (!formulaire || !valide) return;
    const agent = agentDe.get(formulaire.agentId);
    if (!agent) return;
    const ancienne = carteDe.get(agent.id);
    const aujourdhui = new Date();
    const expiration = new Date(aujourdhui);
    expiration.setFullYear(expiration.getFullYear() + VALIDITE_ANS);
    const carte: CarteProfessionnelle = {
      id: `CRT-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      numero: `${aujourdhui.getFullYear()}-${String(cartes.length + 1).padStart(5, "0")}`,
      agentId: agent.id,
      entiteId: agent.entiteId ?? "ENT-METP",
      fonction: formulaire.fonction.trim() || agent.fonction || "Agent",
      dateEmission: aujourdhui.toISOString().slice(0, 10),
      dateExpiration: expiration.toISOString().slice(0, 10),
      statut: "EDITEE",
      emisePar: `${user.nomComplet} — ${entiteById(user.entiteId)?.sigle ?? "DGARH"}`,
      dateRemise: null,
      motifReedition: ancienne ? formulaire.motif.trim() || "Renouvellement" : undefined,
    };
    await enregistrer.mutateAsync({ carte, utilisateur: user, creation: true });
    toast.success(`Carte n° ${carte.numero} éditée`, {
      description: `${agent.prenom} ${agent.nom} — valable jusqu'au ${fmtDate(carte.dateExpiration)}.`,
    });
    setFormulaire(null);
    setSelection(carte);
  };

  const changerStatut = async (c: CarteProfessionnelle, statut: StatutCarte) => {
    const carte = {
      ...c, statut,
      dateRemise: statut === "REMISE" ? new Date().toISOString().slice(0, 10) : c.dateRemise,
    };
    await enregistrer.mutateAsync({ carte, utilisateur: user, creation: false });
    setSelection(carte);
    toast.success(`Carte ${STATUT_LABELS[statut].toLowerCase()}`);
  };

  const imprimer = () => {
    // L'impression n'exporte que la carte : le reste de la page est masqué par la
    // feuille de style d'impression déclarée plus bas.
    window.print();
  };

  const colonnes: Colonne<CarteProfessionnelle>[] = [
    {
      cle: "agent", entete: "Titulaire",
      rendu: (c) => {
        const a = agentDe.get(c.agentId);
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Portrait photo={a?.photo} prenom={a?.prenom} nom={a?.nom} cle={a?.matricule ?? c.agentId} taille="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{a ? `${a.prenom} ${a.nom}` : "—"}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{a?.matricule ?? "—"}</div>
            </div>
          </div>
        );
      },
    },
    { cle: "numero", entete: "N° de carte", visible: "md", rendu: (c) => <span className="font-mono text-xs">{c.numero}</span> },
    {
      cle: "entite", entete: "Direction", visible: "lg",
      rendu: (c) => (
        <span className="text-xs text-muted-foreground" title={entiteById(c.entiteId)?.nom}>
          {entiteById(c.entiteId)?.sigle ?? "—"}
        </span>
      ),
    },
    {
      cle: "validite", entete: "Validité", visible: "xl",
      rendu: (c) => (
        <span className={cn("text-[11px] tabular-nums text-muted-foreground",
          c.statut === "EXPIREE" && "font-semibold text-amber-600")}>
          {fmtDate(c.dateEmission)} → {fmtDate(c.dateExpiration)}
        </span>
      ),
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (c) => <Badge variant="outline" className={cn("text-[10px]", COULEUR[c.statut])}>{STATUT_LABELS[c.statut]}</Badge>,
    },
  ];

  if (isLoading || !pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const agentSel = selection ? agentDe.get(selection.agentId) : undefined;

  return (
    <>
      {/* À l'impression, seule la carte sort. */}
      <style>{`@media print{
        body *{visibility:hidden!important}
        #carte-a-imprimer,#carte-a-imprimer *{visibility:visible!important}
        #carte-a-imprimer{position:fixed;inset:0;margin:auto;width:150mm;padding:12mm}
      }`}</style>

      <PageHeader
        titre="Cartes professionnelles"
        description="Elle atteste la qualité d'agent et rien de plus : la situation administrative de son titulaire résulte des actes, pas de la carte."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/annuaire">Annuaire</Link>
        </Button>
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...vide })}>
            <CreditCard className="mr-1.5 h-4 w-4" /> Éditer une carte
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "emeraude", titre: "Cartes valides", valeur: stats.valides, sousTitre: `couverture ${fmtPct(stats.couverture)}`, icon: BadgeCheck },
        { ton: "ambre", titre: "Agents sans carte", valeur: stats.sans, sousTitre: "aucune carte éditée à ce jour", icon: ShieldX },
        { ton: "rose", titre: "Cartes expirées", valeur: stats.expirees, sousTitre: "à renouveler", icon: RefreshCw },
        { ton: "rose", titre: "Déclarées perdues", valeur: stats.perdues, sousTitre: "à rééditer sur déclaration", icon: TriangleAlert },
      ]} />

      {stats.sans > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.04]">
          <CardHeader className="flex flex-row items-start gap-3 pb-3">
            <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <CardTitle className="text-base">
                {fmtNum(stats.sans)} agents n'ont pas de carte
              </CardTitle>
              <CardDescription>
                La carte se demande au bureau du personnel. Tant qu'elle n'est pas éditée, l'agent ne
                dispose d'aucune pièce attestant sa qualité en dehors de son dossier.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <TableauModule<CarteProfessionnelle>
        titre="Registre des cartes"
        description="Cliquez une ligne pour voir la carte, la remettre ou la rééditer."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(c, t) => {
          const a = agentDe.get(c.agentId);
          return c.numero.includes(t)
            || (!!a && (a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.toLowerCase().includes(t)));
        }}
        placeholderRecherche="Numéro, nom ou matricule…"
        filtres={[
          { cle: "statut", libelle: "Tous les statuts", options: (Object.keys(STATUT_LABELS) as StatutCarte[]).map((v) => ({ valeur: v, libelle: STATUT_LABELS[v] })) },
          { cle: "entite", libelle: "Toutes les directions", options: ENTITES
            .filter((e) => ["DIRECTION", "DIRECTION_GENERALE", "CABINET", "DIRECTION_DEPARTEMENTALE", "INSPECTION_GENERALE"].includes(e.niveau))
            .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 38)}` })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={16}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={agentSel ? `${agentSel.prenom} ${agentSel.nom}` : ""}
        sousTitre={selection ? `Carte n° ${selection.numero}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR[selection.statut])}>
              {STATUT_LABELS[selection.statut]}
            </Badge>
            {agentSel && <BadgeCategorie v={agentSel.categorie} />}
          </>
        )}
        actions={selection && (
          <>
            <Button variant="outline" size="sm" onClick={imprimer}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer
            </Button>
            {redacteur && selection.statut === "EDITEE" && (
              <Button variant="outline" size="sm" onClick={() => changerStatut(selection, "REMISE")}>
                Marquer remise
              </Button>
            )}
            {redacteur && (selection.statut === "REMISE" || selection.statut === "EDITEE") && (
              <Button variant="outline" size="sm" onClick={() => changerStatut(selection, "PERDUE")}>
                Déclarer perdue
              </Button>
            )}
            {redacteur && (selection.statut === "EXPIREE" || selection.statut === "PERDUE") && agentSel && (
              <Button size="sm" onClick={() => setFormulaire({
                agentId: agentSel.id,
                fonction: agentSel.fonction ?? "",
                motif: selection.statut === "PERDUE" ? "Réédition après déclaration de perte" : "Renouvellement à échéance",
              })}>
                Rééditer
              </Button>
            )}
          </>
        )}
        large
      >
        {selection && agentSel && (
          <>
            <Section titre="La carte">
              <div id="carte-a-imprimer" className="grid gap-4 sm:grid-cols-2">
                <CarteRecto carte={selection} agent={agentSel} />
                <CarteVerso carte={selection} />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Format ISO 7810 ID-1 — 85,6 × 54 mm. L'impression n'édite que la carte.
              </p>
            </Section>

            <Section titre="Émission">
              <LigneInfo k="Numéro" v={<span className="font-mono text-xs">{selection.numero}</span>} />
              <LigneInfo k="Émise le" v={fmtDate(selection.dateEmission)} />
              <LigneInfo k="Valable jusqu'au" v={fmtDate(selection.dateExpiration)} />
              <LigneInfo k="Émise par" v={<span className="text-xs">{selection.emisePar}</span>} />
              <LigneInfo k="Remise le" v={selection.dateRemise ? fmtDate(selection.dateRemise) : "pas encore remise"} />
              {selection.motifReedition && <LigneInfo k="Motif de réédition" v={selection.motifReedition} />}
            </Section>

            <Section titre="Qualité attestée">
              <LigneInfo k="Matricule" v={<span className="font-mono text-xs">{agentSel.matricule}</span>} />
              <LigneInfo k="Grade" v={gradeById(agentSel.gradeId)?.libelle ?? "hors carrière statutaire"} />
              <LigneInfo k="Catégorie" v={REGLES_CATEGORIE[agentSel.categorie].libelle} />
              <LigneInfo k="Fonction portée" v={selection.fonction} />
              <LigneInfo k="Direction" v={entiteById(selection.entiteId)?.nom ?? "—"} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">{cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ")}</span>} />
            </Section>

            <Section titre="Portée">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                La carte fige l'affectation et la fonction au jour de son édition. Une mutation
                postérieure ne la met pas à jour : elle appelle une réédition, sans quoi la carte
                atteste une affectation que l'agent a quittée.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Éditer une carte professionnelle"
        description={`Elle sera valable ${VALIDITE_ANS} ans et portera l'affectation en vigueur au jour de l'édition.`}
        surValidation={editer}
        validationPossible={valide}
        libelleValidation="Éditer la carte"
        large
      >
        {formulaire && (
          <>
            <ChampSelect
              label="Agent" obligatoire valeur={formulaire.agentId}
              surChangement={(v) => {
                const a = agentDe.get(v);
                setFormulaire({ ...formulaire, agentId: v, fonction: a?.fonction ?? "" });
              }}
              options={(formulaire.agentId && !sansCarte.some((a) => a.id === formulaire.agentId)
                ? [agentDe.get(formulaire.agentId)!, ...sansCarte]
                : sansCarte
              ).filter(Boolean).slice(0, 300).map((a) => ({
                valeur: a.id,
                libelle: `${a.prenom} ${a.nom} — ${a.matricule}`,
              }))}
              aide="La liste propose d'abord les agents qui n'ont pas encore de carte."
            />
            {formulaire.agentId && agentDe.get(formulaire.agentId) && (
              <div className="rounded-xl border p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Aperçu
                </div>
                <div className="max-w-sm">
                  <CarteRecto
                    agent={agentDe.get(formulaire.agentId)!}
                    carte={{
                      id: "apercu", numero: "…",
                      agentId: formulaire.agentId,
                      entiteId: agentDe.get(formulaire.agentId)!.entiteId ?? "ENT-METP",
                      fonction: formulaire.fonction || agentDe.get(formulaire.agentId)!.fonction || "Agent",
                      dateEmission: new Date().toISOString().slice(0, 10),
                      dateExpiration: new Date(new Date().setFullYear(new Date().getFullYear() + VALIDITE_ANS)).toISOString().slice(0, 10),
                      statut: "EDITEE", emisePar: user.nomComplet,
                    }}
                  />
                </div>
              </div>
            )}
            <ChampTexte
              label="Fonction portée sur la carte" valeur={formulaire.fonction}
              surChangement={(v) => setFormulaire({ ...formulaire, fonction: v })}
              aide="Reprise de l'affectation en vigueur ; modifiable si l'intitulé d'usage diffère." />
            <ChampTexte
              label="Motif" valeur={formulaire.motif}
              surChangement={(v) => setFormulaire({ ...formulaire, motif: v })}
              placeholder="Première édition, renouvellement, perte…" />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
