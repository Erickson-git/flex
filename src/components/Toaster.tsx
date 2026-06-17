import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info, X } from 'lucide-react'
import { onToast, type ToastMsg } from '@/lib/toast'

/** Affiche les toasts (retour visuel des actions). À monter une fois dans App. */
export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([])

  useEffect(
    () =>
      onToast((t) => {
        setItems((l) => [...l, t])
        window.setTimeout(() => setItems((l) => l.filter((x) => x.id !== t.id)), 2600)
      }),
    [],
  )

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className={
              'glass flex max-w-sm items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-card ' +
              (t.kind === 'error' ? 'text-flex-pink' : t.kind === 'success' ? 'text-emerald-300' : 'text-white')
            }
          >
            {t.kind === 'error' ? <X className="h-4 w-4" /> : t.kind === 'success' ? <Check className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
