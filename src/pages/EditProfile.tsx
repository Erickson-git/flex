import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ChevronLeft, Loader2 } from 'lucide-react'
import { updateMyProfile } from '@/lib/profile'
import { uploadMedia } from '@/lib/upload'
import { useAuth } from '@/store/useAuth'
import { Avatar } from '@/components/Avatar'
import { cn, haptic } from '@/lib/utils'

export default function EditProfile() {
  const me = useAuth((s) => s.me)
  const setMe = useAuth((s) => s.setMe)
  const navigate = useNavigate()
  const [name, setName] = useState(me?.display_name ?? '')
  const [bio, setBio] = useState(me?.bio ?? '')
  const [phone, setPhone] = useState(me?.phone ?? '')
  const [avatar, setAvatar] = useState<string | null>(me?.avatar_url ?? null)
  const [cover, setCover] = useState<string | null>(me?.cover_url ?? null)
  const [priv, setPriv] = useState<boolean>(me?.is_private ?? false)
  const [uploading, setUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  if (!me) return null

  async function pickAvatar(file: File | null) {
    if (!file || !me) return
    setUploading(true)
    setErr(null)
    try {
      setAvatar(await uploadMedia(file, me.id))
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de l'upload.")
    } finally {
      setUploading(false)
    }
  }

  async function pickCover(file: File | null) {
    if (!file || !me) return
    setCoverUploading(true)
    setErr(null)
    try {
      setCover(await uploadMedia(file, me.id))
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec de l'upload.")
    } finally {
      setCoverUploading(false)
    }
  }

  async function save() {
    if (!name.trim() || saving) return
    setSaving(true)
    setErr(null)
    haptic([10, 30, 10])
    try {
      const updated = await updateMyProfile(me!.id, {
        display_name: name.trim().slice(0, 40),
        bio: bio.trim().slice(0, 160) || null,
        phone: phone.trim() || null,
        avatar_url: avatar,
        cover_url: cover,
        is_private: priv,
      })
      setMe(updated)
      navigate('/app/me', { replace: true })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur. Réessaie.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 pb-16">
      <header className="safe-top flex items-center justify-between py-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-zinc-400">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="font-semibold">Éditer le profil</span>
        <button onClick={save} disabled={!name.trim() || saving || uploading || coverUploading} className="rounded-full bg-gold-grad px-5 py-2 text-sm font-bold text-ink-900 active:scale-95 disabled:opacity-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
        </button>
      </header>

      {/* Bannière (cover) derrière la photo de profil */}
      <div className="relative mt-2 h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-flex-violet/40 via-ink-700 to-flex-pink/30">
        {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
        <button
          onClick={() => coverRef.current?.click()}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink-900/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur active:scale-95"
        >
          {coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Bannière
        </button>
        {cover && (
          <button
            onClick={() => setCover(null)}
            className="absolute left-3 top-3 rounded-full bg-ink-900/60 px-3 py-1.5 text-xs font-semibold text-flex-pink backdrop-blur active:scale-95"
          >
            Retirer
          </button>
        )}
      </div>

      <div className="-mt-12 flex flex-col items-center">
        <button onClick={() => fileRef.current?.click()} className="relative">
          <Avatar name={name || me.display_name} url={avatar} size={96} ring />
          <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-gold-grad text-ink-900">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)} />
        <div className="mt-2 text-xs text-zinc-500">@{me.username} (non modifiable)</div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs text-zinc-500">Nom affiché</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} className="input-luxe mt-1" placeholder="Ton nom" />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Bio / centres d'intérêt</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            className="input-luxe mt-1 resize-none"
            placeholder="Parle de toi, tes vibes, tes passions…"
          />
          <div className="mt-1 text-right text-[11px] text-zinc-600">{bio.length}/160</div>
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Téléphone (optionnel)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-luxe mt-1"
            placeholder="Ex. +228 90 12 34 56"
            autoComplete="tel"
          />
          <div className="mt-1 text-[11px] text-zinc-600">Permet à tes contacts de te retrouver par numéro.</div>
        </label>

        {/* Confidentialité */}
        <button
          onClick={() => setPriv((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
        >
          <div>
            <div className="font-semibold text-white">Compte privé</div>
            <div className="text-xs text-zinc-500">Ton profil n'est visible que par tes abonnés.</div>
          </div>
          <span className={cn('relative h-6 w-11 rounded-full transition', priv ? 'bg-gold' : 'bg-white/15')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', priv ? 'left-[22px]' : 'left-0.5')} />
          </span>
        </button>

        {err && <p className="text-sm text-flex-pink">{err}</p>}
      </div>
    </div>
  )
}
