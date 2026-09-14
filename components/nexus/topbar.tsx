"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bell, FileClock, KeyRound, LifeBuoy, LogOut, Megaphone, Moon, RefreshCw, Search, Sun,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { ROLE_LABELS, STATUTS_EN_COURS, cheminDe, entiteById } from "@/lib/referentiels";
import {
  useActes, useAgents, useAnnonces, useResetData, useTickets,
} from "@/lib/queries";
import { Armoiries } from "@/components/nexus/logo";
import { DialogueMotDePasse } from "@/components/nexus/mot-de-passe";
import { FilAssistance } from "@/components/ia/fil-assistance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { fmtDate, initiales, joursDepuis } from "@/lib/format";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [motDePasse, setMotDePasse] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: agents = [] } = useAgents();
  const { data: actes = [] } = useActes();
  const { data: tickets = [] } = useTickets();
  const { data: annonces = [] } = useAnnonces();
  const reset = useResetData();
  const [open, setOpen] = useState(false);
  const [vues, setVues] = useState<string[]>([]);

  // Ctrl K : le raccourci était affiché sans être branché.
  useEffect(() => {
    const sur = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", sur);
    return () => window.removeEventListener("keydown", sur);
  }, []);

  /* Les alertes se déduisent de l'état réel des dossiers : un dossier qui
     dort dans votre bannette, une réclamation qui vous est confiée, une
     circulaire dont on attend votre accusé. Chacune mène quelque part. */
  const alertes = useMemo(() => {
    if (!user) return [];
    const chaine = new Set(cheminDe(user.entiteId).map((e) => e.id));
    const out: {
      id: string; titre: string; message: string; href: string;
      icon: any; grave: boolean; date?: string;
    }[] = [];

    const miens = actes.filter((a) => a.assigneA === user.id && STATUTS_EN_COURS.includes(a.statut));
    const enRetard = miens.filter((a) => joursDepuis(a.dateCreation) > 15);
    if (enRetard.length) {
      out.push({
        id: "actes-retard",
        titre: `${enRetard.length} dossier${enRetard.length > 1 ? "s" : ""} au-delà du délai`,
        message: "Ils vous sont confiés et dépassent quinze jours d'instruction.",
        href: "/dgarh/bannette", icon: FileClock, grave: true,
      });
    }

    const aMoi = tickets.filter((t) => t.assigneA === user.id && !["RESOLU", "CLOS"].includes(t.statut));
    if (aMoi.length) {
      out.push({
        id: "tickets-assignes",
        titre: `${aMoi.length} réclamation${aMoi.length > 1 ? "s" : ""} à traiter`,
        message: "Elles vous ont été confiées et attendent une réponse.",
        href: "/tickets", icon: LifeBuoy,
        grave: aMoi.some((t) => new Date(t.echeance).getTime() < Date.now()),
      });
    }

    annonces
      .filter((a) => a.accuseRequis
        && !a.accuses.some((x) => x.utilisateurId === user.id)
        && (a.portee === "MINISTERE" || chaine.has(a.entiteId)))
      .slice(0, 4)
      .forEach((a) => out.push({
        id: a.id, titre: a.titre,
        message: `${a.auteur} — accusé de lecture attendu.`,
        href: "/annonces", icon: Megaphone, grave: false, date: a.dateEmission,
      }));

    return out;
  }, [user, actes, tickets, annonces]);

  if (!user) return null;
  const ent = entiteById(user.entiteId);
  const nonLus = alertes.filter((a) => !vues.includes(a.id)).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 relative items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-6">
      {/* Sur téléphone la barre latérale est repliée : c'est ici que le timbre
          de l'État se tient, sinon l'application n'en porterait aucun. */}
      <Armoiries taille={30} className="lg:hidden" />
      {/* min-w-0 : sans lui, un élément flex refuse de descendre sous la largeur
          de son contenu, et pousse toute la barre hors de l'écran. */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:bg-muted lg:max-w-md"
      >
        <Search className="h-4 w-4" />
        <span className="truncate">Rechercher un agent, un matricule…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] lg:inline">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Badge variant="outline" className="hidden border-primary/30 bg-primary/5 text-[10px] text-primary md:inline-flex">
          {ent?.sigle ?? "METP"}
        </Badge>

        {/* L'assistant ne s'affiche que si l'administrateur l'a ouvert :
            un bouton qui échoue vaut moins qu'un bouton absent. */}
        <FilAssistance />

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {nonLus > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {nonLus}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[22rem] p-0">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <span className="text-sm font-semibold">Ce qui vous attend</span>
              {nonLus > 0 && (
                <Button
                  variant="ghost" size="sm" className="h-7 text-[11px]"
                  onClick={() => setVues(alertes.map((a) => a.id))}
                >
                  Tout marquer comme lu
                </Button>
              )}
            </div>
            <div className="max-h-80 divide-y overflow-y-auto scrollbar-thin">
              {alertes.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  onClick={() => setVues((v) => (v.includes(a.id) ? v : [...v, a.id]))}
                  className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <a.icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.grave ? "text-amber-600" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{a.titre}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.message}</div>
                    {a.date && <div className="mt-1 text-[10px] text-muted-foreground/70">{fmtDate(a.date)}</div>}
                  </div>
                  {!vues.includes(a.id) && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                </Link>
              ))}
              {alertes.length === 0 && (
                <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                  Rien ne vous attend. Votre bannette est à jour.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initiales(user.nomComplet.split(" ")[0], user.nomComplet.split(" ").slice(-1)[0])}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <div className="max-w-[150px] truncate text-xs font-semibold leading-tight">{user.nomComplet}</div>
                <div className="max-w-[150px] truncate text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="text-sm">{user.nomComplet}</div>
              <div className="text-xs font-normal text-muted-foreground">{user.fonction}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Changer son mot de passe ne dépend d'aucun profil : c'est le
                menu de la personne, pas un module qu'on peut lui fermer. */}
            <DropdownMenuItem onClick={() => setMotDePasse(true)}>
              <KeyRound className="mr-2 h-4 w-4" /> Changer mon mot de passe
              {user.motDePasseAChanger && (
                <Badge variant="outline" className="ml-auto text-[9px]">à faire</Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                reset.mutate(undefined, {
                  onSuccess: () => toast.success("Cache navigateur réinitialisé", { description: "Les données fictives ont été rechargées dans IndexedDB." }),
                })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Réinitialiser le cache local
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Un compte dont le mot de passe est encore le provisoire ne fait rien
          d'autre avant d'en avoir changé : celui qui le lui a remis le connaît,
          et tant qu'il n'a pas changé, l'accès n'est pas personnel. */}
      <DialogueMotDePasse
        ouvert={motDePasse || !!user.motDePasseAChanger}
        force={!!user.motDePasseAChanger}
        surFermeture={() => setMotDePasse(false)}
      />

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Nom, prénom ou matricule…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Agents">
            {agents.slice(0, 200).map((a) => (
              <CommandItem
                key={a.id}
                value={`${a.prenom} ${a.nom} ${a.matricule}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/dgarh/agents/${a.id}`);
                }}
              >
                <span className="font-medium">{a.prenom} {a.nom}</span>
                <span className="ml-2 text-xs text-muted-foreground">{a.matricule}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Filet tricolore, dans le prolongement de celui de la barre latérale :
          la même règle court sans interruption en haut de l'application. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-[2px]">
        <span className="flex-1 bg-[#009543]" />
        <span className="flex-1 bg-[#FBDE4A]" />
        <span className="flex-1 bg-[#DC241F]" />
      </div>
    </header>
  );
}
