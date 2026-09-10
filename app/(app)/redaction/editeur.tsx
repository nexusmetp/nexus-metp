"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Check, Download, History, Loader2, Lock, Printer, Save,
  Sparkles, ZoomIn, ZoomOut,
} from "lucide-react";
import type { Brouillon, DocumentEmis } from "@/lib/types";
import { compterMots, porterMention, titreDeduit } from "@/lib/redaction";
import { envelopper, LIBELLE_FORMAT } from "@/lib/documents";
import { telecharger } from "@/lib/export";
import {
  useArreterBrouillon, useEnregistrerBrouillon, useEnregistrerDocument, useModelesMaison,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { useIA } from "@/lib/ia";
import { fmtDateHeure } from "@/lib/format";
import { DeposerModele } from "@/components/redaction/deposer-modele";
import { Ruban } from "@/components/redaction/ruban";
import { Feuille, type PoigneeFeuille } from "@/components/redaction/feuille";
import { PanneauIA } from "@/components/redaction/panneau-ia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const DELAI_SAUVEGARDE = 1500;

/** Nom de fichier lisible, sans accent ni caractère qui gêne un système. */
const nomDeFichier = (titre: string, extension: string) =>
  `${titre.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "document"}.${extension}`;

/**
 * Le poste de travail du rédacteur.
 *
 * Une feuille, une barre d'outils, et l'assistant sur le côté. La
 * sauvegarde est automatique — un brouillon perdu parce qu'on a fermé
 * l'onglet est la première raison qu'ont les agents de retourner dans leur
 * propre traitement de texte.
 */
export function Editeur({ brouillon, surFermeture }: {
  brouillon: Brouillon;
  surFermeture: () => void;
}) {
  const user = useAuth((s) => s.user)!;
  const feuille = useRef<PoigneeFeuille | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [titre, setTitre] = useState(brouillon.titre);
  const [assiste, setAssiste] = useState(brouillon.assiste);
  const [modifie, setModifie] = useState(false);
  const [enregistreA, setEnregistreA] = useState(brouillon.dateMaj);
  const [mots, setMots] = useState(() => compterMots(brouillon.contenu));
  const [zoom, setZoom] = useState(1);
  const [empreinte, setEmpreinte] = useState(brouillon.id);
  const [depot, setDepot] = useState(false);
  const [corpsADeposer, setCorpsADeposer] = useState("");

  const enregistrer = useEnregistrerBrouillon();
  const arreter = useArreterBrouillon();
  const consigner = useEnregistrerDocument();
  const { prete } = useIA();
  const { data: modelesMaison = [] } = useModelesMaison();
  const modeleRepris = modelesMaison.find((m) => m.id === brouillon.modeleMaisonId) ?? null;

  const fige = brouillon.statut === "ARRETE";

  /* La feuille est plus large qu'un téléphone : à l'ouverture, on la met à
     la largeur disponible plutôt que de laisser l'agent chercher la barre
     de défilement horizontale. */
  useEffect(() => {
    const ajuster = () => {
      const large = window.innerWidth;
      setZoom(large < 640 ? Math.max(0.42, (large - 48) / 794) : large < 1280 ? 0.78 : 1);
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  const sauver = useCallback(async (
    version?: { origine: Brouillon["versions"][number]["origine"]; resume: string },
    aussi?: Partial<Brouillon>
  ) => {
    const contenu = feuille.current?.corps() ?? brouillon.contenu;
    const maj = await enregistrer.mutateAsync({
      brouillon: {
        ...brouillon, ...aussi,
        contenu,
        titre: (aussi?.titre ?? titre).trim() || titreDeduit(contenu),
        assiste: aussi?.assiste ?? assiste,
      },
      utilisateur: user,
      version,
    });
    setEnregistreA(maj.dateMaj);
    setModifie(false);
    setMots(compterMots(contenu));
    return maj;
  }, [brouillon, titre, assiste, enregistrer, user]);

  /* Sauvegarde différée : on écrit après le silence, pas à chaque frappe. */
  const marquerModifie = useCallback(() => {
    if (fige) return;
    setModifie(true);
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => { void sauver(); }, DELAI_SAUVEGARDE);
  }, [fige, sauver]);

  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);

  /* Ctrl S : le réflexe existe, autant qu'il fasse ce qu'on attend plutôt
     que d'ouvrir la boîte d'enregistrement du navigateur. */
  useEffect(() => {
    const sur = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!fige) void sauver({ origine: "SAISIE", resume: "Étape enregistrée." })
          .then(() => toast.success("Brouillon enregistré"));
      }
    };
    window.addEventListener("keydown", sur);
    return () => window.removeEventListener("keydown", sur);
  }, [fige, sauver]);

  const surAssistance = (resume: string) => {
    setAssiste(true);
    void sauver({ origine: "ASSISTANT", resume }, { assiste: true });
  };

  const tracerEmission = (canal: DocumentEmis["canal"]) => {
    void consigner.mutateAsync({
      document: {
        id: `DOC-${Date.now().toString(36).toUpperCase()}`,
        modele: brouillon.modele ?? "REDACTION_LIBRE",
        intitule: "Pièce rédigée",
        reference: brouillon.id,
        objet: titre || brouillon.titre,
        sujetType: "libre",
        canal,
        emisPar: user.nomComplet,
        dateEmission: new Date().toISOString(),
        repris: true,
      },
      utilisateur: user,
    });
  };

  const imprimer = () => {
    tracerEmission("IMPRESSION");
    window.print();
  };

  const exporterVers = async (format: "word" | "html") => {
    const corps = porterMention(feuille.current?.corps() ?? brouillon.contenu, assiste);
    const sortie = envelopper(corps, titre || brouillon.titre, format);
    const etat = await telecharger(nomDeFichier(titre || brouillon.titre, sortie.extension), sortie.contenu, sortie.mime);
    if (etat === "enregistre") {
      tracerEmission("TELECHARGEMENT");
      toast.success(`Document exporté en ${LIBELLE_FORMAT[format]}`);
    } else if (etat === "impossible") {
      toast.error("Le téléchargement a échoué");
    }
  };

  const arreterLeTexte = async () => {
    const maj = await sauver({ origine: "SAISIE", resume: "Texte arrêté par son rédacteur." });
    await arreter.mutateAsync({ brouillon: maj, utilisateur: user });
    toast.success("Brouillon arrêté", {
      description: "Le texte est figé. Il peut partir à la signature.",
    });
    surFermeture();
  };

  const revenirA = (version: Brouillon["versions"][number]) => {
    feuille.current?.remplacerTout(version.contenu);
    setEmpreinte(`${brouillon.id}-${version.horodatage}`);
    marquerModifie();
    toast.info("Version rétablie", { description: fmtDateHeure(version.horodatage) });
  };

  const panneau = (
    <PanneauIA feuille={feuille} surAssistance={surAssistance} actif={!fige} />
  );

  return (
    <div className="space-y-3">
      {/* Bandeau : identité de la pièce à gauche, gestes à droite. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={surFermeture} className="shrink-0">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Brouillons
        </Button>
        <Input
          value={titre}
          onChange={(e) => { setTitre(e.target.value); marquerModifie(); }}
          disabled={fige}
          aria-label="Titre du brouillon"
          className="h-9 min-w-0 flex-1 text-sm font-semibold sm:max-w-sm"
        />
        {fige && <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="h-3 w-3" /> arrêté</Badge>}
        {assiste && <Badge variant="outline" className="gap-1 text-[10px]"><Sparkles className="h-3 w-3" /> assisté</Badge>}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Historique des versions">
                <History className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b px-3 py-2 text-xs font-semibold">Versions retenues</div>
              <div className="max-h-72 divide-y overflow-y-auto">
                {brouillon.versions.map((v) => (
                  <button
                    key={v.horodatage}
                    onClick={() => revenirA(v)}
                    disabled={fige}
                    className="block w-full px-3 py-2 text-left transition hover:bg-muted/60 disabled:opacity-50"
                  >
                    <div className="text-[11px] font-medium">{v.resume}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {fmtDateHeure(v.horodatage)} — {v.auteur}
                      {v.origine === "ASSISTANT" && " · assistant"}
                    </div>
                  </button>
                ))}
                {!brouillon.versions.length && (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Aucune étape retenue pour l'instant.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-9 w-9" title="Réduire" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" title="Agrandir" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9" title="Imprimer" onClick={imprimer}>
            <Printer className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Exporter">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exporterVers("word")}>{LIBELLE_FORMAT.word}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exporterVers("html")}>{LIBELLE_FORMAT.html}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {prete && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 xl:hidden" title="Assistant">
                  <Sparkles className="h-4 w-4 text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(24rem,92vw)] overflow-y-auto">
                <SheetHeader className="text-left"><SheetTitle className="text-sm">Assistant de rédaction</SheetTitle></SheetHeader>
                <div className="mt-4">{panneau}</div>
              </SheetContent>
            </Sheet>
          )}

          {!fige && (
            <>
              <Button
                variant="outline" size="sm"
                onClick={() => void sauver({ origine: "SAISIE", resume: "Étape enregistrée." })
                  .then(() => toast.success("Étape enregistrée"))}
              >
                <Save className="mr-1.5 h-4 w-4" /> Enregistrer
              </Button>
              <Button size="sm" onClick={arreterLeTexte} disabled={arreter.isPending}>
                {arreter.isPending
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Check className="mr-1.5 h-4 w-4" />}
                Arrêter
              </Button>
            </>
          )}
        </div>
      </div>

      {!fige && (
        <Ruban
          surFocus={() => feuille.current?.focus()}
          surChangement={marquerModifie}
          surInsertion={(t) => feuille.current?.insererTexte(t)}
          surDepot={() => {
            setCorpsADeposer(feuille.current?.corps() ?? brouillon.contenu);
            setDepot(true);
          }}
          libelleDepot={modeleRepris ? "Mettre à jour le modèle" : "Déposer comme modèle"}
          desactive={fige}
        />
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{mots} mot{mots > 1 ? "s" : ""}</span>
        <span aria-hidden>·</span>
        <span>
          {modifie ? "modifications non enregistrées…" : `enregistré ${fmtDateHeure(enregistreA)}`}
        </span>
        <span className="ml-auto tabular-nums">{Math.round(zoom * 100)} %</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Feuille
          ref={feuille}
          contenu={brouillon.contenu}
          empreinte={empreinte}
          modifiable={!fige}
          surChangement={marquerModifie}
          zoom={zoom}
          className="min-w-0 rounded-lg border"
        />
        <div className="hidden xl:block">{panneau}</div>
      </div>

      <DeposerModele
        ouvert={depot}
        surFermeture={() => setDepot(false)}
        contenu={corpsADeposer}
        existant={modeleRepris}
        titreParDefaut={titre || brouillon.titre}
        base={brouillon.modele}
      />
    </div>
  );
}
