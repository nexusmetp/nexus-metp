"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/* Les identifiants d'un compte qu'on vient d'ouvrir                   */
/* ------------------------------------------------------------------ */

/**
 * Pourquoi un dialogue, et non une notification.
 *
 * Le mot de passe provisoire n'est affiché **qu'une fois** : il n'est stocké
 * nulle part en clair pour être relu, et la plateforme n'a aucun moyen de le
 * redonner — elle peut seulement en engendrer un autre. Une notification qui
 * s'efface au bout de huit secondes ferait donc perdre l'accès de quelqu'un
 * chaque fois que le chef regarde ailleurs.
 *
 * Il faut donc que l'écran retienne son lecteur : on ferme en disant qu'on a
 * noté, et le bouton de copie met les deux lignes dans le presse-papiers d'un
 * geste — parce qu'elles seront recopiées dans un courriel ou un message, et
 * qu'un mot de passe retapé à la main est un mot de passe mal transmis.
 */
export interface AccesOuvert {
  nom: string;
  identifiant: string;
  provisoire: string;
  /** Ce à quoi le compte donne accès — le profil, et sur quelle entité. */
  qualite?: string;
}

export function DialogueAccesOuvert({ acces, surFermeture }: {
  acces: AccesOuvert | null;
  surFermeture: () => void;
}) {
  const [copie, setCopie] = useState(false);

  if (!acces) return null;

  const bloc = `Identifiant : ${acces.identifiant}\nMot de passe provisoire : ${acces.provisoire}`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(bloc);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      /* Presse-papiers refusé — page non sécurisée, permission retirée. Les
         deux lignes restent lisibles et sélectionnables à l'écran : on ne
         signale pas un échec qui ne prive de rien. */
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) surFermeture(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> L&apos;accès de {acces.nom} est ouvert
          </DialogTitle>
          <DialogDescription>
            {acces.qualite
              ? `${acces.qualite}. Transmettez-lui ces deux lignes.`
              : "Transmettez-lui ces deux lignes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          <Ligne k="Identifiant" v={acces.identifiant} />
          <Ligne k="Mot de passe provisoire" v={acces.provisoire} />
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Ce mot de passe ne s&apos;affichera plus : il est propre à ce compte et la plateforme ne
          sait pas le relire — elle sait seulement en engendrer un autre. Il devra être changé à la
          première connexion, et c&apos;est <strong className="font-medium text-foreground">l&apos;adresse
          ci-dessus qui sert d&apos;identifiant</strong>, ici comme partout ailleurs.
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={copier}>
            {copie
              ? <><Check className="mr-1.5 h-4 w-4" /> Copié</>
              : <><Copy className="mr-1.5 h-4 w-4" /> Copier les deux lignes</>}
          </Button>
          <Button onClick={surFermeture}>J&apos;ai noté, fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Ligne({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="select-all font-mono text-sm font-semibold tracking-tight">{v}</span>
    </div>
  );
}
