// ─────────────────────────────────────────────────────────────
// Modèle de données FLEX (partagé front + schéma Supabase)
// ─────────────────────────────────────────────────────────────

/** Statut d'ancienneté (rang d'inscription). */
export type Tier = 'pioneer' | 'founder' | 'member'

/** Statut de prestige (basé sur la popularité / flex_score). */
export type Prestige = 'rookie' | 'vanguard' | 'star' | 'legende'

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  /** Image de bannière derrière la photo de profil. */
  cover_url?: string | null
  /** Numéro de téléphone (saisi à l'inscription, sert aussi à la recherche). */
  phone?: string | null
  bio: string | null
  tier: Tier
  /** Numéro d'inscription : #1, #2, ... — moteur du "Pioneer Status". */
  joined_rank: number
  followers_count: number
  following_count: number
  flex_score: number
  /** Lien Spotify / SoundCloud / AudioMack joué en fond (Vibe Audio). */
  music_url?: string | null
  /** Titre de prestige otaku arboré (ex: "Hokage"). */
  otaku_title?: string | null
  /** Skin visuel de profil (Otaku Sanctuary). */
  profile_theme?: ProfileTheme
  /** Statut VIP (achat validé par l'admin). Premium = VIP OU essai gratuit 30j. */
  is_vip?: boolean
  /** Compte privé : profil verrouillé pour les non-abonnés. */
  is_private?: boolean
  /** Compte invité auto : peut explorer, doit choisir un pseudo pour publier/commenter. */
  is_guest?: boolean
  created_at: string
}

/** Thèmes de profil inspirés des univers animés. */
export type ProfileTheme = 'none' | 'chakra' | 'saiyan' | 'manga' | 'shadow'

export interface Story {
  id: string
  author_id: string
  author?: Profile
  media_url: string
  seen?: boolean
}

export interface Flex {
  id: string
  author_id: string
  author?: Profile
  content: string
  /** URL http(s) d'image, ou "gradient:violet" pour un fond dégradé. */
  media_url: string | null
  /** Vidéo longue découpée en segments ≤ 1 min, joués à la chaîne dans l'ordre. */
  media_urls?: string[] | null
  /** Musique de fond attachée (piste /audio/*.mp3). */
  sound_url?: string | null
  /** Empreinte du code PIN si le Flex est verrouillé (FLEX Lite). */
  pin_hash?: string | null
  likes_count: number
  comments_count: number
  shares_count?: number
  views_count?: number
  /** Temps de rétention cumulé (ms) — signal d'attention. */
  dwell_ms_total?: number
  created_at: string
  liked_by_me?: boolean
  /** Marque les posts du nouvel inscrit pour la "Starification" auto. */
  boosted?: boolean
}

// ── Notifications & modération ──────────────────────────────────
export interface Notification {
  id: string
  kind: 'hype' | 'trend' | 'social' | 'system' | 'message' | 'call' | 'like' | 'comment' | 'follow'
  title: string
  body?: string
  /** Avatar de l'expéditeur (affiché dans le centre de notifications). */
  image?: string | null
  /** Route ouverte au clic (ex: la conversation pour un message). */
  link?: string | null
  actor_id?: string | null
  actor_name?: string | null
  read: boolean
  created_at: string
}

export interface Report {
  id: string
  target_type: 'post' | 'profile' | 'message'
  target_id: string
  reason: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
}

// ── Squads (communautés / canaux temps réel) ────────────────────
export interface Squad {
  id: string
  name: string
  topic: string
  emoji: string
  cover_url: string
  members_count: number
  accent: string // classe tailwind d'accent (gradient)
  secret?: boolean
  /** "teuf" = événement/fête ; "manga_clan" = clan otaku/watchparty. */
  kind?: 'squad' | 'teuf' | 'manga_clan'
  date?: string
  price?: number // prix d'entrée en Sparks (0 = gratuit)
  location?: string // adresse ou texte
  map_url?: string // lien de navigation (Google Maps…)
  /** Manga Clan : lien de la watchparty / streaming en cours. */
  stream_url?: string
}

// ── Flex Shop ────────────────────────────────────────────────────
export type ShopCategory = 'streetwear' | 'accessoire' | 'beaute' | 'manga' | 'autre'

export interface ShopItem {
  id: string
  seller_id: string
  seller_name: string
  title: string
  photo_url: string
  price: number
  currency: 'sparks' | 'fcfa'
  category: ShopCategory
}

// ── Drague : Match Spark ────────────────────────────────────────
export interface SparkResult {
  matched: boolean
  /** Si match mutuel : id du salon de drague éphémère (24 h). */
  room_id?: string
}

export interface ChatMessage {
  id: string
  room_id: string
  author_id: string
  author_name: string
  author_avatar: string | null
  content: string
  media_url?: string | null
  reaction?: string | null
  /** Message cité (réponse) : id + aperçu dénormalisé « auteur : extrait ». */
  reply_to?: string | null
  reply_preview?: string | null
  created_at: string
}

// ── Directs (messagerie privée) ─────────────────────────────────
export interface DirectThread {
  id: string
  peer: Profile
  last_message: string
  last_at: string
  unread: number
  /** Auteur du dernier message (pour le préfixe "Toi :" et les non-lus). */
  last_sender?: string | null
}

// ── Économie interne (Sparks) ───────────────────────────────────
export interface Wallet {
  user_id: string
  sparks: number
  streak_days: number
  last_checkin: string | null
  last_active: string
}

export interface MarketListing {
  id: string
  seller_id: string
  seller_name: string
  kind: 'badge'
  payload: string // nom du badge / titre
  price_sparks: number
  status: 'open' | 'sold' | 'cancelled'
  created_at: string
}

export interface ProfileView {
  id: string
  viewer_id: string
  viewer_name: string
  target_id: string
  revealed: boolean
  created_at: string
}

export interface Spotlight {
  active: boolean
  expires_at: number // ms epoch
}

// ── The Flex Arena ──────────────────────────────────────────────
export interface ArenaPlayer {
  id: string
  name: string
  avatar: string | null
  score: number
  music?: string | null
}

export interface ArenaMatch {
  id: string
  a: ArenaPlayer
  b: ArenaPlayer
  stake: number
  status: 'waiting' | 'live' | 'done'
  a_taps: number
  b_taps: number
  winner?: 'a' | 'b' | null
  featured?: boolean // duel de stars → ouvert aux paris
  created_at: string
}

// ── Hideouts (Ghost Mode, éphémère) ─────────────────────────────
export interface SecretMessage {
  id: string
  hideout_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
  expires_at: number
}
