/**
 * ENGENDRÉ par scripts/resoudre-marque.mjs — ne pas modifier à la main.
 *
 * Les fichiers de marque réellement présents dans /public, dans l'ordre
 * déclaré par public/LISEZMOI.md. Déposez un fichier officiel, reconstruisez :
 * il prend sa place ici et prime sur les suivants.
 *
 * Les cascades gardent plusieurs entrées quand plusieurs fichiers existent :
 * le composant essaie la suivante si l'une devient illisible après coup. Ce
 * qui a disparu, ce sont les noms qui n'ont jamais existé — et les requêtes
 * perdues qu'ils coûtaient à chaque ouverture de page.
 */

export const ARMOIRIES_SOURCES = ["/armoiries-congo.svg"] as const;
export const LOGO_SOURCES = [] as const;
export const DRAPEAU_URL = "/drapeau-congo.svg";

/** Le fond de l'écran d'ouverture et de la connexion : un seul, le premier trouvé. */
export const FOND_MINISTERE = "/batiment-metp.webp";
