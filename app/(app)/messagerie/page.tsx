"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Hash, MessageSquare, Plus, Search, Send, Users2 } from "lucide-react";
import {
  useConversations, useCreerConversation, useEnvoyerMessage, useMessages, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { cheminDe, entiteById } from "@/lib/referentiels";
import { fmtNum, initiales } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, RangeeKpi,
} from "@/components/nexus/module";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Conversation, TypeConversation } from "@/lib/types";

const ICONE: Record<TypeConversation, any> = { DIRECT: MessageSquare, GROUPE: Users2, ENTITE: Hash };
const TYPE_LABELS: Record<TypeConversation, string> = {
  DIRECT: "Échange direct", GROUPE: "Groupe de travail", ENTITE: "Fil de service",
};

const heure = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const aujourdhui = new Date().toDateString() === d.toDateString();
  return aujourdhui
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

const videFil = { titre: "", type: "GROUPE" as TypeConversation, destinataire: "" };

/**
 * On arrive ici depuis une fiche, pas seulement depuis le menu.
 *
 * « Écrire au responsable » porte son identifiant dans l'URL : si le fil
 * existe déjà, on l'ouvre — rouvrir un second fil avec la même personne
 * disperse la conversation —, sinon on présente le formulaire déjà rempli.
 * `useSearchParams` exige une frontière de suspension : la page est cliente,
 * mais Next la pré-rend, et la lecture de l'URL n'a lieu qu'au navigateur.
 */
export default function MessageriePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EspaceMessagerie />
    </Suspense>
  );
}

function EspaceMessagerie() {
  const user = useAuth((s) => s.user)!;
  const { data: conversations = [], isLoading } = useConversations();
  const { data: messages = [] } = useMessages();
  const { data: comptes = [] } = useUtilisateurs();
  const envoyer = useEnvoyerMessage();
  const creer = useCreerConversation();

  const [actif, setActif] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState("");
  const [recherche, setRecherche] = useState("");
  const [formulaire, setFormulaire] = useState<typeof videFil | null>(null);
  /* Les participants imposés par l'URL. Sans eux, « groupe de travail » ouvre
     un fil avec tout le ministère — ce qui convient à une annonce, jamais à
     un lot de quarante agents qu'on vient de cocher. */
  const [imposes, setImposes] = useState<string[] | null>(null);
  const bas = useRef<HTMLDivElement>(null);

  /* Un fil de service appartient à l'entité, pas à une liste figée : un compte
     nouvellement créé doit y accéder sans que personne ait à l'y ajouter. */
  const chaine = useMemo(() => new Set(cheminDe(user.entiteId).map((e) => e.id)), [user.entiteId]);
  const accessible = (c: Conversation) =>
    c.participants.includes(user.id) || (c.type === "ENTITE" && !!c.entiteId && chaine.has(c.entiteId));

  const miens = useMemo(() => conversations
    .filter(accessible)
    .filter((c) => !recherche.trim() || c.titre.toLowerCase().includes(recherche.trim().toLowerCase()))
    .sort((a, b) => (b.dateDernierMessage ?? "").localeCompare(a.dateDernierMessage ?? "")),
    [conversations, user.id, recherche, chaine]);

  const courante = useMemo(
    () => miens.find((c) => c.id === actif) ?? miens[0] ?? null,
    [miens, actif]
  );

  const fil = useMemo(() => courante
    ? messages.filter((m) => m.conversationId === courante.id)
        .sort((a, b) => a.horodatage.localeCompare(b.horodatage))
    : [], [messages, courante]);

  const nonLus = useMemo(() => {
    const parFil = new Map<string, number>();
    messages.forEach((m) => {
      if (m.auteurId === user.id || m.luPar.includes(user.id)) return;
      parFil.set(m.conversationId, (parFil.get(m.conversationId) ?? 0) + 1);
    });
    return parFil;
  }, [messages, user.id]);

  useEffect(() => { bas.current?.scrollIntoView({ behavior: "smooth" }); }, [fil.length, courante?.id]);

  /* Le destinataire demandé par l'URL. Une seule fois : l'agent doit pouvoir
     fermer le formulaire ou changer de fil sans que la page le ramène. */
  const params = useSearchParams();
  const demande = params?.get("direct") ?? null;
  const amorce = useRef(false);
  useEffect(() => {
    if (!demande || amorce.current || isLoading) return;
    amorce.current = true;
    if (demande === user.id) return;
    const existant = conversations.find((c) =>
      c.type === "DIRECT" && c.participants.length === 2
      && c.participants.includes(user.id) && c.participants.includes(demande));
    if (existant) setActif(existant.id);
    else if (comptes.some((c) => c.id === demande && c.actif !== false)) {
      setFormulaire({ ...videFil, type: "DIRECT", destinataire: demande });
    }
  }, [demande, isLoading, conversations, comptes, user.id]);

  /* Un lot coché dans le fichier du personnel : `?groupe=` porte les comptes,
     et non les agents — on n'écrit qu'à qui a de quoi lire. */
  const lot = params?.get("groupe") ?? null;
  const amorceLot = useRef(false);
  useEffect(() => {
    if (!lot || amorceLot.current || isLoading) return;
    amorceLot.current = true;
    const retenus = lot.split(",")
      .filter((id) => comptes.some((c) => c.id === id && c.actif !== false));
    if (!retenus.length) {
      toast.error("Aucun compte joignable dans cette sélection");
      return;
    }
    setImposes([...new Set([user.id, ...retenus])]);
    setFormulaire({
      ...videFil,
      type: "GROUPE",
      titre: `Échange — ${retenus.length} agent${retenus.length > 1 ? "s" : ""}`,
    });
  }, [lot, isLoading, comptes, user.id]);

  const expedier = async () => {
    if (!courante || !brouillon.trim()) return;
    // Écrire dans un fil de service vaut adhésion : on y figure ensuite.
    const conversation = courante.participants.includes(user.id)
      ? courante
      : { ...courante, participants: [...courante.participants, user.id] };
    await envoyer.mutateAsync({ conversation, corps: brouillon.trim(), utilisateur: user });
    setBrouillon("");
  };

  const valide = !!formulaire && (
    formulaire.type === "DIRECT" ? !!formulaire.destinataire : formulaire.titre.trim().length > 2
  );

  const ouvrirFil = async () => {
    if (!formulaire || !valide) return;
    const destinataire = comptes.find((c) => c.id === formulaire.destinataire);
    const conversation: Conversation = {
      id: `CNV-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      type: formulaire.type,
      titre: formulaire.type === "DIRECT" ? destinataire?.nomComplet ?? "Échange" : formulaire.titre.trim(),
      participants: formulaire.type === "DIRECT" && destinataire
        ? [user.id, destinataire.id]
        /* Trois cas et non deux : le lot désigné, sinon tout le ministère —
           c'est ce que veut dire « groupe de travail » ouvert depuis le menu. */
        : imposes ?? comptes.filter((c) => c.actif).map((c) => c.id),
      entiteId: formulaire.type === "ENTITE" ? user.entiteId : null,
      dateCreation: new Date().toISOString(),
      dernierMessage: "",
      dateDernierMessage: new Date().toISOString(),
    };
    await creer.mutateAsync(conversation);
    setActif(conversation.id);
    setFormulaire(null);
    setImposes(null);
    toast.success("Fil ouvert", { description: TYPE_LABELS[conversation.type] });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const totalNonLus = [...nonLus.values()].reduce((a, b) => a + b, 0);
  const Icone = courante ? ICONE[courante.type] : MessageSquare;

  return (
    <>
      <PageHeader
        titre="Messagerie"
        description="Les échanges qui entourent un dossier, gardés au même endroit que lui. Un message n'engage rien : ce qui décide, c'est l'acte."
      >
        <Button size="sm" onClick={() => setFormulaire({ ...videFil })}>
          <Plus className="mr-1.5 h-4 w-4" /> Nouveau fil
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Fils suivis", valeur: fmtNum(miens.length), sousTitre: "conversations auxquelles vous participez", icon: MessageSquare },
        { ton: "ambre", titre: "Non lus", valeur: fmtNum(totalNonLus), sousTitre: "messages à lire", icon: Hash },
        { ton: "bleu", titre: "Messages", valeur: fmtNum(messages.filter((m) => miens.some((c) => c.id === m.conversationId)).length), sousTitre: "dans vos fils", icon: Users2 },
        { ton: "violet", titre: "Interlocuteurs", valeur: fmtNum(new Set(miens.flatMap((c) => c.participants)).size), sousTitre: "comptes joignables", icon: Users2 },
      ]} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* --- Liste des fils --- */}
        <Card className="flex max-h-[640px] flex-col overflow-hidden">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recherche} onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un fil…" className="h-9 pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {miens.map((c) => {
              const I = ICONE[c.type];
              const n = nonLus.get(c.id) ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setActif(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60",
                    courante?.id === c.id && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <I className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{c.titre}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{heure(c.dateDernierMessage)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-muted-foreground">{c.dernierMessage || "Aucun message"}</span>
                      {n > 0 && <Badge className="h-4 shrink-0 px-1.5 text-[9px]" variant="default">{n}</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
            {miens.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">Aucun fil pour l'instant.</p>
            )}
          </div>
        </Card>

        {/* --- Fil courant --- */}
        <Card className="flex max-h-[640px] min-h-[420px] flex-col overflow-hidden">
          {courante ? (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{courante.titre}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {TYPE_LABELS[courante.type]}
                    {courante.entiteId && ` — ${cheminDe(courante.entiteId).map((e) => e.sigle).join(" › ")}`}
                    {` — ${fmtNum(courante.participants.length)} participants`}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {fil.map((m) => {
                  const moi = m.auteurId === user.id;
                  return (
                    <div key={m.id} className={cn("flex gap-2.5", moi && "flex-row-reverse")}>
                      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">
                        {initiales(...m.auteur.split(" ") as [string, string])}
                      </div>
                      <div className={cn("max-w-[75%] space-y-1", moi && "text-right")}>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground" style={{ justifyContent: moi ? "flex-end" : "flex-start" }}>
                          <span className="font-semibold text-foreground/70">{moi ? "Vous" : m.auteur}</span>
                          <span>{heure(m.horodatage)}</span>
                        </div>
                        <div className={cn(
                          "inline-block rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                          moi ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted"
                        )}>
                          {m.corps}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {fil.length === 0 && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Ce fil est vide. Écrivez le premier message.
                  </p>
                )}
                <div ref={bas} />
              </div>

              <div className="flex items-end gap-2 border-t p-3">
                <Textarea
                  value={brouillon} rows={1}
                  onChange={(e) => setBrouillon(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); expedier(); }
                  }}
                  placeholder="Écrire un message — Entrée pour envoyer"
                  className="max-h-32 min-h-[42px] resize-none"
                />
                <Button size="icon" className="h-[42px] w-[42px] shrink-0" disabled={!brouillon.trim()} onClick={expedier}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <CardContent className="grid flex-1 place-items-center py-16 text-center">
              <div>
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">Choisissez un fil, ou ouvrez-en un.</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => { setFormulaire(null); setImposes(null); }}
        titre="Ouvrir un fil"
        description="Un échange direct, un groupe de travail, ou le fil de votre service."
        surValidation={ouvrirFil}
        validationPossible={valide}
        libelleValidation="Ouvrir"
      >
        {formulaire && (
          <>
            <ChampSelect
              label="Nature" obligatoire valeur={formulaire.type}
              surChangement={(v) => setFormulaire({ ...formulaire, type: v as TypeConversation })}
              options={(Object.keys(TYPE_LABELS) as TypeConversation[]).map((t) => ({ valeur: t, libelle: TYPE_LABELS[t] }))}
            />
            {/* Qui sera dans le fil, quand la sélection l'a fixé : ouvrir un
                fil sans savoir à qui l'on parle est le meilleur moyen d'écrire
                à quarante personnes en croyant en toucher quatre. */}
            {imposes && (
              <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-xs">
                <div className="mb-1 font-medium">
                  {imposes.length} participant{imposes.length > 1 ? "s" : ""}, vous compris
                </div>
                <div className="leading-relaxed text-muted-foreground">
                  {imposes
                    .filter((id) => id !== user.id)
                    .map((id) => comptes.find((c) => c.id === id)?.nomComplet ?? id)
                    .join(", ")}
                </div>
              </div>
            )}
            {formulaire.type === "DIRECT" ? (
              <ChampSelect
                label="Destinataire" obligatoire valeur={formulaire.destinataire}
                surChangement={(v) => setFormulaire({ ...formulaire, destinataire: v })}
                options={comptes.filter((c) => c.id !== user.id && c.actif)
                  .map((c) => ({ valeur: c.id, libelle: `${c.nomComplet} — ${entiteById(c.entiteId)?.sigle ?? ""}` }))}
              />
            ) : (
              <ChampTexte
                label="Intitulé du fil" obligatoire valeur={formulaire.titre}
                surChangement={(v) => setFormulaire({ ...formulaire, titre: v })}
                placeholder="Cellule mutations 2026"
              />
            )}
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
