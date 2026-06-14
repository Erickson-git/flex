import { create } from 'zustand'
import type { Profile } from '@/lib/types'
import { ensureGuest as apiEnsureGuest, getCurrentProfile, signOut as apiSignOut } from '@/lib/api'

interface AuthState {
  me: Profile | null
  loading: boolean
  /** Charge le profil courant au démarrage. */
  bootstrap: () => Promise<void>
  setMe: (p: Profile) => void
  /** Crée/charge un compte invité et entre dans l'app. */
  enterAsGuest: () => Promise<Profile>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  me: null,
  loading: true,
  bootstrap: async () => {
    set({ loading: true })
    try {
      const me = await getCurrentProfile()
      set({ me, loading: false })
    } catch {
      set({ me: null, loading: false })
    }
  },
  setMe: (p) => set({ me: p }),
  enterAsGuest: async () => {
    const me = await apiEnsureGuest()
    set({ me, loading: false })
    return me
  },
  signOut: async () => {
    clearGhostTraces()
    await apiSignOut()
    set({ me: null })
  },
}))

/**
 * Ghost Mode : à la déconnexion, on efface toute trace des Hideouts
 * (messages éphémères). "Tout s'efface" — rien ne subsiste sur l'appareil.
 */
export function clearGhostTraces() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('flex.hideout.') && k !== 'flex.hideout.pin') {
        localStorage.removeItem(k)
      }
    }
  } catch {
    /* no-op */
  }
}
