// ─────────────────────────────────────────────────────────────
// Préférences de conversation (façon WhatsApp) : épinglées & en sourdine.
// Stockage local à l'appareil.
// ─────────────────────────────────────────────────────────────

const PIN = 'flex.pinnedChats'
const MUTE = 'flex.mutedChats'
const ARCHIVE = 'flex.archivedChats'

function read(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as string[]
  } catch {
    return []
  }
}
function toggle(key: string, id: string): void {
  const s = new Set(read(key))
  s.has(id) ? s.delete(id) : s.add(id)
  localStorage.setItem(key, JSON.stringify([...s]))
}

export const isPinned = (id: string) => read(PIN).includes(id)
export const isMuted = (id: string) => read(MUTE).includes(id)
export const isArchived = (id: string) => read(ARCHIVE).includes(id)
export const togglePin = (id: string) => toggle(PIN, id)
export const toggleMute = (id: string) => toggle(MUTE, id)
export const toggleArchive = (id: string) => toggle(ARCHIVE, id)
