// ─────────────────────────────────────────────────────────────
// Traduction 1-clic — « zéro barrière de langue ».
//
// v1 : endpoint public GRATUIT et SANS CLÉ (auto-détection de la langue
// source → langue de l'appareil). Aucun secret côté client, aucun coût.
// Limite : débit limité / non garanti à grande échelle.
//
// Montée en charge (à venir) : Supabase Edge Function détenant une clé
// DeepL/Google Cloud (la clé reste côté serveur) ; il suffira de pointer
// `translateText` vers la function. L'interface (bouton « Traduire ») ne
// changera pas.
// ─────────────────────────────────────────────────────────────

const cache = new Map<string, string>()

/** Langue cible par défaut = langue du téléphone (ex: 'fr', 'en'). */
export function deviceLang(): string {
  return (navigator.language || 'en').slice(0, 2).toLowerCase()
}

export async function translateText(text: string, target = deviceLang()): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return text
  const key = `${target}:${trimmed}`
  const cached = cache.get(key)
  if (cached) return cached

  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto' +
    `&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(trimmed)}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Traduction indisponible')
  const data: unknown = await res.json()

  // Format : data[0] = [[segmentTraduit, segmentOriginal, …], …]
  const segments = Array.isArray(data) ? (data[0] as unknown[]) : null
  const out = Array.isArray(segments)
    ? segments.map((s) => (Array.isArray(s) ? String(s[0] ?? '') : '')).join('')
    : trimmed

  cache.set(key, out)
  return out
}
