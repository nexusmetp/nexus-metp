import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { policeInterface } from "./polices/police";

export const metadata: Metadata = {
  title: "NEXUS-METP — Système Intégré de Gestion des Ressources Humaines",
  description:
    "NEXUS-METP : plateforme SIRH du Ministère de l'Enseignement Technique et Professionnel de la République du Congo.",
  applicationName: "NEXUS-METP",
  // Les icônes sont déclarées, non devinées : les armoiries vivent dans
  // /public, et rien n'est cherché par tâtonnement (voir LISEZMOI.md).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48 32x32 16x16" },
      { url: "/icone-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icone-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  // iOS n'ouvre en plein écran, sans barre d'adresse, que sur cette mention.
  appleWebApp: { capable: true, title: "NEXUS-METP", statusBarStyle: "default" },
};

/**
 * Une seule couleur de barre système, et c'est le blanc de la barre du haut.
 *
 * Le thème sombre existe, mais il se commande à la main depuis la barre du
 * haut : `enableSystem` est faux. Décliner cette couleur selon
 * `prefers-color-scheme` mentirait donc une fois sur deux — un poste en thème
 * sombre système mais en clair dans l'application aurait une barre noire
 * au-dessus d'un en-tête blanc.
 */
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);',
          }}
        />
      </head>
      {/* La variable de police est posée sur <body> et non sur <html> :
          next-themes écrit la classe du thème sur <html>, et les deux n'ont
          aucune raison de se disputer le même attribut. */}
      <body className={policeInterface.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
