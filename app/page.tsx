"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { APP_NAME, APP_TAGLINE, pageAccueil } from "@/lib/referentiels";
import { useTextes } from "@/lib/langues";
import { ensureSeed } from "@/lib/db";
import { useAuth } from "@/lib/store";
import { Armoiries } from "@/components/nexus/logo";
import { Progress } from "@/components/ui/progress";
import { FOND_MINISTERE } from "@/lib/referentiels";

/* ------------------------------------------------------------------ */
/* Écran d'ouverture                                                   */
/*                                                                     */
/* La plateforme s'ouvre sur le bureau du ministre, sous un voile.      */
/* Un blanc nu ne dit rien ; cette photo dit d'emblée de quelle maison  */
/* on pousse la porte — et c'est la même image qu'à la connexion, si    */
/* bien que les deux écrans s'enchaînent sans coupure.                  */
/* ------------------------------------------------------------------ */

export default function SplashPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const reduceMotion = useReducedMotion();
  const t = useTextes();
  const ETAPES = t.ouverture.etapes;
  const [progress, setProgress] = useState(0);
  const [etape, setEtape] = useState(0);

  useEffect(() => {
    ensureSeed().catch(() => {});
  }, []);

  useEffect(() => {
    const tic = setInterval(() => {
      setProgress((p) => {
        const suivant = p + Math.random() * 11 + 4;
        if (suivant >= 100) {
          clearInterval(tic);
          return 100;
        }
        return suivant;
      });
    }, 190);
    return () => clearInterval(tic);
  }, []);

  useEffect(() => {
    setEtape(Math.min(ETAPES.length - 1, Math.floor((progress / 100) * ETAPES.length)));
    if (progress >= 100) {
      const tic = setTimeout(() => router.replace(user ? pageAccueil(user.role) : "/login"), 700);
      return () => clearTimeout(tic);
    }
  }, [progress, router, user, ETAPES.length]);

  const monter = reduceMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
      <div
        aria-hidden
        className="fond-ministere fixed inset-0 -z-20"
        style={FOND_MINISTERE ? { backgroundImage: `url(${FOND_MINISTERE})` } : undefined}
      />
      <div aria-hidden className="voile-ouverture fixed inset-0 -z-10" />

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.92 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        // Un halo derrière le blason : il le décolle de la photo sans avoir à
        // poser un cadre autour.
        className="rounded-full shadow-[0_0_70px_28px_rgba(255,255,255,0.16)]"
      >
        <Armoiries taille={128} />
      </motion.div>

      {/* Filet tricolore — la même règle que sur le papier à en-tête. */}
      <div aria-hidden className="mt-7 flex h-1 w-28 overflow-hidden rounded-full">
        <span className="flex-1 bg-[#009543]" />
        <span className="flex-1 bg-[#FBDE4A]" />
        <span className="flex-1 bg-[#DC241F]" />
      </div>

      <motion.p {...monter} transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
        {t.etat.republique}
      </motion.p>
      <motion.h1 {...monter} transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-2 max-w-xl text-balance text-lg font-extrabold uppercase leading-snug tracking-tight text-white drop-shadow sm:text-xl">
        {t.etat.ministere}
      </motion.h1>

      <motion.div {...monter} transition={{ delay: 0.5, duration: 0.5 }} className="mt-9">
        <div className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl">
          {APP_NAME}
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-[#7FD4EE]">
          {APP_TAGLINE}
        </p>
      </motion.div>

      <motion.div {...monter} transition={{ delay: 0.65, duration: 0.5 }}
        className="mt-11 w-[300px] sm:w-[380px]">
        <Progress value={progress} className="h-1 bg-white/20" />
        <div className="mt-4 flex h-5 items-center justify-center gap-2 text-xs text-white/85">
          <AnimatePresence mode="wait">
            <motion.span
              key={etape}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-2"
            >
              {progress >= 100
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                : <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7FD4EE]" />}
              {ETAPES[etape]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="mt-14 text-[10px] uppercase tracking-[0.28em] text-white/40">
        DGARH · {t.etat.devise}
      </p>
    </div>
  );
}
