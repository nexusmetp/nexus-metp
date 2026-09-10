"use client";

import { useMemo, useState } from "react";
import { FileOutput, Search } from "lucide-react";
import { MODELES, type CleModele, type ContexteDocument } from "@/lib/documents";
import { useAgentsProjetes, useActes, useConges } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { DGARH_ID, entiteById, peut } from "@/lib/referentiels";
import { descendantsDe } from "@/lib/referentiels";
import { VisionneuseDocument } from "@/components/nexus/document";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FAMILLES = ["Actes", "Attestations", "États", "Correspondance"] as const;

/**
 * Bibliothèque des modèles.
 *
 * Chaque modèle s'ouvre sur un exemple réel — le premier sujet disponible —
 * plutôt que sur une page de champs vides : on juge un modèle sur ce qu'il
 * produit, pas sur sa description.
 */
export function Bibliotheque() {
  const user = useAuth((s) => s.user)!;
  const { data: agents = [] } = useAgentsProjetes();
  const { data: actes = [] } = useActes();
  const { data: conges = [] } = useConges();
  const [recherche, setRecherche] = useState("");
  const [famille, setFamille] = useState<string>("");
  const [choisi, setChoisi] = useState<CleModele | null>(null);

  /** Un sujet d'exemple par source, pour que l'aperçu soit rempli. */
  const contexte = useMemo<ContexteDocument>(() => {
    const agent = agents.find((a) => a.id === user.agentId) ?? agents[0];
    const acte = actes.find((a) => a.statut === "SIGNE" || a.statut === "NOTIFIE") ?? actes[0];
    const entite = entiteById(DGARH_ID) ?? undefined;
    const conge = conges.find((c) => c.statut === "ACCORDE") ?? conges[0];
    const effectifs = entite
      ? descendantsDe(entite.id)
          .filter((e) => e.parentId === entite.id)
          .map((e) => {
            const branche = descendantsDe(e.id).map((d) => d.id);
            const direct = agents.filter((a) => a.entiteId === e.id).length;
            const total = agents.filter((a) => a.entiteId && branche.includes(a.entiteId)).length;
            return { entite: e, direct, total };
          })
      : [];
    return {
      agent, acte, entite, conge, effectifs,
      saisie: { objet: "Objet à préciser", corps: "Corps de la note à rédiger.", destinataire: "Tous services" },
      signataire: { nom: user.nomComplet },
    };
  }, [agents, actes, conges, user]);

  const visibles = useMemo(() => {
    const t = recherche.trim().toLowerCase();
    return MODELES.filter((m) => peut(user.role, m.module, "R"))
      .filter((m) => !famille || m.famille === famille)
      .filter((m) => !t || m.libelle.toLowerCase().includes(t) || m.usage.toLowerCase().includes(t));
  }, [recherche, famille, user.role]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un modèle…"
            className="pl-8"
          />
        </div>
        <Button variant={famille ? "ghost" : "secondary"} size="sm" onClick={() => setFamille("")}>
          Toutes
        </Button>
        {FAMILLES.map((f) => (
          <Button
            key={f}
            variant={famille === f ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFamille(famille === f ? "" : f)}
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((m) => {
          const redacteur = peut(user.role, m.module, "W");
          return (
            <Card
              key={m.cle}
              onClick={() => setChoisi(m.cle)}
              className={cn(
                "group cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              )}
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <FileOutput className="h-4 w-4 shrink-0 text-primary" />
                  <Badge variant="outline" className="text-[10px]">{m.famille}</Badge>
                </div>
                <div className="text-sm font-semibold leading-tight">{m.libelle}</div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{m.usage}</p>
                <div className="pt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {redacteur ? "Éditer un exemple" : "Consultation seule"}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!visibles.length && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucun modèle ne correspond à cette recherche.
            </CardContent>
          </Card>
        )}
      </div>

      <VisionneuseDocument
        ouvert={!!choisi}
        surFermeture={() => setChoisi(null)}
        cle={choisi}
        contexte={contexte}
      />
    </>
  );
}
