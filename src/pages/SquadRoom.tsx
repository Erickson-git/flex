import { useLocation, useParams } from 'react-router-dom'
import { PlayCircle, ScrollText } from 'lucide-react'
import type { Squad } from '@/lib/types'
import { DEMO_SQUADS } from '@/lib/demoData'
import { DEMO_MANGA_CLANS } from '@/lib/otaku'
import { getTeufs } from '@/lib/social'
import { ChatRoom } from '@/components/ChatRoom'
import { compact, haptic } from '@/lib/utils'

export default function SquadRoom() {
  const { id = '' } = useParams()
  const location = useLocation()
  const squad =
    (location.state as Squad | null) ??
    [...DEMO_SQUADS, ...DEMO_MANGA_CLANS, ...getTeufs()].find((s) => s.id === id) ??
    null

  const isManga = squad?.kind === 'manga_clan'

  return (
    <ChatRoom
      roomId={id}
      title={`${squad?.emoji ?? '✨'} ${squad?.name ?? 'Squad'}`}
      subtitle={squad ? `${compact(squad.members_count)} membres · ${squad.topic}` : undefined}
      accent={squad?.accent ?? 'from-flex-violet to-flex-pink'}
      headerExtra={
        isManga ? (
          <div className="mt-2 flex items-center gap-2">
            <a
              href={squad?.stream_url || '#'}
              target="_blank"
              rel="noreferrer"
              onClick={() => haptic(12)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink-900/30 py-2 text-sm font-bold text-ink-900"
            >
              <PlayCircle className="h-4 w-4" /> Rejoindre la Watchparty
            </a>
            <span className="flex items-center gap-1 rounded-full bg-ink-900/20 px-3 py-2 text-xs font-bold text-ink-900">
              <ScrollText className="h-3.5 w-3.5" /> Scans
            </span>
          </div>
        ) : undefined
      }
    />
  )
}
