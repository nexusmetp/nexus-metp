"use client";

/**
 * Dessin de la carte professionnelle, au format ISO 7810 ID-1 (85,6 × 54 mm).
 *
 * Les cotes sont en millimètres et non en pixels : une carte se fabrique,
 * elle ne s'affiche pas seulement. Ce qui est à l'écran sort de l'imprimante
 * à la taille réelle.
 */

import { CheckCircle2, ShieldCheck } from "lucide-react";
import {
  APP_NAME, cheminDe, entiteById, gradeById, MINISTERE_NOM, REGLES_CATEGORIE,
} from "@/lib/referentiels";
import { fmtDate } from "@/lib/format";
import { Portrait, teinteDe } from "@/components/nexus/portrait";
import { cn } from "@/lib/utils";
import type { AgentProjete, CarteProfessionnelle } from "@/lib/types";

export const VALIDITE_ANS = 5;

/* ------------------------------------------------------------------ */
/* La carte elle-même                                                  */
/* ------------------------------------------------------------------ */

/**
 * Format ISO 7810 ID-1 — 85,6 × 54 mm, le format d'une carte bancaire —
 * rendu à l'échelle 4 pour rester net à l'impression.
 */
export function CarteRecto({ carte, agent }: { carte: CarteProfessionnelle; agent: AgentProjete }) {
  const chaine = cheminDe(carte.entiteId);
  const direction = chaine.find((e) =>
    ["DIRECTION_GENERALE", "DIRECTION", "CABINET", "INSPECTION_GENERALE", "DIRECTION_DEPARTEMENTALE"].includes(e.niveau));
  const service = chaine.filter((e) => ["SERVICE", "BUREAU"].includes(e.niveau)).slice(-1)[0];
  const t = teinteDe(agent.matricule);

  return (
    <div
      className="relative aspect-[85.6/54] w-full overflow-hidden rounded-xl border shadow-sm"
      style={{ background: "linear-gradient(135deg,#F8FBFD 0%,#EAF4F9 100%)" }}
    >
      {/* Bandeau national */}
      <div className="flex items-stretch">
        <div className="h-1.5 flex-1" style={{ background: "#009543" }} />
        <div className="h-1.5 flex-1" style={{ background: "#FBDE4A" }} />
        <div className="h-1.5 flex-1" style={{ background: "#DC241F" }} />
      </div>

      <div className="flex h-[calc(100%-0.375rem)] flex-col p-[4%]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[7px] font-bold uppercase leading-tight tracking-[0.14em] text-[#04293A]">
              République du Congo
            </div>
            <div className="mt-0.5 text-[5.5px] uppercase leading-tight tracking-[0.1em] text-[#04293A]/60">
              Unité · Travail · Progrès
            </div>
            <div className="mt-1 max-w-[26ch] text-[6px] font-semibold uppercase leading-tight text-[#0077B6]">
              {MINISTERE_NOM}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[6px] font-bold uppercase tracking-widest text-[#04293A]/50">Carte</div>
            <div className="text-[6px] font-bold uppercase tracking-widest text-[#04293A]/50">professionnelle</div>
            <div className="mt-1 font-mono text-[7px] font-bold text-[#0077B6]">N° {carte.numero}</div>
          </div>
        </div>

        <div className="mt-[3%] flex flex-1 items-stretch gap-[4%]">
          <div className="flex w-[24%] shrink-0 flex-col">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-md border-2 border-white shadow-sm">
              {agent.photo ? (
                <img src={agent.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-[13px] font-black"
                  style={{ background: t.fond, color: t.texte }}
                >
                  {(agent.prenom[0] ?? "") + (agent.nom[0] ?? "")}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-black uppercase leading-tight text-[#04293A]">
                {agent.nom}
              </div>
              <div className="truncate text-[9px] font-semibold leading-tight text-[#04293A]/80">
                {agent.prenom}
              </div>
              <div className="mt-[3%] grid gap-[2px]">
                <Ligne k="Matricule" v={agent.matricule} mono />
                <Ligne k="Grade" v={gradeById(agent.gradeId)?.libelle ?? REGLES_CATEGORIE[agent.categorie].libelle} />
                <Ligne k="Fonction" v={carte.fonction} />
                <Ligne k="Direction" v={direction?.nom ?? "—"} />
                {service && <Ligne k="Service" v={service.nom} />}
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 pt-[2%]">
              <div>
                <div className="text-[5px] uppercase tracking-widest text-[#04293A]/45">Valable jusqu'au</div>
                <div className="font-mono text-[7px] font-bold text-[#04293A]">{fmtDate(carte.dateExpiration)}</div>
              </div>
              {/* Bande de contrôle : une carte administrative en porte une. */}
              <div className="flex h-[14px] items-end gap-[1.2px]" aria-hidden>
                {Array.from({ length: 30 }, (_, i) => {
                  const h = 5 + ((agent.matricule.charCodeAt(i % agent.matricule.length) + i * 7) % 9);
                  return <span key={i} className="w-[1.2px] bg-[#04293A]" style={{ height: h }} />;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Ligne = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="w-[42px] shrink-0 text-[5px] uppercase tracking-wider text-[#04293A]/45">{k}</span>
    <span className={cn("truncate text-[6.5px] font-semibold text-[#04293A]", mono && "font-mono")}>{v}</span>
  </div>
);

export function CarteVerso({ carte }: { carte: CarteProfessionnelle }) {
  return (
    <div className="relative aspect-[85.6/54] w-full overflow-hidden rounded-xl border bg-[#04293A] p-[5%] text-white shadow-sm">
      <div className="h-3 w-full bg-black/40" />
      <div className="mt-[4%] space-y-[3%]">
        <p className="text-[6px] leading-relaxed text-white/85">
          La présente carte atteste la qualité d'agent du ministère. Elle n'attribue aucun droit :
          la situation administrative de son titulaire résulte des actes qui la fondent.
        </p>
        <p className="text-[6px] leading-relaxed text-white/70">
          Toute perte doit être déclarée sans délai au bureau du personnel. La carte est restituée à
          la cessation de fonctions.
        </p>
        <div className="grid grid-cols-2 gap-[4%] pt-[2%]">
          <div>
            <div className="text-[5px] uppercase tracking-widest text-white/40">Émise le</div>
            <div className="font-mono text-[7px] font-bold">{fmtDate(carte.dateEmission)}</div>
          </div>
          <div>
            <div className="text-[5px] uppercase tracking-widest text-white/40">Émise par</div>
            <div className="text-[6px] font-semibold leading-tight">{carte.emisePar}</div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[5%] right-[5%] text-right">
        <div className="h-[1px] w-16 bg-white/30" />
        <div className="mt-0.5 text-[5px] uppercase tracking-widest text-white/40">Le directeur général</div>
      </div>
      <div className="absolute bottom-[5%] left-[5%] text-[5px] font-mono text-white/35">{APP_NAME}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
