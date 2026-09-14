"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, GitBranch, Loader2, Search } from "lucide-react";
import { useAgentsProjetes, useCreerActe } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  CIRCUIT_ACTE, ENTITES, cheminDe, entiteById, perimetreVisible, typeActeById,
} from "@/lib/referentiels";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Acte, EtapeActe } from "@/lib/types";

const DESTINATIONS = ENTITES.filter((e) =>
  ["DIRECTION_GENERALE", "DIRECTION", "SERVICE", "BUREAU", "SECRETARIAT", "DIRECTION_DEPARTEMENTALE"].includes(e.niveau)
);

const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dansNJours = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export default function NouvelleMutationPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user)!;
  const { data: agents, pret } = useAgentsProjetes();
  const creer = useCreerActe();

  const [q, setQ] = useState("");
  const [agentId, setAgentId] = useState("");
  const [entiteCible, setEntiteCible] = useState("");
  const [fonction, setFonction] = useState("");
  const [dateEffet, setDateEffet] = useState(dansNJours(30));
  const [motif, setMotif] = useState("");

  /* On n'ouvre un acte que pour un agent qu'on administre. Une recherche qui
     répond sur tout le fichier ferait proposer une mutation au nom d'une
     direction voisine — et le formulaire ne dirait rien d'anormal. */
  const perimetreDroit = useMemo(() => perimetreVisible(user), [user.role, user.entiteId]);

  const administres = useMemo(
    () => agents.filter((a) => !perimetreDroit || (a.entiteId && perimetreDroit.has(a.entiteId))),
    [agents, perimetreDroit]
  );

  const resultats = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return administres
      .filter((a) =>
        a.nom.toLowerCase().includes(t) || a.prenom.toLowerCase().includes(t) || a.matricule.includes(t)
      )
      .slice(0, 6);
  }, [administres, q]);

  const agent = useMemo(() => administres.find((a) => a.id === agentId), [administres, agentId]);
  const origine = entiteById(agent?.entiteId);
  const destination = entiteById(entiteCible);

  const memeEntite = !!entiteCible && entiteCible === agent?.entiteId;
  const complet = !!agent && !!entiteCible && !memeEntite && !!dateEffet;

  const soumettre = () => {
    if (!complet || !agent) return;
    const modele = typeActeById("MUTATION")!;
    const id = `ACT-M${Date.now().toString(36).toUpperCase()}`;
    const etapes: EtapeActe[] = CIRCUIT_ACTE.map((s, k) => ({
      id: `${id}-E${k}`,
      ordre: s.ordre,
      libelle: s.libelle,
      entiteId: s.entiteId,
      statut: "A_VENIR",
    }));

    const acte: Acte = {
      id,
      reference: `ARR-${String(Math.floor(Math.random() * 9000) + 1000)}/METP/DGARH-${new Date().getFullYear()}`,
      type: "MUTATION",
      objet: `Mutation — ${agent.prenom} ${agent.nom}`,
      agentId: agent.id,
      entiteInstructriceId: modele.bureauId,
      statut: "BROUILLON",
      dateCreation: aujourdhui(),
      dateEcheance: dansNJours(15),
      initiateur: user.nomComplet,
      cible: {
        entiteId: entiteCible,
        fonction: fonction.trim() || `Agent — ${destination?.sigle}`,
        dateEffet,
        motif: motif.trim() || undefined,
      },
      etapes,
      pieces: [
        { id: `${id}-P1`, nom: "Demande de mutation.pdf", categorie: "Demande", date: aujourdhui(), taille: "180 Ko" },
      ],
    };

    creer.mutate(acte, {
      onSuccess: () => {
        toast.success("Dossier ouvert en brouillon", {
          description: "Soumettez-le pour lancer le circuit d'instruction.",
        });
        router.push(`/dgarh/actes/${id}`);
      },
      onError: () => toast.error("Création impossible"),
    });
  };

  if (!pret) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <PageHeader
        titre="Nouvelle demande de mutation"
        description="Ouvre un acte en brouillon. Rien ne change dans le dossier de l'agent avant la notification de l'acte signé (§08, §09)."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dgarh/actes"><ArrowLeft className="mr-2 h-4 w-4" /> Annuler</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. Agent concerné</CardTitle>
              <CardDescription>Recherche par nom, prénom ou matricule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setAgentId(""); }}
                  placeholder="Deux caractères au minimum…"
                  className="h-11 pl-9"
                />
              </div>

              {resultats.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setAgentId(a.id); setQ(`${a.prenom} ${a.nom}`); }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.prenom} {a.nom}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.matricule} · {entiteById(a.entiteId)?.sigle ?? "sans affectation"}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{a.fonction ?? "—"}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className={!agent ? "opacity-50" : undefined}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Destination</CardTitle>
              <CardDescription>Entité d'accueil et fonction proposée</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Entité d'accueil</Label>
                <Select value={entiteCible} onValueChange={setEntiteCible} disabled={!agent}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choisir une entité…" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {DESTINATIONS.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.sigle} — {e.nom.slice(0, 48)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {memeEntite && (
                  <p className="text-xs font-medium text-amber-600">
                    L'agent y est déjà affecté : une mutation suppose un changement d'entité.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fonction">Fonction proposée</Label>
                <Input
                  id="fonction" value={fonction} onChange={(e) => setFonction(e.target.value)}
                  placeholder={destination ? `Agent — ${destination.sigle}` : "Laisser vide pour la valeur par défaut"}
                  className="h-11" disabled={!agent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateEffet">Date d'effet</Label>
                <Input
                  id="dateEffet" type="date" value={dateEffet}
                  onChange={(e) => setDateEffet(e.target.value)} className="h-11" disabled={!agent}
                />
                <p className="text-xs text-muted-foreground">
                  Distincte de la date de signature : c'est elle qui borne l'ancienne affectation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motif">Motif</Label>
                <Textarea
                  id="motif" value={motif} onChange={(e) => setMotif(e.target.value)}
                  placeholder="Nécessité de service, rapprochement familial, redéploiement…"
                  className="min-h-[80px]" disabled={!agent}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4 text-primary" /> Effet sur le dossier
              </CardTitle>
              <CardDescription>Ce que la notification produira, si l'acte va au bout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!agent ? (
                <p className="text-muted-foreground">Sélectionnez un agent pour voir l'effet.</p>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground">Affectation actuelle</div>
                    <div className="font-medium">{origine?.nom ?? "Sans affectation"}</div>
                    <div className="text-xs text-muted-foreground">
                      {agent.entiteId ? cheminDe(agent.entiteId).map((e) => e.sigle).join(" › ") : "—"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Sera clôturée au {fmtDate(dateEffet)}
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="text-xs text-muted-foreground">Nouvelle affectation</div>
                    <div className="font-medium">{destination?.nom ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {entiteCible ? cheminDe(entiteCible).map((e) => e.sigle).join(" › ") : "—"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ouverte au {fmtDate(dateEffet)}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Circuit à parcourir</CardTitle>
              <CardDescription>Six étapes, délai cible 15 jours</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-xs">
                {CIRCUIT_ACTE.map((s) => (
                  <li key={s.ordre} className="flex gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold tabular-nums">
                      {s.ordre}
                    </span>
                    <div>
                      <div className="font-medium">{s.libelle}</div>
                      <div className="text-muted-foreground">{entiteById(s.entiteId)?.sigle}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" disabled={!complet || creer.isPending} onClick={soumettre}>
            {creer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ouvrir le dossier
          </Button>
        </div>
      </div>
    </>
  );
}
