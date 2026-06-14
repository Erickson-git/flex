import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Marque officielle FLEX (logo doré « mascotte ailée » : /public/logo.jpg).
 *
 * STATIQUE par défaut. Avec `animate`, une entrée luxueuse se joue : halo doré
 * qui pulse, logo qui apparaît en ressort, et un reflet qui balaie le logo.
 * Réservé aux écrans clés (lancement, accueil, connexion, inscription).
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
      {/* Halo d'ambiance qui pulse */}
      {animate && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -z-10 rounded-full bg-gold/25 blur-3xl"
          style={{ width: size * 1.25, height: size * 1.25 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.7, 0.4], scale: [0.6, 1.1, 1] }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
      )}

      {/* Logo (cadre arrondi + reflet animé) */}
      <motion.div
        className="relative overflow-hidden rounded-3xl shadow-glow ring-1 ring-gold/25"
        style={{ width: size, height: size }}
        initial={animate ? { opacity: 0, scale: 0.6, rotate: -6 } : false}
        animate={animate ? { opacity: 1, scale: 1, rotate: 0 } : false}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      >
        <img src="/logo.jpg" alt="FLEX" className="h-full w-full object-cover" draggable={false} />
        {animate && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.45), transparent)' }}
            initial={{ x: '-140%' }}
            animate={{ x: '360%' }}
            transition={{ delay: 0.8, duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3.2 }}
          />
        )}
      </motion.div>

      {baseline && (
        <motion.div
          className="mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-zinc-500"
          initial={animate ? { opacity: 0, y: 6 } : false}
          animate={animate ? { opacity: 1, y: 0 } : false}
          transition={{ delay: animate ? 0.6 : 0, duration: 0.6 }}
        >
          Freedom <span className="text-zinc-700">·</span> Party{' '}
          <span className="text-zinc-700">·</span> Show-biz
        </motion.div>
      )}
    </div>
  )
}
