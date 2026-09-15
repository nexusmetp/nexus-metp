"use client";

import { motion } from "framer-motion";

/** Apparition en cascade des blocs, dans l'ordre de lecture. */
export const Bloc = ({ i = 0, children, className }: {
  i?: number; children: React.ReactNode; className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.32, delay: 0.12 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/** L'infobulle des graphiques — même cadre partout. */
export const infobulle = {
  contentStyle: {
    borderRadius: 10, border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))", fontSize: 12,
  },
};
