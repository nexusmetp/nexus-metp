"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME, APP_TAGLINE, LOGO_URL, MINISTERE_NOM, pageAccueil } from "@/lib/referentiels";
import { ensureSeed } from "@/lib/db";
import { useAuth } from "@/lib/store";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2 } from "lucide-react";

const ETAPES = [
  "Initialisation du noyau NEXUS",
  "Chargement des référentiels METP",
  "Mise en cache navigateur (IndexedDB)",
  "Sécurisation de la session",
  "Prêt",
];

export default function SplashPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#04121a] text-white">
      <div className="absolute inset-0 nexus-grid opacity-40" />
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#00B4D8]/25 blur-[130px]" />
      <div className="absolute bottom-[-160px] right-[-80px] h-[420px] w-[420px] rounded-full bg-[#0077B6]/25 blur-[130px]" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="relative mb-9 flex h-40 w-40 items-center justify-center">
          <span className="absolute h-32 w-32 rounded-full border border-[#00B4D8]/50 animate-nexus-ring" />
          <span className="absolute h-32 w-32 rounded-full border border-[#00B4D8]/40 animate-nexus-ring" style={{ animationDelay: "0.7s" }} />
          <span className="absolute h-32 w-32 rounded-full border border-[#00B4D8]/30 animate-nexus-ring" style={{ animationDelay: "1.4s" }} />
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-28 w-28 overflow-hidden rounded-full bg-white nexus-glow"
          >
            <Image src={LOGO_URL} alt="Armoiries METP" fill sizes="112px" className="object-contain p-1" priority unoptimized />
          </motion.div>
        </div>

        <motion.h1
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="bg-gradient-to-r from-white via-[#90E0EF] to-[#00B4D8] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl"
        >
          {APP_NAME}
        </motion.h1>
        <motion.p
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-3 max-w-xl text-sm font-medium uppercase tracking-[0.22em] text-[#90E0EF]"
        >
          {APP_TAGLINE}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-4 max-w-md text-xs leading-relaxed text-white/55"
        >
          {MINISTERE_NOM}
          <br />
          République du Congo — Unité * Travail * Progrès
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.6 }}
          className="mt-12 w-[320px] sm:w-[400px]"
        >
          <Progress value={progress} className="h-1.5 bg-white/10" />
          <div className="mt-4 flex h-5 items-center justify-center gap-2 text-xs text-white/70">
            <AnimatePresence mode="wait">
              <motion.span
                key={etape}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                {progress >= 100 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00B4D8]" />
                )}
                {ETAPES[etape]}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 z-10 text-[10px] uppercase tracking-[0.3em] text-white/30">
        DGARH • Version 2.0 • 2026
      </div>
    </div>
  );
}
