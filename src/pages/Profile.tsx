import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Crown, Gift, Lock, LogOut, Music2, Pencil, Phone, Settings, ShieldCheck, Share2, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { createCallRoom } from '@/lib/groupCall'
import { useAuth } from '@/store/useAuth'
import { Avatar } from '@/components/Avatar'
import { PioneerBadge } from '@/components/PioneerBadge'
import { PrestigeBadge } from '@/components/PrestigeBadge'
import { SparksChip } from '@/components/SparksChip'
import { ShadowVisitors } from '@/components/ShadowVisitors'
import { AiCompanion } from '@/components/AiCompanion'
import { PremiumBadge } from '@/components/PremiumBadge'
import { SecureAccountCard } from '@/components/SecureAccountCard'
import { ProfileFlexHistory } from '@/components/ProfileFlexHistory'
import { PushToggle } from '@/components/PushToggle'
import { BiometricToggle } from '@/components/BiometricToggle'
import { InstallApp } from '@/components/InstallApp'
import { ThemeButton } from '@/components/ThemeButton'
import { ModeToggle } from '@/components/ModeToggle'
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
      <div className={cn('relative h-40 overflow-hidden bg-gradient-to-br', skin.banner)}>
        {me.cover_url && <img src={me.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-noir-grad opacity-60" />
        <div className="safe-top absolute right-4 top-2 flex gap-2">
          <button onClick={() => navigate('/app/edit-profile')} className="glass grid h-10 w-10 place-items-center rounded-full text-zinc-200">
            <Pencil className="h-5 w-5" />
          </button>
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
          <PremiumBadge me={me} />
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

        {/* Mon IA — agent autoclonable, évolue avec l'activité */}
        <AiCompanion />

        {/* Historique de mes Flex — modifier / verrouiller / supprimer */}
        <ProfileFlexHistory userId={me.id} isOwner />

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

        {/* ── Menu organisé par sections ──────────────────────── */}
        <MenuSection title="Mon univers" />
        <MenuCard>
          <MenuRow icon={Lock} accent="gold" label="Galerie privée" sub="Photos, vidéos & appels protégés" onClick={() => navigate('/app/gallery')} />
          <MenuRow icon={Sparkles} accent="violet" label="Otaku Sanctuary" sub="Titres & skins" onClick={() => navigate('/app/otaku')} />
          <MenuRow icon={Music2} accent="gold" label="Sons FLEX" sub="Musiques & sonnerie" onClick={() => navigate('/app/sounds')} />
        </MenuCard>

        <MenuSection title="Communication" />
        <MenuCard>
          <MenuRow icon={Phone} accent="emerald" label="Historique des appels" onClick={() => navigate('/app/calls')} />
          <MenuRow
            icon={Users}
            accent="cyan"
            label="Nouvel appel de groupe"
            onClick={async () => {
              haptic(12)
              try {
                const id = await createCallRoom('video')
                if (id) navigate(`/app/call/${id}`)
              } catch {
                /* ignore */
              }
            }}
          />
          {isAdmin(me) && (
            <MenuRow icon={ShieldCheck} accent="gold" label="Panneau Admin" sub="Modération & paiements" onClick={() => navigate('/flesh-admin-dashboard')} />
          )}
        </MenuCard>

        {/* Personnalisation */}
        <MenuSection title="Personnalisation" />
        <ThemeButton />
        <ModeToggle />

        {/* Application & compte */}
        <MenuSection title="Application & compte" />
        <InstallApp />
        <PushToggle />
        {/* Sécurité : verrou facial / empreinte (Face ID, Windows Hello…) */}
        <BiometricToggle />
        <SecureAccountCard />
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

        {/* Pied de page légal (requis par les stores) */}
        <div className="mt-6 text-center text-[11px] text-zinc-600">
          <a href="/legal/cgu.html" target="_blank" rel="noopener" className="underline">CGU</a>
          <span className="mx-2">·</span>
          <a href="/legal/confidentialite.html" target="_blank" rel="noopener" className="underline">Confidentialité</a>
          <div className="mt-1">FLEX — un produit de XOFIX Internationale</div>
        </div>
      </div>
    </div>
  )
}

// ── Menu : titres de section + cartes de lignes ─────────────────────
const CHIP: Record<string, string> = {
  gold: 'bg-gold/15 text-gold',
  violet: 'bg-flex-violet/20 text-flex-violet',
  cyan: 'bg-flex-cyan/15 text-flex-cyan',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  pink: 'bg-flex-pink/15 text-flex-pink',
  white: 'bg-white/10 text-zinc-200',
}

function MenuSection({ title }: { title: string }) {
  return <h2 className="mb-2 mt-7 px-1 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">{title}</h2>
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-800/40">
      {children}
    </div>
  )
}

function MenuRow({
  icon: Icon,
  label,
  sub,
  accent = 'white',
  onClick,
}: {
  icon: LucideIcon
  label: string
  sub?: string
  accent?: keyof typeof CHIP
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-white/[0.04]">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', CHIP[accent])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{label}</span>
        {sub && <span className="block truncate text-xs text-zinc-500">{sub}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
    </button>
  )
}
