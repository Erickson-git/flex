import { NavLink, useNavigate } from 'react-router-dom'
import { Home, MessageSquare, Plus, Swords, User, Users, type LucideIcon } from 'lucide-react'
import { cn, haptic } from '@/lib/utils'

interface NavItemDef {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
}

const left: NavItemDef[] = [
  { to: '/app', icon: MessageSquare, label: 'Chat', end: true },
  { to: '/app/flow', icon: Home, label: 'Flow' },
  { to: '/app/arena', icon: Swords, label: 'Arena' },
]
const right: NavItemDef[] = [
  { to: '/app/squads', icon: Users, label: 'Squads' },
  { to: '/app/me', icon: User, label: 'Moi' },
]

export function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-2">
      <div className="glass relative flex items-center justify-around rounded-3xl px-2 py-2 shadow-card">
        {left.map((it) => (
          <NavItem key={it.to} {...it} />
        ))}

        {/* CTA central — publie ton Flex */}
        <button
          onClick={() => {
            haptic(15)
            navigate('/app/compose')
          }}
          className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-gold-grad text-ink-900 shadow-glow transition active:scale-90"
          aria-label="Publier un Flex"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>

        {right.map((it) => (
          <NavItem key={it.to} {...it} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({ to, icon: Icon, label, end }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => haptic(8)}
      className={({ isActive }) =>
        cn(
          'flex w-12 flex-col items-center gap-1 py-1 text-[10px] font-medium transition',
          isActive ? 'text-gold' : 'text-zinc-500',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} />
          {label}
        </>
      )}
    </NavLink>
  )
}
