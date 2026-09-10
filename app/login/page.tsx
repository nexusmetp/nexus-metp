"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown, Eye, EyeOff, HelpCircle, Languages, Loader2, Lock, ShieldAlert, UserPlus,
} from "lucide-react";
import { APP_NAME, MINISTERE_NOM, ROLE_LABELS, pageAccueil } from "@/lib/referentiels";
import { ensureSeed } from "@/lib/db";
import { useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { Armoiries, DrapeauCongo, LogoMETP } from "@/components/nexus/logo";
import { FeedbackButton } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/* ------------------------------------------------------------------ */
/* Page de connexion                                                   */
/*                                                                     */
/* Tenue d'un service public : bandeau au timbre de l'État, fond clair, */
/* une seule carte au centre. Rien à faire sur cette page sinon entrer  */
/* — pas de vitrine, pas d'argument de vente.                          */
/* ------------------------------------------------------------------ */

/** Renvoie l'agent vers la procédure, plutôt que vers un formulaire qui n'existe pas. */
const PROCEDURE_MDP = {
  titre: "Réinitialisation du mot de passe",
  texte: "La réinitialisation est faite par la DGARH, sur demande écrite du chef de service.",
};
const PROCEDURE_COMPTE = {
  titre: "Ouverture d'un compte",
  texte: "Un compte est ouvert par la DGARH sur transmission de l'acte d'affectation de l'agent.",
};

export default function LoginPage() {
  const router = useRouter();
  const { data: utilisateurs = [], isLoading } = useUtilisateurs();
  const login = useAuth((s) => s.login);
  const user = useAuth((s) => s.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [openDemo, setOpenDemo] = useState(false);

  // La page peut être atteinte directement, sans passer par l'écran d'ouverture :
  // sans cet appel, la liste des comptes de démonstration resterait vide.
  useEffect(() => {
    ensureSeed().catch(() => {});
  }, []);

  useEffect(() => {
    if (user) router.replace(pageAccueil(user.role));
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    await new Promise((r) => setTimeout(r, 750));
    const found = utilisateurs.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.motDePasse === password
    );
    setPending(false);
    if (!found) {
      toast.error("Identifiants invalides", { description: "Vérifiez votre adresse professionnelle et votre mot de passe." });
      return;
    }
    if (!found.actif) {
      toast.error("Compte désactivé", { description: "Contactez la DGARH pour réactiver votre accès." });
      return;
    }
    login(found);
    toast.success(`Bienvenue, ${found.nomComplet}`, { description: ROLE_LABELS[found.role] });
    router.replace(pageAccueil(found.role));
  };

  const useDemo = (mail: string) => {
    setEmail(mail);
    setPassword("Nexus2026");
    setOpenDemo(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Bandeau de l'État */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <LogoMETP taille={44} compact className="min-w-0" />
          <span
            className="flex shrink-0 items-center gap-2 text-sm text-slate-600"
            title="La plateforme n'est publiée qu'en français."
          >
            <Languages aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Français</span>
            <DrapeauCongo largeur={26} className="ml-1" />
          </span>
        </div>
        <div aria-hidden className="flex h-[3px]">
          <span className="flex-1 bg-[#009543]" />
          <span className="flex-1 bg-[#FBDE4A]" />
          <span className="flex-1 bg-[#DC241F]" />
        </div>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        {/* Le blason en filigrane, très pâle : il habille le bas de page sans
            entrer en concurrence avec le formulaire. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center opacity-[0.045]">
          <Armoiries taille={420} />
        </div>

        <div className="relative z-10 w-full max-w-[440px]">
          <div className="rounded-md border border-slate-200 bg-white px-6 py-9 shadow-sm sm:px-10">
            <h1 className="text-center font-serif text-[28px] font-normal text-slate-800">
              Ouvrir une session
            </h1>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-normal text-slate-700">
                  Adresse professionnelle
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="prenom.nom@metp.gouv.cg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-[3px] border-slate-300 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-normal text-slate-700">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-[3px] border-slate-300 bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="remember" defaultChecked />
                <Label htmlFor="remember" className="text-sm font-normal text-slate-600">
                  Se souvenir de moi
                </Label>
              </div>

              <Button
                type="submit"
                disabled={pending || isLoading}
                className="h-11 w-full rounded-[3px] text-sm font-semibold"
              >
                {pending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authentification…</>
                  : "Suivant"}
              </Button>
            </form>

            <p className="mt-6 text-[13px] leading-relaxed text-slate-600">
              En me connectant, j&apos;accepte les conditions d&apos;usage du système
              d&apos;information de la DGARH et confirme avoir pris connaissance des règles de
              confidentialité applicables aux données personnelles des agents de l&apos;État.
            </p>

            <div className="mt-6 space-y-3.5 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() => toast.info(PROCEDURE_COMPTE.titre, { description: PROCEDURE_COMPTE.texte })}
                className="flex items-center gap-2.5 text-[15px] text-primary hover:underline"
              >
                <UserPlus className="h-[18px] w-[18px]" /> Demander l&apos;ouverture d&apos;un compte
              </button>
              <button
                type="button"
                onClick={() => toast.info(PROCEDURE_MDP.titre, { description: PROCEDURE_MDP.texte })}
                className="flex items-center gap-2.5 text-[15px] text-primary hover:underline"
              >
                <HelpCircle className="h-[18px] w-[18px] " /> Impossible de vous connecter ?
              </button>
            </div>

            <div className="mt-7 flex items-start gap-2.5 rounded-[3px] border border-amber-200 bg-amber-50 p-3.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-[12px] leading-relaxed text-amber-900">
                Les tentatives d&apos;accès sont enregistrées et contrôlées. L&apos;accès non
                autorisé à un traitement de données de l&apos;État est passible de poursuites.
              </p>
            </div>
          </div>

          {/* Comptes de démonstration — le seul bloc conservé sous la carte. */}
          <Collapsible open={openDemo} onOpenChange={setOpenDemo} className="mt-6">
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between rounded-[3px] border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Comptes de démonstration ({utilisateurs.length})
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openDemo ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 max-h-80 space-y-1.5 overflow-y-auto scrollbar-thin rounded-[3px] border border-slate-200 bg-white p-2">
              {utilisateurs.map((u) => (
                <button
                  key={u.id}
                  onClick={() => useDemo(u.email)}
                  className="flex w-full items-center justify-between gap-3 rounded-[3px] border border-transparent p-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">{u.nomComplet}</span>
                    <span className="block truncate text-xs text-slate-500">{u.email}</span>
                  </span>
                  <Badge variant="outline" className="shrink-0 border-slate-200 text-[10px] text-slate-600">
                    {ROLE_LABELS[u.role]}
                  </Badge>
                </button>
              ))}
              <p className="pt-1 text-center text-xs text-slate-500">
                Mot de passe commun :{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">Nexus2026</code>
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white px-4 py-5 text-center">
        <p className="text-xs font-medium text-slate-600">{MINISTERE_NOM}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          {APP_NAME} · DGARH · Unité · Travail · Progrès — données fictives, environnement de démonstration
        </p>
      </footer>

      {/* Onglet « Commentaires », fixé au bord droit. */}
      <FeedbackButton />
    </div>
  );
}
