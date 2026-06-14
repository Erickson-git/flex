import { recordNotification } from './notifications'
import type { Profile } from './types'

// ─────────────────────────────────────────────────────────────
// Notifications automatiques de DÉCOUVERTE PERSONNALISÉES : FLEX ne rappelle
// QUE les fonctionnalités que l'utilisateur n'a PAS ENCORE testées. Dès qu'il
// essaie une fonction (en visitant sa page), elle sort de la liste des rappels.
// Quand il a tout testé, les rappels s'arrêtent.
// ─────────────────────────────────────────────────────────────

const LAST = 'flex.tips.last' // timestamp du dernier rappel
const IDX = 'flex.tips.idx' // rotation parmi les non-testées
const TRIED = 'flex.tips.tried' // clés des fonctionnalités déjà essayées
const INTERVAL_MS = 6 * 60 * 60 * 1000 // au plus 1 rappel toutes les 6 h

type Tip = { key: string; title: string; body: string; link?: string }

/** Catalogue des fonctionnalités présentées (chaque `key` est unique). */
export const FEATURE_TIPS: Tip[] = [
  { key: 'compose', title: 'Publie ton premier Flex ✦', body: 'Photo, vidéo, son ou mood : crée depuis le Studio.', link: '/app/compose' },
  { key: 'calls', title: 'Appelle gratuitement 📞', body: 'Audio ou vidéo, en privé ou en groupe — c’est gratuit sur FLEX.', link: '/app/calls' },
  { key: 'live', title: 'Passe en Live 🔴', body: 'Ouvre un salon Live, discute en direct et reçois des cadeaux Sparks.', link: '/app/live' },
  { key: 'challenges', title: 'Relève un Défi ⚔️', body: 'Crée ou rejoins un Challenge, gagne et débloque des fonctions premium.', link: '/app/challenges' },
  { key: 'games', title: 'Joue et grimpe au classement 🎮', body: 'Des mini-jeux t’attendent dans l’Arène.', link: '/app/games' },
  { key: 'gallery', title: 'Ta galerie privée 🔒', body: 'Enregistre publications, médias reçus et appels — protégés par code.', link: '/app/gallery' },
  { key: 'premium', title: 'Découvre les Sparks ✨', body: 'La monnaie de FLEX : reçois des cadeaux, relève des défis, convertis.', link: '/app/premium' },
  { key: 'edit', title: 'Personnalise ton profil 🎨', body: '13 thèmes, bannière, musique de profil… rends-le unique.', link: '/app/edit-profile' },
  { key: 'search', title: 'Trouve tes amis 🔎', body: 'Recherche un profil par pseudo, numéro, ou via tes contacts.', link: '/app/search' },
  { key: 'sounds', title: 'Sons & sonneries 🎵', body: 'Choisis ta musique de profil et ta sonnerie d’appel.', link: '/app/sounds' },
  { key: 'otaku', title: 'Espace Otaku 🌸', body: 'Un sanctuaire pour les fans de manga et d’anime.', link: '/app/otaku' },
  { key: 'squads', title: 'Rejoins des Squads 👥', body: 'Communautés et salons à thème pour parler de ce que tu aimes.', link: '/app/squads' },
]

function triedSet(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(TRIED) || '[]'))
  } catch {
    return new Set<string>()
  }
}

/** Marque une fonctionnalité comme essayée (elle ne sera plus rappelée). */
export function markFeatureTried(key: string): void {
  const s = triedSet()
  if (!s.has(key)) {
    s.add(key)
    localStorage.setItem(TRIED, JSON.stringify([...s]))
  }
}

/** Marque comme essayées toutes les fonctionnalités dont la page vient d'être ouverte. */
export function markFeatureSeenByLink(path: string): void {
  for (const t of FEATURE_TIPS) if (t.link === path) markFeatureTried(t.key)
}

/**
 * Présente la prochaine fonctionnalité NON ESSAYÉE si le délai est écoulé.
 * Ne rappelle jamais une fonction déjà testée ; s'arrête quand tout est testé.
 */
export async function maybeShowFeatureTip(me: Profile | null): Promise<void> {
  if (!me) return
  try {
    const last = Number(localStorage.getItem(LAST) || 0)
    if (Date.now() - last < INTERVAL_MS) return
    const tried = triedSet()
    const untried = FEATURE_TIPS.filter((t) => !tried.has(t.key))
    if (!untried.length) return // l'utilisateur a tout testé → on n'embête plus
    const idx = Number(localStorage.getItem(IDX) || 0) % untried.length
    const tip = untried[idx]
    await recordNotification(me.id, 'system', tip.title, tip.body, { link: tip.link ?? null })
    localStorage.setItem(IDX, String(idx + 1))
    localStorage.setItem(LAST, String(Date.now()))
  } catch {
    /* best-effort */
  }
}
