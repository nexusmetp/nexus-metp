"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, ServerCog, ShieldAlert, Sparkles,
} from "lucide-react";
import {
  FOURNISSEURS, REGLAGES_IA_VIDES, appelerIA, fournisseurParCle, iaConfiguree,
  listerModeles, masquer, messageErreur, oublierRelais, relaisDisponible,
} from "@/lib/ia";
import { useMajParametres, useParametres } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { fmtDateHeure } from "@/lib/format";
import type { FournisseurIA, ParametresSysteme, ReglagesIA } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/**
 * Réglage de l'assistant — l'espace de l'administrateur système.
 *
 * Une seule chose est vraiment demandée ici : la clé du fournisseur. Tout
 * le reste a une valeur de départ raisonnable. C'est aussi le seul endroit
 * de la plateforme où un secret est saisi, d'où l'avertissement : posée
 * dans le navigateur, la clé est lisible par qui tient le poste.
 */
export function ReglageAssistant() {
  const user = useAuth((s) => s.user)!;
  const { data: parametres } = useParametres();
  const majParametres = useMajParametres();

  const [forme, setForme] = useState<ReglagesIA>(REGLAGES_IA_VIDES);
  const [cleVisible, setCleVisible] = useState(false);
  const [catalogue, setCatalogue] = useState<string[] | null>(null);
  const [occupe, setOccupe] = useState<"modeles" | "essai" | null>(null);
  const [essai, setEssai] = useState<{ ok: boolean; texte: string } | null>(null);
  const [relais, setRelais] = useState<boolean | null>(null);

  useEffect(() => {
    if (parametres?.ia) setForme({ ...REGLAGES_IA_VIDES, ...parametres.ia });
  }, [parametres?.ia]);

  useEffect(() => {
    oublierRelais();
    relaisDisponible().then(setRelais).catch(() => setRelais(false));
  }, []);

  const changer = (champ: Partial<ReglagesIA>) => setForme((f) => ({ ...f, ...champ }));
  const descripteur = fournisseurParCle(forme.fournisseur);
  const enregistree = parametres?.ia?.cle ?? "";

  const enregistrer = async () => {
    if (!parametres) return;
    const ia: ReglagesIA = {
      ...forme,
      cle: forme.cle.trim(),
      modele: forme.modele.trim(),
      urlBase: forme.urlBase?.trim() || undefined,
      maj: new Date().toISOString(),
      majPar: user.nomComplet,
    };
    await majParametres.mutateAsync({ parametres: { ...parametres, ia } as ParametresSysteme, utilisateur: user });
    toast.success(iaConfiguree(ia) ? "Assistant activé" : "Réglages enregistrés", {
      description: iaConfiguree(ia)
        ? "Les écrans de rédaction et le fil d'assistance s'ouvrent pour tous les rôles habilités."
        : "L'assistant reste éteint tant qu'une clé et un modèle ne sont pas posés.",
    });
  };

  const charger = async () => {
    setOccupe("modeles");
    try {
      const liste = await listerModeles(forme);
      setCatalogue(liste);
      toast.success(`${liste.length} modèles ouverts à ce compte`);
      if (!forme.modele && liste.length) changer({ modele: liste[0] });
    } catch (e) {
      setCatalogue(null);
      toast.error("Catalogue indisponible", { description: messageErreur(e) });
    } finally {
      setOccupe(null);
    }
  };

  const tester = async () => {
    setOccupe("essai");
    setEssai(null);
    try {
      const texte = await appelerIA(
        forme,
        [{ role: "user", contenu: "Réponds exactement : liaison établie." }],
        { maxJetons: 40 }
      );
      setEssai({ ok: true, texte });
    } catch (e) {
      setEssai({ ok: false, texte: messageErreur(e) });
    } finally {
      setOccupe(null);
    }
  };

  const prete = iaConfiguree({ ...forme, actif: true });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Assistant de rédaction
              </CardTitle>
              <CardDescription>
                Un modèle de langage aide à écrire les projets de texte. Il ne décide rien,
                ne signe rien, et n'accède à aucune donnée qu'on ne lui donne pas.
              </CardDescription>
            </div>
            <Badge className="shrink-0" variant={parametres?.ia && iaConfiguree(parametres.ia) ? "secondary" : "outline"}>
              {parametres?.ia && iaConfiguree(parametres.ia) ? "actif" : "éteint"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0">
              <Label className="text-sm">Activer l'assistant</Label>
              <p className="text-[11px] text-muted-foreground">
                Éteint, l'application fonctionne exactement comme aujourd'hui : aucun écran ne
                dépend de lui.
              </p>
            </div>
            <Switch checked={forme.actif} onCheckedChange={(v: boolean) => changer({ actif: v })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Fournisseur</Label>
              <Select
                value={forme.fournisseur}
                onValueChange={(v: string) => { changer({ fournisseur: v as FournisseurIA }); setCatalogue(null); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOURNISSEURS.map((f) => (
                    <SelectItem key={f.valeur} value={f.valeur}>{f.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Clé à obtenir sur {descripteur.console}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Point d'entrée</Label>
              <Input
                value={forme.urlBase ?? ""}
                onChange={(e) => changer({ urlBase: e.target.value })}
                placeholder={descripteur.urlBase}
              />
              <p className="text-[10px] text-muted-foreground">
                À ne renseigner que pour un service compatible hébergé ailleurs.
              </p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs" htmlFor="cle-ia">Clé d'accès</Label>
            <div className="flex gap-2">
              <Input
                id="cle-ia"
                type={cleVisible ? "text" : "password"}
                value={forme.cle}
                onChange={(e) => { changer({ cle: e.target.value }); setCatalogue(null); }}
                placeholder={`${descripteur.prefixe}…`}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 font-mono text-xs"
              />
              <Button
                type="button" variant="outline" size="icon"
                title={cleVisible ? "Masquer" : "Afficher"}
                onClick={() => setCleVisible((v) => !v)}
              >
                {cleVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {enregistree && (
              <p className="text-[10px] text-muted-foreground">
                Clé enregistrée : <span className="font-mono">{masquer(enregistree)}</span>
                {parametres?.ia?.maj && ` — posée le ${fmtDateHeure(parametres.ia.maj)} par ${parametres.ia.majPar ?? "—"}`}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Modèle</Label>
            <div className="flex flex-wrap gap-2">
              {catalogue?.length ? (
                <Select value={forme.modele} onValueChange={(v: string) => changer({ modele: v })}>
                  <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {catalogue.map((m) => (
                      <SelectItem key={m} value={m} className="font-mono text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={forme.modele}
                  onChange={(e) => changer({ modele: e.target.value })}
                  placeholder="Nom du modèle chez le fournisseur"
                  className="min-w-0 flex-1 font-mono text-xs"
                />
              )}
              <Button
                type="button" variant="outline"
                disabled={forme.cle.trim().length < 9 || occupe === "modeles"}
                onClick={charger}
              >
                {occupe === "modeles"
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <RefreshCw className="mr-1.5 h-4 w-4" />}
                Charger la liste
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Aucun nom de modèle n'est écrit en dur dans la plateforme : la liste est demandée
              au fournisseur avec votre clé, et reflète donc les droits réels du compte.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Longueur maximale d'une réponse</Label>
              <Input
                type="number" min={200} max={4000} step={100}
                value={forme.maxJetons}
                onChange={(e) => changer({ maxJetons: Math.max(200, Number(e.target.value) || 200) })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <Label className="text-xs">Contexte de l'écran</Label>
                <p className="text-[10px] text-muted-foreground">
                  Autorise l'assistant à savoir sur quelle page la question est posée.
                </p>
              </div>
              <Switch
                checked={forme.contexteAutorise}
                onCheckedChange={(v: boolean) => changer({ contexteAutorise: v })}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Consigne permanente</Label>
            <Textarea
              rows={3}
              value={forme.consigne ?? ""}
              onChange={(e) => changer({ consigne: e.target.value })}
              placeholder="Ex. : citer systématiquement l'article du statut sur lequel se fonde une proposition."
              className="text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={enregistrer} disabled={majParametres.isPending}>
              {majParametres.isPending
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <KeyRound className="mr-1.5 h-4 w-4" />}
              Enregistrer
            </Button>
            <Button variant="outline" onClick={tester} disabled={!prete || occupe === "essai"}>
              {occupe === "essai"
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              Tester la liaison
            </Button>
          </div>

          {essai && (
            <div className={`rounded-lg border p-3 text-xs ${essai.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
              <div className="font-semibold">{essai.ok ? "Liaison établie" : "Liaison impossible"}</div>
              <p className="mt-1 leading-relaxed text-muted-foreground">{essai.texte}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={relais ? "border-emerald-500/40" : "border-amber-500/40"}>
        <CardContent className="space-y-3 py-4 text-xs leading-relaxed">
          <div className="flex items-center gap-2 font-semibold">
            {relais ? <ServerCog className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
            {relais ? "La clé reste sur le serveur" : "La clé est posée dans le navigateur"}
          </div>
          {relais ? (
            <p className="text-muted-foreground">
              Un relais a été détecté sur cette installation : les appels partent du serveur du
              ministère, avec la clé de son environnement. La clé saisie ci-dessus n'est alors
              pas utilisée pour les appels — elle ne sert qu'à charger le catalogue des modèles.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Sans relais, la clé saisie ici est conservée dans la base locale du navigateur et
                envoyée directement au fournisseur. Elle est donc lisible par toute personne qui
                a la main sur ce poste. C'est acceptable pour une démonstration ; ce ne l'est pas
                pour une installation ouverte aux agents.
              </p>
              <p className="text-muted-foreground">
                Montage recommandé en production : poser <code className="rounded bg-muted px-1">ASSISTANT_CLE</code>
                {" "}dans l'environnement du serveur — et, si le fournisseur n'est pas celui par défaut,
                {" "}<code className="rounded bg-muted px-1">ASSISTANT_FOURNISSEUR</code> et
                {" "}<code className="rounded bg-muted px-1">ASSISTANT_MODELE</code>. La plateforme bascule
                d'elle-même sur le relais, et la clé ne descend plus jamais au navigateur.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
