// ─────────────────────────────────────────────────────────────
// Liens de téléchargement des apps mobiles FLEX.
// Mets ces URLs à jour APRÈS avoir publié les apps :
//  • Android : crée une "Release" GitHub et attache l'APK (le workflow le
//    construit). L'URL "latest/download/<nom-du-fichier>" reste stable.
//  • iOS : mets le lien App Store (ou TestFlight) quand l'app est publiée.
//    Laisse vide ('') tant que ce n'est pas dispo → on proposera la PWA.
// ─────────────────────────────────────────────────────────────

/** APK Android téléchargeable (Release GitHub). */
export const ANDROID_APK_URL =
  'https://github.com/Erickson-git/flex/releases/latest/download/app-debug.apk'

/** Lien App Store / TestFlight (vide = pas encore publié → on propose la PWA). */
export const IOS_APP_URL = ''
