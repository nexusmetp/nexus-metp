"use client";

import { Building2, Eye, PenLine, ScrollText } from "lucide-react";
import {
  NIVEAU_LABELS, ROLE_LABELS, cheminDe, entiteById,
  perimetreAdministrable, perimetreVisible, porteeDe,
} from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import type { Utilisateur } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* ------------------------------------------------------------------ */
/* Où suis-je, et jusqu'où je vois                                     */
/* ------------------------------------------------------------------ */

/**
 * Le rattachement, dit en toutes lettres — et il ne l'était pas.
 *
 * La barre du haut affichait un sigle seul : « DAFM ». Pour qui connaît la
 * maison, c'est assez ; pour un agent qui ouvre la plateforme, cela ne dit ni
 * quelle direction c'est, ni de qui elle relève, ni pourquoi telle liste
 * s'arrête là où elle s'arrête. Un cloisonnement qu'on ne voit pas ressemble
 * à une panne : l'agent qui cherche un collègue d'une autre direction et ne
 * le trouve pas conclut que le fichier est incomplet.
 *
 * Trois choses, donc, et dans cet ordre : **où je suis** (la chaîne entière,
 * du ministère à mon bureau), **ce que j'y suis** (ma fonction et mon profil),
 * et **jusqu'où je vois** — avec, quand la portée dépasse la branche, le texte
 * qui la donne. C'est la seule façon de rendre la règle lisible sans obliger
 * personne à lire un arrêté.
 */
export function Rattachement({ utilisateur }: { utilisateur: Utilisateur }) {
  const entite = entiteById(utilisateur.entiteId);
  const chaine = cheminDe(utilisateur.entiteId);
  const vus = perimetreVisible(utilisateur);
  const administres = perimetreAdministrable(utilisateur);
  const portee = porteeDe(utilisateur.entiteId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Mon rattachement"
          className="hidden md:inline-flex"
        >
          <Badge
            variant="outline"
            className="cursor-pointer border-primary/30 bg-primary/5 text-[10px] text-primary transition hover:bg-primary/10"
          >
            {entite?.sigle ?? "METP"}
          </Badge>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 text-xs">
        <div className="border-b bg-muted/40 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3 w-3" />
            Mon rattachement
          </div>
          {/* La chaîne complète : c'est elle qui situe, pas le sigle seul. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-tight">
            {chaine.map((e, i) => (
              <span key={e.id} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/60">›</span>}
                <span className={i === chaine.length - 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"}>{e.sigle}</span>
              </span>
            ))}
          </div>
          {entite && (
            <div className="mt-1 leading-snug text-muted-foreground">
              {entite.nom}
              <span className="ml-1 text-[10px] opacity-70">
                · {NIVEAU_LABELS[entite.niveau] ?? entite.niveau}
              </span>
            </div>
          )}
        </div>

        <dl className="divide-y">
          <Ligne
            icone={<Building2 className="h-3.5 w-3.5" />}
            terme="Ma fonction"
            valeur={utilisateur.fonction || ROLE_LABELS[utilisateur.role] || "—"}
            detail={utilisateur.fonction ? ROLE_LABELS[utilisateur.role] : undefined}
          />
          <Ligne
            icone={<Eye className="h-3.5 w-3.5" />}
            terme="Je consulte"
            valeur={vus === null
              ? "Tout le ministère"
              : `Ma structure et ce qui en dépend — ${fmtNum(vus.size)} entité${vus.size > 1 ? "s" : ""}`}
            detail={vus === null ? undefined : "Le personnel des autres structures ne m'est pas accessible."}
          />
          <Ligne
            icone={<PenLine className="h-3.5 w-3.5" />}
            terme="J'administre"
            valeur={administres === null
              ? "Tout le ministère"
              : `${fmtNum(administres.size)} entité${administres.size > 1 ? "s" : ""}`}
            detail="Créer une entité, y désigner un responsable, y inscrire du personnel."
          />
          {/* Le texte ne s'affiche que là où il y a quelque chose à fonder :
              une portée ordinaire n'a pas besoin d'être justifiée. */}
          {portee.reference && (
            <Ligne
              icone={<ScrollText className="h-3.5 w-3.5" />}
              terme="Fondement"
              valeur={portee.motif}
              detail={portee.reference}
            />
          )}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function Ligne({ icone, terme, valeur, detail }: {
  icone: React.ReactNode;
  terme: string;
  valeur: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-2.5 px-3 py-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icone}</span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{terme}</dt>
        <dd className="leading-snug">{valeur}</dd>
        {detail && <dd className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{detail}</dd>}
      </div>
    </div>
  );
}
