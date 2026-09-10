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

/* ------------------------------------------------------------------ */
/* Écran d'ouverture                                                   */
/*                                                                     */
/* Fond blanc, armoiries, filet tricolore. Une administration se        */
/* présente par son emblème, pas par un décor : rien ici ne doit        */
/* détourner l'œil du timbre de l'État.                                */
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
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 11 + 4;
        if (next >= 100) {
          clearInterval(t);
          return 100;
        }
        return next;
      });
    }, 190);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setEtape(Math.min(ETAPES.length - 1, Math.floor((progress / 100) * ETAPES.length)));
    if (progress >= 100) {
      const t = setTimeout(() => router.replace(user ? pageAccueil(user.role) : "/login"), 700);
      return () => clearTimeout(t);
    }
  }, [progress, router, user]);

  const monter = reduceMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12 text-center">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.92 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <Armoiries taille={132} />
      </motion.div>

      {/* Filet tricolore — la même règle que sur le papier à en-tête. */}
      <div aria-hidden className="mt-7 flex h-1 w-28 overflow-hidden rounded-full">
        <span className="flex-1 bg-[#009543]" />
        <span className="flex-1 bg-[#FBDE4A]" />
        <span className="flex-1 bg-[#DC241F]" />
      </div>

      <motion.p {...monter} transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
        {t.etat.republique}
      </motion.p>
      <motion.h1 {...monter} transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-2 max-w-xl text-balance text-lg font-extrabold uppercase leading-snug tracking-tight text-slate-900 sm:text-xl">
        {t.etat.ministere}
      </motion.h1>

      <motion.div {...monter} transition={{ delay: 0.5, duration: 0.5 }} className="mt-9">
        <div className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {APP_NAME}
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {APP_TAGLINE}
        </p>
      </motion.div>

      <motion.div {...monter} transition={{ delay: 0.65, duration: 0.5 }}
        className="mt-11 w-[300px] sm:w-[380px]">
        <Progress value={progress} className="h-1 bg-slate-200" />
        <div className="mt-4 flex h-5 items-center justify-center gap-2 text-xs text-slate-500">
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
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                : <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              {ETAPES[etape]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="mt-14 text-[10px] uppercase tracking-[0.28em] text-slate-400">
        DGARH · {t.etat.devise}
      </p>
    </div>
  );
}
