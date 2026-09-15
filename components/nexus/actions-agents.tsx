"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, FileText, MessageSquare } from "lucide-react";
import { corpsById, entiteById, gradeById } from "@/lib/referentiels";
import { POSITION_LABELS, REGLES_CATEGORIE } from "@/lib/referentiels";
import { copier, telecharger, versCSV } from "@/lib/export";
import { fmtNum } from "@/lib/format";
import { useUtilisateurs } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AgentProjete } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Ce qu'on fait d'une sélection d'agents                              */
/* ------------------------------------------------------------------ */

/**
 * Trois gestes, et aucun qui touche à la situation d'un agent.
 *
 * Le fichier du personnel se travaille par lots — une note à quarante
 * enseignants d'un département, la liste d'un service à joindre à un rapport,
 * un fil ouvert avec les chefs de bureau concernés. Jusqu'ici il fallait les
 * reprendre un par un, et la DGARH le faisait donc hors de la plateforme.
 *
 * **Ce qui n'est pas ici l'est délibérément.** Aucune affectation, aucune
 * promotion, aucun congé groupés : chacun de ces effets suppose un acte
 * individuel, daté, signé et notifié — c'est la règle du domaine, et un bouton
 * qui en produirait quarante d'un coup fabriquerait quarante actes que
 * personne n'a relus. Une note de service organise, elle ne décide pas de la
 * situation d'un agent : c'est pourquoi elle, elle a sa place.
 */
export function ActionsAgents({ agents }: { agents: AgentProjete[] }) {
  const { data: comptes = [] } = useUtilisateurs();
  const [enCours, setEnCours] = useState(false);

  /* Qui, dans la sélection, a un compte ouvert : on n'écrit qu'à ceux-là, et
     l'écran dit combien restent injoignables plutôt que de le taire. */
  const joignables = useMemo(() => {
    const parAgent = new Map(
      comptes.filter((c) => c.actif !== false && c.agentId).map((c) => [c.agentId!, c]));
    return agents.map((a) => parAgent.get(a.id)).filter(Boolean) as typeof comptes;
  }, [agents, comptes]);

  const muets = agents.length - joignables.length;
  const ids = agents.map((a) => a.id).join(",");

  const exporter = async () => {
    setEnCours(true);
    const csv = versCSV(
      ["Matricule", "Nom", "Prénom", "Sexe", "Date de naissance", "Régime", "Corps",
        "Grade", "Échelon", "Indice", "Position", "Structure", "Fonction", "Complétude"],
      agents.map((a) => {
        const grade = gradeById(a.gradeId);
        return [
          a.matricule, a.nom, a.prenom, a.sexe, a.dateNaissance,
          REGLES_CATEGORIE[a.categorie]?.libelle ?? a.categorie,
          corpsById(grade?.corpsId)?.libelle ?? "",
          grade?.libelle ?? "",
          a.echelon ?? "", a.indice ?? "",
          POSITION_LABELS[a.nature] ?? a.nature,
          entiteById(a.entiteId ?? "")?.nom ?? "",
          a.fonction ?? "",
          `${a.tauxCompletude} %`,
        ];
      })
    );
    const nom = `personnel-selection-${new Date().toISOString().slice(0, 10)}.csv`;
    const issue = await telecharger(nom, csv);
    setEnCours(false);
    if (issue === "enregistre") {
      toast.success(`${fmtNum(agents.length)} agents exportés`, { description: nom });
      return;
    }
    /* Le téléchargement est inerte dans certains conteneurs : le presse-papiers
       est le second chemin, jamais un message d'échec sans issue. */
    const colle = await copier(csv);
    toast[colle ? "success" : "error"](
      colle ? "Liste copiée dans le presse-papiers" : "Export impossible sur ce poste",
      { description: colle ? "Collez-la dans un tableur." : "Aucun des deux chemins n'a abouti." });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Button variant="outline" size="sm" className="h-8" asChild>
        <Link href={`/redaction?agents=${ids}&modele=NOTE_SERVICE`}>
          <FileText className="mr-1.5 h-3.5 w-3.5" /> Note de service
        </Link>
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline" size="sm" className="h-8"
              disabled={joignables.length === 0}
              asChild={joignables.length > 0}
            >
              {joignables.length > 0 ? (
                <Link href={`/messagerie?groupe=${joignables.map((c) => c.id).join(",")}`}>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Écrire — {fmtNum(joignables.length)}
                </Link>
              ) : (
                <span><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Écrire</span>
              )}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {joignables.length === 0
            ? "Aucun agent de la sélection n'a de compte ouvert."
            : muets > 0
              ? `${fmtNum(muets)} agent${muets > 1 ? "s" : ""} sans compte ne recevra${muets > 1 ? "ont" : ""} rien.`
              : "Ouvre un fil avec la sélection."}
        </TooltipContent>
      </Tooltip>

      <Button variant="outline" size="sm" className="h-8" onClick={exporter} disabled={enCours}>
        <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter
      </Button>
    </TooltipProvider>
  );
}
