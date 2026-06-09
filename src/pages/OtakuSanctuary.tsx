import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, Loader2, Music, Sparkle } from 'lucide-react'
import type { ProfileTheme } from '@/lib/types'
import { OTAKU_TITLES, THEME_SKINS, themeSkin } from '@/lib/otaku'
import { buyOtakuTitle, buyProfileTheme, equipTheme, setVibeMusic } from '@/lib/otakuActions'
import { updateMyProfile } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { Avatar } from '@/components/Avatar'
import { OtakuTitleBadge } from '@/components/OtakuTitleBadge'
import { SparksChip } from '@/components/SparksChip'
import { cn, compact, haptic } from '@/lib/utils'

export default function OtakuSanctuary() {
  const me = useAuth((s) => s.me)
  const setMe = useAuth((s) => s.setMe)
  const refresh = useEconomy((s) => s.refresh)
  const wallet = useEconomy((s) => s.wallet)
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [music, setMusic] = useState(me?.music_url ?? '')

  if (!me) return null
  const balance = wallet?.sparks ?? 0
  const skin = themeSkin(me.profile_theme)

  function flash(m: string) {
    setToast(m)
    setTimeout(() => setToast(null), 2200)
  }

  async function takeTitle(id: string) {
    const title = OTAKU_TITLES.find((t) => t.id === id)!
    if (busy) return
    if (me!.otaku_title !== id && balance < title.price) return flash('Sparks insuffisants')
    setBusy('t_' + id)
    haptic([10, 30, 10])
    try {
      const equipping = me!.otaku_title === id
      if (equipping) {
        setMe(await updateMyProfile(me!, { otaku_title: null }))
        flash('Titre retiré')
      } else {
        const { profile } = await buyOtakuTitle(me!, title)
        setMe(profile)
        await refresh(me!.id)
        flash(`${title.emoji} ${title.label} débloqué !`)
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(null)
    }
  }

  async function takeTheme(id: ProfileTheme) {
    const theme = THEME_SKINS.find((t) => t.id === id)!
    if (busy) return
    setBusy('s_' + id)
    haptic(10)
    try {
      // gratuit ou déjà actif → simple équipement, sinon achat.
      const profile =
        theme.price === 0 ? await equipTheme(me!, id) : (await buyProfileTheme(me!, theme)).profile
      setMe(profile)
      await refresh(me!.id)
      flash(`Thème « ${theme.label} » appliqué`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Sparks insuffisants')
    } finally {
      setBusy(null)
    }
  }

  async function saveMusic() {
    setBusy('music')
    try {
      setMe(await setVibeMusic(me!, music.trim() || null))
      flash('Vibe enregistrée 🎵')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-20">
      <header className="safe-top flex items-center justify-between py-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="font-display text-xl font-extrabold">Otaku Sanctuary 🌸</h1>
        <SparksChip />
      </header>

      {/* Aperçu */}
      <div className={cn('mt-2 overflow-hidden rounded-3xl bg-gradient-to-br p-5', skin.banner)}>
        <div className="flex items-center gap-3">
          <Avatar name={me.display_name} url={me.avatar_url} size={64} ring ringClass={cn('ring-2 ring-offset-2 ring-offset-ink-900', skin.ring, skin.glow)} />
          <div>
            <div className="text-lg font-extrabold text-white">{me.display_name}</div>
            <OtakuTitleBadge titleId={me.otaku_title} size="sm" />
          </div>
        </div>
      </div>

      {/* Titres */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-zinc-400">Titres de prestige</h2>
      <div className="grid grid-cols-2 gap-3">
        {OTAKU_TITLES.map((t) => {
          const owned = me.otaku_title === t.id
          return (
            <button
              key={t.id}
              onClick={() => takeTitle(t.id)}
              disabled={!!busy}
              className={cn(
                'flex flex-col items-start rounded-2xl border p-3 text-left transition',
                owned ? 'border-flex-violet bg-flex-violet/10' : 'border-white/10 bg-ink-800/60',
              )}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="mt-1 font-bold text-white">{t.label}</span>
              <span className="text-[11px] text-zinc-500">{t.hint}</span>
              <span className={cn('mt-2 flex items-center gap-1 text-sm font-bold', owned ? 'text-flex-violet' : 'text-gold')}>
                {busy === 't_' + t.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : owned ? (
                  <><Check className="h-4 w-4" /> Équipé</>
                ) : (
                  <><Sparkle className="h-4 w-4" /> {compact(t.price)}</>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Thèmes */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-zinc-400">Skins de profil</h2>
      <div className="grid grid-cols-2 gap-3">
        {THEME_SKINS.map((s) => {
          const active = (me.profile_theme ?? 'none') === s.id
          return (
            <button
              key={s.id}
              onClick={() => takeTheme(s.id)}
              disabled={!!busy}
              className={cn('overflow-hidden rounded-2xl border text-left transition', active ? 'border-gold' : 'border-white/10')}
            >
              <div className={cn('h-16 bg-gradient-to-br', s.banner)} />
              <div className="flex items-center justify-between p-2.5">
                <span className="text-sm font-bold text-white">{s.label}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-gold">
                  {busy === 's_' + s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Check className="h-3.5 w-3.5 text-gold" /> : s.price === 0 ? 'Gratuit' : <><Sparkle className="h-3 w-3" />{s.price}</>}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Vibe Audio */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-zinc-400">Vibe Audio du profil</h2>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3">
          <Music className="h-4 w-4 text-flex-pink" />
          <input
            value={music}
            onChange={(e) => setMusic(e.target.value)}
            placeholder="Lien Spotify / SoundCloud / AudioMack"
            className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
        <button onClick={saveMusic} disabled={busy === 'music'} className="rounded-2xl bg-gold-grad px-4 py-3 text-sm font-bold text-ink-900 active:scale-95 disabled:opacity-40">
          OK
        </button>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="safe-bottom fixed inset-x-0 bottom-4 z-50 mx-auto w-fit rounded-full bg-ink-700 px-5 py-2.5 text-sm font-semibold text-white shadow-card"
        >
          {toast}
        </motion.div>
      )}
    </div>
  )
}
