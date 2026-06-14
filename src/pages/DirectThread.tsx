import { useLocation, useParams } from 'react-router-dom'
import type { DirectThread } from '@/lib/types'
import { DEMO_THREADS } from '@/lib/demoData'
import { ChatRoom } from '@/components/ChatRoom'

export default function DirectThreadPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const thread =
    (location.state as DirectThread | null) ?? DEMO_THREADS.find((t) => t.id === id) ?? null

  return (
    <ChatRoom
      roomId={id}
      title={thread?.peer.display_name ?? 'Direct'}
      subtitle={thread ? `@${thread.peer.username} · en ligne` : undefined}
      accent="from-flex-cyan to-flex-violet"
      notifyUserId={thread?.peer.id}
      peer={thread?.peer}
    />
  )
}
