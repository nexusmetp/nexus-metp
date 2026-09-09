"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle, Eye, EyeOff, Fingerprint, Loader2, Lock, User, ShieldCheck, Database, Users, GitBranch, ChevronDown,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE, LOGO_URL, MINISTERE_NOM, ROLE_LABELS } from "@/lib/referentiels";
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

const ATOUTS = [
  { icon: Users, titre: "Dossier agent unique", texte: "Un dossier administratif centralisé et historisé pour chaque agent du METP." },
  { icon: GitBranch, titre: "Workflows dématérialisés", texte: "Nominations, mutations et avancements validés électroniquement." },
  { icon: Database, titre: "Cache navigateur IndexedDB", texte: "Consultation fluide même en connectivité dégradée." },
  { icon: ShieldCheck, titre: "Sécurité & traçabilité", texte: "RBAC par niveau administratif, journalisation complète des accès." },
];

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
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panneau institutionnel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#04121a] p-12 text-white lg:flex">
        <div className="absolute inset-0 nexus-grid opacity-35" />
        <div className="absolute -left-24 top-1/4 h-[460px] w-[460px] rounded-full bg-[#00B4D8]/22 blur-[130px]" />
        <div className="absolute -right-24 bottom-0 h-[380px] w-[380px] rounded-full bg-[#0077B6]/22 blur-[120px]" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white">
            <Image src={LOGO_URL} alt="Armoiries METP" fill sizes="56px" className="object-contain p-0.5" unoptimized />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight">{APP_NAME}</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#90E0EF]">République du Congo</div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.h2
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl font-bold leading-tight"
          >
            La gestion des ressources humaines du METP,{" "}
            <span className="text-[#00B4D8]">entièrement dématérialisée</span>.
          </motion.h2>
          <p className="mt-4 text-sm leading-relaxed text-white/60">{APP_TAGLINE} — piloté par la DGARH, déployé du Cabinet du Ministre aux 15 directions départementales.</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {ATOUTS.map((a, i) => (
              <motion.div
                key={a.titre}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
              >
                <a.icon className="h-5 w-5 text-[#00B4D8]" />
                <div className="mt-3 text-sm font-semibold">{a.titre}</div>
                <div className="mt-1 text-xs leading-relaxed text-white/50">{a.texte}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-[10px] uppercase tracking-[0.24em] text-white/35">
          <span>Ordonnance 81-013</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>Conforme RGPD</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>DGARH 2026</span>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center bg-muted/30 px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border">
              <Image src={LOGO_URL} alt="METP" fill sizes="48px" className="object-contain" unoptimized />
            </div>
            <div>
              <div className="text-lg font-extrabold">{APP_NAME}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">SIRH — METP</div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="border-border bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Lock className="mr-1.5 h-3 w-3" /> Chiffré AES-256
            </Badge>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-[10px] uppercase tracking-wider text-primary">
              <Fingerprint className="mr-1.5 h-3 w-3" /> Habilitation niveau 5
            </Badge>
          </div>

          <Card className="rounded-2xl border-border/70 shadow-xl shadow-primary/5">
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
                      onClick={() => setShow((s) => !s)}
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

          <p className="mt-5 text-center text-[11px] text-muted-foreground/80">
            Protégé par chiffrement quantique · Certifié ISO 27001
          </p>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Maquette</span>
            <Separator className="flex-1" />
          </div>

          <Collapsible open={openDemo} onOpenChange={setOpenDemo}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Comptes de démonstration ({utilisateurs.length})
                <ChevronDown className={`h-4 w-4 transition-transform ${openDemo ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 max-h-72 space-y-2 overflow-y-auto scrollbar-thin pr-1">
              {utilisateurs.map((u) => (
                <button
                  key={u.id}
                  onClick={() => useDemo(u.email)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{u.nomComplet}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{ROLE_LABELS[u.role]}</Badge>
                </button>
              ))}
              <p className="pt-1 text-center text-xs text-muted-foreground">Mot de passe commun : <code className="rounded bg-muted px-1.5 py-0.5 font-mono">Nexus2026</code></p>
            </CollapsibleContent>
          </Collapsible>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            {MINISTERE_NOM}
            <br />Données fictives — environnement de démonstration
          </p>
        </div>
      </div>
    </div>
  );
}
