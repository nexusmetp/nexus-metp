"use client";

/**
 * Le contenu de l'infobulle.
 *
 * MapLibre attend du HTML. Un nom d'établissement vient de la base et peut
 * donc contenir n'importe quoi : il est échappé avant d'entrer dans la
 * chaîne, comme partout ailleurs dans la plateforme.
 */

import { ETATS, FAMILLES } from "@/lib/carte/symboles";
import type { PointCarte } from "./types";

const e = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ligne = (libelle: string, valeur: string, ton?: string) =>
  `<div style="display:flex;gap:10px;justify-content:space-between">
     <span style="color:#475569">${e(libelle)}</span>
     <strong style="color:${ton ?? "#0f172a"};font-variant-numeric:tabular-nums">${e(valeur)}</strong>
   </div>`;

export function htmlInfobulle(p: PointCarte): string {
  const f = FAMILLES[p.famille];
  const s = ETATS[p.etat];
  return `<div style="min-width:206px;font-size:11.5px;line-height:1.45">
    <div style="display:flex;align-items:center;gap:6px">
      <span style="width:9px;height:9px;border-radius:50%;background:${f.couleur};flex:none"></span>
      <strong style="font-size:12.5px;color:#0f172a">${e(p.nom)}</strong>
    </div>
    <div style="color:#64748b;margin:2px 0 6px">${e(p.sousTitre ?? f.libelle)}</div>
    <div style="border-top:1px solid #e2e8f0;padding-top:5px;display:grid;gap:2px">
      ${ligne("Effectif", String(p.effectif))}
      ${(p.detail ?? []).map((d) => ligne(d.libelle, d.valeur, d.ton)).join("")}
    </div>
    <div style="margin-top:6px;padding-top:5px;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:${s.couleur};flex:none"></span>
      <span style="color:${s.couleur};font-weight:600">${e(s.libelle)}</span>
    </div>
    ${p.responsable ? `<div style="margin-top:4px;color:#475569">${e(p.responsable)}</div>` : ""}
    <div style="margin-top:5px;color:#94a3b8;font-size:10px">Cliquer pour ouvrir la fiche</div>
  </div>`;
}
