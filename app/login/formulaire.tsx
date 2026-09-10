"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, HelpCircle, Loader2, ShieldAlert, UserPlus } from "lucide-react";
import { useTextes } from "@/lib/langues";
import { useUtilisateurs } from "@/lib/queries";
import type { Utilisateur } from "@/lib/types";
import { ComptesDemo } from "./comptes-demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * La carte d'ouverture de session.
 *
 * Elle ne connecte personne : elle vérifie les identifiants et remonte l'agent
 * reconnu. C'est l'écran de confirmation qui ouvre réellement la session, une
 * fois les conditions d'usage portées à la connaissance de l'agent.
 */
export function Formulaire({ onValide }: { onValide: (u: Utilisateur) => void }) {
  const t = useTextes();
  const { data: utilisateurs = [], isLoading } = useUtilisateurs();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    await new Promise((r) => setTimeout(r, 700));
    const trouve = utilisateurs.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.motDePasse === password
    );
    setPending(false);
    if (!trouve) {
      toast.error(t.messages.invalides, { description: t.messages.invalidesDetail });
      return;
    }
    if (!trouve.actif) {
      toast.error(t.messages.desactive, { description: t.messages.desactiveDetail });
      return;
    }
    onValide(trouve);
  };

  const remplir = (mail: string) => {
    setEmail(mail);
    setPassword("Nexus2026");
  };

  return (
    <div className="space-y-3">
      {/* Deux colonnes : la saisie, puis ce qu'il faut avoir lu. Elles se
          superposent normalement, et se mettent côte à côte quand la fenêtre
          est basse — un téléphone en paysage, une fenêtre réduite. */}
      <div className="carte-connexion corps-connexion rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="colonne-saisie">
        <h1 className="titre-connexion text-center font-serif text-[26px] font-normal text-slate-800">
          {t.connexion.titre}
        </h1>

        <form onSubmit={submit} className="espace-connexion mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-normal text-slate-700">
              {t.connexion.email}
            </Label>
            <Input
              id="email" type="email" required autoComplete="email" autoFocus
              placeholder={t.connexion.emailExemple}
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="champ-connexion h-11 rounded-[3px] border-slate-300 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-normal text-slate-700">
              {t.connexion.motDePasse}
            </Label>
            <div className="relative">
              <Input
                id="password" type={show ? "text" : "password"} required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="champ-connexion h-11 rounded-[3px] border-slate-300 bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? t.connexion.masquer : t.connexion.afficher}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="remember" defaultChecked />
            <Label htmlFor="remember" className="text-sm font-normal text-slate-600">
              {t.connexion.seSouvenir}
            </Label>
          </div>

          <Button
            type="submit" disabled={pending || isLoading}
            className="h-11 w-full rounded-[3px] text-sm font-semibold"
          >
            {pending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.connexion.enCours}</>
              : t.connexion.suivant}
          </Button>
        </form>
        </div>

        <div className="colonne-avis">
        {/* L'avertissement de sécurité prend la place laissée par les conditions
            d'usage : il doit être lu AVANT de tenter d'entrer, pas après. */}
        <div className="avis-securite mt-5 flex items-start gap-2.5 rounded-[3px] border border-amber-200 bg-amber-50 p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[12px] leading-relaxed text-amber-900">{t.connexion.securite}</p>
        </div>

        <div className="liens-connexion mt-5 space-y-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => toast.info(t.messages.procedureCompteTitre, { description: t.messages.procedureCompteTexte })}
            className="flex w-full items-start gap-2.5 text-left text-[15px] text-primary hover:underline"
          >
            <UserPlus className="mt-[3px] h-[18px] w-[18px] shrink-0" /> {t.connexion.ouvrirCompte}
          </button>
          <button
            type="button"
            onClick={() => toast.info(t.messages.procedureMdpTitre, { description: t.messages.procedureMdpTexte })}
            className="flex w-full items-start gap-2.5 text-left text-[15px] text-primary hover:underline"
          >
            <HelpCircle className="mt-[3px] h-[18px] w-[18px] shrink-0" /> {t.connexion.impossible}
          </button>
        </div>
        </div>
      </div>

      <ComptesDemo utilisateurs={utilisateurs} onChoisir={remplir} />
    </div>
  );
}
