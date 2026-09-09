"use client";

/**
 * Export CSV des états réglementaires — cahier §13.
 *
 * Le téléchargement direct est inerte dans certains conteneurs (bac à sable
 * qui bloque les téléchargements initiés par la page) : on propose donc
 * toujours la copie dans le presse-papiers en second chemin.
 */

const echapper = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function versCSV(colonnes: string[], lignes: (string | number | undefined)[][]): string {
  // Point-virgule : séparateur attendu par les tableurs en configuration française.
  const corps = [colonnes, ...lignes].map((l) => l.map(echapper).join(";")).join("\r\n");
  return "﻿" + corps; // BOM, sinon les accents se perdent à l'ouverture
}

export type Resultat = "enregistre" | "refuse" | "impossible";

/**
 * Enregistre le fichier chez l'utilisateur.
 *
 * Deux chemins : l'ancre classique dans un navigateur ordinaire, et l'API
 * du visualiseur quand la page y est publiée — celui-ci n'autorise pas les
 * téléchargements initiés par la page et affiche sa propre confirmation.
 */
export async function telecharger(nom: string, csv: string): Promise<Resultat> {
  const hote = (globalThis as any).claude;
  if (hote?.use) {
    try {
      const downloads = await hote.use("downloads");
      if (downloads) {
        await downloads.save({ filename: nom, data: csv });
        return "enregistre";
      }
    } catch (e: any) {
      // Un refus de l'utilisateur n'est pas une panne : ne pas réessayer.
      return e?.code === "declined" ? "refuse" : "impossible";
    }
  }
  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "enregistre";
  } catch {
    return "impossible";
  }
}

export async function copier(csv: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(csv);
    return true;
  } catch {
    return false;
  }
}
