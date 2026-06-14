import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Contact, Loader2, Search as SearchIcon } from 'lucide-react'
import { searchProfiles } from '@/lib/search'
import { contactsSupported, findContactsOnFlex, pickContactNumbers } from '@/lib/contacts'
import type { Profile } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { PrestigeBadge } from '@/components/PrestigeBadge'
import { PioneerBadge } from '@/components/PioneerBadge'
import { compact, haptic } from '@/lib/utils'

export default function Search() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  // Découverte par les contacts du téléphone.
  const [contacts, setContacts] = useState<Profile[] | null>(null)
  const [cLoading, setCLoading] = useState(false)
  const [cMsg, setCMsg] = useState<string | null>(null)

  async function findMyContacts() {
    haptic(10)
    setCLoading(true)
    setCMsg(null)
    try {
      const digits = await pickContactNumbers()
      if (!digits.length) {
        setCMsg('Aucun numéro sélectionné.')
        setContacts([])
        return
      }
      const found = await findContactsOnFlex(digits)
      setContacts(found)
      if (!found.length) setCMsg('Aucun de tes contacts n\'est encore sur FLEX. Invite-les !')
    } catch (e) {
      setCMsg(e instanceof Error ? e.message : 'Import des contacts impossible.')
    } finally {
      setCLoading(false)
    }
  }

  // Recherche prédictive débouncée.
  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    setTouched(true)
    const t = setTimeout(async () => {
      try {
        setResults(await searchProfiles(term))
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      <header className="safe-top flex items-center gap-2 py-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un profil, un intérêt…"
            autoCapitalize="none"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-white outline-none placeholder:text-zinc-600 focus:border-gold/50"
          />
        </div>
      </header>

      {/* Découverte par les contacts du téléphone */}
      {contactsSupported() && (
        <div className="mt-3">
          <button
            onClick={findMyContacts}
            disabled={cLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-flex-cyan/30 bg-flex-cyan/5 py-3 text-sm font-bold text-flex-cyan active:scale-[0.98] disabled:opacity-50"
          >
            {cLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Contact className="h-4 w-4" />}
            Trouver mes contacts sur FLEX
          </button>
          {cMsg && <p className="mt-2 text-center text-xs text-zinc-500">{cMsg}</p>}
          {contacts && contacts.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="px-1 text-xs font-bold uppercase tracking-wider text-zinc-500">
                Tes contacts sur FLEX ({contacts.length})
              </div>
              {contacts.map((p, i) => (
                <ProfileRow key={p.id} p={p} index={i} onClick={() => { haptic(8); navigate(`/app/u/${p.username}`) }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-2">
        {loading && (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" /></div>
        )}

        {!loading && touched && q.trim() && results.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-600">Aucun profil pour « {q.trim()} ».</div>
        )}

        {!touched && (
          <div className="py-12 text-center text-sm text-zinc-600">Tape un pseudo, un nom ou un centre d'intérêt ✦</div>
        )}

        <div className="space-y-2">
          {results.map((p, i) => (
            <ProfileRow key={p.id} p={p} index={i} onClick={() => { haptic(8); navigate(`/app/u/${p.username}`) }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProfileRow({ p, index, onClick }: { p: Profile; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-ink-800/50 p-3 text-left active:scale-[0.99]"
    >
      <Avatar name={p.display_name} url={p.avatar_url} size={44} ring={p.tier === 'pioneer'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-white">{p.display_name}</span>
          <PrestigeBadge score={p.flex_score} size="sm" />
          <PioneerBadge tier={p.tier} rank={p.joined_rank} size="sm" />
        </div>
        <div className="truncate text-xs text-zinc-500">@{p.username}</div>
        {p.bio && <div className="mt-0.5 truncate text-xs text-zinc-400">{p.bio}</div>}
      </div>
      <span className="shrink-0 text-xs text-zinc-500">{compact(p.followers_count)} abonnés</span>
    </motion.button>
  )
}
