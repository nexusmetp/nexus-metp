"use client";

import { useMemo, useState } from "react";
import { BookLock, KeyRound, Layers, ShieldCheck } from "lucide-react";
import {
  useBasculerProfil, useEnregistrerProfil, useProfils, useSupprimerProfil, useUtilisateurs,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import {
  MODULES_PROFIL, PROFILS, compterDroits, heriteDuSocle, peut, porteursDe,
  profilParCode, socleDe,
} from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import {
  Badge, Colonne, LigneInfo, PanneauDetail, RangeeKpi, Section, TableauModule,
} from "@/components/nexus/module";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MatriceProfil } from "./matrice";
import { DialogueBascule, DialogueProfil } from "./formulaire";
import type { ProfilAcces } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Profils d'accès                                                     */
/*                                                                     */
/* L'écran qui manquait à l'administrateur système. La plateforme lui  */
/* donnait la matrice des droits à *lire* — un tableau décrivant une   */
/* règle que son lecteur ne pouvait pas régler — et créer un profil    */
/* demandait de modifier le code et de redéployer.                     */
/*                                                                     */
/* Tout est profil d'accès ici, ministre compris. Il n'y a pas deux    */
/* régimes : pouvoir inventer « chargé du courrier » mais pas corriger */
/* « directeur général » serait une distinction sans fondement.        */
/*                                                                     */
/* Un profil est prédéfini au centre : deux secrétaires de deux        */
/* directions font le même métier, leurs droits ne doivent pas         */
/* dépendre du service qui les a nommés. C'est un type, pas un poste — */
/* plusieurs agents d'une même direction le portent, et il s'attache   */
/* aux agents selon leurs responsabilités.                             */
/* ------------------------------------------------------------------ */

export default function ProfilsPage() {
  const user = useAuth((s) => s.user)!;
  const { toast } = useToast();
  const redacteur = peut(user.role, "profils", "W");
  const { data: maison = [], isLoading } = useProfils();
  const { data: comptes = [] } = useUtilisateurs();

  const enregistrer = useEnregistrerProfil();
  const basculer = useBasculerProfil();
  const supprimer = useSupprimerProfil();

  const [filtres, setFiltres] = useState<Record<string, string>>({ origine: "all" });
  const [selection, setSelection] = useState<string | null>(null);
  const [formulaire, setFormulaire] = useState<{ profil: ProfilAcces | null } | null>(null);
  const [bascule, setBascule] = useState<ProfilAcces | null>(null);

  /* On lit le catalogue hydraté plutôt que la seule table : il porte les
     treize livrés, qui vivent dans le code et n'ont pas de ligne en base. */
  const lignes = useMemo(() => [...PROFILS].sort(
    (a, b) => b.rang - a.rang || a.libelle.localeCompare(b.libelle, "fr")
  ), [maison]);

  const porteursParCode = useMemo(() => {
    const m = new Map<string, number>();
    comptes.forEach((c) => m.set(c.role, (m.get(c.role) ?? 0) + 1));
    return m;
  }, [comptes]);

  const visibles = useMemo(() => lignes.filter((p) => {
    if (filtres.origine === "livre") return p.origine === "LIVRE";
    if (filtres.origine === "maison") return p.origine === "MAISON";
    if (filtres.origine === "ferme") return !p.actif;
    if (filtres.origine === "portes") return (porteursParCode.get(p.code) ?? 0) > 0;
    return true;
  }), [lignes, filtres, porteursParCode]);

  const active = selection ? profilParCode(selection) ?? null : null;
  const porteursActifs = active ? porteursDe(active.code, comptes) : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const echec = (e: unknown) =>
    toast({
      title: "Geste refusé",
      description: e instanceof Error ? e.message : "Opération impossible.",
      variant: "destructive",
    });

  const nbMaison = lignes.filter((p) => p.origine === "MAISON").length;
  const sansPorteur = lignes.filter((p) => (porteursParCode.get(p.code) ?? 0) === 0).length;

  const colonnes: Colonne<ProfilAcces>[] = [
    {
      cle: "profil", entete: "Profil", visible: "toujours",
      rendu: (p) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{p.libelle}</span>
            {!p.actif && <Badge variant="outline" className="bg-slate-500/12 text-slate-500 border-slate-500/20">Fermé</Badge>}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{p.code}</div>
        </div>
      ),
    },
    {
      cle: "origine", entete: "Origine", visible: "md",
      rendu: (p) => (p.origine === "LIVRE"
        ? <Badge variant="outline" className="bg-indigo-500/12 text-indigo-600 border-indigo-500/20">Livré</Badge>
        : <Badge variant="outline" className="bg-amber-500/12 text-amber-600 border-amber-500/20">Maison</Badge>),
    },
    {
      cle: "rang", entete: "Rang", aligne: "droite", visible: "md",
      rendu: (p) => (
        <span className={p.rang === 0 ? "text-xs text-muted-foreground" : "tabular-nums text-sm"}>
          {p.rang === 0 ? "n'administre personne" : p.rang}
        </span>
      ),
    },
    {
      cle: "droits", entete: "Droits ouverts", aligne: "droite", visible: "lg",
      rendu: (p) => {
        const { lecture, ecriture } = compterDroits(p);
        return (
          <span className="text-xs text-muted-foreground">
            {ecriture} en écriture · {lecture} en lecture
          </span>
        );
      },
    },
    {
      cle: "porteurs", entete: "Comptes", aligne: "droite",
      rendu: (p) => {
        const n = porteursParCode.get(p.code) ?? 0;
        return (
          <span className={n === 0 ? "text-xs text-muted-foreground" : "tabular-nums text-sm"}>
            {n === 0 ? "aucun" : fmtNum(n)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Profils d'accès"
        description={
          "Ce qu'un profil ouvre, module par module, et qui peut l'attribuer. Tous se règlent ici, "
          + "du ministre au chargé du courrier, et valent pour tout le ministère : deux secrétaires "
          + "de deux directions font le même métier."
        }
      >
        {redacteur && (
          <Button onClick={() => setFormulaire({ profil: null })}>
            <Layers className="mr-1.5 h-4 w-4" /> Créer un profil
          </Button>
        )}
      </PageHeader>

      <RangeeKpi tuiles={[
        {
          ton: "indigo", titre: "Profils au catalogue", valeur: fmtNum(lignes.length), icon: ShieldCheck,
          sousTitre: `${fmtNum(lignes.length - nbMaison)} livrés, ${fmtNum(nbMaison)} de la maison`,
        },
        {
          ton: "emeraude", titre: "Comptes rattachés", valeur: fmtNum(comptes.length), icon: KeyRound,
          sousTitre: "chacun porte un profil, et un seul à la fois",
        },
        {
          ton: "ambre", titre: "Profils sans porteur", valeur: fmtNum(sansPorteur), icon: BookLock,
          sousTitre: "définis, attribués à personne",
        },
        {
          ton: "cyan", titre: "Modules réglables", valeur: fmtNum(MODULES_PROFIL.length),
          icon: Layers, sousTitre: "chacun ouvrable en lecture ou en écriture",
        },
      ]} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ce qu'est un profil</CardTitle>
          <CardDescription className="leading-relaxed">
            Un profil est un <strong>type, pas un poste</strong> : plusieurs agents d'une même
            direction le portent en même temps. C'est ce qui permet à une direction d'avoir trois
            secrétaires sans que rien n'ait à être dupliqué. Il s'attache aux agents selon leurs
            responsabilités, et ses droits valent partout de la même façon.
            <br /><br />
            La mention <strong>Livré</strong> ou <strong>Maison</strong> dit seulement d'où vient le
            profil — apporté à l'installation, ou créé par le ministère. Elle ne commande rien :
            tous se règlent. Deux refus seulement, et ils protègent celui qui règle : on ne crée
            pas un profil d'un rang supérieur ou égal au sien, et on ne retire pas à son propre
            profil l'écriture sur cet écran — ce serait fermer le seul chemin du retour.
          </CardDescription>
        </CardHeader>
      </Card>

      <TableauModule<ProfilAcces>
        titre="Le catalogue"
        description="Cliquer sur un profil ouvre sa matrice et la liste des comptes qui le portent."
        lignes={visibles}
        colonnes={colonnes}
        recherche={(p, t) => `${p.libelle} ${p.code} ${p.description}`.toLowerCase().includes(t.toLowerCase())}
        placeholderRecherche="Rechercher un profil…"
        filtres={[{
          cle: "origine", libelle: "Tous les profils",
          options: [
            { valeur: "livre", libelle: "Livrés" },
            { valeur: "maison", libelle: "De la maison" },
            { valeur: "portes", libelle: "Attribués à quelqu'un" },
            { valeur: "ferme", libelle: "Fermés" },
          ],
        }]}
        valeursFiltres={filtres}
        surChangementFiltre={(cle, valeur) => setFiltres((f) => ({ ...f, [cle]: valeur }))}
        surSelection={(p) => setSelection(p.code)}
        ligneActive={selection}
        vide="Aucun profil ne correspond à ce filtre."
        parPage={16}
      />

      <PanneauDetail
        ouvert={!!active}
        surFermeture={() => setSelection(null)}
        titre={active?.libelle ?? ""}
        sousTitre={active ? `Code ${active.code} — rang ${active.rang}` : undefined}
        etiquette={active && (
          <>
            <Badge variant="outline" className={active.origine === "LIVRE"
              ? "bg-indigo-500/12 text-indigo-600 border-indigo-500/20"
              : "bg-amber-500/12 text-amber-600 border-amber-500/20"}>
              {active.origine === "LIVRE" ? "Livré à l'installation" : "Créé par le ministère"}
            </Badge>
            {!active.actif && <Badge variant="outline" className="bg-slate-500/12 text-slate-500 border-slate-500/20">Fermé</Badge>}
          </>
        )}
        large
        actions={active && redacteur && (
          <>
            <Button variant="outline" onClick={() => {
              setSelection(null);
              setFormulaire({ profil: null });
            }}>
              Reprendre
            </Button>
            {active.code !== user.role && (
              <Button variant="outline" onClick={() => setBascule(active)}>
                {active.actif ? "Fermer" : "Rouvrir"}
              </Button>
            )}
            {porteursActifs.length === 0 && active.code !== user.role && (
              <Button
                variant="outline"
                onClick={() => supprimer.mutate(
                  { profil: active, comptes, utilisateur: user },
                  {
                    onError: echec,
                    onSuccess: () => { setSelection(null); toast({ title: "Profil supprimé" }); },
                  }
                )}
              >
                Supprimer
              </Button>
            )}
            <Button onClick={() => setFormulaire({ profil: active })}>Régler</Button>
          </>
        )}
      >
        {active && (
          <>
            <Section titre="Ce profil">
              <LigneInfo k="Nom" v={active.libelle} />
              <LigneInfo k="Code" v={<span className="font-mono text-xs">{active.code}</span>} />
              <LigneInfo k="Rang" v={active.rang === 0 ? "0 — n'administre personne" : active.rang} />
              <LigneInfo k="Repris de" v={active.deriveDe ?? "—"} />
              <LigneInfo
                k="Attribution"
                v={active.reserveAdmin
                  ? "Réservée à l'administrateur système"
                  : "Par tout chef d'un rang supérieur, dans son périmètre"}
              />
              {active.description && <LigneInfo k="À quoi il sert" v={active.description} />}
            </Section>

            <Section titre={`Les comptes qui le portent (${porteursActifs.length})`}>
              {porteursActifs.length === 0
                ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun compte. Ce profil est défini et n'est attribué à personne — ce qui est
                    normal pour un profil qu'on vient de créer, et à regarder pour un autre.
                  </p>
                )
                : (
                  <div className="space-y-1">
                    {porteursActifs.slice(0, 12).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-0">
                        <span className="min-w-0 truncate">{c.nomComplet}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{c.entiteId}</span>
                      </div>
                    ))}
                    {porteursActifs.length > 12 && (
                      <p className="pt-1 text-[11px] text-muted-foreground">
                        et {porteursActifs.length - 12} autre(s).
                      </p>
                    )}
                  </div>
                )}
            </Section>

            <Section titre="Les droits, module par module">
              {active.technique && (
                <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                  Profil technique : son porteur n&apos;est pas un agent du ministère. Il n&apos;hérite
                  donc de rien — ce qui n&apos;est pas ouvert ici ne l&apos;est nulle part.
                </p>
              )}
              {heriteDuSocle(active) && (
                <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                  Les modules marqués « socle agent » ne viennent pas de ce profil : chacun,
                  au ministère, les possède déjà. Ce profil ajoute le reste.
                </p>
              )}
              <MatriceProfil droits={active.droits} socle={socleDe(active)} />
            </Section>
          </>
        )}
      </PanneauDetail>

      <DialogueProfil
        ouvert={!!formulaire}
        profil={formulaire?.profil ?? null}
        auteur={user}
        surFermeture={() => setFormulaire(null)}
        surValidation={(profil, creation) => {
          enregistrer.mutate(
            { profil, utilisateur: user, creation },
            {
              onError: echec,
              onSuccess: (p) => {
                toast({
                  title: creation ? "Profil créé" : "Profil enregistré",
                  description: `${p.libelle} — les droits prennent effet immédiatement.`,
                });
                setFormulaire(null);
              },
            }
          );
        }}
      />

      <DialogueBascule
        ouvert={!!bascule}
        profil={bascule}
        porteurs={bascule ? porteursDe(bascule.code, comptes).length : 0}
        surFermeture={() => setBascule(null)}
        surValidation={(motif) => {
          if (bascule) {
            basculer.mutate(
              { profil: bascule, actif: !bascule.actif, utilisateur: user, motif },
              { onError: echec, onSuccess: () => toast({ title: bascule.actif ? "Profil fermé" : "Profil rouvert" }) }
            );
          }
          setBascule(null);
        }}
      />
    </div>
  );
}
