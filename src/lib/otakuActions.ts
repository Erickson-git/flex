import { DEMO_MODE, supabase } from './supabase'
import { getCurrentProfile, updateMyProfile } from './api'
import { fetchWallet, spendSparks } from './economy'
import type { Profile, ProfileTheme, Wallet } from './types'
import type { OtakuTitle, ThemeSkin } from './otaku'

// ─────────────────────────────────────────────────────────────
// Achat/équipement des titres et thèmes otaku.
// Démo : dépense locale + mise à jour du profil.
// Prod : RPC atomique (dépense + équipement en une transaction).
// ─────────────────────────────────────────────────────────────

interface Result {
  profile: Profile
  wallet?: Wallet
}

export async function buyOtakuTitle(me: Profile, title: OtakuTitle): Promise<Result> {
  if (DEMO_MODE) {
    let wallet: Wallet | undefined
    if (title.price > 0) wallet = await spendSparks(me.id, title.price, 'otaku_title')
    const profile = await updateMyProfile(me, { otaku_title: title.id })
    return { profile, wallet }
  }
  const { error } = await supabase!.rpc('buy_otaku_title', { p_title: title.id, p_price: title.price })
  if (error) throw error
  const profile = await getCurrentProfile()
  return { profile: profile ?? me, wallet: await fetchWallet(me.id) }
}

export async function buyProfileTheme(me: Profile, theme: ThemeSkin): Promise<Result> {
  if (DEMO_MODE) {
    let wallet: Wallet | undefined
    if (theme.price > 0) wallet = await spendSparks(me.id, theme.price, 'profile_theme')
    const profile = await updateMyProfile(me, { profile_theme: theme.id })
    return { profile, wallet }
  }
  const { error } = await supabase!.rpc('buy_profile_theme', { p_theme: theme.id, p_price: theme.price })
  if (error) throw error
  const profile = await getCurrentProfile()
  return { profile: profile ?? me, wallet: await fetchWallet(me.id) }
}

/** Équipe un thème déjà possédé (gratuit) ou retire le titre. */
export async function equipTheme(me: Profile, theme: ProfileTheme): Promise<Profile> {
  return updateMyProfile(me, { profile_theme: theme })
}

export async function setVibeMusic(me: Profile, url: string | null): Promise<Profile> {
  return updateMyProfile(me, { music_url: url })
}
