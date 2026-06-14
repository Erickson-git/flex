import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Send, X } from 'lucide-react'
import { addComment, fetchComments, type Comment } from '@/lib/comments'
import { recordNotification } from '@/lib/notifications'
import { useAuth } from '@/store/useAuth'
import { Avatar } from './Avatar'
import { ChooseUsernameSheet } from './ChooseUsernameSheet'
import { haptic, looksMalicious, sanitizeText, timeAgo } from '@/lib/utils'

/** Fil de commentaires d'un Flex (bottom-sheet). */
export function CommentsSheet({ flexId, authorId, onClose, onAdded }: { flexId: string; authorId?: string; onClose: () => void; onAdded: () => void }) {
  const [list, setList] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [needName, setNeedName] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchComments(flexId)
      .then(setList)
      .finally(() => setLoading(false))
  }, [flexId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [list])

  async function send() {
    const cur = useAuth.getState().me
    if (!cur) return
    if (cur.is_guest) {
      setNeedName(true)
      return
    }
    const clean = sanitizeText(text.trim(), 280)
    if (!clean || sending || looksMalicious(text)) return
    setSending(true)
    haptic(8)
    try {
      const cm = await addComment(flexId, clean, cur.id)
      setList((l) => [...l, cm])
      setText('')
      onAdded()
      if (authorId && authorId !== cur.id) {
        recordNotification(authorId, 'comment', `${cur.display_name} a commenté ton Flex`, clean, {
          image: cur.avatar_url,
          actorId: cur.id,
          actorName: cur.display_name,
        })
      }
    } catch {
      /* échec d'envoi : on garde le texte saisi, pas de rejet non géré */
    } finally {
      setSending(false)
    }
  }

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[70] grid place-items-end bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 320 }}
          animate={{ y: 0 }}
          exit={{ y: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="flex h-[72dvh] w-full flex-col rounded-t-3xl border-t border-white/10 bg-ink-800"
        >
          <header className="flex items-center justify-between px-5 py-3">
            <span className="font-bold text-white">Commentaires</span>
            <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 pb-2">
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-500" /></div>
            ) : list.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-600">Sois le premier à commenter ✦</p>
            ) : (
              list.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar name={c.author?.display_name ?? '?'} url={c.author?.avatar_url ?? null} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl rounded-tl-sm bg-white/[0.05] px-3 py-2">
                      <span className="mr-1.5 text-xs font-bold text-gold">@{c.author?.username ?? '?'}</span>
                      <span className="text-sm text-zinc-100">{c.content}</span>
                    </div>
                    <div className="mt-0.5 pl-1 text-[10px] text-zinc-600">{timeAgo(c.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="safe-bottom flex items-center gap-2 px-4 pb-3 pt-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ajoute un commentaire…"
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-grad text-ink-900 active:scale-90 disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    {needName && (
      <ChooseUsernameSheet
        reason="Choisis ton pseudo pour commenter (le reste est optionnel)."
        onClose={() => setNeedName(false)}
        onDone={() => {
          setNeedName(false)
          send()
        }}
      />
    )}
    </>
  )
}
