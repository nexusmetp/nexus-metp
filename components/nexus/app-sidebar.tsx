"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Building2, Network, Users, FileCheck2, GitBranch, CalendarDays, GraduationCap,
  Gavel, ClipboardList, Library, FolderOpen, BarChart3, ScrollText, Settings,
  UserCircle, ChevronLeft,
} from "lucide-react";
import { APP_NAME, LOGO_URL, ROLE_LABELS, peut, type ModuleKey } from "@/lib/referentiels";
import { useAuth, useUi } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItem = {
  href: string; label: string; icon: any; mod: ModuleKey;
  /** false = module au cahier mais pas encore implémenté : affiché, non cliquable. */
  pret?: boolean;
};

const GROUPES: { titre: string; items: NavItem[] }[] = [
  {
    titre: "Direction générale",
    items: [
      { href: "/dgarh", label: "Espace DGARH", icon: Building2, mod: "dgarh", pret: true },
      { href: "/dgarh/organigramme", label: "Organigramme", icon: Network, mod: "organigramme", pret: true },
      { href: "/dgarh/agents", label: "Agents", icon: Users, mod: "agents", pret: true },
      { href: "/dgarh/actes", label: "Actes", icon: FileCheck2, mod: "actes", pret: true },
    ],
  },
  {
    titre: "Gestion du personnel",
    items: [
      { href: "/carrieres", label: "Carrières", icon: GitBranch, mod: "carrieres" },
      { href: "/conges", label: "Congés et positions", icon: CalendarDays, mod: "conges" },
      { href: "/formations", label: "Formation", icon: GraduationCap, mod: "formations" },
      { href: "/contentieux", label: "Contentieux", icon: Gavel, mod: "contentieux" },
    ],
  },
  {
    titre: "Déconcentration",
    items: [{ href: "/besoins", label: "États de besoins", icon: ClipboardList, mod: "besoins" }],
  },
  {
    titre: "Ressources",
    items: [
      { href: "/referentiels", label: "Référentiels", icon: Library, mod: "referentiels" },
      { href: "/documents", label: "Archives et GED", icon: FolderOpen, mod: "documents" },
      { href: "/rapports", label: "Rapports", icon: BarChart3, mod: "rapports" },
    ],
  },
  {
    titre: "Espace personnel",
    items: [{ href: "/mon-dossier", label: "Mon dossier", icon: UserCircle, mod: "mon-dossier" }],
  },
  {
    titre: "Système",
    items: [
      { href: "/journal", label: "Journal d'audit", icon: ScrollText, mod: "journal" },
      { href: "/administration", label: "Administration", icon: Settings, mod: "administration" },
    ],
  },
];

function useGroupesAutorises() {
  const user = useAuth((s) => s.user);
  if (!user) return [];
  return GROUPES
    .map((g) => ({ ...g, items: g.items.filter((i) => peut(user.role, i.mod)) }))
    .filter((g) => g.items.length > 0);
}

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const { sidebarOpen, toggleSidebar } = useUi();
  const groupes = useGroupesAutorises();
  if (!user) return null;

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-300 lg:flex",
        sidebarOpen ? "w-[272px]" : "w-[76px]"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-white">
          <Image src={LOGO_URL} alt="METP" fill sizes="40px" className="object-contain p-0.5" unoptimized />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold tracking-tight">{APP_NAME}</div>
            <div className="truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">SIRH · DGARH</div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-5">
          {groupes.map((g) => (
            <div key={g.titre}>
              {sidebarOpen && (
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {g.titre}
                </div>
              )}
              <div className="space-y-0.5">
                {g.items.map((i) => {
                  const actif = pathname === i.href || pathname.startsWith(i.href + "/");
                  const base = "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition";

                  // Module prévu au cahier mais non implémenté : on l'affiche sans
                  // y mener, plutôt que d'envoyer sur une 404.
                  if (!i.pret) {
                    return (
                      <div
                        key={i.href}
                        title={`${i.label} — module non encore implémenté`}
                        aria-disabled="true"
                        className={cn(base, "cursor-not-allowed text-sidebar-foreground/35", !sidebarOpen && "justify-center px-0")}
                      >
                        <i.icon className="h-[18px] w-[18px] shrink-0" />
                        {sidebarOpen && (
                          <>
                            <span className="truncate">{i.label}</span>
                            <span className="ml-auto rounded border border-current/25 px-1 text-[8.5px] font-semibold uppercase tracking-wider opacity-70">
                              à venir
                            </span>
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      title={i.label}
                      className={cn(
                        base,
                        actif
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        !sidebarOpen && "justify-center px-0"
                      )}
                    >
                      <i.icon className="h-[18px] w-[18px] shrink-0" />
                      {sidebarOpen && <span className="truncate">{i.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t p-3">
        {sidebarOpen && (
          <div className="mb-3 rounded-lg bg-primary/5 p-3">
            <div className="truncate text-xs font-semibold">{user.nomComplet}</div>
            <div className="truncate text-[10px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs text-muted-foreground transition hover:bg-accent"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", !sidebarOpen && "rotate-180")} />
          {sidebarOpen && "Réduire"}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const groupes = useGroupesAutorises();
  if (!user) return null;
  const items = groupes.flatMap((g) => g.items).filter((i) => i.pret).slice(0, 5);
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-background/95 backdrop-blur lg:hidden">
      {items.map((i) => {
        const actif = pathname === i.href || pathname.startsWith(i.href + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]",
              actif ? "text-primary" : "text-muted-foreground"
            )}
          >
            <i.icon className="h-5 w-5" />
            <span className="truncate px-1">{i.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </div>
  );
}
