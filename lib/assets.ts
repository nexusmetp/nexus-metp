/** Fond de la page de connexion. Remplacez ce chemin par votre propre visuel
 *  (dans /public, ou une URL sur un hôte autorisé dans next.config.js). */
export const LOGIN_BG_URL = "/login-bg.jpg";

/** Vidéo de fond, optionnelle. Déposez le fichier dans /public (MP4 H.264,
 *  muet, en boucle) et renseignez son chemin ici — par exemple
 *  "/login-bg.mp4". Laissez null pour garder l'image fixe.
 *
 *  La page retombe automatiquement sur LOGIN_BG_URL si la vidéo échoue à
 *  charger, et ne la lit jamais quand le système demande moins d'animations. */
export const LOGIN_VIDEO_URL: string | null = null;
