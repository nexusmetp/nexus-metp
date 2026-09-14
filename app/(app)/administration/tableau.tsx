"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2, KeyRound, ShieldCheck, UserPlus,
} from "lucide-react";
import type { Entite, Habilitation, ProfilAcces, Utilisateur } from "@/lib/types";
import {
  NIVEAU_LABELS, chefsParEntite, entiteById, habilitationsEnVigueur,
  incoherencesOrganigramme, libelleProfil,
} from "@/lib/referentiels";
import { fmtDate, fmtNum } from "@/lib/format";
import { RangeeKpi } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/* Le tableau de bord de l'administrateur système                      */
/*                                                                     */
/* Ce qui manquait : l'administrateur avait des outils et aucune vue.  */
/* Il ouvrait des comptes un par un sans jamais voir l'état de ce      */
/* qu'il tient — combien d'entités au registre, combien de profils au  */
/* catalogue, et surtout ce que les chefs font de la délégation qu'il  */
/* leur a ouverte. Or son métier n'est pas d'inscrire le personnel :   */
/* il pose le cadre, et ce sont les directions qui le remplissent.     */
/* Sans cet écran, il ne pouvait pas le vérifier.                      */
/* ------------------------------------------------------------------ */

/**
 * Les niveaux qui, dans ce ministère, portent un chef et donc une délégation.
 *
 * La liste s'arrêtait aux directions. C'était trop court : un **service**, un
 * **établissement** et une **inspection interdépartementale** portent eux aussi
 * un responsable qui inscrit du personnel, et une chaîne qui s'interrompt à ce
 * niveau-là s'interrompt pour de bon — l'administrateur ne le voyait pas. Le
 * bureau n'y figure pas : il est la maille terminale, son chef relève du
 * service, et l'y compter noierait le signal dans trente-neuf lignes. */
const NIVEAUX_DE_COMMANDEMENT: Entite["niveau"][] = [
  "DIRECTION_GENERALE", "DIRECTION", "DIRECTION_DEPARTEMENTALE",
  "INSPECTION_GENERALE", "INSPECTION_INTERDEPARTEMENTALE", "CABINET",
  "SERVICE", "ETABLISSEMENT",
];

export function TableauDeBord({
  entites, comptes, habilitations, profils, aujourdhui,
}: {
  entites: Entite[];
  comptes: Utilisateur[];
  habilitations: Habilitation[];
  profils: ProfilAcces[];
  aujourdhui: string;
}) {
  /* La grammaire de l'organigramme ne réécrit pas l'existant : elle est
     vérifiée à l'écriture. Ce qui lui est antérieur se relit donc ici, pour
     que « la règle est posée » ne se confonde pas avec « tout est conforme ». */
  const horsGrammaire = useMemo(() => incoherencesOrganigramme(entites), [entites]);

  const vue = useMemo(() => {
    const actives = entites.filter((e) => e.actif !== false);
    const parEntite = new Map<string, number>();
    comptes.forEach((c) => parEntite.set(c.entiteId, (parEntite.get(c.entiteId) ?? 0) + 1));

    /* Une habilitation accordée par quelqu'un — et non par l'installation —
       est la trace d'une délégation réellement exercée. C'est le seul chiffre
       qui dise si la chaîne fonctionne ou si tout remonte à l'administrateur. */
    const deleguees = habilitations
      .filter((h) => h.accordePar)
      .sort((a, b) => b.accordeLe.localeCompare(a.accordeLe));

    const porteurs = new Map<string, number>();
    comptes.filter((c) => c.actif).forEach((c) => porteurs.set(c.role, (porteurs.get(c.role) ?? 0) + 1));

    const sansHabilitation = comptes.filter(
      (c) => c.actif && habilitationsEnVigueur(habilitations, c.id, aujourdhui).length === 0
    );
    const entiteDisparue = comptes.filter((c) => c.actif && !entiteById(c.entiteId));
    const profilsInutilises = profils.filter((p) => p.actif && !porteurs.get(p.code));
    const profilsFermesPortes = profils.filter((p) => !p.actif && (porteurs.get(p.code) ?? 0) > 0);
    /* « Pourvue » ne veut pas dire « quelqu'un y est rattaché » : depuis que
       chaque agent a un compte, ce test rendait toutes les entités pourvues et
       l'écran annonçait « toutes pourvues » sur soixante-seize entités sans
       chef. On demande donc un responsable réellement habilité. */
    const chefs = chefsParEntite(comptes, habilitations, aujourdhui);
    const aCommander = actives.filter((e) => NIVEAUX_DE_COMMANDEMENT.includes(e.niveau));
    const directionsSansCompte = aCommander.filter((e) => !chefs.has(e.id));

    return {
      actives, deleguees, porteurs,
      sansTete: directionsSansCompte.length,
      /* Les deux comptes que l'administrateur ouvre lui-même, et rien d'autre :
         tant qu'ils manquent, personne ne peut reprendre la chaîne. */
      tetes: ["MINISTRE", "DIRECTEUR_GENERAL"].filter((r) => (porteurs.get(r) ?? 0) > 0).length,
      profilsActifs: profils.filter((p) => p.actif).length,
      reserves: profils.filter((p) => p.actif && p.reserveAdmin).length,
      maison: profils.filter((p) => p.origine === "MAISON").length,
      commandement: aCommander.length,
      pourvues: aCommander.length - directionsSansCompte.length,
      anomalies: [
        {
          cle: "sans-habilitation",
          n: sansHabilitation.length,
          titre: "comptes actifs qu'aucune habilitation en vigueur ne fonde",
          quoi: "Ils ouvrent un droit que plus personne n'a accordé : le cas le plus discret et le plus gênant. Attribuez un profil depuis le dossier de l'agent, ou fermez le compte.",
        },
        {
          cle: "entite-disparue",
          n: entiteDisparue.length,
          titre: "comptes rattachés à une entité qui n'existe plus",
          quoi: "Leur périmètre est vide : ils ne voient rien et ne peuvent rien déléguer. À rattacher dans l'onglet « Comptes et accès ».",
        },
        {
          cle: "profils-fermes",
          n: profilsFermesPortes.length,
          titre: "profils fermés encore portés par des comptes",
          quoi: "Ces comptes gardent le nom du profil et n'ouvrent plus rien. C'est voulu et réversible, mais cela ne doit pas durer : attribuez-leur un autre profil.",
        },
        {
          cle: "directions-vides",
          n: directionsSansCompte.length,
          titre: "directions ou services de commandement sans responsable",
          quoi: "La chaîne s'y arrête : tant que personne n'y est désigné, aucun agent ne peut y être inscrit — ni par ce responsable qui n'existe pas, ni par vous, qui ne désignez que la tête. Ouvrez la fiche de l'entité et désignez-la.",
        },
        {
          cle: "organigramme-incoherent",
          n: horsGrammaire.length,
          titre: "entités dont le niveau ne tient pas sous leur rattachement",
          quoi: "Un bureau sous un établissement, une direction sous un service : l'arbre reste "
            + "lisible et tous les calculs de périmètre qui en descendent sont faux. La règle "
            + "s'applique désormais à toute création ; celles-ci lui sont antérieures et se "
            + "régularisent en rattachant l'entité au bon parent.",
        },
        {
          cle: "profils-inutilises",
          n: profilsInutilises.length,
          titre: "profils au catalogue que personne ne porte",
          quoi: "Normal pour un profil qu'on vient de créer, à regarder pour un autre : un profil défini et jamais attribué entretient l'idée qu'une fonction est couverte.",
        },
      ].filter((a) => a.n > 0),
    };
  }, [entites, comptes, habilitations, profils, aujourdhui, horsGrammaire]);

  return (
    <div className="space-y-4">
      <RangeeKpi tuiles={[
        {
          ton: "bleu", titre: "Entités au registre", valeur: fmtNum(vue.actives.length), icon: Building2,
          /* Le sous-titre annonçait « dont 22 portent un chef » en affichant le
             nombre d'entités qui *devraient* en porter un. Deux chiffres
             différents sous un seul libellé : on dit maintenant les deux. */
          sousTitre: `${fmtNum(vue.pourvues)} des ${fmtNum(vue.commandement)} entités de commandement ont un chef`,
          href: "/dgarh/organisation",
        },
        {
          ton: "indigo", titre: "Profils au catalogue", valeur: fmtNum(vue.profilsActifs), icon: KeyRound,
          sousTitre: `${fmtNum(vue.reserves)} réservés à vous, ${fmtNum(vue.maison)} créés par le ministère`,
          href: "/profils",
        },
        {
          ton: "emeraude", titre: "Désignations déléguées", valeur: fmtNum(vue.deleguees.length), icon: UserPlus,
          sousTitre: "profils attribués par un chef, non par vous",
        },
        {
          ton: vue.anomalies.length ? "rose" : "emeraude",
          titre: "Points d'attention", valeur: fmtNum(vue.anomalies.reduce((s, a) => s + a.n, 0)),
          icon: ShieldCheck,
          sousTitre: vue.anomalies.length
            ? `${vue.anomalies.length} natures d'écart`
            : "rien à signaler",
        },
      ]} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">La chaîne, et où vous vous arrêtez</CardTitle>
          <CardDescription className="leading-relaxed">
            Vous ne peuplez pas le ministère : vous posez le cadre, vous ouvrez{" "}
            <strong>deux comptes</strong>, et vous vous retirez. Ces deux-là sont le ministre et le
            directeur général de la DGARH — les seuls qui n&apos;aient personne au-dessus d&apos;eux
            pour les leur accorder. Tout le reste appartient à la DGARH : c&apos;est elle qui
            administre le personnel de toutes les structures, cabinet compris, donc elle qui crée
            les directions, les services et les bureaux et qui en désigne les responsables. Ceux-ci
            délèguent ensuite chez eux, chacun dans son périmètre et jamais au-dessus de son rang.
            Le ministre, lui, voit tout et n&apos;administre rien : décider n&apos;est pas
            instruire. Vous n&apos;êtes ni dans les dossiers, ni dans les actes, ni dans les
            documents — ce ne sont pas vos affaires.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Etape
            n="1" titre="Vous posez le cadre"
            chiffre={`${fmtNum(vue.actives.length)} entités, ${fmtNum(vue.profilsActifs)} profils`}
            href="/profils"
            quoi="L'organigramme d'origine et le catalogue des profils : ce qu'un secrétaire, un chef de bureau ou un directeur peut faire, écrit une fois pour tout le ministère."
          />
          <Etape
            n="2" titre="Vous ouvrez deux comptes"
            chiffre={`${fmtNum(vue.tetes)} en place sur 2`}
            href="/dgarh/organisation"
            quoi="Le ministre, au ministère. Le directeur général, à la DGARH. Dossier, compte et habilitation s'ouvrent du même geste, et le mot de passe provisoire ne s'affiche qu'une fois."
          />
          <Etape
            n="3" titre="La DGARH administre le ministère"
            chiffre={vue.sansTete > 0 ? `${fmtNum(vue.sansTete)} entités sans responsable` : "toutes pourvues"}
            href="/dgarh/organisation"
            quoi="Le directeur général crée les directions, services et bureaux partout — le cabinet compris — et en désigne les responsables. Ce n'est plus votre geste."
          />
          <Etape
            n="4" titre="La chaîne descend sans vous"
            chiffre={`${fmtNum(vue.deleguees.length)} désignations déléguées`}
            href="/journal"
            quoi="Chaque responsable inscrit son personnel et lui attribue un profil dans son périmètre. Vous ne le faites pas à sa place : vous le vérifiez au journal."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ce que les chefs ont attribué</CardTitle>
          <CardDescription className="leading-relaxed">
            Les vingt dernières attributions faites par quelqu&apos;un du ministère, et non par
            l&apos;installation. Chacune porte son auteur et son motif : c&apos;est ce qui distingue
            une délégation d&apos;un accès apparu tout seul.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {vue.deleguees.length === 0
            ? (
              <p className="text-sm text-muted-foreground">
                Aucune. Tous les accès en place viennent de l&apos;installation ou de vous — la
                délégation existe dans le code et n&apos;a pas encore été exercée.
              </p>
            )
            : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Accordé par</th>
                      <th className="py-2 pr-3 font-medium">À</th>
                      <th className="py-2 pr-3 font-medium">Profil</th>
                      <th className="py-2 pr-3 font-medium">Périmètre</th>
                      <th className="py-2 font-medium">Le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vue.deleguees.slice(0, 20).map((h) => {
                      const beneficiaire = comptes.find((c) => c.id === h.utilisateurId);
                      const e = entiteById(h.entiteId);
                      return (
                        <tr key={h.id} className="border-b last:border-0 align-top">
                          <td className="py-2 pr-3">{h.accordeParNom}</td>
                          <td className="py-2 pr-3">
                            <div className="min-w-0">
                              <div className="truncate">{beneficiaire?.nomComplet ?? h.utilisateurId}</div>
                              <div className="truncate text-[11px] text-muted-foreground">{h.motif}</div>
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className="whitespace-nowrap">{libelleProfil(h.role)}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">
                            {e ? `${e.sigle} · ${NIVEAU_LABELS[e.niveau]}` : h.entiteId}
                          </td>
                          <td className="py-2 whitespace-nowrap text-xs text-muted-foreground">
                            {fmtDate(h.accordeLe.slice(0, 10))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>

      <Card className={vue.anomalies.length ? "border-amber-500/30" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Points d&apos;attention</CardTitle>
          <CardDescription className="leading-relaxed">
            Des écarts d&apos;administration, non des fautes d&apos;agents. Aucun de ces constats ne
            met personne en cause : ils désignent des portes restées ouvertes ou des cadres restés
            vides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {vue.anomalies.length === 0
            ? (
              <p className="text-sm text-muted-foreground">
                Rien à signaler : tout compte actif est fondé sur une habilitation en vigueur, et
                chaque entité de commandement a quelqu&apos;un pour l&apos;administrer.
              </p>
            )
            : vue.anomalies.map((a) => (
              <div key={a.cle} className="rounded-md border px-3 py-2">
                <p className="text-sm font-medium">
                  <span className="tabular-nums">{fmtNum(a.n)}</span> {a.titre}
                </p>
                <p className="pt-0.5 text-[11px] leading-relaxed text-muted-foreground">{a.quoi}</p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Etape({ n, titre, chiffre, quoi, href }: {
  n: string; titre: string; chiffre: string; quoi: string; href: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {n}
        </span>
        <span className="min-w-0 truncate text-sm font-medium">{titre}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{quoi}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] font-medium tabular-nums text-foreground">{chiffre}</span>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
          <Link href={href}>Ouvrir</Link>
        </Button>
      </div>
    </div>
  );
}
