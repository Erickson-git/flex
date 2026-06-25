import { create } from 'zustand'
import type { Profile } from '@/lib/types'
import { deleteGuest as apiDeleteGuest, ensureGuest as apiEnsureGuest, getCurrentProfile, signOut as apiSignOut } from '@/lib/api'
import { setGuestFlag } from '@/lib/guard'

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

export const useAuth = create<AuthState>((set, get) => ({
  me: null,
  loading: true,
  bootstrap: async () => {
    set({ loading: true })
    try {
      const me = await getCurrentProfile()
      setGuestFlag(!!me?.is_guest)
      set({ me, loading: false })
    } catch {
      setGuestFlag(false)
      set({ me: null, loading: false })
    }
  },
  setMe: (p) => {
    setGuestFlag(!!p.is_guest)
    set({ me: p })
  },
  enterAsGuest: async () => {
    const me = await apiEnsureGuest()
    setGuestFlag(!!me.is_guest)
    set({ me, loading: false })
    return me
  },
  signOut: async () => {
    const me = get().me
    clearGhostTraces()
    // Compte invité non converti = valable une seule session → supprimé.
    if (me?.is_guest) await apiDeleteGuest()
    else await apiSignOut()
    setGuestFlag(false)
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
