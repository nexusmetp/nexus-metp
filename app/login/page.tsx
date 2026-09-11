"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { APP_NAME, ROLE_LABELS, pageAccueil } from "@/lib/referentiels";
import { useTextes } from "@/lib/langues";
import { ensureSeed } from "@/lib/db";
import { useAuth } from "@/lib/store";
import type { Utilisateur } from "@/lib/types";
import { LogoMETP } from "@/components/nexus/logo";
import { SelecteurLangue } from "@/components/nexus/selecteur-langue";
import { FeedbackButton } from "@/components/feedback";
import { Formulaire } from "./formulaire";
import { Confirmation } from "./confirmation";
import { FOND_MINISTERE } from "@/lib/referentiels";

/* ------------------------------------------------------------------ */
/* Écran de connexion                                                  */
/*                                                                     */
/* Deux temps : on vérifie l'identité, puis on la confirme et on ouvre  */
/* la session. Séparer les deux permet de porter les conditions d'usage */
/* à la connaissance de l'agent au moment où elles s'appliquent.        */
/*                                                                     */
/* L'écran tient dans la fenêtre et ne défile jamais : les paliers de   */
/* compacité sont dans globals.css, sur la HAUTEUR de la fenêtre — car  */
/* c'est la hauteur qui manque sur un portable de service.              */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const user = useAuth((s) => s.user);
  const t = useTextes();

  /** L'agent reconnu, tant que la session n'est pas encore ouverte. */
  const [reconnu, setReconnu] = useState<Utilisateur | null>(null);

  // La page peut être atteinte directement, sans passer par l'écran
  // d'ouverture : sans cet appel, la liste des comptes resterait vide.
  useEffect(() => {
    ensureSeed().catch(() => {});
  }, []);

  useEffect(() => {
    if (user) router.replace(pageAccueil(user.role));
  }, [user, router]);

  const entrer = () => {
    if (!reconnu) return;
    login(reconnu);
    toast.success(`${t.messages.bienvenue}, ${reconnu.nomComplet}`, {
      description: ROLE_LABELS[reconnu.role],
    });
    router.replace(pageAccueil(reconnu.role));
  };

  return (
    <div className="ecran-connexion relative flex flex-col">
      {/* Le bureau du ministre en fond, sous un voile de lisibilité. La photo
          est posée en position fixe plutôt qu'en background-attachment : sur
          téléphone, le fond attaché saute pendant le défilement. */}
      <div
        aria-hidden
        className="fond-ministere fixed inset-0 -z-20"
        style={FOND_MINISTERE ? { backgroundImage: `url(${FOND_MINISTERE})` } : undefined}
      />
      <div aria-hidden className="voile-connexion fixed inset-0 -z-10" />

      {/* Bandeau de l'État : le timbre à gauche, la langue à droite, chacun
          au bord de l'écran. */}
      <header className="shrink-0 border-b border-white/20 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 px-3 py-2 sm:px-5">
          <LogoMETP taille={38} compact className="min-w-0" />
          <SelecteurLangue />
        </div>
        <div aria-hidden className="flex h-[3px]">
          <span className="flex-1 bg-[#009543]" />
          <span className="flex-1 bg-[#FBDE4A]" />
          <span className="flex-1 bg-[#DC241F]" />
        </div>
      </header>

      {/* Plus de blason en filigrane : la photo porte déjà les armoiries au
          mur, un second emblème par-dessus ne ferait que du bruit. */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4">
        <div className="colonne-connexion relative z-10 w-full max-w-[430px]">
          {reconnu
            ? <Confirmation utilisateur={reconnu} onContinuer={entrer} />
            : <Formulaire onValide={setReconnu} />}
        </div>
      </main>

      <footer className="pied-connexion shrink-0 border-t border-white/15 bg-slate-950/45 px-4 py-2.5 text-center backdrop-blur-sm">
        <p className="text-[11px] font-medium text-white/85">{t.etat.ministere}</p>
        <p className="mt-0.5 text-[10px] text-white/55">
          {APP_NAME} · DGARH · {t.etat.devise} — {t.connexion.piedDePage}
        </p>
      </footer>

      <FeedbackButton />
    </div>
  );
}
