import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Palette, X } from 'lucide-react'
import { currentThemeKey, setTheme, THEMES } from '@/lib/themes'
import { haptic } from '@/lib/utils'

/** Bouton « Thème » + sélecteur des 13 accents. Choix mémorisé par appareil. */
export function ThemeButton() {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(currentThemeKey())
  const current = THEMES.find((t) => t.key === sel) ?? THEMES[0]

  function choose(key: string) {
    haptic(8)
    setTheme(key)
    setSel(key)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3 text-sm font-bold text-gold active:scale-[0.98]"
      >
        <Palette className="h-4 w-4" /> Thème
        <span className="ml-1 h-4 w-4 rounded-full ring-2 ring-white/20" style={{ background: `rgb(${current.accent})` }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] grid place-items-end bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 320 }}
              animate={{ y: 0 }}
              exit={{ y: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl border-t border-white/10 bg-ink-800 p-5 pb-9"
            >
              <header className="mb-4 flex items-center justify-between">
                <span className="font-display text-lg font-extrabold text-gold-grad">Choisis ton thème</span>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-zinc-400">
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="grid grid-cols-4 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => choose(t.key)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={
                        'relative grid h-14 w-14 place-items-center rounded-2xl ring-2 transition ' +
                        (sel === t.key ? 'ring-white' : 'ring-white/10')
                      }
                      style={{ background: `linear-gradient(135deg, rgb(${t.soft}), rgb(${t.accent}), rgb(${t.deep}))` }}
                    >
                      {sel === t.key && <Check className="h-6 w-6 text-ink-900" strokeWidth={3} />}
                    </span>
                    <span className={'text-[11px] ' + (sel === t.key ? 'font-bold text-white' : 'text-zinc-400')}>{t.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
