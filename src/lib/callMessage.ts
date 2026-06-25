// ─────────────────────────────────────────────────────────────
// Message d'appel dans la conversation (façon WhatsApp).
//
// À la fin d'un appel 1-à-1, l'appelant poste un message « d'appel » dans la
// salle DM. On encode l'info dans le contenu derrière un séparateur INVISIBLE
// (n'apparaît jamais en clair), et le chat le rend avec une icône + libellé
// (« Appel vocal · 2:34 », « Appel manqué »…), entrant/sortant selon le lecteur.
// ─────────────────────────────────────────────────────────────

const TAG = '⁣call⁣' // U+2063 (invisible separator)

export interface CallInfo {
  kind: 'audio' | 'video'
  status: 'answered' | 'missed' | 'declined'
  duration: number
}

export function encodeCall(info: CallInfo): string {
  return TAG + JSON.stringify(info)
}

export function parseCall(content?: string | null): CallInfo | null {
  if (!content || !content.startsWith(TAG)) return null
  try {
    return JSON.parse(content.slice(TAG.length)) as CallInfo
  } catch {
    return null
  }
}

/** Libellé court pour la liste de conversations / aperçu. */
export function callPreview(info: CallInfo): string {
  if (info.status === 'missed') return '📞 Appel manqué'
  if (info.status === 'declined') return '📞 Appel refusé'
  const m = Math.floor(info.duration / 60)
  const s = String(info.duration % 60).padStart(2, '0')
  return `${info.kind === 'video' ? '📹' : '📞'} Appel · ${m}:${s}`
}
