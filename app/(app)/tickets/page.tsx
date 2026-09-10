"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, Clock, LifeBuoy, MessageSquare, Plus, Send, Star,
} from "lucide-react";
import {
  useActes, useAgents, useEnregistrerTicket, useMessagesTicket, useRepondreTicket,
  useTickets, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { ENTITES, cheminDe, descendantsDe, entiteById, peut } from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, LigneInfo, PanneauDetail,
  RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  CategorieTicket, PrioriteTicket, StatutTicket, Ticket,
} from "@/lib/types";

const CATEGORIE_LABELS: Record<CategorieTicket, string> = {
  RECLAMATION: "Réclamation",
  ASSISTANCE: "Assistance",
  INCIDENT: "Incident",
  DEMANDE_PIECE: "Pièce manquante",
  SUGGESTION: "Suggestion",
};

const PRIORITE_LABELS: Record<PrioriteTicket, string> = {
  BASSE: "Basse", NORMALE: "Normale", HAUTE: "Haute", CRITIQUE: "Critique",
};

const COULEUR_PRIORITE: Record<PrioriteTicket, string> = {
  BASSE: "bg-slate-500/12 text-slate-600 border-slate-500/20",
  NORMALE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  HAUTE: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  CRITIQUE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
};

const STATUT_LABELS: Record<StatutTicket, string> = {
  OUVERT: "Ouvert",
  PRIS_EN_CHARGE: "Pris en charge",
  EN_ATTENTE_DEMANDEUR: "En attente du demandeur",
  RESOLU: "Résolu",
  CLOS: "Clos",
};

const COULEUR_STATUT: Record<StatutTicket, string> = {
  OUVERT: "bg-rose-500/12 text-rose-600 border-rose-500/20",
  PRIS_EN_CHARGE: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  EN_ATTENTE_DEMANDEUR: "bg-amber-500/12 text-amber-600 border-amber-500/20",
  RESOLU: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  CLOS: "bg-slate-500/12 text-slate-600 border-slate-500/20",
};

const OUVERTS: StatutTicket[] = ["OUVERT", "PRIS_EN_CHARGE", "EN_ATTENTE_DEMANDEUR"];

/** Suite ouverte à chaque statut : le ticket avance, il ne saute pas d'étape. */
const SUITES: Record<StatutTicket, StatutTicket[]> = {
  OUVERT: ["PRIS_EN_CHARGE"],
  PRIS_EN_CHARGE: ["EN_ATTENTE_DEMANDEUR", "RESOLU"],
  EN_ATTENTE_DEMANDEUR: ["PRIS_EN_CHARGE", "RESOLU"],
  RESOLU: ["CLOS", "PRIS_EN_CHARGE"],
  CLOS: [],
};

const HEURES: Record<PrioriteTicket, number> = { CRITIQUE: 4, HAUTE: 24, NORMALE: 72, BASSE: 168 };

const videTicket = {
  objet: "", description: "", categorie: "RECLAMATION" as CategorieTicket,
  priorite: "NORMALE" as PrioriteTicket, agentId: "", entiteId: "",
};

export default function TicketsPage() {
  const user = useAuth((s) => s.user)!;
  const { data: tickets = [], isLoading } = useTickets();
  const { data: fils = [] } = useMessagesTicket();
  const { data: agents = [] } = useAgents();
  const { data: actes = [] } = useActes();
  const { data: comptes = [] } = useUtilisateurs();
  const enregistrer = useEnregistrerTicket();
  const repondre = useRepondreTicket();

  const [selection, setSelection] = useState<Ticket | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ statut: "all", priorite: "all", categorie: "all" });
  const [formulaire, setFormulaire] = useState<typeof videTicket | null>(null);
  const [reponse, setReponse] = useState("");
  const [interne, setInterne] = useState(false);

  const instructeur = peut(user.role, "tickets", "W") && user.role !== "AGENT";
  const perimetre = useMemo(() => new Set(descendantsDe(user.entiteId).map((e) => e.id)), [user.entiteId]);

  /* Un agent ne voit que ce qu'il a ouvert ; un instructeur voit son périmètre. */
  const visibles = useMemo(() => tickets.filter((t) =>
    t.ouvertPar === user.id || (instructeur && perimetre.has(t.entiteId))
  ), [tickets, user.id, instructeur, perimetre]);

  const nomAgent = useMemo(() => {
    const m = new Map(agents.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id?: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [agents]);

  const enRetard = (t: Ticket) =>
    OUVERTS.includes(t.statut) && new Date(t.echeance).getTime() < Date.now();

  const stats = useMemo(() => {
    const ouverts = visibles.filter((t) => OUVERTS.includes(t.statut));
    const clos = visibles.filter((t) => t.dateCloture);
    const delai = clos.length
      ? Math.round(clos.reduce((s, t) =>
          s + (new Date(t.dateCloture!).getTime() - new Date(t.dateOuverture).getTime()) / 864e5, 0) / clos.length)
      : 0;
    const notes = visibles.map((t) => t.satisfaction).filter(Boolean) as number[];
    return {
      ouverts: ouverts.length,
      retard: visibles.filter(enRetard).length,
      delai,
      satisfaction: notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1) : "—",
    };
  }, [visibles]);

  const lignes = useMemo(() => visibles
    .filter((t) => filtres.statut === "all" || t.statut === filtres.statut)
    .filter((t) => filtres.priorite === "all" || t.priorite === filtres.priorite)
    .filter((t) => filtres.categorie === "all" || t.categorie === filtres.categorie)
    .sort((a, b) => b.dateOuverture.localeCompare(a.dateOuverture)), [visibles, filtres]);

  const conversation = useMemo(() => selection
    ? fils.filter((m) => m.ticketId === selection.id)
        .filter((m) => !m.interne || instructeur)
        .sort((a, b) => a.horodatage.localeCompare(b.horodatage))
    : [], [fils, selection, instructeur]);

  const valide = !!formulaire && formulaire.objet.trim().length > 5 && formulaire.description.trim().length > 10;

  const ouvrirTicket = async () => {
    if (!formulaire || !valide) return;
    const maintenant = new Date();
    const n = tickets.length + 1;
    const ticket: Ticket = {
      id: `TCK-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      reference: `REC-${String(n).padStart(4, "0")}/${maintenant.getFullYear()}`,
      objet: formulaire.objet.trim(),
      description: formulaire.description.trim(),
      categorie: formulaire.categorie,
      priorite: formulaire.priorite,
      statut: "OUVERT",
      ouvertPar: user.id,
      ouvertParNom: user.nomComplet,
      agentId: formulaire.agentId || user.agentId || null,
      entiteId: formulaire.entiteId || user.entiteId,
      assigneA: null,
      dateOuverture: maintenant.toISOString(),
      echeance: new Date(maintenant.getTime() + HEURES[formulaire.priorite] * 36e5).toISOString(),
      dateCloture: null,
      acteId: null,
      satisfaction: null,
    };
    await enregistrer.mutateAsync({ ticket, utilisateur: user, creation: true, message: ticket.description });
    toast.success(`Réclamation ${ticket.reference} enregistrée`, {
      description: `Réponse attendue avant le ${fmtDate(ticket.echeance)}.`,
    });
    setFormulaire(null);
    setSelection(ticket);
  };

  const envoyer = async (statut?: StatutTicket) => {
    if (!selection || !reponse.trim()) return;
    await repondre.mutateAsync({
      ticket: selection, corps: reponse.trim(), interne, utilisateur: user, statut,
    });
    if (statut) setSelection({ ...selection, statut });
    setReponse("");
    setInterne(false);
    toast.success(interne ? "Note interne ajoutée" : "Réponse envoyée");
  };

  const changerStatut = async (statut: StatutTicket) => {
    if (!selection) return;
    const ticket: Ticket = {
      ...selection, statut,
      assigneA: statut === "PRIS_EN_CHARGE" ? user.id : selection.assigneA,
      dateCloture: statut === "RESOLU" || statut === "CLOS" ? new Date().toISOString() : selection.dateCloture,
    };
    await enregistrer.mutateAsync({ ticket, utilisateur: user, creation: false });
    setSelection(ticket);
    toast.success(`Réclamation ${STATUT_LABELS[statut].toLowerCase()}`);
  };

  const colonnes: Colonne<Ticket>[] = [
    {
      cle: "reference", entete: "Référence",
      rendu: (t) => (
        <div className="min-w-0">
          <div className="font-mono text-xs font-semibold">{t.reference}</div>
          <div className="max-w-[300px] truncate text-xs text-muted-foreground" title={t.objet}>{t.objet}</div>
        </div>
      ),
    },
    {
      cle: "categorie", entete: "Nature", visible: "md",
      rendu: (t) => <Badge variant="secondary" className="text-[10px]">{CATEGORIE_LABELS[t.categorie]}</Badge>,
    },
    {
      cle: "agent", entete: "Agent concerné", visible: "xl",
      rendu: (t) => <span className="text-xs">{nomAgent(t.agentId)}</span>,
    },
    {
      cle: "priorite", entete: "Priorité", visible: "lg",
      rendu: (t) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR_PRIORITE[t.priorite])}>
          {PRIORITE_LABELS[t.priorite]}
        </Badge>
      ),
    },
    {
      cle: "echeance", entete: "Échéance", visible: "md",
      rendu: (t) => (
        <span className={cn("text-xs tabular-nums", enRetard(t) && "font-semibold text-rose-600")}>
          {fmtDate(t.echeance)}
        </span>
      ),
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (t) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR_STATUT[t.statut])}>
          {STATUT_LABELS[t.statut]}
        </Badge>
      ),
    },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const acteLie = selection?.acteId ? actes.find((a) => a.id === selection.acteId) : undefined;

  return (
    <>
      <PageHeader
        titre="Réclamations et assistance"
        description="Une réclamation ne décide rien : quand elle aboutit à un changement de situation, elle ouvre un acte, qui seul fait foi (§05). Le fil de discussion garde la trace de l'échange."
      >
        <Button size="sm" onClick={() => setFormulaire({ ...videTicket, entiteId: user.entiteId })}>
          <Plus className="mr-1.5 h-4 w-4" /> Ouvrir une réclamation
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "En cours", valeur: fmtNum(stats.ouverts), sousTitre: `${fmtNum(visibles.length)} au total`, icon: LifeBuoy },
        { ton: "rose", titre: "Hors délai", valeur: fmtNum(stats.retard), sousTitre: "échéance dépassée", icon: AlertTriangle },
        { ton: "ambre", titre: "Délai moyen", valeur: `${stats.delai} j`, sousTitre: "de l'ouverture à la clôture", icon: Clock },
        { ton: "emeraude", titre: "Satisfaction", valeur: stats.satisfaction, sousTitre: "note moyenne sur 5", icon: Star },
      ]} />

      <TableauModule<Ticket>
        titre={instructeur ? "Réclamations de votre périmètre" : "Mes réclamations"}
        description={instructeur
          ? "Vous voyez ce qui relève de votre branche, plus ce que vous avez ouvert vous-même."
          : "Vous voyez les réclamations que vous avez ouvertes."}
        lignes={lignes}
        colonnes={colonnes}
        recherche={(t, q) => t.reference.toLowerCase().includes(q) || t.objet.toLowerCase().includes(q)}
        placeholderRecherche="Référence ou objet…"
        filtres={[
          { cle: "statut", libelle: "Tous les statuts", options: (Object.keys(STATUT_LABELS) as StatutTicket[]).map((s) => ({ valeur: s, libelle: STATUT_LABELS[s] })) },
          { cle: "priorite", libelle: "Toutes priorités", options: (Object.keys(PRIORITE_LABELS) as PrioriteTicket[]).map((p) => ({ valeur: p, libelle: PRIORITE_LABELS[p] })) },
          { cle: "categorie", libelle: "Toutes natures", options: (Object.keys(CATEGORIE_LABELS) as CategorieTicket[]).map((c) => ({ valeur: c, libelle: CATEGORIE_LABELS[c] })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        vide="Aucune réclamation. C'est plutôt bon signe."
        parPage={12}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => { setSelection(null); setReponse(""); }}
        titre={selection?.objet ?? ""}
        sousTitre={selection ? `${selection.reference} — ouverte par ${selection.ouvertParNom} le ${fmtDate(selection.dateOuverture)}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR_STATUT[selection.statut])}>
              {STATUT_LABELS[selection.statut]}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", COULEUR_PRIORITE[selection.priorite])}>
              {PRIORITE_LABELS[selection.priorite]}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">{CATEGORIE_LABELS[selection.categorie]}</Badge>
            {selection && enRetard(selection) && (
              <Badge variant="destructive" className="text-[10px]">hors délai</Badge>
            )}
          </>
        )}
        actions={selection && instructeur && SUITES[selection.statut].length > 0 && (
          <>
            {SUITES[selection.statut].map((s) => (
              <Button
                key={s} size="sm"
                variant={s === "RESOLU" || s === "CLOS" ? "default" : "outline"}
                onClick={() => changerStatut(s)}
              >
                {s === "RESOLU" ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : null}
                {STATUT_LABELS[s]}
              </Button>
            ))}
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Dossier">
              <LigneInfo k="Agent concerné" v={nomAgent(selection.agentId)} />
              <LigneInfo k="Entité de traitement" v={entiteById(selection.entiteId)?.nom ?? "—"} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">{cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ")}</span>} />
              <LigneInfo k="Pris en charge par" v={comptes.find((c) => c.id === selection.assigneA)?.nomComplet ?? "personne pour l'instant"} />
              <LigneInfo k="Échéance" v={<span className={cn(enRetard(selection) && "font-semibold text-rose-600")}>{fmtDate(selection.echeance)}</span>} />
              {selection.dateCloture && <LigneInfo k="Clôturée le" v={fmtDate(selection.dateCloture)} />}
            </Section>

            {acteLie && (
              <Section titre="Suite donnée">
                <Link
                  href={`/dgarh/actes/${acteLie.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold">{acteLie.reference}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{acteLie.objet}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{acteLie.statut}</Badge>
                </Link>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  La réclamation a donné lieu à un acte : c'est lui qui produit l'effet dans le dossier.
                </p>
              </Section>
            )}

            <Section titre={`Échanges — ${conversation.length}`}>
              <div className="space-y-3">
                {conversation.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg border p-3",
                      m.interne && "border-amber-500/30 bg-amber-500/5",
                      m.auteurId === user.id && !m.interne && "border-primary/25 bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{m.auteur}</span>
                      <div className="flex items-center gap-2">
                        {m.interne && <Badge variant="outline" className="text-[9px]">note interne</Badge>}
                        <span className="text-[10px] text-muted-foreground">{fmtDate(m.horodatage)}</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{m.corps}</p>
                  </div>
                ))}
              </div>
            </Section>

            {selection.statut !== "CLOS" && (
              <Section titre="Répondre">
                <Textarea
                  value={reponse} rows={3}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Votre réponse au demandeur…"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  {instructeur && (
                    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Switch checked={interne} onCheckedChange={setInterne} />
                      Note interne — non visible du demandeur
                    </label>
                  )}
                  <Button size="sm" disabled={!reponse.trim()} onClick={() => envoyer()}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Envoyer
                  </Button>
                </div>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Ouvrir une réclamation"
        description="Décrivez la situation. Si elle appelle un changement dans un dossier, un acte sera ouvert pour le porter."
        surValidation={ouvrirTicket}
        validationPossible={valide}
        libelleValidation="Enregistrer la réclamation"
        large
      >
        {formulaire && (
          <>
            <ChampTexte
              label="Objet" obligatoire valeur={formulaire.objet}
              surChangement={(v) => setFormulaire({ ...formulaire, objet: v })}
              placeholder="Avancement non pris en compte depuis 2024"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect
                label="Nature" obligatoire valeur={formulaire.categorie}
                surChangement={(v) => setFormulaire({ ...formulaire, categorie: v as CategorieTicket })}
                options={(Object.keys(CATEGORIE_LABELS) as CategorieTicket[]).map((c) => ({ valeur: c, libelle: CATEGORIE_LABELS[c] }))}
              />
              <ChampSelect
                label="Priorité" obligatoire valeur={formulaire.priorite}
                surChangement={(v) => setFormulaire({ ...formulaire, priorite: v as PrioriteTicket })}
                options={(Object.keys(PRIORITE_LABELS) as PrioriteTicket[]).map((p) => ({
                  valeur: p, libelle: `${PRIORITE_LABELS[p]} — réponse sous ${HEURES[p]} h`,
                }))}
                aide="La priorité fixe l'échéance de réponse ; elle ne fixe pas l'issue."
              />
            </div>
            {instructeur && (
              <ChampSelect
                label="Entité de traitement" valeur={formulaire.entiteId}
                surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
                options={ENTITES.filter((e) => e.niveau === "BUREAU" || e.niveau === "SERVICE")
                  .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom}` }))}
              />
            )}
            <ChampZone
              label="Exposé" obligatoire lignes={5} valeur={formulaire.description}
              surChangement={(v) => setFormulaire({ ...formulaire, description: v })}
              placeholder="Exposez les faits, les dates et les pièces dont vous disposez."
            />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
