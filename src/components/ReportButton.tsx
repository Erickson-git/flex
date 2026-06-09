import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flag, MoreHorizontal } from 'lucide-react'
import type { Report } from '@/lib/types'
import { REPORT_REASONS, submitReport } from '@/lib/reports'
import { useAuth } from '@/store/useAuth'
import { haptic } from '@/lib/utils'

/** Bouton discret de signalement (kebab) + feuille de raisons. */
export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: Report['target_type']
  targetId: string
}) {
  const me = useAuth((s) => s.me)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  async function report(reason: string) {
    if (!me) return
    haptic(10)
    try {
      await submitReport(me.id, targetType, targetId, reason)
    } catch {
      /* no-op */
    }
    setDone(true)
    setTimeout(() => {
      setOpen(false)
      setDone(false)
    }, 1200)
  }

  return (
    <>
      <button
        onClick={() => {
          haptic(8)
          setOpen(true)
        }}
        className="text-zinc-500 transition hover:text-zinc-300"
        aria-label="Signaler"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] grid place-items-end bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 240 }}
              animate={{ y: 0 }}
              exit={{ y: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl border-t border-white/10 bg-ink-800 p-6 pb-10"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-300">
                <Flag className="h-4 w-4 text-flex-pink" /> Signaler ce contenu
              </div>
              {done ? (
                <div className="py-6 text-center text-sm font-semibold text-emerald-400">
                  Merci, notre équipe va vérifier. ✓
                </div>
              ) : (
                <div className="grid gap-2">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => report(r)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-200 active:scale-[0.98]"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
