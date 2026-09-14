"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";
import {
  useArticlesArchives, useEnregistrerVersement, useUtilisateurs, useVersements,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  ENTITES, PLAN_CLASSEMENT, STATUT_VERSEMENT_LABELS, cheminDe, echeanceDua, entiteById,
  peut, peutDans,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import {
  ChampSelect, ChampTexte, DialogueFormulaire, LigneInfo, PanneauDetail,
  Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { DocumentsLies } from "@/components/nexus/documents-lies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ArticleArchive, Versement } from "@/lib/types";

const COULEUR: Record<string, string> = {
  PREPARE: "bg-slate-500/12 text-slate-500 border-slate-500/25",
  VERSE: "bg-primary/10 text-primary border-primary/25",
  RECOLE: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  REFUSE: "bg-rose-500/12 text-rose-600 border-rose-500/25",
};

const vide = {
  intitule: "", entiteId: "", dateDebut: "", dateFin: "", serieCode: PLAN_CLASSEMENT[0].code, nbArticles: "3",
};

/** Les versements : ce qui entre au service des archives, et sur quel bordereau. */
export function Versements() {
  const user = useAuth((s) => s.user)!;
  const { data: versements = [] } = useVersements();
  const { data: articles = [] } = useArticlesArchives();
  const { data: utilisateurs = [] } = useUtilisateurs();
  const enregistrer = useEnregistrerVersement();
  const [selection, setSelection] = useState<Versement | null>(null);
  const [formulaire, setFormulaire] = useState<typeof vide | null>(null);
  const archiviste = peutDans(user, "archives", "W");

  const nomDe = useMemo(() => {
    const m = new Map(utilisateurs.map((u) => [u.id, u.nomComplet]));
    return (id?: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [utilisateurs]);

  const articlesDe = useMemo(() => {
    const m = new Map<string, ArticleArchive[]>();
    articles.forEach((a) => {
      const l = m.get(a.versementId);
      if (l) l.push(a); else m.set(a.versementId, [a]);
    });
    return m;
  }, [articles]);

  const lignes = useMemo(
    () => [...versements].sort((a, b) => b.dateVersement.localeCompare(a.dateVersement)),
    [versements]
  );

  const colonnes: Colonne<Versement>[] = [
    {
      cle: "ref", entete: "Versement",
      rendu: (v) => (
        <div className="min-w-0">
          <div className="font-mono text-[11px]">{v.reference}</div>
          <div className="truncate text-[10px] text-muted-foreground">{v.intitule}</div>
        </div>
      ),
    },
    {
      cle: "service", entete: "Service versant", visible: "lg",
      rendu: (v) => <span className="text-xs">{entiteById(v.entiteId)?.sigle ?? "—"}</span>,
    },
    {
      cle: "dates", entete: "Dates extrêmes", visible: "md",
      rendu: (v) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {v.dateDebut.slice(0, 4)} — {v.dateFin.slice(0, 4)}
        </span>
      ),
    },
    {
      cle: "articles", entete: "Articles", visible: "xl", aligne: "droite",
      rendu: (v) => <span className="text-xs tabular-nums">{fmtNum(articlesDe.get(v.id)?.length ?? 0)}</span>,
    },
    {
      cle: "metrage", entete: "Métrage", aligne: "droite",
      rendu: (v) => <span className="text-xs tabular-nums text-muted-foreground">{v.metrage} ml</span>,
    },
    {
      cle: "statut", entete: "Statut", aligne: "droite",
      rendu: (v) => (
        <Badge variant="outline" className={cn("text-[10px]", COULEUR[v.statut])}>
          {STATUT_VERSEMENT_LABELS[v.statut]}
        </Badge>
      ),
    },
  ];

  const valide = !!formulaire
    && formulaire.intitule.trim().length > 3
    && !!formulaire.entiteId
    && /^\d{4}-\d{2}-\d{2}$/.test(formulaire.dateDebut)
    && /^\d{4}-\d{2}-\d{2}$/.test(formulaire.dateFin)
    && formulaire.dateFin >= formulaire.dateDebut;

  const creer = async () => {
    if (!formulaire || !valide) return;
    const serie = PLAN_CLASSEMENT.find((s) => s.code === formulaire.serieCode)!;
    const n = Math.max(1, Math.min(40, Number(formulaire.nbArticles) || 1));
    const id = `VER-${Date.now().toString(36).toUpperCase()}`;
    const annee = formulaire.dateFin.slice(0, 4);

    const versement: Versement = {
      id,
      reference: `VER-${new Date().getFullYear()}-${id.slice(-4)}`,
      intitule: formulaire.intitule.trim(),
      entiteId: formulaire.entiteId,
      dateVersement: new Date().toISOString().slice(0, 10),
      dateDebut: formulaire.dateDebut,
      dateFin: formulaire.dateFin,
      metrage: Math.round(n * 0.8 * 10) / 10,
      statut: "PREPARE",
      verseParId: user.id,
      recuParId: null,
    };

    /* Les articles héritent de la série : DUA et sort final ne se saisissent pas
       au versement, ils découlent du plan de classement (§14). */
    const nouveaux: ArticleArchive[] = Array.from({ length: n }, (_, i) => ({
      id: `ART-${id.slice(-6)}-${i + 1}`,
      cote: `METP/DGARH/${serie.code.replace(/\s/g, "")}/${annee}/${String(i + 1).padStart(3, "0")}`,
      intitule: `${serie.intitule} — ${formulaire.intitule.trim()}`,
      versementId: id,
      serieCode: serie.code,
      dateDebut: formulaire.dateDebut,
      dateFin: formulaire.dateFin,
      dua: serie.dua,
      echeanceDua: echeanceDua(formulaire.dateFin, serie.dua),
      sortFinal: serie.sortFinal,
      communicabilite: serie.communicabilite,
      support: "PAPIER",
      statut: "EN_RAYON",
    }));

    await enregistrer.mutateAsync({ versement, articles: nouveaux, utilisateur: user, creation: true });
    toast.success("Versement préparé", {
      description: `${versement.reference} — ${n} article(s) cotés dans la série ${serie.code}.`,
    });
    setFormulaire(null);
  };

  const statuer = (v: Versement, statut: Versement["statut"]) => {
    enregistrer.mutate(
      { versement: { ...v, statut, recuParId: user.id }, utilisateur: user, creation: false },
      {
        onSuccess: () => {
          toast.success(STATUT_VERSEMENT_LABELS[statut], { description: v.reference });
          setSelection({ ...v, statut, recuParId: user.id });
        },
      }
    );
  };

  const arts = selection ? articlesDe.get(selection.id) ?? [] : [];

  return (
    <>
      <TableauModule<Versement>
        titre="Versements"
        description="Un service remet ses dossiers au service des archives. Le bordereau qui les décrit est la preuve de la prise en charge."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(v, t) =>
          v.reference.toLowerCase().includes(t) || v.intitule.toLowerCase().includes(t)
          || (entiteById(v.entiteId)?.nom ?? "").toLowerCase().includes(t)}
        placeholderRecherche="Référence, intitulé ou service…"
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={12}
        actions={archiviste && (
          <Button size="sm" onClick={() => setFormulaire({ ...vide })}>
            <Plus className="mr-1.5 h-4 w-4" /> Préparer un versement
          </Button>
        )}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection?.intitule ?? ""}
        sousTitre={selection?.reference}
        large
        etiquette={selection && (
          <Badge variant="outline" className={cn("text-[10px]", COULEUR[selection.statut])}>
            {STATUT_VERSEMENT_LABELS[selection.statut]}
          </Badge>
        )}
        actions={selection && (
          <>
            <DocumentsLies
              source="archives"
              libelle="Bordereaux"
              contexte={{
                versement: selection,
                articlesArchives: arts,
                entite: entiteById(selection.entiteId) ?? undefined,
                signataire: { nom: user.nomComplet },
              }}
            />
            {archiviste && selection.statut === "PREPARE" && (
              <>
                <Button variant="outline" size="sm" onClick={() => statuer(selection, "REFUSE")}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Refuser
                </Button>
                <Button size="sm" onClick={() => statuer(selection, "VERSE")}>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Prendre en charge
                </Button>
              </>
            )}
            {archiviste && selection.statut === "VERSE" && (
              <Button size="sm" onClick={() => statuer(selection, "RECOLE")}>Récoler</Button>
            )}
          </>
        )}
      >
        {selection && (
          <>
            <Section titre="Le versement">
              <LigneInfo k="Référence" v={<span className="font-mono text-xs">{selection.reference}</span>} />
              <LigneInfo k="Service versant" v={entiteById(selection.entiteId)?.nom} />
              <LigneInfo k="Chaîne" v={<span className="text-[11px]">
                {cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ")}
              </span>} />
              <LigneInfo k="Dates extrêmes" v={`${fmtDate(selection.dateDebut)} — ${fmtDate(selection.dateFin)}`} />
              <LigneInfo k="Versé le" v={fmtDate(selection.dateVersement)} />
              <LigneInfo k="Métrage" v={`${selection.metrage} mètres linéaires`} />
              <LigneInfo k="Versé par" v={nomDe(selection.verseParId)} />
              <LigneInfo k="Reçu par" v={nomDe(selection.recuParId)} />
              {selection.observations && (
                <LigneInfo k="Observations" v={<span className="text-xs text-amber-600">{selection.observations}</span>} />
              )}
            </Section>

            <Section titre={`Articles versés (${arts.length})`}>
              {arts.length ? (
                <div className="space-y-1.5">
                  {arts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px]">{a.cote}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{a.intitule}</div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">{a.serieCode}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucun article décrit dans ce versement.</p>
              )}
            </Section>

            <Section titre="Pourquoi un bordereau">
              <p className="rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Le bordereau de versement énumère article par article ce qui change de main. Sans lui,
                le service versant ne peut pas prouver qu'il a remis, ni le service des archives qu'il
                a reçu — et une pièce introuvable devient la faute de tout le monde et de personne.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Préparer un versement"
        description="La série choisie fixe la durée d'utilité et le sort final : elles ne se saisissent pas article par article."
        surValidation={creer}
        validationPossible={valide}
        libelleValidation="Préparer le versement"
        large
      >
        {formulaire && (
          <>
            <ChampTexte label="Intitulé du versement" obligatoire valeur={formulaire.intitule}
              surChangement={(v) => setFormulaire({ ...formulaire, intitule: v })}
              placeholder="Dossiers de congés 2021 — bureau de la gestion de carrière" />
            <ChampSelect label="Service versant" obligatoire valeur={formulaire.entiteId}
              surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
              options={ENTITES.filter((e) => ["BUREAU", "SERVICE", "DIRECTION"].includes(e.niveau))
                .slice(0, 120)
                .map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 44)}` }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Date d'ouverture" obligatoire type="date" valeur={formulaire.dateDebut}
                surChangement={(v) => setFormulaire({ ...formulaire, dateDebut: v })} />
              <ChampTexte label="Date de clôture" obligatoire type="date" valeur={formulaire.dateFin}
                surChangement={(v) => setFormulaire({ ...formulaire, dateFin: v })}
                aide="La durée d'utilité court à partir de cette date, pas de l'ouverture." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Série du plan de classement" valeur={formulaire.serieCode}
                surChangement={(v) => setFormulaire({ ...formulaire, serieCode: v })}
                options={PLAN_CLASSEMENT.map((s) => ({
                  valeur: s.code, libelle: `${s.code} — ${s.intitule}`,
                }))} />
              <ChampTexte label="Nombre d'articles" type="number" valeur={formulaire.nbArticles}
                surChangement={(v) => setFormulaire({ ...formulaire, nbArticles: v })}
                aide="Chaque article recevra une cote automatiquement." />
            </div>
            {formulaire.dateFin && (
              <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Série {formulaire.serieCode} — durée d'utilité de{" "}
                {PLAN_CLASSEMENT.find((s) => s.code === formulaire.serieCode)?.dua} ans, échéance en{" "}
                <strong>{echeanceDua(formulaire.dateFin, PLAN_CLASSEMENT.find((s) => s.code === formulaire.serieCode)?.dua ?? 0).slice(0, 4)}</strong>.
              </p>
            )}
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
