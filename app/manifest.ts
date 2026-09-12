import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/referentiels";

/**
 * Le manifeste d'application — ce qui rend la plateforme installable.
 *
 * Il ne change rien à l'application servie : il décrit seulement, au
 * navigateur, sous quel nom, quelle icône et quel cadre l'inscrire au bureau
 * ou à l'écran d'accueil d'un agent. Aucun travailleur de service n'est posé
 * ici ; l'installation ne le réclame pas, et le hors-ligne se traite à part.
 *
 * Next le sert à `/manifest.webmanifest` et pose lui-même la balise dans
 * l'en-tête : rien à déclarer dans le gabarit.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description:
      "Plateforme de gestion du personnel de la DGARH du Ministère de l'Enseignement Technique et Professionnel de la République du Congo.",
    lang: "fr",
    dir: "ltr",
    // L'ouverture passe par l'écran d'accueil, qui oriente vers la connexion
    // ou vers le bureau selon la session déjà ouverte sur le poste.
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Ni portrait ni paysage imposés : les tableaux de la DGARH se lisent
    // couché sur une tablette, les fiches debout sur un téléphone.
    background_color: "#ffffff",
    // Le blanc de la barre du haut, sous laquelle court le filet tricolore.
    theme_color: "#ffffff",
    categories: ["government", "business", "productivity"],
    icons: [
      // Deux tailles au tracé complet, fond transparent : ce que posent les
      // navigateurs de bureau et les onglets.
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Et la version masquable, que les lanceurs Android rognent à leur
      // forme : fond plein d'un bord à l'autre, armoiries dans la zone sûre.
      { src: "/icone-masquable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
