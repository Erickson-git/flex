import { useEffect, lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { useEconomy } from '@/store/useEconomy'
import { evaluateOrchestrator, recordSignal } from '@/lib/orchestrator'
import { touchActive } from '@/lib/economy'
import { syncPushIfGranted } from '@/lib/push'
import { subscribeNotifications, syncAppBadge } from '@/lib/notifications'
import { clearAppBadge } from '@/lib/badge'
import { maybeShowFeatureTip, markFeatureSeenByLink } from '@/lib/featureTips'
import { playDing } from '@/lib/sfx'
import { BottomNav } from '@/components/BottomNav'
import { EmojiBurstProvider } from '@/components/EmojiBurst'
import { CallProvider } from '@/components/CallProvider'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { BiometricGate } from '@/components/BiometricGate'
import { PasswordGate } from '@/components/PasswordGate'
import { Toaster } from '@/components/Toaster'
import { OfflineBanner } from '@/components/OfflineBanner'
import { BrandLogo } from '@/components/BrandLogo'
import { isAdmin } from '@/lib/premium'
import { rememberRedirect } from '@/lib/redirect'
import { startGlobalPresence, stopGlobalPresence } from '@/lib/globalPresence'

// Code-splitting : chaque page = un chunk chargé à la demande.
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const ClaimUsername = lazy(() => import('@/pages/ClaimUsername'))
const SignIn = lazy(() => import('@/pages/SignIn'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Welcome = lazy(() => import('@/pages/Welcome'))
const FlexFlow = lazy(() => import('@/pages/FlexFlow'))
const Compose = lazy(() => import('@/pages/Compose'))
const Squads = lazy(() => import('@/pages/Squads'))
const SquadRoom = lazy(() => import('@/pages/SquadRoom'))
const Directs = lazy(() => import('@/pages/Directs'))
const DirectThread = lazy(() => import('@/pages/DirectThread'))
const Hideouts = lazy(() => import('@/pages/Hideouts'))
const Profile = lazy(() => import('@/pages/Profile'))
const Market = lazy(() => import('@/pages/Market'))
const ArenaLobby = lazy(() => import('@/pages/ArenaLobby'))
const ArenaMatch = lazy(() => import('@/pages/ArenaMatch'))
const Premium = lazy(() => import('@/pages/Premium'))
const Withdraw = lazy(() => import('@/pages/Withdraw'))
const Invite = lazy(() => import('@/pages/Invite'))
const Logout = lazy(() => import('@/pages/Logout'))
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))
const SparkRoom = lazy(() => import('@/pages/SparkRoom'))
const UserProfile = lazy(() => import('@/pages/UserProfile'))
const OtakuSanctuary = lazy(() => import('@/pages/OtakuSanctuary'))
const Games = lazy(() => import('@/pages/Games'))
const Live = lazy(() => import('@/pages/Live'))
const Challenges = lazy(() => import('@/pages/Challenges'))
const Search = lazy(() => import('@/pages/Search'))
const EditProfile = lazy(() => import('@/pages/EditProfile'))
const SoundLibrary = lazy(() => import('@/pages/SoundLibrary'))
const CallHistory = lazy(() => import('@/pages/CallHistory'))
const GroupCallRoom = lazy(() => import('@/pages/GroupCallRoom'))
const Gallery = lazy(() => import('@/pages/Gallery'))

function Splash() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-noir-grad">
      <div className="flex flex-col items-center gap-8">
        <BrandLogo size={180} animate />
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
      </div>
    </div>
  )
}

/** Garde : redirige vers l'accueil/connexion si pas de profil (en mémorisant
 *  le lien d'origine pour y revenir après connexion). */
function Protected({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!me) {
    rememberRedirect(location.pathname + location.search)
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

/**
 * Garde admin : non connecté → accueil/connexion ; connecté non-admin → /app.
 * Le verrou réel reste la RLS Supabase (app_admins).
 */
function AdminOnly({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!me) {
    rememberRedirect(location.pathname + location.search)
    return <Navigate to="/" replace />
  }
  if (!isAdmin(me)) return <Navigate to="/app" replace />
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

  // Suivi de découverte : visiter la page d'une fonctionnalité = "testée"
  // → elle ne sera plus rappelée par les notifications automatiques.
  useEffect(() => {
    markFeatureSeenByLink(location.pathname)
  }, [location.pathname])

  // Présence EN LIGNE globale (façon WhatsApp) : on se signale tant qu'on est
  // connecté, et on coupe à la déconnexion.
  useEffect(() => {
    if (!me) return
    startGlobalPresence(me.id)
    return () => stopGlobalPresence()
  }, [me?.id])

  // Son de notification (~1 s) quand un push arrive et que l'app est ouverte.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'flex-push') playDing()
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [])

  // Sonnerie de notification PAR DÉFAUT (in-app, sans autorisation) + pastille
  // de comptage sur l'icône de l'app : dès qu'une notification arrive, un son
  // joue et le badge se met à jour.
  useEffect(() => {
    if (!me) {
      clearAppBadge()
      return
    }
    syncAppBadge()
    const unsub = subscribeNotifications(() => {
      playDing()
      syncAppBadge()
    })
    // Re-synchronise le compteur quand l'app revient au premier plan
    // (ex. après avoir cliqué une notification système).
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncAppBadge()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [me])

  // Charge l'économie + démarre "Le Chef d'Orchestre" dès qu'on a un profil.
  useEffect(() => {
    if (!me) return
    loadEconomy(me.id).catch(() => {})
    touchActive()
    recordSignal('open')
    syncPushIfGranted().catch(() => {})
    // Rappels automatiques des fonctionnalités (auto-limités à 1 / 6 h).
    maybeShowFeatureTip(me).catch(() => {})
    const t = setInterval(() => {
      evaluateOrchestrator()
      maybeShowFeatureTip(me).catch(() => {})
    }, 20_000)
    // Throttle scroll : recordSignal écrit en localStorage (synchrone). Max 1/1,5s.
    let lastScroll = 0
    const onScroll = () => {
      const now = Date.now()
      if (now - lastScroll < 1500) return
      lastScroll = now
      recordSignal('scroll')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearInterval(t)
      window.removeEventListener('scroll', onScroll)
    }
  }, [me, loadEconomy])

  return (
    <EmojiBurstProvider>
      <CallProvider>
      <UpdatePrompt />
      <Toaster />
      <OfflineBanner />
      {/* Verrou biométrique (hors pages d'auth). La complétion du compte (email/
          téléphone) est OPTIONNELLE et se fait à tout moment depuis le profil :
          plus de blocage à l'ouverture. */}
      {!['/reset', '/forgot', '/signin'].includes(location.pathname) && (
        <>
          <BiometricGate />
          <PasswordGate />
        </>
      )}
      <Suspense fallback={<Splash />}>
      <Routes location={location}>
        <Route path="/" element={<PublicOnly><Onboarding /></PublicOnly>} />
        <Route path="/claim" element={<PublicOnly><ClaimUsername /></PublicOnly>} />
        <Route path="/signin" element={<PublicOnly><SignIn /></PublicOnly>} />
        <Route path="/forgot" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        {/* Réinitialisation depuis le lien email : accessible même avec une session de récupération */}
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/welcome" element={<Protected><Welcome /></Protected>} />
        <Route path="/invite/:code" element={<Invite />} />
        <Route path="/logout" element={<Logout />} />

        {/* Back-office privé — garde admin strict (redirige les non-admins) */}
        <Route path="/flesh-admin-dashboard" element={<AdminOnly><AdminDashboard /></AdminOnly>} />

        {/* Ghost Mode — plein écran, sans navigation (geste secret) */}
        <Route path="/ghost" element={<Protected><Hideouts /></Protected>} />

        {/* Plein écran (sans BottomNav) */}
        <Route path="/app/compose" element={<Protected><Compose /></Protected>} />
        <Route path="/app/squads/:id" element={<Protected><SquadRoom /></Protected>} />
        <Route path="/app/directs/:id" element={<Protected><DirectThread /></Protected>} />
        <Route path="/app/market" element={<Protected><Market /></Protected>} />
        <Route path="/app/premium" element={<Protected><Premium /></Protected>} />
        <Route path="/app/withdraw" element={<Protected><Withdraw /></Protected>} />
        <Route path="/app/arena/:id" element={<Protected><ArenaMatch /></Protected>} />
        <Route path="/app/spark/:id" element={<Protected><SparkRoom /></Protected>} />
        <Route path="/app/u/:username" element={<Protected><UserProfile /></Protected>} />
        <Route path="/app/otaku" element={<Protected><OtakuSanctuary /></Protected>} />
        <Route path="/app/games" element={<Protected><Games /></Protected>} />
        <Route path="/app/live" element={<Protected><Live /></Protected>} />
        <Route path="/app/challenges" element={<Protected><Challenges /></Protected>} />
        <Route path="/app/search" element={<Protected><Search /></Protected>} />
        <Route path="/app/edit-profile" element={<Protected><EditProfile /></Protected>} />
        <Route path="/app/sounds" element={<Protected><SoundLibrary /></Protected>} />
        <Route path="/app/calls" element={<Protected><CallHistory /></Protected>} />
        <Route path="/app/gallery" element={<Protected><Gallery /></Protected>} />
        <Route path="/app/call/:id" element={<Protected><GroupCallRoom /></Protected>} />

        {/* Onglets avec BottomNav */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Directs />} />
          <Route path="flow" element={<FlexFlow />} />
          <Route path="squads" element={<Squads />} />
          <Route path="arena" element={<ArenaLobby />} />
          <Route path="directs" element={<Directs />} />
          <Route path="me" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </CallProvider>
    </EmojiBurstProvider>
  )
}
