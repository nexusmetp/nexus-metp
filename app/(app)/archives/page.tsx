"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Archive, Boxes, Clock, ShieldCheck } from "lucide-react";
import { useArticlesArchives, useCommunications, useVersements } from "@/lib/queries";
import { duaEchue } from "@/lib/referentiels";
import { fmtNum } from "@/lib/format";
import { GardeModule, PageHeader } from "@/components/nexus/ui-kit";
import { RangeeKpi } from "@/components/nexus/module";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FondsArchives } from "./fonds";
import { Versements } from "./versements";
import { SortFinalArchives } from "./elimination";
import { Communications } from "./communications";

/**
 * Service des archives — cahier §14.
 *
 * Ce que la GED ne fait pas : décider combien de temps on garde, qui peut
 * consulter, et ce qu'on détruit. La GED range les pièces d'un dossier
 * vivant ; les archives prennent le relais quand le dossier est clos.
 */
export default function ArchivesPage() {
  const user = useAuth((s) => s.user)!;
  const { data: articles = [], isLoading } = useArticlesArchives();
  const { data: versements = [] } = useVersements();
  const { data: communications = [] } = useCommunications();

  const chiffres = useMemo(() => {
    const enRayon = articles.filter((a) => a.statut === "EN_RAYON").length;
    const echus = articles.filter((a) => a.statut !== "ELIMINE" && duaEchue(a.echeanceDua));
    return {
      articles: articles.length,
      enRayon,
      metrage: Math.round(versements.reduce((s, v) => s + v.metrage, 0) * 10) / 10,
      echus: echus.length,
      aEliminer: echus.filter((a) => a.sortFinal === "ELIMINATION").length,
      sorties: articles.filter((a) => a.statut === "COMMUNIQUE").length,
      enAttente: versements.filter((v) => v.statut === "PREPARE").length,
    };
  }, [articles, versements]);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <GardeModule module="archives" role={user.role}>
      <PageHeader
        titre="Archives"
        description="Le dossier clos ne disparaît pas : il est coté, rangé, et son sort est fixé à l'avance. C'est ce qui distingue l'archivage du simple stockage."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/documents">Documents et GED</Link>
        </Button>
      </PageHeader>

      <RangeeKpi tuiles={[
        {
          ton: "violet", titre: "Articles conservés", valeur: fmtNum(chiffres.articles),
          sousTitre: `${fmtNum(chiffres.enRayon)} en rayon · ${chiffres.metrage} mètres linéaires`,
          icon: Archive,
        },
        {
          ton: "bleu", titre: "Versements", valeur: fmtNum(versements.length),
          sousTitre: chiffres.enAttente
            ? `${fmtNum(chiffres.enAttente)} en attente de prise en charge`
            : "tous pris en charge",
          icon: Boxes,
        },
        {
          ton: "ambre", titre: "Durées échues", valeur: fmtNum(chiffres.echus),
          sousTitre: `dont ${fmtNum(chiffres.aEliminer)} éliminables sur bordereau visé`,
          icon: Clock,
        },
        {
          ton: "cyan", titre: "Sorties en cours", valeur: fmtNum(chiffres.sorties),
          sousTitre: `${fmtNum(communications.length)} communications enregistrées`,
          icon: ShieldCheck,
        },
      ]} />

      <Tabs defaultValue="fonds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fonds">Fonds</TabsTrigger>
          <TabsTrigger value="versements">Versements</TabsTrigger>
          <TabsTrigger value="sort">Sort final</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="fonds" className="space-y-4"><FondsArchives /></TabsContent>
        <TabsContent value="versements" className="space-y-4"><Versements /></TabsContent>
        <TabsContent value="sort" className="space-y-4"><SortFinalArchives /></TabsContent>
        <TabsContent value="communications" className="space-y-4"><Communications /></TabsContent>
      </Tabs>
    </GardeModule>
  );
}
