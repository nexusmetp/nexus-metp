"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { assainir } from "@/lib/redaction";
import { ID_IMPRESSION, useStylesDocument } from "@/components/nexus/styles-document";
import { cn } from "@/lib/utils";

/**
 * La feuille A4 qu'on écrit.
 *
 * Le corps est posé dans le DOM une seule fois, puis laissé au DOM : si
 * React le rendait à chaque frappe, le curseur reviendrait au début du
 * document à chaque caractère. C'est la même règle que dans la visionneuse,
 * et c'est la seule qui tienne pour un champ de saisie riche.
 */

export interface PoigneeFeuille {
  /** Le corps tel qu'il est à l'écran, assaini. */
  corps: () => string;
  /** Le passage sélectionné, en HTML. Chaîne vide si rien n'est sélectionné. */
  selection: () => string;
  /** Remplace le passage sélectionné — la retouche de l'assistant. */
  remplacerSelection: (html: string) => void;
  /** Pose un bloc à la fin du document. */
  ajouter: (html: string) => void;
  /** Écrit du texte brut là où se trouve le curseur — un champ de fusion. */
  insererTexte: (texte: string) => void;
  /** Applique une propriété de style au passage sélectionné. */
  appliquerStyle: (propriete: string, valeur: string) => void;
  /** Remplace tout le corps — nouveau modèle, retour à une version. */
  remplacerTout: (html: string) => void;
  focus: () => void;
}

interface Props {
  contenu: string;
  /** Change quand il faut reposer le corps : autre brouillon, autre version. */
  empreinte: string;
  modifiable: boolean;
  surChangement: () => void;
  /** Échelle d'affichage. 1 = grandeur nature, 210 mm de large. */
  zoom?: number;
  className?: string;
}

export const Feuille = forwardRef<PoigneeFeuille, Props>(function Feuille(
  { contenu, empreinte, modifiable, surChangement, zoom = 1, className }, ref
) {
  useStylesDocument();
  const hote = useRef<HTMLDivElement | null>(null);
  const cale = useRef<HTMLDivElement | null>(null);
  const plage = useRef<Range | null>(null);

  /* Le corps est assaini À L'ENTRÉE autant qu'à la sortie.
     Nettoyer seulement avant d'enregistrer ne protégerait que l'auteur : un
     modèle de la maison se partage, et un corps piégé s'exécuterait dans le
     navigateur du collègue qui l'ouvre. La porte se ferme des deux côtés. */
  const propre = useMemo(() => assainir(contenu), [contenu]);

  /* Le corps entre dans le DOM au montage du nœud, pas dans un effet : le
     nœud peut naître dans un portail, où l'ordre des effets n'est pas garanti. */
  const poser = useCallback((el: HTMLDivElement | null) => {
    hote.current = el;
    if (el && el.dataset.empreinte !== empreinte) {
      el.innerHTML = propre;
      el.dataset.empreinte = empreinte;
    }
  }, [propre, empreinte]);

  useEffect(() => {
    const el = hote.current;
    if (el && el.dataset.empreinte !== empreinte) {
      el.innerHTML = propre;
      el.dataset.empreinte = empreinte;
    }
  }, [propre, empreinte]);

  /* Les commandes d'édition doivent produire du CSS et non de vieilles
     balises <font> : c'est la forme que l'assainissement sait conserver, et
     celle qui traverse un export vers un traitement de texte. */
  useEffect(() => {
    try { document.execCommand("styleWithCSS", false, "true"); } catch { /* sans effet ailleurs */ }
  }, []);

  /* La sélection est retenue en permanence : dès qu'on clique un bouton de la
     barre ou du panneau d'assistance, le navigateur l'a déjà perdue. */
  useEffect(() => {
    const retenir = () => {
      const s = window.getSelection();
      if (!s || s.rangeCount === 0) return;
      const r = s.getRangeAt(0);
      if (hote.current?.contains(r.commonAncestorContainer)) plage.current = r.cloneRange();
    };
    document.addEventListener("selectionchange", retenir);
    return () => document.removeEventListener("selectionchange", retenir);
  }, []);

  const restaurer = () => {
    const s = window.getSelection();
    const r = plage.current;
    if (!s || !r || !hote.current?.contains(r.commonAncestorContainer)) return null;
    s.removeAllRanges();
    s.addRange(r);
    return r;
  };

  useImperativeHandle(ref, () => ({
    corps: () => assainir(hote.current?.innerHTML ?? ""),
    selection: () => {
      const r = plage.current;
      if (!r || r.collapsed) return "";
      const d = document.createElement("div");
      d.appendChild(r.cloneContents());
      return assainir(d.innerHTML);
    },
    remplacerSelection: (html) => {
      hote.current?.focus();
      const r = restaurer();
      if (!r) return;
      r.deleteContents();
      const gabarit = document.createElement("div");
      gabarit.innerHTML = assainir(html);
      const fragment = document.createDocumentFragment();
      while (gabarit.firstChild) fragment.appendChild(gabarit.firstChild);
      const dernier = fragment.lastChild;
      r.insertNode(fragment);
      // Le curseur se replace après ce qui vient d'être posé, sinon la frappe
      // suivante réécrirait par-dessus.
      if (dernier) {
        const apres = document.createRange();
        apres.setStartAfter(dernier);
        apres.collapse(true);
        plage.current = apres;
        const s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(apres);
      }
      surChangement();
    },
    /* `execCommand` ne connaît que sept tailles relatives héritées du HTML 3 :
       impossible d'y demander « 12 points ». On entoure donc la sélection
       nous-mêmes, ce qui donne la valeur exacte annoncée par le ruban. */
    appliquerStyle: (propriete, valeur) => {
      hote.current?.focus();
      const r = restaurer();
      if (!r || r.collapsed) return;
      const enveloppe = document.createElement("span");
      enveloppe.setAttribute("style", `${propriete}: ${valeur}`);
      try {
        enveloppe.appendChild(r.extractContents());
        r.insertNode(enveloppe);
      } catch {
        // Une sélection à cheval sur plusieurs blocs ne s'entoure pas d'un
        // seul nœud : on laisse le texte intact plutôt que de le déplacer.
        return;
      }
      const apres = document.createRange();
      apres.selectNodeContents(enveloppe);
      plage.current = apres;
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(apres);
      surChangement();
    },
    insererTexte: (texte) => {
      hote.current?.focus();
      const r = restaurer();
      if (!r) {
        // Sans curseur posé dans la feuille, le champ irait n'importe où :
        // on le met en fin de document plutôt que de ne rien faire.
        const cible = hote.current?.querySelector(".doc-feuille") ?? hote.current;
        cible?.appendChild(document.createTextNode(texte));
      } else {
        r.deleteContents();
        const noeud = document.createTextNode(texte);
        r.insertNode(noeud);
        const apres = document.createRange();
        apres.setStartAfter(noeud);
        apres.collapse(true);
        plage.current = apres;
        const s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(apres);
      }
      surChangement();
    },
    ajouter: (html) => {
      const el = hote.current;
      if (!el) return;
      const cible = el.querySelector(".doc-feuille") ?? el;
      const bloc = document.createElement("div");
      bloc.innerHTML = assainir(html);
      while (bloc.firstChild) cible.appendChild(bloc.firstChild);
      surChangement();
    },
    remplacerTout: (html) => {
      const el = hote.current;
      if (!el) return;
      el.innerHTML = assainir(html);
      el.dataset.empreinte = `remplace-${Date.now()}`;
      surChangement();
    },
    focus: () => hote.current?.focus(),
  }), [surChangement]);

  /* La cale doit suivre la feuille : celle-ci grandit quand on écrit, et sa
     hauteur transformée n'est plus celle que le flux voit. */
  useEffect(() => {
    const feuille = hote.current;
    const support = cale.current;
    if (!feuille || !support || typeof ResizeObserver === "undefined") return;
    const suivre = () => { support.style.height = `${feuille.offsetHeight * zoom}px`; };
    const observateur = new ResizeObserver(suivre);
    observateur.observe(feuille);
    suivre();
    return () => observateur.disconnect();
  }, [zoom, empreinte]);

  /* Un collage venu d'un autre traitement de texte apporte ses propres
     styles, ses polices et parfois des balises entières : on ne garde que
     la structure, sans quoi la feuille A4 se déforme au premier collage. */
  const coller = (e: React.ClipboardEvent) => {
    if (!modifiable) return;
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const texte = e.clipboardData.getData("text/plain");
    const propre = html
      ? assainir(html)
      : texte.split(/\n{2,}/).map((p) => `<p class="doc-paragraphe">${p.replace(/\n/g, "<br>")}</p>`).join("");
    document.execCommand("insertHTML", false, propre);
    surChangement();
  };

  return (
    <div className={cn("overflow-auto bg-muted/40 p-4 sm:p-6", className)}>
      {/* La feuille est réduite par une transformation, qui ne prend pas de
          place dans le flux : une cale reprend ses dimensions réelles, sinon
          la zone défilerait sur une hauteur fausse. */}
      <div ref={cale} className="mx-auto" style={{ width: `calc(210mm * ${zoom})` }}>
        <div
          id={ID_IMPRESSION}
          ref={poser}
          role="textbox"
          aria-multiline="true"
          aria-label="Corps du document"
          contentEditable={modifiable}
          suppressContentEditableWarning
          spellCheck
          lang="fr"
          onInput={surChangement}
          onPaste={coller}
          style={{ width: "210mm", transform: `scale(${zoom})`, transformOrigin: "top left" }}
          className={cn(
            "shadow-lg outline-none transition",
            modifiable && "ring-1 ring-primary/20 focus:ring-2 focus:ring-primary/50"
          )}
        />
      </div>
    </div>
  );
});
