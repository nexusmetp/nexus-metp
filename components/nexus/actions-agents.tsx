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
/**
 * Deux plafonds, et ils ne sont pas techniques.
 *
 * Une note de service qui nommerait trois mille huit cents agents n'est pas
 * une note nominative : c'est une note à tous les services, et elle s'adresse
 * alors aux services. Un fil de discussion à deux cents participants n'est pas
 * un échange : c'est une annonce, et la plateforme en a une. Au-delà, ces deux
 * boutons se ferment en disant pourquoi — plutôt que de produire une pièce que
 * personne ne relira et une adresse de trente-huit mille caractères.
 */
const NOMINATIF_MAX = 100;
const FIL_MAX = 50;

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
  const tropPourUneNote = agents.length > NOMINATIF_MAX;
  const tropPourUnFil = joignables.length > FIL_MAX;

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
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline" size="sm" className="h-8"
              disabled={tropPourUneNote} asChild={!tropPourUneNote}
            >
              {tropPourUneNote ? (
                <span><FileText className="mr-1.5 h-3.5 w-3.5" /> Note de service</span>
              ) : (
                <Link href={`/redaction?agents=${ids}&modele=NOTE_SERVICE`}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Note de service
                </Link>
              )}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {tropPourUneNote
            ? `Au-delà de ${NOMINATIF_MAX} destinataires, une note nominative n'en est plus une : `
              + "adressez-la à la structure depuis sa fiche."
            : "La note nommera chaque destinataire, matricule compris."}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline" size="sm" className="h-8"
              disabled={joignables.length === 0 || tropPourUnFil}
              asChild={joignables.length > 0 && !tropPourUnFil}
            >
              {joignables.length > 0 && !tropPourUnFil ? (
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
            : tropPourUnFil
              ? `Au-delà de ${FIL_MAX} participants, un fil n'est plus un échange mais une `
                + "annonce : passez par une note de service."
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
