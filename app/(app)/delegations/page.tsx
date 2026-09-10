"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock, CheckCircle2, PenLine, Plus, ShieldAlert, UserCog, XCircle,
} from "lucide-react";
import { useDelegations, useEnregistrerDelegation, useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, NIVEAU_LABELS, ROLE_LABELS, TYPES_ACTE, cheminDe, entiteById, peut, typeActeById,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  ChampSelect, ChampTexte, ChampZone, DialogueFormulaire, LigneInfo,
  PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Delegation, PorteeDelegation, TypeActe } from "@/lib/types";

const PORTEE_LABELS: Record<PorteeDelegation, string> = {
  SIGNATURE: "Délégation de signature",
  INTERIM: "Intérim",
};

/** Une délégation vaut par ses dates : hors fenêtre, elle ne produit rien. */
const etatDe = (d: Delegation): "EN_VIGUEUR" | "A_VENIR" | "ECHUE" | "REVOQUEE" => {
  if (d.revoquee) return "REVOQUEE";
  const jour = new Date().toISOString().slice(0, 10);
  if (jour < d.dateDebut) return "A_VENIR";
  if (jour > d.dateFin) return "ECHUE";
  return "EN_VIGUEUR";
};

const ETAT_LABELS = {
  EN_VIGUEUR: "En vigueur", A_VENIR: "À venir", ECHUE: "Échue", REVOQUEE: "Révoquée",
} as const;

const COULEUR_ETAT: Record<keyof typeof ETAT_LABELS, string> = {
  EN_VIGUEUR: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
  A_VENIR: "bg-sky-500/12 text-sky-600 border-sky-500/20",
  ECHUE: "bg-slate-500/12 text-slate-600 border-slate-500/20",
  REVOQUEE: "bg-rose-500/12 text-rose-600 border-rose-500/20",
};

const vide = {
  portee: "SIGNATURE" as PorteeDelegation,
  delegataireId: "", entiteId: "", types: [] as TypeActe[],
  dateDebut: new Date().toISOString().slice(0, 10),
  dateFin: "", motif: "",
};

export default function DelegationsPage() {
  const user = useAuth((s) => s.user)!;
  const { data: delegations = [], isLoading } = useDelegations();
  const { data: comptes = [] } = useUtilisateurs();
  const enregistrer = useEnregistrerDelegation();

  const [selection, setSelection] = useState<Delegation | null>(null);
  const [formulaire, setFormulaire] = useState<typeof vide | null>(null);
  const [filtres, setFiltres] = useState<Record<string, string>>({ portee: "all", etat: "all" });

  const redacteur = peut(user.role, "delegations", "W");

  const lignes = useMemo(() => delegations
    .filter((d) => filtres.portee === "all" || d.portee === filtres.portee)
    .filter((d) => filtres.etat === "all" || etatDe(d) === filtres.etat)
    .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)), [delegations, filtres]);

  const stats = useMemo(() => ({
    vigueur: delegations.filter((d) => etatDe(d) === "EN_VIGUEUR").length,
    interims: delegations.filter((d) => d.portee === "INTERIM" && etatDe(d) === "EN_VIGUEUR").length,
    // Ce qui expire bientôt : une délégation échue sans successeur bloque le circuit.
    proches: delegations.filter((d) => {
      if (etatDe(d) !== "EN_VIGUEUR") return false;
      const reste = (new Date(d.dateFin).getTime() - Date.now()) / 864e5;
      return reste <= 30;
    }).length,
    miennes: delegations.filter((d) =>
      (d.delegataireId === user.id || d.delegantId === user.id) && etatDe(d) === "EN_VIGUEUR").length,
  }), [delegations, user.id]);

  const valide = !!formulaire
    && !!formulaire.delegataireId && !!formulaire.entiteId
    && !!formulaire.dateFin && formulaire.dateFin > formulaire.dateDebut
    && formulaire.motif.trim().length > 8;

  const consentir = async () => {
    if (!formulaire || !valide) return;
    const destinataire = comptes.find((c) => c.id === formulaire.delegataireId)!;
    const delegation: Delegation = {
      id: `DEL-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      reference: `DEC-${String(delegations.length + 1).padStart(3, "0")}/METP/DGARH-${new Date().getFullYear()}`,
      portee: formulaire.portee,
      delegantId: user.id,
      delegantNom: user.nomComplet,
      delegataireId: destinataire.id,
      delegataireNom: destinataire.nomComplet,
      entiteId: formulaire.entiteId,
      typesActe: formulaire.types,
      dateDebut: formulaire.dateDebut,
      dateFin: formulaire.dateFin,
      motif: formulaire.motif.trim(),
      acteId: null,
    };
    await enregistrer.mutateAsync({ delegation, utilisateur: user, creation: true });
    toast.success("Délégation consentie", {
      description: `${destinataire.nomComplet} signe en vos lieu et place jusqu'au ${fmtDate(delegation.dateFin)}.`,
      duration: 8000,
    });
    setFormulaire(null);
    setSelection(delegation);
  };

  const revoquer = async (d: Delegation) => {
    const maj = { ...d, revoquee: true };
    await enregistrer.mutateAsync({ delegation: maj, utilisateur: user, creation: false });
    setSelection(maj);
    toast.success("Délégation révoquée", {
      description: "Elle cesse de produire effet immédiatement ; elle reste au registre.",
    });
  };

  const basculerType = (t: TypeActe) => setFormulaire((f) =>
    f ? { ...f, types: f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t] } : f);

  const colonnes: Colonne<Delegation>[] = [
    {
      cle: "reference", entete: "Décision",
      rendu: (d) => (
        <div className="min-w-0">
          <div className="font-mono text-xs font-semibold">{d.reference}</div>
          <div className="text-[11px] text-muted-foreground">{PORTEE_LABELS[d.portee]}</div>
        </div>
      ),
    },
    {
      cle: "chaine", entete: "De qui, à qui",
      rendu: (d) => (
        <div className="min-w-0 text-xs">
          <div className="font-medium">{d.delegantNom}</div>
          <div className="text-muted-foreground">→ {d.delegataireNom}</div>
        </div>
      ),
    },
    {
      cle: "entite", entete: "Périmètre", visible: "lg",
      rendu: (d) => (
        <span className="text-xs text-muted-foreground" title={entiteById(d.entiteId)?.nom}>
          {entiteById(d.entiteId)?.sigle ?? "—"}
        </span>
      ),
    },
    {
      cle: "types", entete: "Actes couverts", visible: "xl",
      rendu: (d) => d.typesActe.length
        ? <span className="text-[11px]">{d.typesActe.map((t) => typeActeById(t)?.libelle ?? t).join(", ")}</span>
        : <span className="text-[11px] italic text-muted-foreground">tous ceux du délégant</span>,
    },
    {
      cle: "fenetre", entete: "Fenêtre", visible: "md",
      rendu: (d) => (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmtDate(d.dateDebut)} → {fmtDate(d.dateFin)}
        </span>
      ),
    },
    {
      cle: "etat", entete: "État", aligne: "droite",
      rendu: (d) => {
        const e = etatDe(d);
        return <Badge variant="outline" className={cn("text-[10px]", COULEUR_ETAT[e])}>{ETAT_LABELS[e]}</Badge>;
      },
    },
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Délégations et intérims"
        description="Ce qui permet au circuit de continuer quand le signataire est absent. Une délégation est bornée dans le temps et nominative : hors de sa fenêtre, elle ne produit rien (§11)."
      >
        {redacteur && (
          <Button size="sm" onClick={() => setFormulaire({ ...vide, entiteId: user.entiteId })}>
            <Plus className="mr-1.5 h-4 w-4" /> Consentir une délégation
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "emeraude", titre: "En vigueur", valeur: stats.vigueur, sousTitre: `sur ${fmtNum(delegations.length)} enregistrées`, icon: CheckCircle2 },
        { ton: "cyan", titre: "Intérims en cours", valeur: stats.interims, sousTitre: "un agent exerce à la place d'un autre", icon: UserCog },
        { ton: "ambre", titre: "Expirent sous 30 jours", valeur: stats.proches, sousTitre: "à renouveler avant échéance", icon: CalendarClock },
        { ton: "bleu", titre: "Vous concernant", valeur: stats.miennes, sousTitre: "consenties par vous ou à vous", icon: PenLine },
      ]} />

      {stats.proches > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.04]">
          <CardHeader className="flex flex-row items-start gap-3 pb-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <CardTitle className="text-base">
                {fmtNum(stats.proches)} délégation{stats.proches > 1 ? "s" : ""} arrive{stats.proches > 1 ? "nt" : ""} à échéance
              </CardTitle>
              <CardDescription>
                Une délégation qui expire sans être renouvelée arrête les dossiers qu'elle couvrait :
                ils attendront la signature du délégant, absent ou non.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <TableauModule<Delegation>
        titre="Registre des délégations"
        description="Cliquez une ligne pour la lire en entier."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(d, t) =>
          d.reference.toLowerCase().includes(t) || d.delegantNom.toLowerCase().includes(t)
          || d.delegataireNom.toLowerCase().includes(t) || d.motif.toLowerCase().includes(t)}
        placeholderRecherche="Référence, nom ou motif…"
        filtres={[
          { cle: "portee", libelle: "Signature et intérim", options: (Object.keys(PORTEE_LABELS) as PorteeDelegation[]).map((p) => ({ valeur: p, libelle: PORTEE_LABELS[p] })) },
          { cle: "etat", libelle: "Tous les états", options: Object.entries(ETAT_LABELS).map(([v, l]) => ({ valeur: v, libelle: l })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        vide="Aucune délégation enregistrée."
        parPage={14}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection ? PORTEE_LABELS[selection.portee] : ""}
        sousTitre={selection ? `${selection.reference} — ${selection.delegantNom} → ${selection.delegataireNom}` : undefined}
        etiquette={selection && (
          <Badge variant="outline" className={cn("text-[10px]", COULEUR_ETAT[etatDe(selection)])}>
            {ETAT_LABELS[etatDe(selection)]}
          </Badge>
        )}
        actions={selection && redacteur && etatDe(selection) === "EN_VIGUEUR" && selection.delegantId === user.id && (
          <Button variant="destructive" size="sm" onClick={() => revoquer(selection)}>
            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Révoquer
          </Button>
        )}
      >
        {selection && (
          <>
            <Section titre="Parties">
              <LigneInfo k="Délégant" v={selection.delegantNom} />
              <LigneInfo k="Rôle du délégant" v={ROLE_LABELS[comptes.find((c) => c.id === selection.delegantId)?.role ?? "DIRECTEUR_GENERAL"]} />
              <LigneInfo k="Délégataire" v={selection.delegataireNom} />
              <LigneInfo k="Rôle du délégataire" v={ROLE_LABELS[comptes.find((c) => c.id === selection.delegataireId)?.role ?? "CHEF_SERVICE"]} />
            </Section>

            <Section titre="Étendue">
              <LigneInfo k="Portée" v={PORTEE_LABELS[selection.portee]} />
              <LigneInfo k="Entité couverte" v={entiteById(selection.entiteId)?.nom ?? "—"} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">{cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ")}</span>} />
              <div className="pt-3">
                <div className="mb-2 text-[11px] text-muted-foreground">Types d'acte couverts</div>
                <div className="flex flex-wrap gap-1.5">
                  {selection.typesActe.length
                    ? selection.typesActe.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{typeActeById(t)?.libelle ?? t}</Badge>
                      ))
                    : <span className="text-xs italic text-muted-foreground">Tous les actes que le délégant peut signer.</span>}
                </div>
              </div>
            </Section>

            <Section titre="Fenêtre">
              <LigneInfo k="Du" v={fmtDate(selection.dateDebut)} />
              <LigneInfo k="Au" v={fmtDate(selection.dateFin)} />
              <LigneInfo k="État" v={ETAT_LABELS[etatDe(selection)]} />
            </Section>

            <Section titre="Motif">
              <p className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">{selection.motif}</p>
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Consentir une délégation"
        description="Elle prend effet à la date de début et cesse d'elle-même à l'échéance. Rien à défaire."
        surValidation={consentir}
        validationPossible={valide}
        libelleValidation="Consentir"
        large
      >
        {formulaire && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect
                label="Portée" obligatoire valeur={formulaire.portee}
                surChangement={(v) => setFormulaire({ ...formulaire, portee: v as PorteeDelegation })}
                options={(Object.keys(PORTEE_LABELS) as PorteeDelegation[]).map((p) => ({ valeur: p, libelle: PORTEE_LABELS[p] }))}
                aide="L'intérim remplace la personne ; la délégation de signature ne transfère qu'un pouvoir de signer."
              />
              <ChampSelect
                label="Délégataire" obligatoire valeur={formulaire.delegataireId}
                surChangement={(v) => setFormulaire({ ...formulaire, delegataireId: v })}
                options={comptes.filter((c) => c.actif && c.id !== user.id)
                  .map((c) => ({ valeur: c.id, libelle: `${c.nomComplet} — ${ROLE_LABELS[c.role]}` }))}
              />
            </div>
            <ChampSelect
              label="Entité couverte" obligatoire valeur={formulaire.entiteId}
              surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
              options={ENTITES.map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${NIVEAU_LABELS[e.niveau]}` }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Du" type="date" obligatoire valeur={formulaire.dateDebut}
                surChangement={(v) => setFormulaire({ ...formulaire, dateDebut: v })} />
              <ChampTexte label="Au" type="date" obligatoire valeur={formulaire.dateFin}
                surChangement={(v) => setFormulaire({ ...formulaire, dateFin: v })} />
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs font-medium">Types d'acte couverts</span>
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2.5">
                {TYPES_ACTE.map((t) => {
                  const actif = formulaire.types.includes(t.type);
                  return (
                    <button
                      key={t.type} type="button" onClick={() => basculerType(t.type)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition",
                        actif ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                      )}
                    >
                      {t.libelle}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Aucun type sélectionné : la délégation couvre tout ce que vous pouvez signer.
              </p>
            </div>
            <ChampZone
              label="Motif" obligatoire lignes={3} valeur={formulaire.motif}
              surChangement={(v) => setFormulaire({ ...formulaire, motif: v })}
              placeholder="Mission à l'intérieur du pays du 15 au 30 septembre."
              aide="Le motif figure au registre et au journal d'audit : c'est ce qui justifie la délégation en cas de contrôle."
            />
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
