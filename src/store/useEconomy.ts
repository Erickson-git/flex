import { create } from 'zustand'
import type { Wallet } from '@/lib/types'
import {
  buyListing,
  dailyCheckin,
  fetchBadges,
  fetchWallet,
  revealViewer,
  transferSparks,
} from '@/lib/economy'
import { getSpotlight, setSpotlightExpiry } from '@/lib/orchestrator'
import { DEMO_MODE, supabase } from '@/lib/supabase'

interface EconomyState {
  wallet: Wallet | null
  badges: string[]
  loaded: boolean
  load: (userId: string) => Promise<void>
  refresh: (userId: string) => Promise<void>
  checkin: (userId: string) => Promise<{ streak: number; reward: number }>
  transfer: (fromId: string, toId: string, amount: number) => Promise<void>
  buy: (userId: string, listingId: string) => Promise<string>
  reveal: (userId: string, viewId: string) => Promise<string>
  spotlightActive: () => boolean
  /** Pour la version Supabase : déclenche la RPC grant_spotlight. */
  grantSpotlightRemote: () => Promise<void>
}

export const useEconomy = create<EconomyState>((set, get) => ({
  wallet: null,
  badges: [],
  loaded: false,

  load: async (userId) => {
    const [wallet, badges] = await Promise.all([fetchWallet(userId), fetchBadges(userId)])
    set({ wallet, badges, loaded: true })
  },

  refresh: async (userId) => {
    set({ wallet: await fetchWallet(userId) })
  },

  checkin: async (userId) => {
    const { streak, reward, wallet } = await dailyCheckin(userId)
    set({ wallet })
    return { streak, reward }
  },

  transfer: async (fromId, toId, amount) => {
    const wallet = await transferSparks(fromId, toId, amount)
    set({ wallet })
  },

  buy: async (userId, listingId) => {
    const { wallet, badge } = await buyListing(userId, listingId)
    set((s) => ({ wallet, badges: badge ? [...s.badges, badge] : s.badges }))
    return badge
  },

  reveal: async (userId, viewId) => {
    const { wallet, viewer } = await revealViewer(userId, viewId)
    set({ wallet })
    return viewer
  },

  spotlightActive: () => getSpotlight().active,

  grantSpotlightRemote: async () => {
    if (DEMO_MODE) return
    const { data } = await supabase!.rpc('grant_spotlight', { p_minutes: 15 })
    if (data) setSpotlightExpiry(new Date(data as string).getTime())
  },
}))
