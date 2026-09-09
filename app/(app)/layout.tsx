"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/store";
import { ROLE_LABELS, moduleDeRoute, peut } from "@/lib/referentiels";
import { AppSidebar, MobileNav } from "@/components/nexus/app-sidebar";
import { Topbar } from "@/components/nexus/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Contrôle d'accès par module — cahier §11. Un rôle qui n'a pas le module
  // ne doit pas voir la page, même en tapant l'URL.
  const mod = moduleDeRoute(pathname);
  const autorise = !mod || peut(user.role, mod);

  return (
    <div className="flex min-h-screen bg-muted/25">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 space-y-6 p-4 pb-24 lg:p-8 lg:pb-10">
          {autorise ? (
            children
          ) : (
            <div className="grid min-h-[55vh] place-items-center">
              <div className="max-w-sm text-center">
                <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <h2 className="mt-4 text-lg font-semibold">Accès non autorisé</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Votre rôle — {ROLE_LABELS[user.role]} — ne donne pas accès à ce module.
                  Le périmètre découle de votre rattachement dans l'organigramme.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
