"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileOutput, FolderOpen, Printer, ShieldCheck } from "lucide-react";
import { useActes, useDocumentsEmis } from "@/lib/queries";
import { MODELES } from "@/lib/documents";
import { fmtNum } from "@/lib/format";
import { PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi } from "@/components/nexus/module";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bibliotheque } from "./bibliotheque";
import { RegistreDocuments } from "./registre";
import { PiecesDossiers } from "./pieces";

/**
 * Espace documentaire — cahier §14.
 *
 * Trois fonds qu'il ne faut pas confondre : les modèles qu'on édite,
 * les documents qu'on a établis, et les pièces versées aux dossiers.
 * Les deux premiers produisent du papier ; le troisième en conserve.
 */
export default function DocumentsPage() {
  const { data: actes = [], isLoading } = useActes();
  const { data: emis = [] } = useDocumentsEmis();

  const pieces = useMemo(() => actes.reduce((s, a) => s + a.pieces.length, 0), [actes]);
  const imprimes = useMemo(() => emis.filter((d) => d.canal === "IMPRESSION").length, [emis]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <>
      <PageHeader
        titre="Documents"
        description="Tout document du ministère s'édite ici : il s'imprime au format A4, se télécharge, se copie et se transmet. Chaque édition laisse une trace nominative."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/textes">Fonds réglementaire</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        { ton: "violet", titre: "Modèles disponibles", valeur: fmtNum(MODELES.length), sousTitre: "arrêtés, attestations, états, correspondance", icon: FileOutput },
        { ton: "bleu", titre: "Documents établis", valeur: fmtNum(emis.length), sousTitre: `dont ${fmtNum(imprimes)} imprimés`, icon: Printer },
        { ton: "cyan", titre: "Pièces au dossier", valeur: fmtNum(pieces), sousTitre: `réparties sur ${fmtNum(actes.length)} actes`, icon: FolderOpen },
        { ton: "emeraude", titre: "Rattachement", valeur: "100 %", sousTitre: "toute pièce relève d'un acte", icon: ShieldCheck },
      ]} />

      <Tabs defaultValue="modeles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modeles">Bibliothèque</TabsTrigger>
          <TabsTrigger value="registre">Documents établis</TabsTrigger>
          <TabsTrigger value="pieces">Pièces des dossiers</TabsTrigger>
        </TabsList>

        <TabsContent value="modeles" className="space-y-4">
          <Bibliotheque />
        </TabsContent>

        <TabsContent value="registre" className="space-y-4">
          <RegistreDocuments />
        </TabsContent>

        <TabsContent value="pieces" className="space-y-4">
          <PiecesDossiers />
        </TabsContent>
      </Tabs>
    </>
  );
}
