import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Loader2, Lock, MessageCircle, Phone, UserCheck, UserPlus, Video } from 'lucide-react'
import type { DirectThread, Profile } from '@/lib/types'
import { DEMO_PROFILES } from '@/lib/demoData'
import { fetchProfileByUsername } from '@/lib/profile'
import { followUser, isFollowing, unfollowUser } from '@/lib/follows'
import { recordNotification } from '@/lib/notifications'
import { useAuth } from '@/store/useAuth'
import { Avatar } from '@/components/Avatar'
import { PrestigeBadge } from '@/components/PrestigeBadge'
import { PioneerBadge } from '@/components/PioneerBadge'
import { OtakuTitleBadge } from '@/components/OtakuTitleBadge'
import { SparkButton } from '@/components/SparkButton'
import { VibePlayer } from '@/components/VibePlayer'
import { ShopSection } from '@/components/ShopSection'
import { ProfileFlexHistory } from '@/components/ProfileFlexHistory'
import { useCall } from '@/components/CallProvider'
import { themeSkin } from '@/lib/otaku'
import { cn, compact, dmRoomId, haptic } from '@/lib/utils'

export default function UserProfile() {
  const { username = '' } = useParams()
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const { startCall, available: callAvailable } = useCall()
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      let p = await fetchProfileByUsername(username)
      if (!p) p = DEMO_PROFILES.find((d) => d.username === username) ?? null
      if (!active) return
      setUser(p)
      setLoading(false)
      if (p && me && p.id !== me.id) {
        const f = await isFollowing(p.id, me.id)
        if (active) setFollowing(f)
      }
    })()
    return () => {
      active = false
    }
  }, [username, me])

  if (loading) {
    return <div className="grid min-h-[100dvh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-gold" /></div>
  }
  if (!user) {
    return <div className="grid min-h-[100dvh] place-items-center text-zinc-500">Profil introuvable.</div>
  }

  const isMe = me?.id === user.id
  const locked = !!user.is_private && !isMe && !following

  async function toggleFollow() {
    if (!me || !user || isMe || busy) return
    setBusy(true)
    try {
      if (following) {
        await unfollowUser(user.id, me.id)
        setFollowing(false)
      } else {
        await followUser(user.id, me.id)
        setFollowing(true)
        haptic([10, 20, 10])
        recordNotification(user.id, 'follow', 'Nouvel abonné ✦', `${me.display_name} te suit maintenant`, {
          image: me.avatar_url,
          actorId: me.id,
          actorName: me.display_name,
          link: `/app/u/${me.username}`,
        })
      }
    } finally {
      setBusy(false)
    }
  }

  function dm() {
    if (!user) return
    haptic(10)
    // Salon canonique (identique pour les 2 participants) en prod ;
    // fallback pseudo en démo (profils factices sans id réel partagé).
    const roomId = me && user.id ? dmRoomId(me.id, user.id) : `dm_${user.username}`
    const thread: DirectThread = {
      id: roomId,
      peer: user,
      last_message: '',
      last_at: new Date().toISOString(),
      unread: 0,
    }
    navigate(`/app/directs/${roomId}`, { state: thread })
  }

  return (
    <div className="mx-auto max-w-lg pb-24">
      <div className={cn('relative h-36 overflow-hidden bg-gradient-to-br', themeSkin(user.profile_theme).banner)}>
        {user.cover_url && <img src={user.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-noir-grad opacity-60" />
        <button onClick={() => navigate(-1)} className="safe-top absolute left-3 top-2 grid h-10 w-10 place-items-center rounded-full bg-ink-900/50 text-white backdrop-blur">
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="-mt-12 px-5">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Avatar
            name={user.display_name}
            url={user.avatar_url}
            size={96}
            ring
            ringClass={cn('ring-[3px] ring-offset-2 ring-offset-ink-900', themeSkin(user.profile_theme).ring, themeSkin(user.profile_theme).glow)}
          />
        </motion.div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold">{user.display_name}</h1>
          {user.is_private && <Lock className="h-4 w-4 text-zinc-500" />}
          <PrestigeBadge score={user.flex_score} />
          <OtakuTitleBadge titleId={user.otaku_title} size="sm" />
          <PioneerBadge tier={user.tier} rank={user.joined_rank} size="sm" />
        </div>
        <div className="text-zinc-500">@{user.username}</div>
        {user.bio && <p className="mt-2 text-sm text-zinc-300">{user.bio}</p>}

        <div className="mt-3 flex gap-4 text-sm">
          <span><b className="text-white">{compact(user.followers_count)}</b> <span className="text-zinc-500">followers</span></span>
          <span><b className="text-white">{compact(user.flex_score)}</b> <span className="text-zinc-500">score</span></span>
        </div>

        {/* Actions */}
        {isMe ? (
          <button onClick={() => navigate('/app/edit-profile')} className="mt-4 w-full rounded-2xl border border-white/15 py-3 font-bold text-white active:scale-95">
            Éditer mon profil
          </button>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={toggleFollow}
                disabled={busy}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-2xl py-3 font-bold active:scale-95 disabled:opacity-50',
                  following ? 'border border-white/15 text-white' : 'bg-gold-grad text-ink-900',
                )}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : following ? <><UserCheck className="h-5 w-5" /> Suivi</> : <><UserPlus className="h-5 w-5" /> Suivre</>}
              </button>
              <button onClick={dm} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 font-bold text-white active:scale-95">
                <MessageCircle className="h-5 w-5" /> Message
              </button>
            </div>
            {callAvailable && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button onClick={() => startCall(user, 'audio')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 font-bold text-white active:scale-95">
                  <Phone className="h-5 w-5 text-emerald-400" /> Appel
                </button>
                <button onClick={() => startCall(user, 'video')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 font-bold text-white active:scale-95">
                  <Video className="h-5 w-5 text-flex-cyan" /> Vidéo
                </button>
              </div>
            )}
            <div className="mt-3">
              <SparkButton target={user} />
            </div>
          </>
        )}

        {/* Contenu : verrouillé si compte privé non suivi */}
        {locked ? (
          <div className="mt-8 grid place-items-center rounded-2xl border border-white/10 bg-ink-800/40 p-10 text-center">
            <Lock className="mb-3 h-8 w-8 text-zinc-500" />
            <div className="font-semibold text-white">Compte privé</div>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">Suis @{user.username} pour voir sa vibe et sa boutique.</p>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <VibePlayer url={user.music_url} label={`La vibe de ${user.display_name}`} />
            </div>
            <ShopSection sellerId={user.id} />
            <ProfileFlexHistory userId={user.id} isOwner={isMe} />
          </>
        )}
      </div>
    </div>
  )
}
