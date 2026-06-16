import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Marque officielle FLEX (logo doré « mascotte ailée » : /public/logo.jpg).
 *
 * Présentation épurée et luxueuse : le logo flotte sur le fond sombre (cadre
 * discret, halo doré). STATIQUE par défaut. Avec `animate` (lancement,
 * accueil, connexion), une entrée élégante se joue : le halo éclôt, le logo
 * apparaît en douceur, respire légèrement, et un reflet doré le balaie.
 */
export function BrandLogo({
  size = 160,
  baseline = true,
  animate = false,
  className,
}: {
  size?: number
  baseline?: boolean
  animate?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      {/* Halo doré qui éclôt puis respire */}
      {animate && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -z-10 rounded-full bg-gold/20 blur-3xl"
          style={{ width: size * 1.35, height: size * 1.35 }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.6, 0.45], scale: [0.7, 1.05, 1] }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
      )}

      {/* Logo : cadre discret, léger halo, reflet animé */}
      <motion.div
        className="relative overflow-hidden rounded-[28%] ring-1 ring-white/10"
        style={{ width: size, height: size, boxShadow: '0 0 40px -10px rgb(var(--accent) / 0.35)' }}
        initial={animate ? { opacity: 0, scale: 0.85, y: 6 } : false}
        animate={
          animate
            ? { opacity: 1, scale: [0.85, 1.02, 1], y: 0 }
            : false
        }
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src="/logo.jpg" alt="FLEX" className="h-full w-full object-cover" draggable={false} />
        {animate && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.35), transparent)' }}
            initial={{ x: '-150%' }}
            animate={{ x: '380%' }}
            transition={{ delay: 0.9, duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4 }}
          />
        )}
      </motion.div>

      {baseline && (
        <motion.div
          className="mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-zinc-500"
          initial={animate ? { opacity: 0 } : false}
          animate={animate ? { opacity: 1 } : false}
          transition={{ delay: animate ? 0.7 : 0, duration: 0.8 }}
        >
          Freedom <span className="text-zinc-700">·</span> Party{' '}
          <span className="text-zinc-700">·</span> Show-biz
        </motion.div>
      )}
    </div>
  )
}
