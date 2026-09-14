"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ShieldQuestion, XCircle } from "lucide-react";
import { useAgents, useDeciderNomination, useNominationsEnAttente } from "@/lib/queries";
import { entiteById, libelleProfil } from "@/lib/referentiels";
import { fmtDate, joursDepuis } from "@/lib/format";
import { ChampZone, DialogueFormulaire } from "@/components/nexus/module";
import { DialogueAccesOuvert, type AccesOuvert } from "@/components/nexus/acces-ouvert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import type { Acte, Utilisateur } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Les nominations qui attendent la décision du ministre              */
/* ------------------------------------------------------------------ */

/**
 * Ce que le ministre approuve, et ce qu'il n'approuve pas.
 *
 * Pas tout : soumettre chaque geste du directeur général à une signature
 * produirait une file que personne ne vide, et un contrôle qui ne s'exerce
 * pas est pire qu'aucun contrôle — il laisse croire qu'une vérification a eu
 * lieu. Ce qui remonte ici, ce sont les **nominations à la tête d'une
 * structure**, parce que c'est là que l'autorité du ministre s'exerce
 * réellement. Le reste — inscrire un agent, ouvrir un bureau, enregistrer une
 * arrivée — relève de la délégation du directeur général, et le journal
 * d'audit en garde la trace.
 *
 * Tant que la décision n'est pas prise, **rien ne s'est produit** : aucun
 * compte n'est ouvert, aucune habilitation accordée, aucune prise de fonction
 * enregistrée. C'est la règle du dépôt et non une exception : l'effet d'un
 * acte s'applique à sa notification.
 */
export function Approbations({ utilisateur }: { utilisateur: Utilisateur }) {
  const { data: enAttente = [] } = useNominationsEnAttente();
  const { data: agents = [] } = useAgents();
  const decider = useDeciderNomination();

  const [demande, setDemande] = useState<{ acte: Acte; sens: "APPROUVER" | "REFUSER" } | null>(null);
  const [motif, setMotif] = useState("");
  const [acces, setAcces] = useState<AccesOuvert | null>(null);

  const parAgent = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const trancher = async () => {
    if (!demande) return;
    try {
      const r = await decider.mutateAsync({
        acte: demande.acte,
        decision: demande.sens,
        motif: motif.trim(),
        utilisateur,
      });
      setDemande(null);
      setMotif("");
      if (r.decision === "APPROUVER" && r.compte && r.provisoire) {
        const e = entiteById(demande.acte.cible?.entiteId);
        setAcces({
          nom: r.compte.nomComplet,
          identifiant: r.compte.email,
          provisoire: r.provisoire,
          qualite: `${libelleProfil(r.compte.role)} — ${e?.sigle ?? ""}`,
        });
      } else {
        toast.success("Nomination refusée", {
          description: "L'acte est rejeté avec son motif. Aucun accès n'avait été ouvert.",
        });
      }
    } catch (e) {
      toast.error("Décision impossible", {
        description: e instanceof Error ? e.message : "Opération refusée.",
        duration: 9000,
      });
    }
  };

  return (
    <>
      <Card className={enAttente.length ? "border-amber-500/40" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldQuestion className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            Nominations soumises à votre approbation
            {enAttente.length > 0 && (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-500">
                {enAttente.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Nommer à la tête d&apos;une direction engage le ministère : l&apos;acte est établi par
            la DGARH et attend votre signature. Tant que vous n&apos;avez pas tranché, rien ne
            s&apos;est produit — ni compte, ni habilitation, ni prise de fonction. Ce qui relève de
            la gestion courante ne remonte pas ici : c&apos;est la délégation du directeur général,
            et elle se vérifie au journal.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {enAttente.length === 0
            ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                Aucune nomination en attente.
              </p>
            )
            : enAttente.map((a) => {
              const agent = parAgent.get(a.agentId);
              const entite = entiteById(a.cible?.entiteId);
              const age = joursDepuis(a.dateCreation);
              return (
                <div key={a.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold">
                        {agent ? `${agent.prenom} ${agent.nom.toUpperCase()}` : a.agentId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {libelleProfil(a.cible?.profil ?? "")} — {entite?.sigle ?? "—"}
                        {entite && <span className="ml-1">· {entite.nom}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                      <div>{a.reference}</div>
                      <div>
                        établi par {a.initiateur} · {fmtDate(a.dateCreation)}
                        {age > 7 && (
                          <span className="ml-1 text-amber-600 dark:text-amber-500">
                            — en attente depuis {age} jours
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {a.cible?.motif && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                      <span className="font-medium">Au titre de :</span> {a.cible.motif}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => { setDemande({ acte: a, sens: "APPROUVER" }); setMotif(""); }}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approuver
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => { setDemande({ acte: a, sens: "REFUSER" }); setMotif(""); }}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" /> Refuser
                    </Button>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      <DialogueFormulaire
        ouvert={!!demande}
        surFermeture={() => { setDemande(null); setMotif(""); }}
        titre={demande?.sens === "APPROUVER" ? "Approuver la nomination" : "Refuser la nomination"}
        description={demande
          ? `${demande.acte.objet} — ${demande.acte.reference}`
          : ""}
        surValidation={trancher}
        libelleValidation={demande?.sens === "APPROUVER" ? "Approuver et notifier" : "Refuser"}
        validationPossible={motif.trim().length >= 10}
      >
        <ChampZone
          label="Votre décision, au titre de quoi" valeur={motif} surChangement={setMotif}
          lignes={3} obligatoire
          placeholder={demande?.sens === "APPROUVER"
            ? "Conforme à la proposition du directeur général du …"
            : "Motif du refus : profil, périmètre, opportunité…"}
          aide={demande?.sens === "APPROUVER"
            ? "L'acte est notifié : le compte s'ouvre, l'habilitation prend effet, et vous recevez les identifiants à transmettre — une seule fois."
            : "L'acte est rejeté et le dossier provisoire retiré. Le motif reste au journal : c'est lui qui permettra de reprendre la proposition."}
        />
      </DialogueFormulaire>

      <DialogueAccesOuvert acces={acces} surFermeture={() => setAcces(null)} />
    </>
  );
}
