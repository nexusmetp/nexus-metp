"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FilePlus2, FileSignature, PenLine, Sparkles, Trash2,
} from "lucide-react";
import type { Brouillon } from "@/lib/types";
import type { CleModele } from "@/lib/documents";
import {
  useBrouillons, useEnregistrerBrouillon, useModelesMaison, useSupprimerBrouillon,
} from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { useIA } from "@/lib/ia";
import { compterMots, depuisModele, fusionner } from "@/lib/redaction";
import { MODELES } from "@/lib/documents";
import { useContexteExemple } from "@/components/nexus/contexte-exemple";
import { fmtDateHeure, fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi, TableauModule, type Colonne } from "@/components/nexus/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Editeur } from "./editeur";
import { Demarrer } from "./demarrer";

const LIBELLE_STATUT: Record<Brouillon["statut"], string> = {
  BROUILLON: "en cours",
  RELECTURE: "en relecture",
  ARRETE: "arrêté",
};

/**
 * Espace de rédaction — le traitement de texte de la maison.
 *
 * Il existe parce qu'un agent qui ne peut pas écrire dans l'outil écrit à
 * côté : la pièce part alors dans un fichier personnel, sans timbre, sans
 * trace et sans retour. Ici la feuille est au format de l'administration
 * dès la première ligne, et ce qui en sort est enregistré au registre.
 */
export default function RedactionPage() {
  // `useSearchParams` exige une frontière de suspension : la page est cliente,
  // mais Next la pré-rend, et la lecture de l'URL n'a lieu qu'au navigateur.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EspaceRedaction />
    </Suspense>
  );
}

function EspaceRedaction() {
  const user = useAuth((s) => s.user)!;
  const { data: brouillons = [], isLoading } = useBrouillons();
  const enregistrer = useEnregistrerBrouillon();
  const supprimer = useSupprimerBrouillon();
  const { prete } = useIA();

  const [ouvert, setOuvert] = useState<string | null>(null);
  const [demarrage, setDemarrage] = useState(false);

  const params = useSearchParams();
  const contexte = useContexteExemple();
  const { data: maison = [] } = useModelesMaison();
  const amorce = useRef(false);

  const miens = useMemo(
    () => brouillons.filter((b) => b.auteurId === user.id),
    [brouillons, user.id]
  );
  const courant = ouvert ? brouillons.find((b) => b.id === ouvert) : null;

  const creer = async (contenu: string, titre: string, modele?: CleModele, modeleMaisonId?: string) => {
    const maintenant = new Date().toISOString();
    const brouillon: Brouillon = {
      id: `BRL-${Date.now().toString(36).toUpperCase()}`,
      titre, modele, modeleMaisonId, contenu,
      statut: "BROUILLON",
      auteurId: user.id,
      auteur: user.nomComplet,
      entiteId: user.entiteId,
      dateCreation: maintenant,
      dateMaj: maintenant,
      assiste: false,
      versions: [],
    };
    await enregistrer.mutateAsync({
      brouillon, utilisateur: user, creation: true,
      version: {
        origine: modele || modeleMaisonId ? "MODELE" : "SAISIE",
        resume: modeleMaisonId ? "Ouvert depuis un modèle de la maison."
          : modele ? "Ouvert depuis un modèle livré." : "Feuille blanche.",
      },
    });
    setOuvert(brouillon.id);
  };

  /* Arrivée depuis la bibliothèque : /redaction?modele=… ou ?maison=….
     Le garde évite qu'un rendu supplémentaire n'ouvre un second brouillon. */
  useEffect(() => {
    if (amorce.current || isLoading) return;
    const livre = params?.get("modele");
    const propre = params?.get("maison");
    if (!livre && !propre) return;
    if (livre && !MODELES.some((m) => m.cle === livre)) return;
    if (propre && !maison.length) return;
    amorce.current = true;

    if (livre) {
      const descripteur = MODELES.find((m) => m.cle === livre)!;
      void creer(depuisModele(descripteur.cle, contexte), descripteur.libelle, descripteur.cle);
      return;
    }
    const m = maison.find((x) => x.id === propre);
    if (m) void creer(fusionner(m.contenu, contexte).contenu, m.libelle, undefined, m.id);
  }, [params, maison, contexte, isLoading]);

  const jeter = async (b: Brouillon, e: React.MouseEvent) => {
    e.stopPropagation();
    await supprimer.mutateAsync(b.id);
    toast.success("Brouillon supprimé", { description: b.titre });
  };

  const colonnes: Colonne<Brouillon>[] = [
    {
      cle: "titre", entete: "Pièce",
      rendu: (b) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{b.titre}</span>
            {b.assiste && <Sparkles className="h-3 w-3 shrink-0 text-primary" />}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {compterMots(b.contenu)} mots — {b.versions.length} version{b.versions.length > 1 ? "s" : ""}
          </div>
        </div>
      ),
    },
    {
      cle: "statut", entete: "État", visible: "md",
      rendu: (b) => (
        <Badge variant={b.statut === "ARRETE" ? "secondary" : "outline"} className="text-[10px]">
          {LIBELLE_STATUT[b.statut]}
        </Badge>
      ),
    },
    {
      cle: "maj", entete: "Dernière écriture", visible: "lg",
      rendu: (b) => <span className="text-xs text-muted-foreground">{fmtDateHeure(b.dateMaj)}</span>,
    },
    {
      cle: "actions", entete: "", aligne: "droite",
      rendu: (b) => (
        <Button
          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Supprimer ce brouillon"
          onClick={(e) => jeter(b, e)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (courant) return <Editeur brouillon={courant} surFermeture={() => setOuvert(null)} />;

  const arretes = miens.filter((b) => b.statut === "ARRETE").length;
  const assistes = miens.filter((b) => b.assiste).length;

  return (
    <>
      <PageHeader
        titre="Rédaction"
        description="Le traitement de texte du ministère. La feuille est au format A4 administratif dès la première ligne : timbre, lieu, date et bloc de signature sont déjà en place, et ce qui s'imprime est exactement ce qui est relu."
      >
        <Button size="sm" onClick={() => setDemarrage(true)}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> Nouveau document
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "cyan", titre: "Mes brouillons", valeur: fmtNum(miens.length), sousTitre: "conservés dans ce navigateur", icon: PenLine },
        { ton: "emeraude", titre: "Textes arrêtés", valeur: fmtNum(arretes), sousTitre: "figés, prêts pour la signature", icon: FileSignature },
        { ton: "violet", titre: "Passages assistés", valeur: fmtNum(assistes), sousTitre: "portent la mention au document", icon: Sparkles },
        {
          ton: prete ? "emeraude" : "ardoise",
          titre: "Assistant", valeur: prete ? "Actif" : "Éteint",
          sousTitre: prete ? "clé posée par l'administrateur" : "aucune clé dans l'espace Système",
          icon: Sparkles,
        },
      ]} />

      {!prete && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center gap-3 py-4 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1">
              L'éditeur fonctionne sans assistant : il n'en a pas besoin pour écrire, imprimer
              ni exporter. Pour ouvrir la rédaction assistée, l'administrateur système pose une
              clé de fournisseur dans <strong>Système → Assistant</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      <TableauModule<Brouillon>
        titre="Mes brouillons"
        description="Un brouillon ne touche à aucun dossier. Il devient une pièce le jour où il est arrêté, signé puis notifié."
        lignes={miens}
        colonnes={colonnes}
        recherche={(b, t) => b.titre.toLowerCase().includes(t)}
        placeholderRecherche="Titre du document…"
        surSelection={(b) => setOuvert(b.id)}
        vide="Aucun brouillon. Ouvrez une feuille blanche ou partez d'un modèle."
        parPage={10}
      />

      <Demarrer ouvert={demarrage} surFermeture={() => setDemarrage(false)} surChoix={creer} />
    </>
  );
}
