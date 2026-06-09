import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { evaluateOrchestrator, recordSignal } from '@/lib/orchestrator'
import { touchActive } from '@/lib/economy'
import { BottomNav } from '@/components/BottomNav'
import { EmojiBurstProvider } from '@/components/EmojiBurst'
import { BrandLogo } from '@/components/BrandLogo'
import Onboarding from '@/pages/Onboarding'
import ClaimUsername from '@/pages/ClaimUsername'
import Welcome from '@/pages/Welcome'
import FlexFlow from '@/pages/FlexFlow'
import Compose from '@/pages/Compose'
import Squads from '@/pages/Squads'
import SquadRoom from '@/pages/SquadRoom'
import Directs from '@/pages/Directs'
import DirectThread from '@/pages/DirectThread'
import Hideouts from '@/pages/Hideouts'
import Profile from '@/pages/Profile'
import Market from '@/pages/Market'
import ArenaLobby from '@/pages/ArenaLobby'
import ArenaMatch from '@/pages/ArenaMatch'
import Premium from '@/pages/Premium'
import Invite from '@/pages/Invite'
import AdminDashboard from '@/pages/AdminDashboard'
import SparkRoom from '@/pages/SparkRoom'
import UserProfile from '@/pages/UserProfile'
import OtakuSanctuary from '@/pages/OtakuSanctuary'

function Splash() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-noir-grad">
      <div className="flex flex-col items-center gap-8">
        <BrandLogo size={180} />
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
      </div>
    </div>
  )
}

/** Garde : redirige vers l'accueil si pas de profil. */
function Protected({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  if (loading) return <Splash />
  if (!me) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Si déjà connecté, on saute l'accueil pour aller au Flow. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  if (loading) return <Splash />
  if (me) return <Navigate to="/app" replace />
  return <>{children}</>
}

/** Layout des onglets connectés : contenu + navigation basse. */
function AppLayout() {
  return (
    <Protected>
      <div className="min-h-[100dvh]">
        <Outlet />
        <BottomNav />
      </div>
    </Protected>
  )
}

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap)
  const me = useAuth((s) => s.me)
  const loadEconomy = useEconomy((s) => s.load)
  const location = useLocation()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // Charge l'économie + démarre "Le Chef d'Orchestre" dès qu'on a un profil.
  useEffect(() => {
    if (!me) return
    loadEconomy(me.id).catch(() => {})
    touchActive()
    recordSignal('open')
    const t = setInterval(() => evaluateOrchestrator(), 20_000)
    const onScroll = () => recordSignal('scroll')
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearInterval(t)
      window.removeEventListener('scroll', onScroll)
    }
  }, [me, loadEconomy])

  return (
    <EmojiBurstProvider>
      <Routes location={location}>
        <Route path="/" element={<PublicOnly><Onboarding /></PublicOnly>} />
        <Route path="/claim" element={<PublicOnly><ClaimUsername /></PublicOnly>} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/invite/:code" element={<Invite />} />

        {/* Back-office privé */}
        <Route path="/flesh-admin-dashboard" element={<Protected><AdminDashboard /></Protected>} />

        {/* Ghost Mode — plein écran, sans navigation (geste secret) */}
        <Route path="/ghost" element={<Protected><Hideouts /></Protected>} />

        {/* Plein écran (sans BottomNav) */}
        <Route path="/app/compose" element={<Protected><Compose /></Protected>} />
        <Route path="/app/squads/:id" element={<Protected><SquadRoom /></Protected>} />
        <Route path="/app/directs/:id" element={<Protected><DirectThread /></Protected>} />
        <Route path="/app/market" element={<Protected><Market /></Protected>} />
        <Route path="/app/premium" element={<Protected><Premium /></Protected>} />
        <Route path="/app/arena/:id" element={<Protected><ArenaMatch /></Protected>} />
        <Route path="/app/spark/:id" element={<Protected><SparkRoom /></Protected>} />
        <Route path="/app/u/:username" element={<Protected><UserProfile /></Protected>} />
        <Route path="/app/otaku" element={<Protected><OtakuSanctuary /></Protected>} />

        {/* Onglets avec BottomNav */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<FlexFlow />} />
          <Route path="squads" element={<Squads />} />
          <Route path="arena" element={<ArenaLobby />} />
          <Route path="directs" element={<Directs />} />
          <Route path="me" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </EmojiBurstProvider>
  )
}
