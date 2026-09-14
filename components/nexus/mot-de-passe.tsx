"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useChangerMotDePasse } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { LONGUEUR_MINIMALE, verdictMotDePasse } from "@/lib/acces/motdepasse";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ */
/* Changer son mot de passe                                            */
/* ------------------------------------------------------------------ */

/**
 * L'écran qui manquait, et sans lequel le reste ne tenait pas.
 *
 * La plateforme ouvrait des comptes avec un mot de passe provisoire et
 * inscrivait « à changer à la première connexion » — sans offrir nulle part
 * le moyen d'en changer. La mention n'était donc pas une règle, c'était une
 * phrase. Le provisoire restait en place, et comme il était le même pour
 * tous, il ouvrait tous les comptes.
 *
 * Le dialogue vit dans le menu de l'utilisateur, et non dans un module : un
 * module se ferme par un profil, et personne ne doit pouvoir être privé du
 * droit de changer son propre mot de passe — l'administrateur système compris,
 * qui n'a pourtant aucun dossier d'agent.
 */
export function DialogueMotDePasse({ ouvert, surFermeture, force = false }: {
  ouvert: boolean;
  surFermeture: () => void;
  /** Première connexion : on ne sort pas sans avoir changé. */
  force?: boolean;
}) {
  const { user, login } = useAuth();
  const changer = useChangerMotDePasse();

  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirme, setConfirme] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setAncien(""); setNouveau(""); setConfirme(""); setVisible(false);
  }, [ouvert]);

  if (!user) return null;

  const verdict = nouveau
    ? verdictMotDePasse(nouveau, { ancien, identifiant: user.email })
    : { ok: false as const };
  const concordent = !!confirme && nouveau === confirme;
  const valide = !!ancien && verdict.ok && concordent;

  const valider = async () => {
    if (!valide) return;
    try {
      const ligne = await changer.mutateAsync({ compte: user, ancien, nouveau });
      /* La session porte une copie du compte : sans cette reprise, l'écran
         continuerait d'afficher « mot de passe à changer » jusqu'à la
         déconnexion, et le garde de première connexion se rouvrirait. */
      login(ligne);
      toast.success("Mot de passe changé", {
        description: "Il vous servira à la prochaine connexion, avec la même adresse.",
      });
      surFermeture();
    } catch (e) {
      toast.error("Changement refusé", {
        description: e instanceof Error ? e.message : "Opération impossible.",
      });
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => { if (!o && !force) surFermeture(); }}>
      {/* À la première connexion, on ne sort pas sans avoir changé : ni par
          la croix, ni par Échap, ni en cliquant à côté. La croix se masque par
          une classe plutôt que par une prop, parce que `components/ui/` se
          reprend au caractère près de la source amont et ne se modifie pas. */}
      <DialogContent
        className={force ? "sm:max-w-md [&>button.absolute]:hidden" : "sm:max-w-md"}
        onInteractOutside={(e) => { if (force) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (force) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>
            {force ? "Changez votre mot de passe" : "Changer mon mot de passe"}
          </DialogTitle>
          <DialogDescription>
            {force
              ? "Celui qui vous a été remis est provisoire et connu de la personne qui vous a ouvert l'accès. Choisissez-en un que vous êtes seul à connaître."
              : `Votre identifiant reste ${user.email} : il ne change pas.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Champ
            id="mdp-ancien" label={force ? "Mot de passe provisoire" : "Mot de passe actuel"}
            valeur={ancien} surChangement={setAncien} visible={visible}
          />
          <Champ
            id="mdp-nouveau" label="Nouveau mot de passe"
            valeur={nouveau} surChangement={setNouveau} visible={visible}
            aide={nouveau && !verdict.ok
              ? verdict.motif
              : `Au moins ${LONGUEUR_MINIMALE} caractères. Une phrase dont vous vous souvenez vaut mieux qu'un mot compliqué que vous noterez.`}
            erreur={!!nouveau && !verdict.ok}
          />
          <Champ
            id="mdp-confirme" label="Répétez-le"
            valeur={confirme} surChangement={setConfirme} visible={visible}
            aide={confirme && !concordent ? "Les deux saisies diffèrent." : undefined}
            erreur={!!confirme && !concordent}
          />

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {visible ? "Masquer les mots de passe" : "Afficher les mots de passe"}
          </button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {!force && <Button variant="outline" onClick={surFermeture}>Annuler</Button>}
          <Button onClick={valider} disabled={!valide || changer.isPending}>
            {changer.isPending ? "Enregistrement…" : "Changer le mot de passe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Champ({ id, label, valeur, surChangement, visible, aide, erreur }: {
  id: string; label: string; valeur: string; surChangement: (v: string) => void;
  visible: boolean; aide?: string; erreur?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={id === "mdp-ancien" ? "current-password" : "new-password"}
        value={valeur}
        onChange={(e) => surChangement(e.target.value)}
      />
      {aide && (
        <p className={erreur ? "text-[11px] text-destructive" : "text-[11px] text-muted-foreground"}>
          {aide}
        </p>
      )}
    </div>
  );
}
