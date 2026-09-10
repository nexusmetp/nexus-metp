"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCheck, Megaphone, Pin, Plus, Users } from "lucide-react";
import {
  useAccuserLecture, useAnnonces, useEnregistrerAnnonce, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { ENTITES, NIVEAU_LABELS, cheminDe, descendantsDe, entiteById, peut } from "@/lib/referentiels";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, Jauge, LigneInfo,
  PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Annonce, PorteeAnnonce } from "@/lib/types";

const PORTEE_LABELS: Record<PorteeAnnonce, string> = {
  MINISTERE: "Tout le ministère",
  ENTITE: "Une entité et son périmètre",
};

const videAnnonce = {
  titre: "", corps: "", portee: "ENTITE" as PorteeAnnonce,
  entiteId: "", accuseRequis: true, epingle: false, reference: "",
};

export default function AnnoncesPage() {
  const user = useAuth((s) => s.user)!;
  const { data: annonces = [], isLoading } = useAnnonces();
  const { data: comptes = [] } = useUtilisateurs();
  const enregistrer = useEnregistrerAnnonce();
  const accuser = useAccuserLecture();

  const [selection, setSelection] = useState<Annonce | null>(null);
  const [formulaire, setFormulaire] = useState<typeof videAnnonce | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ portee: "all", lecture: "all" });

  const emetteur = peut(user.role, "annonces", "W");

  /* On reçoit ce qui vise le ministère, ou une entité de sa chaîne. */
  const chaine = useMemo(() => new Set(cheminDe(user.entiteId).map((e) => e.id)), [user.entiteId]);
  const visibles = useMemo(() => annonces.filter((a) =>
    a.portee === "MINISTERE" || chaine.has(a.entiteId) || a.auteurId === user.id
  ), [annonces, chaine, user.id]);

  const luePar = (a: Annonce) => a.accuses.some((x) => x.utilisateurId === user.id);

  const destinataires = (a: Annonce) => {
    if (a.portee === "MINISTERE") return comptes.filter((c) => c.actif).length;
    const perimetre = new Set(descendantsDe(a.entiteId).map((e) => e.id));
    return comptes.filter((c) => c.actif && perimetre.has(c.entiteId)).length;
  };

  const lignes = useMemo(() => visibles
    .filter((a) => filtres.portee === "all" || a.portee === filtres.portee)
    .filter((a) => filtres.lecture === "all" || (filtres.lecture === "lue" ? luePar(a) : !luePar(a)))
    .sort((a, b) => Number(b.epingle) - Number(a.epingle) || b.dateEmission.localeCompare(a.dateEmission)),
    [visibles, filtres, user.id]);

  const aLire = visibles.filter((a) => a.accuseRequis && !luePar(a)).length;

  const valide = !!formulaire && formulaire.titre.trim().length > 5 && formulaire.corps.trim().length > 20;

  const diffuser = async () => {
    if (!formulaire || !valide) return;
    const annee = new Date().getFullYear();
    const annonce: Annonce = {
      id: `ANN-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      reference: formulaire.reference.trim()
        || `NS-${String(annonces.length + 1).padStart(3, "0")}/METP/DGARH-${annee}`,
      titre: formulaire.titre.trim(),
      corps: formulaire.corps.trim(),
      auteurId: user.id,
      auteur: user.nomComplet,
      portee: formulaire.portee,
      entiteId: formulaire.portee === "MINISTERE" ? "ENT-METP" : (formulaire.entiteId || user.entiteId),
      dateEmission: new Date().toISOString(),
      accuseRequis: formulaire.accuseRequis,
      accuses: [],
      epingle: formulaire.epingle,
    };
    await enregistrer.mutateAsync({ annonce, utilisateur: user, creation: true });
    toast.success("Note diffusée", {
      description: `${annonce.reference} — ${fmtNum(destinataires(annonce))} destinataires.`,
    });
    setFormulaire(null);
    setSelection(annonce);
  };

  const accuserLecture = async (a: Annonce) => {
    const maj = await accuser.mutateAsync({ annonce: a, utilisateur: user });
    setSelection(maj as Annonce);
    toast.success("Lecture accusée", { description: "Votre nom figure désormais dans l'état de diffusion." });
  };

  const colonnes: Colonne<Annonce>[] = [
    {
      cle: "titre", entete: "Note",
      rendu: (a) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {a.epingle && <Pin className="h-3 w-3 shrink-0 text-primary" />}
            <span className={cn("text-sm", !luePar(a) && a.accuseRequis ? "font-semibold" : "font-medium")}>
              {a.titre}
            </span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">{a.reference}</div>
        </div>
      ),
    },
    { cle: "auteur", entete: "Émetteur", visible: "lg", rendu: (a) => <span className="text-xs">{a.auteur}</span> },
    {
      cle: "portee", entete: "Portée", visible: "md",
      rendu: (a) => (
        <Badge variant="outline" className="text-[10px]">
          {a.portee === "MINISTERE" ? "Ministère" : entiteById(a.entiteId)?.sigle ?? "—"}
        </Badge>
      ),
    },
    { cle: "date", entete: "Émise le", visible: "md", rendu: (a) => <span className="text-xs tabular-nums">{fmtDate(a.dateEmission)}</span> },
    {
      cle: "diffusion", entete: "Diffusion", aligne: "droite", visible: "xl",
      rendu: (a) => {
        const cible = destinataires(a);
        const pct = cible ? Math.round((a.accuses.length / cible) * 100) : 0;
        return a.accuseRequis
          ? <span className="tabular-nums text-xs text-muted-foreground">{a.accuses.length}/{cible} — {pct} %</span>
          : <span className="text-xs text-muted-foreground">sans accusé</span>;
      },
    },
    {
      cle: "lecture", entete: "", aligne: "droite",
      rendu: (a) => a.accuseRequis
        ? (luePar(a)
            ? <Badge variant="secondary" className="text-[10px]"><CheckCheck className="mr-1 h-3 w-3" />lue</Badge>
            : <Badge variant="destructive" className="text-[10px]">à lire</Badge>)
        : null,
    },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const cibleSel = selection ? destinataires(selection) : 0;
  const pctSel = selection && cibleSel ? Math.round((selection.accuses.length / cibleSel) * 100) : 0;

  return (
    <>
      <PageHeader
        titre="Notes et circulaires"
        description="Ce que la direction générale fait savoir. L'accusé de lecture est nominatif : c'est ce qui distingue une circulaire d'un simple message."
      >
        {emetteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...videAnnonce, entiteId: user.entiteId })}>
            <Plus className="mr-1.5 h-4 w-4" /> Diffuser une note
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Notes reçues", valeur: fmtNum(visibles.length), sousTitre: "vous concernant", icon: Megaphone },
        { ton: "ambre", titre: "À lire", valeur: fmtNum(aLire), sousTitre: "accusé de lecture attendu", icon: BellRing },
        { ton: "violet", titre: "Épinglées", valeur: fmtNum(visibles.filter((a) => a.epingle).length), sousTitre: "en tête de liste", icon: Pin },
        { ton: "bleu", titre: "Émises par vous", valeur: fmtNum(annonces.filter((a) => a.auteurId === user.id).length), sousTitre: "dont vous répondez", icon: Users },
      ]} />

      <TableauModule<Annonce>
        titre="Diffusion"
        description="Les notes épinglées restent en tête. Cliquez pour lire et accuser réception."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) => a.titre.toLowerCase().includes(t) || a.reference.toLowerCase().includes(t) || a.corps.toLowerCase().includes(t)}
        placeholderRecherche="Titre, référence ou contenu…"
        filtres={[
          { cle: "portee", libelle: "Toutes portées", options: (Object.keys(PORTEE_LABELS) as PorteeAnnonce[]).map((p) => ({ valeur: p, libelle: PORTEE_LABELS[p] })) },
          { cle: "lecture", libelle: "Lues et non lues", options: [{ valeur: "non", libelle: "À lire" }, { valeur: "lue", libelle: "Lues" }] },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        vide="Aucune note diffusée."
        parPage={12}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.titre ?? ""}
        sousTitre={selection ? `${selection.reference} — ${selection.auteur}, le ${fmtDate(selection.dateEmission)}` : undefined}
        etiquette={selection && (
          <>
            <Badge variant="secondary" className="text-[10px]">
              {selection.portee === "MINISTERE" ? "Tout le ministère" : entiteById(selection.entiteId)?.sigle ?? "—"}
            </Badge>
            {selection.epingle && <Badge variant="outline" className="text-[10px]"><Pin className="mr-1 h-3 w-3" />épinglée</Badge>}
            {selection.accuseRequis && (
              <Badge variant={luePar(selection) ? "secondary" : "destructive"} className="text-[10px]">
                {luePar(selection) ? "lecture accusée" : "accusé attendu"}
              </Badge>
            )}
          </>
        )}
        actions={selection && selection.accuseRequis && !luePar(selection) && (
          <Button size="sm" onClick={() => accuserLecture(selection)}>
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> J'accuse réception
          </Button>
        )}
      >
        {selection && (
          <>
            <Section titre="Texte">
              <p className="whitespace-pre-line rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
                {selection.corps}
              </p>
            </Section>

            <Section titre="Émission">
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.reference}</span>} />
              <LigneInfo k="Émetteur" v={selection.auteur} />
              <LigneInfo k="Portée" v={PORTEE_LABELS[selection.portee]} />
              <LigneInfo k="Entité" v={entiteById(selection.entiteId)?.nom ?? "—"} />
              <LigneInfo k="Date" v={fmtDate(selection.dateEmission)} />
            </Section>

            {selection.accuseRequis && (
              <Section titre={`État de diffusion — ${selection.accuses.length} sur ${cibleSel}`}>
                <Jauge valeur={pctSel} teinte={pctSel >= 80 ? "bg-emerald-500" : pctSel >= 40 ? "bg-amber-500" : "bg-rose-500"} />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {fmtPct(pctSel)} des destinataires ont accusé réception.
                </p>
                <div className="mt-3 space-y-1">
                  {selection.accuses.map((x) => {
                    const c = comptes.find((u) => u.id === x.utilisateurId);
                    return (
                      <div key={x.utilisateurId} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                        <span className="text-xs">{c?.nomComplet ?? x.utilisateurId}</span>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(x.date)}</span>
                      </div>
                    );
                  })}
                  {selection.accuses.length === 0 && (
                    <p className="py-3 text-center text-xs text-muted-foreground">Personne n'a encore accusé réception.</p>
                  )}
                </div>
              </Section>
            )}
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Diffuser une note de service"
        description="Elle atteint immédiatement les destinataires de la portée choisie."
        surValidation={diffuser}
        validationPossible={valide}
        libelleValidation="Diffuser"
        large
      >
        {formulaire && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte
                label="Titre" obligatoire valeur={formulaire.titre}
                surChangement={(v) => setFormulaire({ ...formulaire, titre: v })}
                placeholder="Ouverture de la campagne d'avancement"
              />
              <ChampTexte
                label="Référence" valeur={formulaire.reference}
                surChangement={(v) => setFormulaire({ ...formulaire, reference: v })}
                placeholder="attribuée automatiquement si vide"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect
                label="Portée" obligatoire valeur={formulaire.portee}
                surChangement={(v) => setFormulaire({ ...formulaire, portee: v as PorteeAnnonce })}
                options={(Object.keys(PORTEE_LABELS) as PorteeAnnonce[]).map((p) => ({ valeur: p, libelle: PORTEE_LABELS[p] }))}
              />
              {formulaire.portee === "ENTITE" && (
                <ChampSelect
                  label="Entité visée" valeur={formulaire.entiteId}
                  surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
                  options={ENTITES.map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))}
                  aide="La note atteint cette entité et tout ce qui lui est rattaché."
                />
              )}
            </div>
            <ChampZone
              label="Texte" obligatoire lignes={7} valeur={formulaire.corps}
              surChangement={(v) => setFormulaire({ ...formulaire, corps: v })}
              placeholder="Les chefs de service sont invités à transmettre…"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Accusé de lecture</div>
                  <p className="text-[11px] text-muted-foreground">Produit un état de diffusion nominatif.</p>
                </div>
                <Switch checked={formulaire.accuseRequis} onCheckedChange={(v: boolean) => setFormulaire({ ...formulaire, accuseRequis: v })} />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Épingler</div>
                  <p className="text-[11px] text-muted-foreground">Maintient la note en tête de liste.</p>
                </div>
                <Switch checked={formulaire.epingle} onCheckedChange={(v: boolean) => setFormulaire({ ...formulaire, epingle: v })} />
              </label>
            </div>
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
