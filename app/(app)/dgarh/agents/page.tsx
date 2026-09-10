"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, GraduationCap, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useAgentsProjetes, useEntites, useInscrireAgent } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  CATEGORIES, ENTITES, GRADES, POSITION_LABELS, REGLES_CATEGORIE,
  cheminDe, descendantsDe, entiteById, gradeById, peut,
} from "@/lib/referentiels";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import {
  BadgeCategorie, BadgePosition, BadgeStatutaire, PageHeader,
} from "@/components/nexus/ui-kit";
import {
  ChampPhoto, ChampSelect, ChampTexte, DialogueFormulaire, Jauge, LigneInfo,
  PanneauDetail, RangeeKpi, Section, TableauModule, type Colonne,
} from "@/components/nexus/module";
import { Portrait } from "@/components/nexus/portrait";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AgentProjete, Agent, CategoriePersonnel, Sexe } from "@/lib/types";

/** Entités susceptibles de porter des agents. */
const NIVEAUX_PORTEURS = [
  "DIRECTION_GENERALE", "DIRECTION", "SERVICE", "BUREAU", "SECRETARIAT",
  "DIRECTION_DEPARTEMENTALE", "INSPECTION_GENERALE",
  "INSPECTION_INTERDEPARTEMENTALE", "ETABLISSEMENT",
];

const videAgent = {
  nom: "", prenom: "", sexe: "M" as Sexe, dateNaissance: "1990-01-01",
  lieuNaissance: "", telephone: "", email: "",
  categorie: "FONCTIONNAIRE" as CategoriePersonnel,
  enseignant: false, entiteId: "", fonction: "",
  dateEffet: new Date().toISOString().slice(0, 10), gradeId: "",
  photo: null as string | null,
};

export default function AgentsPage() {
  const user = useAuth((s) => s.user)!;
  const { data: agents, pret } = useAgentsProjetes();
  const { data: entitesDb = [] } = useEntites();
  const inscrire = useInscrireAgent();

  const [selection, setSelection] = useState<AgentProjete | null>(null);
  const [formulaire, setFormulaire] = useState<typeof videAgent | null>(null);
  const parametres = useSearchParams();
  const [filtres, setFiltres] = useState<Record<string, string>>({
    entite: parametres?.get("entite") ?? "all",
    categorie: parametres?.get("categorie") ?? "all",
    position: "all",
  });

  const redacteur = peut(user.role, "agents", "W");

  /* Le directeur inscrit dans son périmètre, pas ailleurs. §11 */
  const entitesOuvertes = useMemo(() => {
    const perimetre = new Set(descendantsDe(user.entiteId).map((e) => e.id));
    return ENTITES.filter((e) =>
      NIVEAUX_PORTEURS.includes(e.niveau) && e.actif !== false && perimetre.has(e.id));
  }, [user.entiteId, entitesDb]);

  const entitesFiltrables = useMemo(
    () => ENTITES.filter((e) => NIVEAUX_PORTEURS.includes(e.niveau) && e.actif !== false),
    [entitesDb]
  );

  const perimetreFiltre = useMemo(
    () => (filtres.entite === "all" ? null : new Set(descendantsDe(filtres.entite).map((e) => e.id))),
    [filtres.entite]
  );

  const lignes = useMemo(() => agents.filter((a) => {
    if (perimetreFiltre && !(a.entiteId && perimetreFiltre.has(a.entiteId))) return false;
    if (filtres.categorie !== "all" && a.categorie !== filtres.categorie) return false;
    if (filtres.position !== "all" && a.nature !== filtres.position) return false;
    return true;
  }), [agents, perimetreFiltre, filtres]);

  const stats = useMemo(() => ({
    total: lignes.length,
    enseignants: lignes.filter((a) => a.enseignant).length,
    activite: lignes.filter((a) => a.nature === "ACTIVITE").length,
    completude: lignes.length
      ? Math.round(lignes.reduce((s, a) => s + a.tauxCompletude, 0) / lignes.length)
      : 0,
  }), [lignes]);

  const valide = !!formulaire
    && formulaire.nom.trim().length > 1
    && formulaire.prenom.trim().length > 1
    && !!formulaire.entiteId;

  const enregistrer = async () => {
    if (!formulaire || !valide) return;
    const regle = REGLES_CATEGORIE[formulaire.categorie];
    const agent: Agent = {
      id: `AGT-${Date.now().toString(36).toUpperCase().slice(-8)}`,
      matricule: `${formulaire.categorie.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
      nom: formulaire.nom.trim().toUpperCase(),
      prenom: formulaire.prenom.trim(),
      sexe: formulaire.sexe,
      dateNaissance: formulaire.dateNaissance,
      lieuNaissance: formulaire.lieuNaissance.trim() || "Brazzaville",
      nationalite: "Congolaise",
      situationFamiliale: "Célibataire",
      enfants: 0,
      telephone: formulaire.telephone.trim(),
      email: formulaire.email.trim(),
      adresse: "",
      categorie: formulaire.categorie,
      enseignant: formulaire.enseignant,
      photo: formulaire.photo,
      dateRecrutement: formulaire.dateEffet,
      datePriseService: formulaire.dateEffet,
      diplomes: [],
      competences: [],
      langues: ["Français"],
    };
    await inscrire.mutateAsync({
      agent,
      entiteId: formulaire.entiteId,
      fonction: formulaire.fonction.trim() || (formulaire.enseignant ? "Enseignant" : "Agent"),
      dateEffet: formulaire.dateEffet,
      gradeId: regle.carriereStatutaire ? (formulaire.gradeId || null) : null,
      utilisateur: user,
    });
    toast.success(`${agent.prenom} ${agent.nom} inscrit`, {
      description: "Un acte de recrutement a été ouvert et notifié : c'est lui qui porte l'affectation.",
      duration: 8000,
    });
    setFormulaire(null);
  };

  const colonnes: Colonne<AgentProjete>[] = [
    {
      cle: "agent", entete: "Agent",
      rendu: (a) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Portrait photo={a.photo} prenom={a.prenom} nom={a.nom} cle={a.matricule} taille="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{a.prenom} {a.nom}</div>
            <div className="font-mono text-[10px] text-muted-foreground">{a.matricule}</div>
          </div>
        </div>
      ),
    },
    { cle: "categorie", entete: "Catégorie", visible: "md", rendu: (a) => <BadgeCategorie v={a.categorie} /> },
    {
      cle: "grade", entete: "Grade et échelon", visible: "lg",
      rendu: (a) => a.gradeId
        ? (
          <div>
            <div className="text-xs">{gradeById(a.gradeId)?.libelle ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">
              {a.echelon ? `échelon ${a.echelon}` : ""}{a.indice ? ` — indice ${a.indice}` : ""}
            </div>
          </div>
        )
        : <span className="text-xs text-muted-foreground">hors carrière statutaire</span>,
    },
    {
      cle: "entite", entete: "Affectation", visible: "lg",
      rendu: (a) => (
        <span className="text-xs text-muted-foreground" title={entiteById(a.entiteId)?.nom}>
          {entiteById(a.entiteId)?.sigle ?? "—"}
        </span>
      ),
    },
    { cle: "position", entete: "Position", visible: "xl", rendu: (a) => <BadgePosition v={a.nature} /> },
    {
      cle: "completude", entete: "Dossier", aligne: "droite",
      rendu: (a) => (
        <div className="ml-auto w-20">
          <div className="mb-1 text-right text-[11px] tabular-nums">{fmtPct(a.tauxCompletude)}</div>
          <Jauge
            valeur={a.tauxCompletude}
            teinte={a.tauxCompletude >= 75 ? "bg-emerald-500" : a.tauxCompletude >= 50 ? "bg-amber-500" : "bg-rose-500"}
          />
        </div>
      ),
    },
  ];

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Agents"
        description="Grade, échelon et affectation résultent des actes : ils ne se corrigent pas ici (§06). Inscrire un agent ouvre un acte de recrutement, qui porte son entrée au fichier."
      >
        {redacteur && entitesOuvertes.length > 0 && (
          <Button size="sm" onClick={() => setFormulaire({
            ...videAgent,
            entiteId: entitesOuvertes[0]?.id ?? user.entiteId,
          })}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Inscrire un agent
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "bleu", titre: "Agents", valeur: fmtNum(stats.total), sousTitre: `sur ${fmtNum(agents.length)} au ministère`, icon: Users },
        { ton: "cyan", titre: "Enseignants", valeur: fmtNum(stats.enseignants), sousTitre: "personnel enseignant et d'encadrement", icon: GraduationCap },
        { ton: "emeraude", titre: "En activité", valeur: fmtNum(stats.activite), sousTitre: "position administrative courante", icon: ShieldCheck },
        { ton: "violet", titre: "Dossiers complets", valeur: fmtPct(stats.completude), sousTitre: "moyenne des pièces attendues", icon: UserPlus },
      ]} />

      <TableauModule<AgentProjete>
        titre="Fichier du personnel"
        description="Cliquez un agent pour prévisualiser son dossier."
        lignes={lignes}
        colonnes={colonnes}
        recherche={(a, t) =>
          a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.toLowerCase().includes(t)}
        placeholderRecherche="Nom, prénom ou matricule…"
        filtres={[
          { cle: "entite", libelle: "Toutes les entités", options: entitesFiltrables.map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 40)}` })) },
          { cle: "categorie", libelle: "Toutes catégories", options: CATEGORIES.map((c) => ({ valeur: c, libelle: REGLES_CATEGORIE[c].libelle })) },
          { cle: "position", libelle: "Toutes positions", options: Object.entries(POSITION_LABELS).map(([k, v]) => ({ valeur: k, libelle: v as string })) },
        ]}
        valeursFiltres={filtres}
        surChangementFiltre={(c, v) => setFiltres((f) => ({ ...f, [c]: v }))}
        surSelection={setSelection}
        ligneActive={selection?.id}
        parPage={20}
      />

      <PanneauDetail
        ouvert={!!selection}
        surFermeture={() => setSelection(null)}
        titre={selection ? `${selection.prenom} ${selection.nom}` : ""}
        sousTitre={selection ? `${selection.matricule} — ${entiteById(selection.entiteId)?.nom ?? "sans affectation"}` : undefined}
        etiquette={selection && (
          <>
            <BadgeCategorie v={selection.categorie} />
            <BadgePosition v={selection.nature} />
            {selection.categorieStatutaire && <BadgeStatutaire v={selection.categorieStatutaire} />}
          </>
        )}
        actions={selection && (
          <Button size="sm" asChild>
            <Link href={`/dgarh/agents/${selection.id}`}>
              Ouvrir le dossier complet <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      >
        {selection && (
          <>
            <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
              <Portrait photo={selection.photo} prenom={selection.prenom} nom={selection.nom}
                        cle={selection.matricule} taille="lg" />
              <div className="min-w-0">
                <div className="text-base font-semibold">{selection.prenom} {selection.nom}</div>
                <div className="font-mono text-xs text-muted-foreground">{selection.matricule}</div>
                <div className="mt-1 text-xs text-muted-foreground">{selection.fonction ?? "—"}</div>
              </div>
            </div>

            <Section titre="État civil">
              <LigneInfo k="Nom et prénom" v={`${selection.prenom} ${selection.nom}`} />
              <LigneInfo k="Matricule" v={<span className="font-mono text-xs">{selection.matricule}</span>} />
              <LigneInfo k="Sexe" v={selection.sexe === "M" ? "Masculin" : "Féminin"} />
              <LigneInfo k="Né(e) le" v={`${fmtDate(selection.dateNaissance)} à ${selection.lieuNaissance}`} />
              <LigneInfo k="Âge" v={`${selection.age} ans`} />
            </Section>

            <Section titre="Situation administrative en vigueur">
              <LigneInfo k="Catégorie" v={REGLES_CATEGORIE[selection.categorie].libelle} />
              <LigneInfo k="Grade" v={gradeById(selection.gradeId)?.libelle ?? "hors carrière statutaire"} />
              <LigneInfo k="Échelon" v={selection.echelon ?? "—"} />
              <LigneInfo k="Indice" v={selection.indice ?? "—"} />
              <LigneInfo k="Position" v={POSITION_LABELS[selection.nature]} />
              <LigneInfo k="Ancienneté" v={`${selection.anciennete} ans`} />
            </Section>

            <Section titre="Affectation">
              <LigneInfo k="Entité" v={entiteById(selection.entiteId)?.nom ?? "—"} />
              <LigneInfo k="Fonction" v={<span className="text-xs">{selection.fonction ?? "—"}</span>} />
              <LigneInfo k="Chaîne" v={
                <span className="text-[11px]">
                  {selection.entiteId ? cheminDe(selection.entiteId).map((e) => e.sigle).join(" › ") : "—"}
                </span>
              } />
            </Section>

            <Section titre="Complétude du dossier">
              <Jauge
                valeur={selection.tauxCompletude}
                teinte={selection.tauxCompletude >= 75 ? "bg-emerald-500" : selection.tauxCompletude >= 50 ? "bg-amber-500" : "bg-rose-500"}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {fmtPct(selection.tauxCompletude)} des blocs attendus pour cette catégorie sont renseignés.
                Les pièces manquantes se réclament par une demande de pièce, tracée comme le reste.
              </p>
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueFormulaire
        ouvert={!!formulaire}
        surFermeture={() => setFormulaire(null)}
        titre="Inscrire un agent"
        description="L'inscription ouvre un acte de recrutement déjà notifié : c'est lui qui porte l'affectation et la position, comme pour tout autre changement (§05)."
        surValidation={enregistrer}
        validationPossible={valide}
        libelleValidation="Inscrire au fichier"
        large
      >
        {formulaire && (
          <>
            <ChampPhoto
              label="Photographie d'identité"
              valeur={formulaire.photo}
              surChangement={(v) => setFormulaire({ ...formulaire, photo: v })}
              aide="Facultative. Elle apparaîtra sur la carte professionnelle et dans l'annuaire ; à défaut, un jeton d'initiales en tient lieu."
              apercu={
                <Portrait
                  photo={formulaire.photo}
                  prenom={formulaire.prenom || "?"}
                  nom={formulaire.nom || "?"}
                  cle={formulaire.nom + formulaire.prenom || "nouveau"}
                  taille="lg" carre
                />
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Nom" obligatoire valeur={formulaire.nom}
                surChangement={(v) => setFormulaire({ ...formulaire, nom: v })} placeholder="MABIALA" />
              <ChampTexte label="Prénom" obligatoire valeur={formulaire.prenom}
                surChangement={(v) => setFormulaire({ ...formulaire, prenom: v })} placeholder="Ghislain" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ChampSelect label="Sexe" valeur={formulaire.sexe}
                surChangement={(v) => setFormulaire({ ...formulaire, sexe: v as Sexe })}
                options={[{ valeur: "M", libelle: "Masculin" }, { valeur: "F", libelle: "Féminin" }]} />
              <ChampTexte label="Date de naissance" type="date" valeur={formulaire.dateNaissance}
                surChangement={(v) => setFormulaire({ ...formulaire, dateNaissance: v })} />
              <ChampTexte label="Lieu de naissance" valeur={formulaire.lieuNaissance}
                surChangement={(v) => setFormulaire({ ...formulaire, lieuNaissance: v })} placeholder="Brazzaville" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Téléphone" valeur={formulaire.telephone}
                surChangement={(v) => setFormulaire({ ...formulaire, telephone: v })} placeholder="+242 …" />
              <ChampTexte label="Adresse électronique" type="email" valeur={formulaire.email}
                surChangement={(v) => setFormulaire({ ...formulaire, email: v })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect label="Catégorie de personnel" obligatoire valeur={formulaire.categorie}
                surChangement={(v) => setFormulaire({ ...formulaire, categorie: v as CategoriePersonnel })}
                options={CATEGORIES.map((c) => ({ valeur: c, libelle: REGLES_CATEGORIE[c].libelle }))}
                aide="Elle décide de ce que le dossier doit contenir, et si l'agent a une carrière statutaire." />
              <ChampSelect label="Affectation" obligatoire valeur={formulaire.entiteId}
                surChangement={(v) => setFormulaire({ ...formulaire, entiteId: v })}
                options={entitesOuvertes.map((e) => ({ valeur: e.id, libelle: `${e.sigle} — ${e.nom.slice(0, 44)}` }))}
                aide="Limitée à votre périmètre." />
            </div>

            {REGLES_CATEGORIE[formulaire.categorie].carriereStatutaire && (
              <ChampSelect label="Grade d'intégration" valeur={formulaire.gradeId}
                surChangement={(v) => setFormulaire({ ...formulaire, gradeId: v })}
                options={GRADES.map((g) => ({ valeur: g.id, libelle: g.libelle }))}
                aide="L'échelon et l'indice de départ en découlent ; les avancements ultérieurs se feront par acte." />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Fonction" valeur={formulaire.fonction}
                surChangement={(v) => setFormulaire({ ...formulaire, fonction: v })}
                placeholder="Agent du bureau des mouvements" />
              <ChampTexte label="Date de prise de service" type="date" obligatoire valeur={formulaire.dateEffet}
                surChangement={(v) => setFormulaire({ ...formulaire, dateEffet: v })} />
            </div>

            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Personnel enseignant</div>
                <p className="text-[11px] text-muted-foreground">
                  Change les pièces attendues au dossier et le rattachement aux états de besoins.
                </p>
              </div>
              <input
                type="checkbox" className="h-4 w-4 accent-primary"
                checked={formulaire.enseignant}
                onChange={(e) => setFormulaire({ ...formulaire, enseignant: e.target.checked })}
              />
            </label>
          </>
        )}
      </DialogueFormulaire>
    </>
  );
}
