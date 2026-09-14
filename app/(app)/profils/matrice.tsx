"use client";

import { MODULE_LABELS, type ModuleKey } from "@/lib/referentiels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* La matrice, réglable — module par module                            */
/* ------------------------------------------------------------------ */

/** Les trois états d'un droit. Absent du dictionnaire = aucun accès. */
export type Niveau = "aucun" | "R" | "W";

const ETIQUETTES: Record<Niveau, string> = {
  aucun: "Aucun",
  R: "Lecture",
  W: "Écriture",
};

/**
 * Les modules groupés comme la barre latérale les présente.
 *
 * Une liste de trente-six cases à cocher sans ordre est illisible, et
 * l'administrateur qui règle un profil cherche « ce qui touche au personnel »,
 * pas la trente et unième ligne alphabétique.
 */
const GROUPES: { titre: string; modules: ModuleKey[] }[] = [
  { titre: "Pilotage", modules: ["ministre", "dgarh", "pilotage", "national", "rapports"] },
  { titre: "Organisation", modules: ["organisation", "organigramme", "delegations"] },
  {
    titre: "Personnel",
    modules: ["agents", "presences", "sorties", "annuaire", "cartes"],
  },
  {
    titre: "Dossiers et actes",
    modules: ["actes", "carrieres", "conges", "formations", "contentieux"],
  },
  {
    titre: "Emplois et effectifs",
    modules: ["postes", "besoins", "recrutement", "remuneration", "retraite"],
  },
  { titre: "Documentation", modules: ["documents", "redaction", "archives", "textes", "aide"] },
  { titre: "Échanges", modules: ["messagerie", "tickets", "annonces"] },
  { titre: "Mon espace", modules: ["mon-dossier"] },
  { titre: "Supervision", modules: ["administration", "profils", "referentiels", "journal"] },
];

const COULEUR: Record<Niveau, string> = {
  aucun: "text-muted-foreground",
  R: "bg-sky-500/12 text-sky-700 dark:text-sky-400 border-sky-500/30",
  W: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
};

/** Le plus fort des deux droits ; l'écriture emporte toujours la lecture. */
const plusFort = (a: Niveau, b: Niveau): Niveau =>
  a === "W" || b === "W" ? "W" : a === "R" || b === "R" ? "R" : "aucun";

/**
 * Le réglage d'un profil, en lecture ou en écriture.
 *
 * `surChangement` absent = la matrice est en consultation. C'est ainsi qu'un
 * profil livré s'affiche : on le lit entièrement, on n'y touche pas, et le
 * même composant sert aux deux cas — sans quoi les deux vues divergeraient.
 *
 * `socle` porte les droits que **tout agent** possède déjà. Ils s'affichent
 * ici, marqués et non décochables, et c'est le point : sans cela, l'écran
 * montrerait « Aucun » sur un module que le profil ouvre malgré tout, et
 * l'administrateur croirait avoir fermé une porte qui reste ouverte. On ne
 * donne pas moins que le socle — on ne descend pas un chef de service
 * au-dessous d'un agent.
 */
export function MatriceProfil({ droits, socle = {}, surChangement }: {
  droits: Record<string, "R" | "W">;
  socle?: Record<string, "R" | "W">;
  surChangement?: (mod: ModuleKey, niveau: Niveau) => void;
}) {
  const lectureSeule = !surChangement;

  return (
    <div className="space-y-5">
      {GROUPES.map((g) => (
        <section key={g.titre} className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.titre}
          </h4>
          <div className="space-y-1">
            {g.modules.map((m) => {
              const dessous: Niveau = socle[m] ?? "aucun";
              const niveau = plusFort(droits[m] ?? "aucun", dessous);
              return (
                <div
                  key={m}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {MODULE_LABELS[m]}
                    {dessous !== "aucun" && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        socle agent
                      </span>
                    )}
                  </span>
                  {lectureSeule
                    ? (
                      <span className={cn(
                        "shrink-0 rounded border px-2 py-0.5 text-[11px] font-medium",
                        niveau === "aucun" ? "border-transparent" : COULEUR[niveau]
                      )}>
                        {ETIQUETTES[niveau]}
                      </span>
                    )
                    : (
                      <div className="flex shrink-0 gap-1">
                        {(["aucun", "R", "W"] as Niveau[]).map((n) => {
                          /* Un cran déjà couvert par le socle ne se retire
                             pas : le bouton reste visible — la règle doit
                             s'expliquer d'elle-même — mais il ne ment pas. */
                          const sousLeSocle = plusFort(n, dessous) !== n;
                          return (
                            <Button
                              key={n}
                              type="button"
                              size="sm"
                              disabled={sousLeSocle}
                              title={sousLeSocle
                                ? `Tout agent du ministère a déjà ce module en ${ETIQUETTES[dessous].toLowerCase()} : un profil ajoute, il ne retranche pas.`
                                : undefined}
                              variant={niveau === n ? "default" : "outline"}
                              className="h-7 px-2.5 text-[11px]"
                              onClick={() => surChangement(m, n)}
                            >
                              {ETIQUETTES[n]}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Applique un changement sans laisser de « aucun » dans le dictionnaire.
 *
 * Un droit absent et un droit à « aucun » doivent rester la même chose :
 * `peut()` teste la présence de la clé, et une clé posée à `"aucun"` la
 * ferait répondre vrai. La faute serait invisible — le profil ouvrirait un
 * module que l'écran montre pourtant comme fermé.
 */
export function appliquer(
  droits: Record<string, "R" | "W">,
  mod: ModuleKey,
  niveau: Niveau,
  socle: Record<string, "R" | "W"> = {}
): Record<string, "R" | "W"> {
  const suite = { ...droits };
  /* Ce que le socle donne déjà ne se recopie pas dans le profil : la matrice
     enregistrée ne garde que ce qu'il **ajoute**. Sans cela, corriger le socle
     plus tard laisserait derrière lui autant de copies périmées qu'il y a de
     profils, et personne ne saurait plus lequel fait foi. */
  if (niveau === "aucun" || plusFort(niveau, socle[mod] ?? "aucun") !== niveau) delete suite[mod];
  else suite[mod] = niveau;
  return suite;
}
