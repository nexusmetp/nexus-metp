"use client";

import { Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { KpiCard } from "@/components/nexus/ui-kit";
import { tonDuRang, type Ton } from "@/components/nexus/tons";

/* ------------------------------------------------------------------ */
/* Le gabarit d'un module                                              */
/*                                                                     */
/* Chaque écran de l'application est bâti sur les mêmes pièces :        */
/* une rangée de tuiles de même taille, une barre de filtres, un        */
/* tableau, un panneau de détail. L'utilisateur retrouve les mêmes      */
/* gestes d'une page à l'autre, et le code ne se recopie pas.           */
/*                                                                     */
/* Le dossier suit la règle des 500 lignes : une pièce par fichier,     */
/* `index.ts` réexporte l'ensemble, et aucun site d'appel ne bouge.     */
/* ------------------------------------------------------------------ */

export interface Tuile {
  titre: string;
  valeur: string | number;
  sousTitre?: string;
  icon: any;
  variation?: number;
  /** Où mène le chiffre : une tuile qui ne s'ouvre sur rien est un cul-de-sac. */
  href?: string;
  /** Ce que dit la couleur. À défaut, la position dans la rangée en donne un. */
  ton?: Ton;
}

/**
 * Toujours quatre colonnes en grand écran, toujours la même hauteur : les
 * tuiles s'alignent d'une page à l'autre. Elles apparaissent en cascade —
 * assez pour que l'œil suive, assez court pour ne pas faire attendre.
 */
export function RangeeKpi({ tuiles }: { tuiles: Tuile[] }) {
  if (!tuiles.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {tuiles.slice(0, 4).map((t, i) => {
        const carte = (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <KpiCard {...t} ton={t.ton ?? tonDuRang(i)} />
          </motion.div>
        );
        return t.href ? (
          <Link
            key={t.titre} href={t.href}
            className="group h-full rounded-xl outline-none ring-offset-background transition-transform focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-0.5"
          >
            {carte}
          </Link>
        ) : (
          <Fragment key={t.titre}>{carte}</Fragment>
        );
      })}
    </div>
  );
}
