"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Archive, Award, Banknote, BarChart3, BookMarked, Briefcase, Building2, CalendarDays, ChevronDown, ChevronLeft, CircleHelp, ClipboardList, Contact, CreditCard, FileCheck2, FileSignature, FolderOpen, Gauge, Gavel, GitBranch, GraduationCap, Inbox, Landmark, LayoutDashboard, Library, LifeBuoy, Map, Megaphone, MessageSquare, MoreHorizontal, Network, PenLine, Globe2, ScrollText, Settings, ShieldCheck, UserCheck, UserCircle, UserMinus, Users,
} from "lucide-react";
import { APP_NAME, ROLE_LABELS, peut, type ModuleKey } from "@/lib/referentiels";
import { Armoiries } from "@/components/nexus/logo";
import { useAuth, useUi } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavItem = {
  href: string; label: string; icon: any; mod: ModuleKey;
  /** false = module au cahier mais pas encore implémenté : affiché, non cliquable. */
  pret?: boolean;
};

/*
 * Les groupes suivent les métiers, pas les modules : on cherche « où sont les
 * dossiers », pas « où est la page des actes ». Ils se replient, et celui qui
 * contient la page ouverte se déplie de lui-même.
 */
const GROUPES: { titre: string; items: NavItem[] }[] = [
  {
    titre: "Pilotage",
    items: [
      /* Le tableau de bord vient en premier, pour tous — ministre compris.
         C'est la page qui porte les effectifs, les dossiers et les courbes :
         celle qu'on ouvre en arrivant. « Pilotage du ministère » pose les
         quatre questions du ministre et se lit après les chiffres, pas avant. */
      { href: "/dgarh", label: "Tableau de bord", icon: LayoutDashboard, mod: "dgarh", pret: true },
      { href: "/ministre", label: "Pilotage du ministère", icon: ShieldCheck, mod: "ministre", pret: true },
      { href: "/dgarh/pilotage", label: "Pilotage des directions", icon: Gauge, mod: "pilotage", pret: true },
      { href: "/dgarh/national", label: "Vue nationale", icon: Map, mod: "national", pret: true },
      { href: "/rapports", label: "Rapports et états", icon: BarChart3, mod: "rapports", pret: true },
    ],
  },
  {
    titre: "Organisation",
    items: [
      /* « Organisation » nommait à la fois le groupe, l'entrée et le module :
         trois fois le même mot pour trois choses différentes, et personne ne
         savait où se créait une direction. L'entrée dit maintenant ce qu'on y
         trouve — le registre des directions, services et bureaux. */
      { href: "/dgarh/organisation", label: "Directions et services", icon: Landmark, mod: "organisation", pret: true },
      { href: "/dgarh/organigramme", label: "Organigramme", icon: Network, mod: "organigramme", pret: true },
      { href: "/delegations", label: "Délégations et intérims", icon: PenLine, mod: "delegations", pret: true },
    ],
  },
  {
    titre: "Personnel",
    items: [
      { href: "/dgarh/agents", label: "Agents", icon: Users, mod: "agents", pret: true },
      { href: "/presences", label: "Présences et pointages", icon: UserCheck, mod: "presences", pret: true },
      { href: "/sorties", label: "Sorties du territoire", icon: Globe2, mod: "sorties", pret: true },
      { href: "/annuaire", label: "Annuaire", icon: Contact, mod: "annuaire", pret: true },
      { href: "/cartes", label: "Cartes professionnelles", icon: CreditCard, mod: "cartes", pret: true },
    ],
  },
  {
    titre: "Dossiers et actes",
    items: [
      { href: "/dgarh/bannette", label: "Ma bannette", icon: Inbox, mod: "actes", pret: true },
      { href: "/dgarh/actes", label: "Registre des actes", icon: FileCheck2, mod: "actes", pret: true },
      { href: "/carrieres", label: "Carrières", icon: GitBranch, mod: "carrieres", pret: true },
      { href: "/conges", label: "Congés et positions", icon: CalendarDays, mod: "conges", pret: true },
      { href: "/formations", label: "Formation", icon: GraduationCap, mod: "formations", pret: true },
      { href: "/contentieux", label: "Contentieux", icon: Gavel, mod: "contentieux", pret: true },
    ],
  },
  {
    titre: "Emplois et effectifs",
    items: [
      { href: "/postes", label: "Tableau des emplois", icon: Briefcase, mod: "postes", pret: true },
      { href: "/besoins", label: "États de besoins", icon: ClipboardList, mod: "besoins", pret: true },
      { href: "/recrutement", label: "Recrutement et concours", icon: Award, mod: "recrutement", pret: true },
      { href: "/remuneration", label: "Rémunération", icon: Banknote, mod: "remuneration", pret: true },
      { href: "/retraite", label: "Départs à la retraite", icon: UserMinus, mod: "retraite", pret: true },
    ],
  },
  {
    titre: "Documentation",
    items: [
      { href: "/textes", label: "Fonds réglementaire", icon: BookMarked, mod: "textes", pret: true },
      { href: "/documents", label: "Documents et GED", icon: FolderOpen, mod: "documents", pret: true },
      { href: "/redaction", label: "Rédaction", icon: FileSignature, mod: "redaction", pret: true },
      { href: "/archives", label: "Archives", icon: Archive, mod: "archives", pret: true },
    ],
  },
  {
    titre: "Échanges",
    items: [
      { href: "/messagerie", label: "Messagerie", icon: MessageSquare, mod: "messagerie", pret: true },
      { href: "/tickets", label: "Réclamations", icon: LifeBuoy, mod: "tickets", pret: true },
      { href: "/annonces", label: "Notes et circulaires", icon: Megaphone, mod: "annonces", pret: true },
    ],
  },
  {
    titre: "Mon espace",
    items: [
      { href: "/mon-dossier", label: "Mon dossier", icon: UserCircle, mod: "mon-dossier", pret: true },
      { href: "/aide", label: "Aide", icon: CircleHelp, mod: "aide", pret: true },
    ],
  },
  {
    titre: "Supervision",
    items: [
      /* Les référentiels sont les nomenclatures du système — corps, grades,
         échelons, catégories — et non de la documentation. Les ranger ici,
         c'est les mettre là où on les cherche : avec le journal et les profils,
         entre les mains de qui règle la plateforme. */
      { href: "/referentiels", label: "Référentiels", icon: Library, mod: "referentiels", pret: true },
      { href: "/journal", label: "Journal d'audit", icon: ScrollText, mod: "journal", pret: true },
      { href: "/profils", label: "Profils d'accès", icon: ShieldCheck, mod: "profils", pret: true },
      { href: "/administration", label: "Système", icon: Settings, mod: "administration", pret: true },
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
  const [replies, setReplies] = useState<Record<string, boolean>>({});
  if (!user) return null;

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-300 lg:flex",
        sidebarOpen ? "w-[272px]" : "w-[76px]"
      )}
    >
      {/* Le timbre de l'État ouvre la barre, sous le filet tricolore : la même
          marque qu'à l'écran d'ouverture et sur les documents imprimés. */}
      <div>
        <div className="flex h-16 items-center gap-3 px-4">
          <Armoiries taille={38} />
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold tracking-tight">{APP_NAME}</div>
              <div className="truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">SIRH · DGARH</div>
            </div>
          )}
        </div>
        <div aria-hidden className="flex h-[3px]">
          <span className="flex-1 bg-[#009543]" />
          <span className="flex-1 bg-[#FBDE4A]" />
          <span className="flex-1 bg-[#DC241F]" />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-3">
          {groupes.map((g) => {
            const porteLActif = g.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
            const deplie = !sidebarOpen || replies[g.titre] === undefined ? porteLActif || !sidebarOpen : !replies[g.titre];
            return (
            <div key={g.titre}>
              {sidebarOpen && (
                <button
                  onClick={() => setReplies((r) => ({ ...r, [g.titre]: deplie }))}
                  className="mb-1 flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 transition hover:text-foreground"
                >
                  {g.titre}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", !deplie && "-rotate-90")} />
                </button>
              )}
              <div className={cn("space-y-0.5", !deplie && "hidden")}>
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
            );
          })}
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
  const [menu, setMenu] = useState(false);
  if (!user) return null;

  const tous = groupes.flatMap((g) => g.items).filter((i) => i.pret);
  const items = tous.slice(0, 4);
  const lien = "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]";

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-background/95 backdrop-blur print:hidden lg:hidden">
        {items.map((i) => {
          const actif = pathname === i.href || pathname.startsWith(i.href + "/");
          return (
            <Link
              key={i.href} href={i.href}
              className={cn(lien, actif ? "text-primary" : "text-muted-foreground")}
            >
              <i.icon className="h-5 w-5" />
              <span className="truncate px-1">{i.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button onClick={() => setMenu(true)} className={cn(lien, "text-muted-foreground")}>
          <MoreHorizontal className="h-5 w-5" />
          <span className="px-1">Plus</span>
        </button>
      </div>

      {/* Toute la navigation, atteignable sur téléphone. */}
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto lg:hidden">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2.5">
              <Armoiries taille={26} />
              Navigation
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5 pb-6">
            {groupes.map((g) => (
              <div key={g.titre}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {g.titre}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {g.items.filter((i) => i.pret).map((i) => {
                    const actif = pathname === i.href || pathname.startsWith(i.href + "/");
                    return (
                      <Link
                        key={i.href} href={i.href}
                        onClick={() => setMenu(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition",
                          actif ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <i.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{i.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
