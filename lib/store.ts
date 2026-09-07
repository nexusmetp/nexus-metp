"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Utilisateur } from "@/lib/types";

interface AuthState {
  user: Utilisateur | null;
  hydrated: boolean;
  login: (u: Utilisateur) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      login: (u) => set({ user: u }),
      logout: () => set({ user: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "nexus-metp-auth",
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

interface UiState {
  sidebarOpen: boolean;
  splashSeen: boolean;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  markSplashSeen: () => void;
}

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      splashSeen: false,
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebar: (v) => set({ sidebarOpen: v }),
      markSplashSeen: () => set({ splashSeen: true }),
    }),
    { name: "nexus-metp-ui" }
  )
);

interface FilterState {
  q: string;
  entiteId: string;
  categorie: string;
  statut: string;
  etat: string;
  page: number;
  set: (p: Partial<Omit<FilterState, "set" | "reset">>) => void;
  reset: () => void;
}

const filterInit = { q: "", entiteId: "all", categorie: "all", statut: "all", etat: "all", page: 1 };

export const useAgentFilters = create<FilterState>((set) => ({
  ...filterInit,
  set: (p) => set((s) => ({ ...s, ...p, page: p.page ?? 1 })),
  reset: () => set(filterInit),
}));
