"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle, Eye, EyeOff, Fingerprint, Loader2, Lock, User, ShieldCheck, ChevronDown,
} from "lucide-react";
import { APP_NAME, LOGO_URL, MINISTERE_NOM, ROLE_LABELS } from "@/lib/referentiels";
import { LOGIN_BG_URL, LOGIN_VIDEO_URL } from "@/lib/assets";
import { useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [videoKo, setVideoKo] = useState(false);
  const reduceMotion = useReducedMotion();
  const fondAnime = Boolean(LOGIN_VIDEO_URL) && !reduceMotion && !videoKo;

  useEffect(() => {
    if (user) router.replace(user.role === "AGENT" ? "/mon-dossier" : "/dashboard");
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
    router.replace(found.role === "AGENT" ? "/mon-dossier" : "/dashboard");
  };

  const useDemo = (mail: string) => {
    setEmail(mail);
    setPassword("Nexus2026");
    setOpenDemo(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04121a] px-4 py-10 sm:px-6 sm:py-14">
      {/* Fond plein écran : vidéo si LOGIN_VIDEO_URL est renseigné, image sinon */}
      {fondAnime ? (
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={LOGIN_BG_URL}
          onError={() => setVideoKo(true)}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={LOGIN_VIDEO_URL as string} />
        </video>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${LOGIN_BG_URL})` }}
        />
      )}
      <div aria-hidden className="absolute inset-0 bg-[#04121a]/45" />
      <div aria-hidden className="absolute inset-0 nexus-grid opacity-25" />

      <div className="relative z-10 w-full max-w-md">
        {/* Marque */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-white nexus-glow">
            <Image src={LOGO_URL} alt="Armoiries METP" fill sizes="64px" className="object-contain p-0.5" priority unoptimized />
          </div>
          <div className="mt-3 text-xl font-extrabold tracking-tight text-white">{APP_NAME}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-[#90E0EF]">République du Congo</div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="border-white/15 bg-white/5 text-[10px] uppercase tracking-wider text-white/70">
            <Lock className="mr-1.5 h-3 w-3" /> Chiffré AES-256
          </Badge>
          <Badge variant="outline" className="border-[#00B4D8]/40 bg-[#00B4D8]/10 text-[10px] uppercase tracking-wider text-[#90E0EF]">
            <Fingerprint className="mr-1.5 h-3 w-3" /> Habilitation niveau 5
          </Badge>
        </div>

        <Card className="rounded-2xl border-white/10 shadow-2xl shadow-black/50">
          <CardHeader className="space-y-1.5 pb-6 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Terminal d&apos;Accès</CardTitle>
            <CardDescription>Entrez vos identifiants pour accéder au système</CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Adresse Email</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="prenom.nom@metp.gouv.cg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Mot de passe</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-transparent bg-muted/60 pl-9 pr-10 focus-visible:border-input focus-visible:bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" defaultChecked />
                  <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                    Se souvenir de moi
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => toast.info("Procédure DGARH", { description: "La réinitialisation est effectuée par la Direction des Ressources Humaines." })}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <Button type="submit" className="h-11 w-full text-sm font-semibold uppercase tracking-wide" disabled={pending || isLoading}>
                {pending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authentification…</>
                ) : (
                  <><ShieldCheck className="mr-2 h-4 w-4" /> Accéder au système</>
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Avis de sécurité</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Toutes les tentatives d&apos;accès sont enregistrées et surveillées. L&apos;accès non autorisé est
                    interdit et sera poursuivi dans toute la mesure du droit.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-[11px] text-white/40">
          Protégé par chiffrement quantique · Certifié ISO 27001
        </p>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1 bg-white/15" />
          <span className="text-[10px] uppercase tracking-widest text-white/40">Maquette</span>
          <Separator className="flex-1 bg-white/15" />
        </div>

        <Collapsible open={openDemo} onOpenChange={setOpenDemo}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Comptes de démonstration ({utilisateurs.length})
              <ChevronDown className={`h-4 w-4 transition-transform ${openDemo ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 max-h-72 space-y-2 overflow-y-auto scrollbar-thin pr-1">
            {utilisateurs.map((u) => (
              <button
                key={u.id}
                onClick={() => useDemo(u.email)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#00B4D8]/50 hover:bg-[#00B4D8]/10"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{u.nomComplet}</div>
                  <div className="truncate text-xs text-white/50">{u.email}</div>
                </div>
                <Badge variant="outline" className="shrink-0 border-white/15 bg-white/5 text-[10px] text-white/70">
                  {ROLE_LABELS[u.role]}
                </Badge>
              </button>
            ))}
            <p className="pt-1 text-center text-xs text-white/50">
              Mot de passe commun : <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/80">Nexus2026</code>
            </p>
          </CollapsibleContent>
        </Collapsible>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/40">
          {MINISTERE_NOM}
          <br />Données fictives — environnement de démonstration
        </p>
      </div>
    </div>
  );
}
