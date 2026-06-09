import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { createFlex } from '@/lib/api'
import { useAuth } from '@/store/useAuth'
import { consumeSpotlightForPost } from '@/lib/orchestrator'
import { MEDIA } from '@/lib/media'
import { Avatar } from '@/components/Avatar'
import { SmartImage } from '@/components/SmartImage'
import { cn, haptic, looksMalicious, sanitizeText } from '@/lib/utils'

const PALETTE = [
  MEDIA.nightlife[2],
  MEDIA.luxury[2],
  MEDIA.neon[1],
  MEDIA.fashion[3],
  MEDIA.nightlife[3],
  MEDIA.luxury[0],
]
const MAX = 280

export default function Compose() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  if (!me) return null

  async function publish() {
    if ((!content.trim() && !media) || posting) return
    const clean = sanitizeText(content.trim(), MAX)
    if (looksMalicious(content)) {
      // Défense : on bloque côté client (le garde Postgres double la sécurité).
      setPosting(false)
      return
    }
    setPosting(true)
    haptic([10, 30, 10])
    // Le Chef d'Orchestre : si un Coup de Projecteur était armé, il s'active ici.
    consumeSpotlightForPost()
    try {
      await createFlex(clean, media, me!)
      navigate('/app', { replace: true })
    } catch {
      setPosting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col">
      <header className="safe-top flex items-center justify-between px-4 pb-3 pt-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-semibold">Nouveau Flex</span>
        <button
          onClick={publish}
          disabled={(!content.trim() && !media) || posting}
          className="rounded-full bg-gold-grad px-5 py-2 text-sm font-bold text-ink-900 transition active:scale-95 disabled:opacity-30"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Flexer'}
        </button>
      </header>

      <div className="flex gap-3 px-5 pt-3">
        <Avatar name={me.display_name} url={me.avatar_url} size={44} ring={me.tier === 'pioneer'} />
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX))}
          placeholder="Quoi de neuf de ouf ? ✦"
          rows={4}
          className="flex-1 resize-none bg-transparent text-lg leading-relaxed text-white outline-none placeholder:text-zinc-600"
        />
      </div>

      {media && <SmartImage src={media} className="mx-5 mt-2 aspect-[4/5] rounded-2xl" />}

      <div className="mt-auto px-5 pb-8 pt-4">
        <div className="mb-3 text-sm text-zinc-500">Choisis ton visuel</div>
        <div className="grid grid-cols-3 gap-2">
          {PALETTE.map((p) => (
            <button
              key={p}
              onClick={() => {
                haptic(8)
                setMedia(media === p ? null : p)
              }}
              className="relative aspect-square overflow-hidden rounded-xl"
            >
              <SmartImage src={p} seed={p.length} className="h-full w-full" overlay={false} />
              {media === p && (
                <span className="absolute inset-0 grid place-items-center bg-ink-900/40">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-grad text-ink-900">
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
        <div className={cn('mt-3 text-right text-xs', content.length > MAX - 30 ? 'text-flex-pink' : 'text-zinc-600')}>
          {content.length}/{MAX}
        </div>
      </div>
    </div>
  )
}
