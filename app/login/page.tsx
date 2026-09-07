"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight, Eye, EyeOff, Fingerprint, Loader2, Lock, Mail, ShieldCheck, Database, Users, GitBranch, ChevronDown,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE, LOGO_URL, MINISTERE_NOM, ROLE_LABELS } from "@/lib/referentiels";
import { useUtilisateurs } from "@/lib/queries";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-center bg-background px-6 py-12">
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

          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
            <Fingerprint className="mr-1.5 h-3 w-3" /> Accès sécurisé
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Connexion à la plateforme</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Utilisez votre adresse professionnelle <span className="font-medium text-foreground">@metp.gouv.cg</span>. Vos droits sont déterminés automatiquement par votre profil.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse professionnelle</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="prenom.nom@metp.gouv.cg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info("Procédure DGARH", { description: "La réinitialisation est effectuée par la Direction des Ressources Humaines." })}>
                  Mot de passe oublié ?
                </button>
              </div>
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
                  className="h-11 pl-9 pr-10"
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" defaultChecked />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                Conserver ma session sur cet appareil
              </Label>
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={pending || isLoading}>
              {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authentification…</> : <>Se connecter <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>

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
