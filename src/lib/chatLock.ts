// ─────────────────────────────────────────────────────────────
// Verrou de conversation (façon WhatsApp « Chats verrouillés »).
// Liste locale des salons verrouillés ; l'ouverture exige le visage/empreinte.
// ─────────────────────────────────────────────────────────────

const KEY = 'flex.lockedChats'

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as string[]
  } catch {
    return []
  }
}

export function isChatLocked(roomId: string): boolean {
  return read().includes(roomId)
}

export function lockChat(roomId: string): void {
  const s = new Set(read())
  s.add(roomId)
  localStorage.setItem(KEY, JSON.stringify([...s]))
}

export function unlockChat(roomId: string): void {
  localStorage.setItem(KEY, JSON.stringify(read().filter((r) => r !== roomId)))
}
