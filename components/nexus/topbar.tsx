"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Bell, LogOut, Moon, RefreshCw, Search, Sun, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { ROLE_LABELS, entiteById } from "@/lib/referentiels";
import { useAgents, useNotifications, useResetData } from "@/lib/queries";
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
import { initials } from "@/lib/format";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: notifs = [] } = useNotifications();
  const { data: agents = [] } = useAgents();
  const reset = useResetData();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const ent = entiteById(user.entiteId);
  const nonLus = notifs.filter((n) => !n.lu).length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-6">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:bg-muted lg:max-w-md"
      >
        <Search className="h-4 w-4" />
        <span className="truncate">Rechercher un agent, un matricule…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] lg:inline">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Badge variant="outline" className="hidden border-primary/30 bg-primary/5 text-[10px] text-primary md:inline-flex">
          {ent?.sigle ?? "METP"}
        </Badge>

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
          <PopoverContent align="end" className="w-96 p-0">
            <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
            <div className="max-h-80 divide-y overflow-y-auto scrollbar-thin">
              {notifs.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        n.type === "alerte" ? "bg-amber-500" : n.type === "succes" ? "bg-emerald-500" : "bg-primary"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold">{n.titre}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.message}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground/70">{n.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initials(user.nomComplet.split(" ")[0], user.nomComplet.split(" ").slice(-1)[0])}
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
            <DropdownMenuItem onClick={() => router.push("/mon-dossier")}>
              <User className="mr-2 h-4 w-4" /> Mon espace
            </DropdownMenuItem>
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
                  router.push(`/agents/${a.id}`);
                }}
              >
                <span className="font-medium">{a.prenom} {a.nom}</span>
                <span className="ml-2 text-xs text-muted-foreground">{a.matricule}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
