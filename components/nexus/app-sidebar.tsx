"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, GitBranch, CalendarDays, GraduationCap, Star, Gavel, Network,
  Library, FolderOpen, BarChart3, Settings, UserCircle, ChevronLeft,
} from "lucide-react";
import { APP_NAME, LOGO_URL, ROLE_LABELS, can, type ModuleKey } from "@/lib/referentiels";
import { useAuth, useUi } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItem = { href: string; label: string; icon: any; mod: ModuleKey };

const GROUPS: { titre: string; items: NavItem[] }[] = [
  {
    titre: "Pilotage",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, mod: "dashboard" },
      { href: "/rapports", label: "Rapports & KPI", icon: BarChart3, mod: "rapports" },
    ],
  },
  {
    titre: "Ressources humaines",
    items: [
      { href: "/agents", label: "Agents", icon: Users, mod: "agents" },
      { href: "/carrieres", label: "Carrières & Actes", icon: GitBranch, mod: "carrieres" },
      { href: "/conges", label: "Congés & Absences", icon: CalendarDays, mod: "conges" },
      { href: "/formations", label: "Formation continue", icon: GraduationCap, mod: "formations" },
      { href: "/evaluations", label: "Évaluations", icon: Star, mod: "evaluations" },
      { href: "/discipline", label: "Discipline", icon: Gavel, mod: "discipline" },
    ],
  },
  {
    titre: "Organisation",
    items: [
      { href: "/organigramme", label: "Organigramme", icon: Network, mod: "organigramme" },
      { href: "/referentiels", label: "Référentiels", icon: Library, mod: "referentiels" },
      { href: "/documents", label: "GED documentaire", icon: FolderOpen, mod: "documents" },
    ],
  },
  {
    titre: "Espace personnel",
    items: [{ href: "/mon-dossier", label: "Mon dossier", icon: UserCircle, mod: "mon-dossier" }],
  },
  {
    titre: "Système",
    items: [{ href: "/administration", label: "Administration", icon: Settings, mod: "administration" }],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const { sidebarOpen, toggleSidebar } = useUi();
  if (!user) return null;

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(user.role, i.mod)) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-300 lg:flex",
        sidebarOpen ? "w-[268px]" : "w-[76px]"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-white">
          <Image src={LOGO_URL} alt="METP" fill sizes="40px" className="object-contain p-0.5" unoptimized />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold tracking-tight">{APP_NAME}</div>
            <div className="truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">SIRH • DGARH</div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {groups.map((g) => (
            <div key={g.titre}>
              {sidebarOpen && (
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {g.titre}
                </div>
              )}
              <div className="space-y-1">
                {g.items.map((i) => {
                  const active = pathname === i.href || pathname.startsWith(i.href + "/");
                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      title={i.label}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                        active
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
  if (!user) return null;
  const items = GROUPS.flatMap((g) => g.items).filter((i) => can(user.role, i.mod)).slice(0, 5);
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-background/95 backdrop-blur lg:hidden">
      {items.map((i) => {
        const active = pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
            <i.icon className="h-5 w-5" />
            <span className="truncate px-1">{i.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </div>
  );
}
