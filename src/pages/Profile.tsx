import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, Gift, LogOut, Settings, ShieldCheck, Share2, Sparkles } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { Avatar } from '@/components/Avatar'
import { PioneerBadge } from '@/components/PioneerBadge'
import { PrestigeBadge } from '@/components/PrestigeBadge'
import { SparksChip } from '@/components/SparksChip'
import { ShadowVisitors } from '@/components/ShadowVisitors'
import { OtakuTitleBadge } from '@/components/OtakuTitleBadge'
import { inviteLink } from '@/lib/referral'
import { isAdmin } from '@/lib/premium'
import { themeSkin } from '@/lib/otaku'
import { cn, compact, haptic, PRESTIGE_LADDER, prestigeFromScore, prestigeProgress } from '@/lib/utils'

export default function Profile() {
  const me = useAuth((s) => s.me)
  const signOut = useAuth((s) => s.signOut)
  const navigate = useNavigate()

  if (!me) return null

  const stats = [
    { label: 'Flex Score', value: compact(me.flex_score) },
    { label: 'Followers', value: compact(me.followers_count) },
    { label: 'Suivis', value: compact(me.following_count) },
  ]

  const meta = prestigeFromScore(me.flex_score)
  const prog = prestigeProgress(me.flex_score)
  const skin = themeSkin(me.profile_theme)
  const themed = (me.profile_theme ?? 'none') !== 'none'

  async function share() {
    haptic(12)
    const url = `${location.origin}/?ref=${me!.username}`
    try {
      if (navigator.share) await navigator.share({ title: 'FLEX', text: `Rejoins-moi sur FLEX, @${me!.username}`, url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* annulé */
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      {/* bannière dégradée (skin otaku appliqué) */}
      <div className={cn('relative h-40 bg-gradient-to-br', skin.banner)}>
        <div className="absolute inset-0 bg-noir-grad opacity-60" />
        <div className="safe-top absolute right-4 top-2 flex gap-2">
          <button onClick={share} className="glass grid h-10 w-10 place-items-center rounded-full text-zinc-200">
            <Share2 className="h-5 w-5" />
          </button>
          <button onClick={() => navigate('/app/otaku')} className="glass grid h-10 w-10 place-items-center rounded-full text-zinc-200">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="-mt-12 px-5">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Avatar
            name={me.display_name}
            url={me.avatar_url}
            size={96}
            ring
            ringClass={cn('ring-[3px] ring-offset-2 ring-offset-ink-900', themed ? skin.ring : meta.ring, themed ? skin.glow : meta.glow)}
          />
        </motion.div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold">{me.display_name}</h1>
          <PrestigeBadge score={me.flex_score} />
          <OtakuTitleBadge titleId={me.otaku_title} size="sm" />
          <PioneerBadge tier={me.tier} rank={me.joined_rank} size="sm" />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-zinc-500">@{me.username}</div>
          <SparksChip onClick={() => navigate('/app/market')} />
        </div>
        {me.bio && <p className="mt-2 text-sm text-zinc-300">{me.bio}</p>}

        {/* Échelle de prestige — montre la prochaine marche à gravir */}
        <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-gold">
              Statut · {meta.label} · Membre #{me.joined_rank}
            </div>
            <span className="text-xs text-zinc-500">{Math.round(prog * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-gold-grad"
              initial={{ width: 0 }}
              animate={{ width: `${prog * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <div className="mt-3 flex justify-between">
            {PRESTIGE_LADDER.map((p) => (
              <div
                key={p.key}
                className={
                  'text-[10px] font-bold uppercase ' +
                  (me.flex_score >= p.min ? 'text-gold' : 'text-zinc-600')
                }
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <div className="text-xl font-extrabold text-white">{s.value}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions : viralité + premium + admin */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              haptic(12)
              const url = inviteLink(me.username)
              try {
                if (navigator.share) await navigator.share({ title: 'FLEX', text: 'Rejoins-moi sur FLEX, +50 Sparks chacun ✦', url })
                else await navigator.clipboard.writeText(url)
              } catch {
                /* annulé */
              }
            }}
            className="flex items-center justify-center gap-2 rounded-2xl border border-flex-cyan/30 bg-flex-cyan/5 py-3 text-sm font-bold text-flex-cyan active:scale-95"
          >
            <Gift className="h-4 w-4" /> Inviter (+50 ✦)
          </button>
          <button
            onClick={() => navigate('/app/premium')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gold-grad py-3 text-sm font-bold text-ink-900 active:scale-95"
          >
            <Crown className="h-4 w-4" /> Recharger
          </button>
        </div>

        <button
          onClick={() => navigate('/app/otaku')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-flex-violet/40 bg-flex-violet/10 py-3 text-sm font-bold text-flex-violet active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" /> Otaku Sanctuary · titres & skins
        </button>

        {isAdmin(me) && (
          <button
            onClick={() => navigate('/flesh-admin-dashboard')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/30 py-3 text-sm font-semibold text-gold active:scale-[0.98]"
          >
            <ShieldCheck className="h-4 w-4" /> Panneau Admin
          </button>
        )}

        {/* Shadow Profile — qui regarde dans l'ombre */}
        <ShadowVisitors />

        <button
          onClick={async () => {
            await signOut()
            navigate('/', { replace: true })
          }}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3.5 text-sm font-semibold text-zinc-400 transition active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
