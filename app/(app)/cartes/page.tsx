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
import { Portrait, teinteDe } from "@/components/nexus/portrait";
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

const VALIDITE_ANS = 5;

/* ------------------------------------------------------------------ */
/* La carte elle-même                                                  */
/* ------------------------------------------------------------------ */

/**
 * Format ISO 7810 ID-1 — 85,6 × 54 mm, le format d'une carte bancaire —
 * rendu à l'échelle 4 pour rester net à l'impression.
 */
function CarteRecto({ carte, agent }: { carte: CarteProfessionnelle; agent: AgentProjete }) {
  const chaine = cheminDe(carte.entiteId);
  const direction = chaine.find((e) =>
    ["DIRECTION_GENERALE", "DIRECTION", "CABINET", "INSPECTION_GENERALE", "DIRECTION_DEPARTEMENTALE"].includes(e.niveau));
  const service = chaine.filter((e) => ["SERVICE", "BUREAU"].includes(e.niveau)).slice(-1)[0];
  const t = teinteDe(agent.matricule);

  return (
    <div
      className="relative aspect-[85.6/54] w-full overflow-hidden rounded-xl border shadow-sm"
      style={{ background: "linear-gradient(135deg,#F8FBFD 0%,#EAF4F9 100%)" }}
    >
      {/* Bandeau national */}
      <div className="flex items-stretch">
        <div className="h-1.5 flex-1" style={{ background: "#009543" }} />
        <div className="h-1.5 flex-1" style={{ background: "#FBDE4A" }} />
        <div className="h-1.5 flex-1" style={{ background: "#DC241F" }} />
      </div>

      <div className="flex h-[calc(100%-0.375rem)] flex-col p-[4%]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[7px] font-bold uppercase leading-tight tracking-[0.14em] text-[#04293A]">
              République du Congo
            </div>
            <div className="mt-0.5 text-[5.5px] uppercase leading-tight tracking-[0.1em] text-[#04293A]/60">
              Unité · Travail · Progrès
            </div>
            <div className="mt-1 max-w-[26ch] text-[6px] font-semibold uppercase leading-tight text-[#0077B6]">
              {MINISTERE_NOM}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[6px] font-bold uppercase tracking-widest text-[#04293A]/50">Carte</div>
            <div className="text-[6px] font-bold uppercase tracking-widest text-[#04293A]/50">professionnelle</div>
            <div className="mt-1 font-mono text-[7px] font-bold text-[#0077B6]">N° {carte.numero}</div>
          </div>
        </div>

        <div className="mt-[3%] flex flex-1 items-stretch gap-[4%]">
          <div className="flex w-[24%] shrink-0 flex-col">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-md border-2 border-white shadow-sm">
              {agent.photo ? (
                <img src={agent.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-[13px] font-black"
                  style={{ background: t.fond, color: t.texte }}
                >
                  {(agent.prenom[0] ?? "") + (agent.nom[0] ?? "")}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-black uppercase leading-tight text-[#04293A]">
                {agent.nom}
              </div>
              <div className="truncate text-[9px] font-semibold leading-tight text-[#04293A]/80">
                {agent.prenom}
              </div>
              <div className="mt-[3%] grid gap-[2px]">
                <Ligne k="Matricule" v={agent.matricule} mono />
                <Ligne k="Grade" v={gradeById(agent.gradeId)?.libelle ?? REGLES_CATEGORIE[agent.categorie].libelle} />
                <Ligne k="Fonction" v={carte.fonction} />
                <Ligne k="Direction" v={direction?.nom ?? "—"} />
                {service && <Ligne k="Service" v={service.nom} />}
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 pt-[2%]">
              <div>
                <div className="text-[5px] uppercase tracking-widest text-[#04293A]/45">Valable jusqu'au</div>
                <div className="font-mono text-[7px] font-bold text-[#04293A]">{fmtDate(carte.dateExpiration)}</div>
              </div>
              {/* Bande de contrôle : une carte administrative en porte une. */}
              <div className="flex h-[14px] items-end gap-[1.2px]" aria-hidden>
                {Array.from({ length: 30 }, (_, i) => {
                  const h = 5 + ((agent.matricule.charCodeAt(i % agent.matricule.length) + i * 7) % 9);
                  return <span key={i} className="w-[1.2px] bg-[#04293A]" style={{ height: h }} />;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Ligne = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="w-[42px] shrink-0 text-[5px] uppercase tracking-wider text-[#04293A]/45">{k}</span>
    <span className={cn("truncate text-[6.5px] font-semibold text-[#04293A]", mono && "font-mono")}>{v}</span>
  </div>
);

function CarteVerso({ carte }: { carte: CarteProfessionnelle }) {
  return (
    <div className="relative aspect-[85.6/54] w-full overflow-hidden rounded-xl border bg-[#04293A] p-[5%] text-white shadow-sm">
      <div className="h-3 w-full bg-black/40" />
      <div className="mt-[4%] space-y-[3%]">
        <p className="text-[6px] leading-relaxed text-white/85">
          La présente carte atteste la qualité d'agent du ministère. Elle n'attribue aucun droit :
          la situation administrative de son titulaire résulte des actes qui la fondent.
        </p>
        <p className="text-[6px] leading-relaxed text-white/70">
          Toute perte doit être déclarée sans délai au bureau du personnel. La carte est restituée à
          la cessation de fonctions.
        </p>
        <div className="grid grid-cols-2 gap-[4%] pt-[2%]">
          <div>
            <div className="text-[5px] uppercase tracking-widest text-white/40">Émise le</div>
            <div className="font-mono text-[7px] font-bold">{fmtDate(carte.dateEmission)}</div>
          </div>
          <div>
            <div className="text-[5px] uppercase tracking-widest text-white/40">Émise par</div>
            <div className="text-[6px] font-semibold leading-tight">{carte.emisePar}</div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[5%] right-[5%] text-right">
        <div className="h-[1px] w-16 bg-white/30" />
        <div className="mt-0.5 text-[5px] uppercase tracking-widest text-white/40">Le directeur général</div>
      </div>
      <div className="absolute bottom-[5%] left-[5%] text-[5px] font-mono text-white/35">{APP_NAME}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

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
        { titre: "Cartes valides", valeur: stats.valides, sousTitre: `couverture ${fmtPct(stats.couverture)}`, icon: BadgeCheck },
        { titre: "Agents sans carte", valeur: stats.sans, sousTitre: "aucune carte éditée à ce jour", icon: ShieldX },
        { titre: "Cartes expirées", valeur: stats.expirees, sousTitre: "à renouveler", icon: RefreshCw },
        { titre: "Déclarées perdues", valeur: stats.perdues, sousTitre: "à rééditer sur déclaration", icon: TriangleAlert },
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
