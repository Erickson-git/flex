-- ═══════════════════════════════════════════════════════════════
--  FLEX — setup.sql UNIFIÉ (copier-coller unique dans Supabase SQL Editor)
--  Ordre de dépendances :
--    1) schema   2) economy  3) arena   4) growth
--    5) social   6) otaku    7) engagement   8) security
--
--  Après exécution :
--   • Authentication → Providers → Anonymous : ACTIVER
--   • Storage → New bucket "receipts" (privé)
--   • Ajoute ton user_id dans app_admins (accès admin) et dans... rien d'autre :
--     la forteresse de sécurité (honeypots, audit, anti-injection) est active.
-- ═══════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : schema.sql                                     ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- FLEX — Schéma Supabase (Postgres)
-- À coller dans : Supabase Dashboard → SQL Editor → New query → Run
-- Active aussi l'auth anonyme : Authentication → Providers → Anonymous
-- ═══════════════════════════════════════════════════════════════

-- ── Compteur global d'inscriptions (pour le rang Pionnier) ──────
create table if not exists public.signup_counter (
  id int primary key default 1,
  total int not null default 0
);
insert into public.signup_counter (id, total) values (1, 0)
  on conflict (id) do nothing;

-- ── Profils ─────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  tier text not null default 'member' check (tier in ('pioneer','founder','member')),
  joined_rank int not null,
  followers_count int not null default 0,
  following_count int not null default 0,
  flex_score int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Flexes (posts du fil public) ────────────────────────────────
create table if not exists public.flexes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  media_url text,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists flexes_created_idx on public.flexes (created_at desc);

-- ── Likes / "Flex" ──────────────────────────────────────────────
create table if not exists public.flex_likes (
  flex_id uuid not null references public.flexes(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (flex_id, user_id)
);

-- ── Chat temps réel (Squads + Directs partagent la même table) ──
-- room_id : "sq_*" pour un Squad, "dm_*" pour un Direct.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_avatar text,
  content text not null default '',
  media_url text,
  reaction text,
  created_at timestamptz not null default now()
);
create index if not exists chat_room_idx on public.chat_messages (room_id, created_at);

-- ── Hideouts + messages éphémères ───────────────────────────────
create table if not exists public.secret_messages (
  id uuid primary key default gen_random_uuid(),
  hideout_id text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists secret_hideout_idx on public.secret_messages (hideout_id, created_at);

-- ═══════════════════════════════════════════════════════════════
-- FONCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Revendication atomique d'un pseudo : incrémente le compteur,
-- calcule le rang + le tier, crée le profil. Renvoie le profil.
create or replace function public.claim_username(p_username text, p_display_name text)
returns public.profiles
language plpgsql
security definer
as $$
declare
  v_rank int;
  v_tier text;
  v_profile public.profiles;
begin
  update public.signup_counter set total = total + 1 where id = 1
    returning total into v_rank;

  v_tier := case
    when v_rank <= 100 then 'pioneer'
    when v_rank <= 1000 then 'founder'
    else 'member'
  end;

  insert into public.profiles (id, username, display_name, joined_rank, tier, following_count)
  values (auth.uid(), lower(p_username), coalesce(nullif(p_display_name,''), p_username), v_rank, v_tier, 0)
  returning * into v_profile;

  -- Crée le portefeuille + Sparks de départ (fonctions définies dans economy.sql).
  begin
    perform public.award_sparks(auth.uid(), 30, 'welcome');
  exception when undefined_function then
    null; -- economy.sql pas encore exécuté : on ignore
  end;

  return v_profile;
end;
$$;

-- Maintien des compteurs de likes
create or replace function public.bump_like() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.flexes set likes_count = likes_count + 1 where id = new.flex_id;
    update public.profiles p set flex_score = flex_score + 10
      from public.flexes f where f.id = new.flex_id and p.id = f.author_id;
  elsif tg_op = 'DELETE' then
    update public.flexes set likes_count = greatest(0, likes_count - 1) where id = old.flex_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_bump_like on public.flex_likes;
create trigger trg_bump_like after insert or delete on public.flex_likes
  for each row execute function public.bump_like();

-- Purge des messages expirés (à appeler via un cron Supabase, ou au fetch)
create or replace function public.purge_expired() returns void language sql as $$
  delete from public.secret_messages where expires_at < now();
$$;

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.flexes enable row level security;
alter table public.flex_likes enable row level security;
alter table public.chat_messages enable row level security;
alter table public.secret_messages enable row level security;

-- Profils : lecture publique, écriture limitée à soi
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);

-- Flexes : lecture publique, création/suppression par l'auteur
drop policy if exists "flexes_read" on public.flexes;
create policy "flexes_read" on public.flexes for select using (true);
drop policy if exists "flexes_insert_self" on public.flexes;
create policy "flexes_insert_self" on public.flexes for insert with check (auth.uid() = author_id);
drop policy if exists "flexes_delete_self" on public.flexes;
create policy "flexes_delete_self" on public.flexes for delete using (auth.uid() = author_id);

-- Likes : lecture publique, gérés par l'utilisateur connecté
drop policy if exists "likes_read" on public.flex_likes;
create policy "likes_read" on public.flex_likes for select using (true);
drop policy if exists "likes_insert_self" on public.flex_likes;
create policy "likes_insert_self" on public.flex_likes for insert with check (auth.uid() = user_id);
drop policy if exists "likes_delete_self" on public.flex_likes;
create policy "likes_delete_self" on public.flex_likes for delete using (auth.uid() = user_id);

-- Messages secrets : visibles uniquement s'ils ne sont pas expirés ;
-- insertion par l'auteur uniquement. (À durcir selon ta logique de salons.)
drop policy if exists "secret_read_live" on public.secret_messages;
create policy "secret_read_live" on public.secret_messages for select using (expires_at > now());
drop policy if exists "secret_insert_self" on public.secret_messages;
create policy "secret_insert_self" on public.secret_messages for insert with check (auth.uid() = author_id);

-- Chat : lecture publique (les salons sont ouverts), insertion par l'auteur.
-- (Pour des Squads privés, ajoute une table d'appartenance + un check ici.)
drop policy if exists "chat_read" on public.chat_messages;
create policy "chat_read" on public.chat_messages for select using (true);
drop policy if exists "chat_insert_self" on public.chat_messages;
create policy "chat_insert_self" on public.chat_messages for insert with check (auth.uid() = author_id);

-- ── Realtime (fil + salons en direct) ───────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.flexes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.secret_messages;
exception when duplicate_object then null; end $$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : economy.sql                                    ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- FLEX — Couche économique : Sparks (Éclats), marché P2P, Shadow Profile,
-- Spotlight (Chef d'Orchestre) et aversion à la perte (decay).
-- À exécuter APRÈS schema.sql (SQL Editor → Run).
--
-- Principe de sécurité : les soldes ne sont JAMAIS modifiables directement
-- par le client. Toute mutation passe par des fonctions `security definer`
-- atomiques avec verrous de ligne (SELECT ... FOR UPDATE) — pas de double
-- dépense, pas de duplication. Le client n'a que le droit de LIRE.
-- ═══════════════════════════════════════════════════════════════

-- ── Portefeuilles ───────────────────────────────────────────────
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sparks int not null default 0 check (sparks >= 0),
  streak_days int not null default 0,
  last_checkin date,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Grand livre (append-only) : audit + impossibilité de "créer" du néant
create table if not exists public.spark_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null,            -- daily_streak | transfer_in | transfer_out | market_buy | market_sell | reveal | milestone | secret
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists ledger_user_idx on public.spark_ledger (user_id, created_at desc);

-- ── Badges / titres possédés (objets échangeables) ──────────────
create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, badge)
);

-- ── Place de marché (titres/badges de prestige contre Sparks) ───
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('badge')),
  payload text not null,           -- nom du badge/titre
  price_sparks int not null check (price_sparks > 0),
  status text not null default 'open' check (status in ('open','sold','cancelled')),
  buyer_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create index if not exists listings_open_idx on public.market_listings (status, created_at desc);

-- ── Coups de Projecteur (Spotlight) ─────────────────────────────
create table if not exists public.spotlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reason text not null default 'reengagement'
);
create index if not exists spotlight_active_idx on public.spotlights (user_id, expires_at);

-- ── Visites de profil (Shadow Profile) ──────────────────────────
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  revealed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists views_target_idx on public.profile_views (target_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════
-- FONCTIONS ATOMIQUES
-- ═══════════════════════════════════════════════════════════════

-- Crée le wallet à la volée (idempotent).
create or replace function public.ensure_wallet(p_user uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.wallets (user_id) values (p_user) on conflict (user_id) do nothing;
$$;

-- Récompense interne (réservée aux usages serveur/triggers).
create or replace function public.award_sparks(p_user uuid, p_amount int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount = 0 then return; end if;
  perform public.ensure_wallet(p_user);
  update public.wallets
     set sparks = greatest(0, sparks + p_amount), updated_at = now()
   where user_id = p_user;
  insert into public.spark_ledger (user_id, delta, reason) values (p_user, p_amount, p_reason);
end;$$;

-- Check-in quotidien : gère la série (streak) et la récompense croissante.
create or replace function public.daily_checkin()
returns table(streak int, reward int)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_last date; v_streak int; v_reward int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  perform public.ensure_wallet(v_uid);
  select last_checkin, streak_days into v_last, v_streak
    from public.wallets where user_id = v_uid for update;       -- verrou
  if v_last = current_date then raise exception 'Déjà validé aujourd''hui'; end if;
  if v_last = current_date - 1 then v_streak := coalesce(v_streak,0) + 1; else v_streak := 1; end if;
  v_reward := 10 + least(v_streak, 30) * 2;                     -- l'effort paie
  update public.wallets
     set streak_days = v_streak, last_checkin = current_date,
         sparks = sparks + v_reward, last_active = now(), updated_at = now()
   where user_id = v_uid;
  insert into public.spark_ledger (user_id, delta, reason) values (v_uid, v_reward, 'daily_streak');
  return query select v_streak, v_reward;
end;$$;

-- TRANSFERT P2P ATOMIQUE (don de Sparks). Verrou émetteur → pas de double dépense.
create or replace function public.transfer_sparks(p_to uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare v_from uuid := auth.uid(); v_balance int;
begin
  if v_from is null then raise exception 'Non authentifié'; end if;
  if p_amount <= 0 then raise exception 'Montant invalide'; end if;
  if v_from = p_to then raise exception 'Transfert vers soi-même interdit'; end if;
  perform public.ensure_wallet(v_from);
  perform public.ensure_wallet(p_to);

  select sparks into v_balance from public.wallets where user_id = v_from for update;  -- verrou
  if v_balance < p_amount then raise exception 'Solde insuffisant'; end if;

  update public.wallets set sparks = sparks - p_amount, updated_at = now() where user_id = v_from;
  update public.wallets set sparks = sparks + p_amount, updated_at = now() where user_id = p_to;
  insert into public.spark_ledger (user_id, delta, reason, ref_id) values
    (v_from, -p_amount, 'transfer_out', p_to),
    (p_to,    p_amount, 'transfer_in',  v_from);
end;$$;

-- Mise en vente d'un badge possédé (le badge est retiré le temps de la vente).
create or replace function public.list_badge(p_badge text, p_price int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_price <= 0 then raise exception 'Prix invalide'; end if;
  delete from public.user_badges where user_id = v_uid and badge = p_badge;
  if not found then raise exception 'Tu ne possèdes pas ce badge'; end if;
  insert into public.market_listings (seller_id, kind, payload, price_sparks)
    values (v_uid, 'badge', p_badge, p_price) returning id into v_id;
  return v_id;
end;$$;

-- ACHAT ATOMIQUE : verrou annonce + verrou wallet acheteur ; paiement +
-- livraison + clôture en une seule transaction (impossible d'acheter 2×).
create or replace function public.buy_listing(p_listing uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_buyer uuid := auth.uid(); v_seller uuid; v_price int; v_payload text; v_status text; v_bal int;
begin
  if v_buyer is null then raise exception 'Non authentifié'; end if;
  perform public.ensure_wallet(v_buyer);

  select seller_id, price_sparks, payload, status
    into v_seller, v_price, v_payload, v_status
    from public.market_listings where id = p_listing for update;   -- verrou annonce
  if not found then raise exception 'Annonce introuvable'; end if;
  if v_status <> 'open' then raise exception 'Annonce indisponible'; end if;
  if v_seller = v_buyer then raise exception 'Achat de sa propre annonce interdit'; end if;

  select sparks into v_bal from public.wallets where user_id = v_buyer for update;  -- verrou acheteur
  if coalesce(v_bal, 0) < v_price then raise exception 'Solde insuffisant'; end if;

  update public.wallets set sparks = sparks - v_price, updated_at = now() where user_id = v_buyer;
  update public.wallets set sparks = sparks + v_price, updated_at = now() where user_id = v_seller;
  insert into public.spark_ledger (user_id, delta, reason, ref_id) values
    (v_buyer,  -v_price, 'market_buy',  p_listing),
    (v_seller,  v_price, 'market_sell', p_listing);

  -- livraison du titre à l'acheteur
  insert into public.user_badges (user_id, badge) values (v_buyer, v_payload)
    on conflict (user_id, badge) do nothing;

  update public.market_listings
     set status = 'sold', buyer_id = v_buyer, sold_at = now()
   where id = p_listing;
end;$$;

-- Shadow Profile : dépenser des Sparks pour lever le voile sur un visiteur.
create or replace function public.reveal_viewer(p_view uuid, p_cost int default 50)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_target uuid; v_viewer uuid; v_bal int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  select target_id, viewer_id into v_target, v_viewer
    from public.profile_views where id = p_view for update;
  if not found then raise exception 'Visite introuvable'; end if;
  if v_target <> v_uid then raise exception 'Cette visite ne te concerne pas'; end if;

  select sparks into v_bal from public.wallets where user_id = v_uid for update;
  if coalesce(v_bal,0) < p_cost then raise exception 'Solde insuffisant'; end if;

  update public.wallets set sparks = sparks - p_cost, updated_at = now() where user_id = v_uid;
  insert into public.spark_ledger (user_id, delta, reason, ref_id) values (v_uid, -p_cost, 'reveal', p_view);
  update public.profile_views set revealed = true where id = p_view;
  return v_viewer;
end;$$;

-- Chef d'Orchestre : accorde un Spotlight de 15 min (boost de visibilité).
create or replace function public.grant_spotlight(p_minutes int default 15)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_exp timestamptz;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  -- pas de spotlight si un autre est déjà actif
  if exists (select 1 from public.spotlights where user_id = v_uid and expires_at > now()) then
    select expires_at into v_exp from public.spotlights where user_id = v_uid and expires_at > now() limit 1;
    return v_exp;
  end if;
  v_exp := now() + make_interval(mins => p_minutes);
  insert into public.spotlights (user_id, expires_at) values (v_uid, v_exp);
  return v_exp;
end;$$;

-- Aversion à la perte : à planifier (pg_cron / Edge Function) toutes les heures.
-- Marque l'érosion du prestige et l'expiration des Sparks après 48 h d'inactivité.
create or replace function public.apply_decay()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with stale as (
    select user_id from public.wallets
     where last_active < now() - interval '48 hours' and sparks > 0
  )
  update public.wallets w
     set sparks = greatest(0, floor(w.sparks * 0.9)), updated_at = now()  -- -10 % / passage
    from stale where w.user_id = stale.user_id;
  get diagnostics v_count = row_count;
  insert into public.spark_ledger (user_id, delta, reason)
    select user_id, 0, 'decay_warning' from public.wallets
     where last_active < now() - interval '48 hours';
  return v_count;
end;$$;

-- Récompense de prestige automatique quand le flex_score franchit un palier.
create or replace function public.on_score_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.flex_score >= 100000 and old.flex_score < 100000 then perform public.award_sparks(new.id, 500, 'milestone_legende');
  elsif new.flex_score >= 25000 and old.flex_score < 25000 then perform public.award_sparks(new.id, 150, 'milestone_star');
  elsif new.flex_score >= 1000 and old.flex_score < 1000 then perform public.award_sparks(new.id, 50, 'milestone_vanguard');
  end if;
  return new;
end;$$;
drop trigger if exists trg_score_change on public.profiles;
create trigger trg_score_change after update of flex_score on public.profiles
  for each row execute function public.on_score_change();

-- ═══════════════════════════════════════════════════════════════
-- RLS — lecture seule côté client ; toute écriture passe par les RPC ci-dessus
-- ═══════════════════════════════════════════════════════════════
alter table public.wallets enable row level security;
alter table public.spark_ledger enable row level security;
alter table public.user_badges enable row level security;
alter table public.market_listings enable row level security;
alter table public.spotlights enable row level security;
alter table public.profile_views enable row level security;

-- Wallet : chacun lit le sien. (Aucune policy INSERT/UPDATE/DELETE → mutations
-- impossibles hors fonctions security definer.)
drop policy if exists "wallet_read_self" on public.wallets;
create policy "wallet_read_self" on public.wallets for select using (auth.uid() = user_id);
drop policy if exists "ledger_read_self" on public.spark_ledger;
create policy "ledger_read_self" on public.spark_ledger for select using (auth.uid() = user_id);
drop policy if exists "badges_read_all" on public.user_badges;
create policy "badges_read_all"  on public.user_badges for select using (true);

-- Marché : annonces visibles de tous ; pas d'écriture directe (via list_badge / buy_listing).
drop policy if exists "listings_read" on public.market_listings;
create policy "listings_read" on public.market_listings for select using (true);

-- Spotlights : lisibles de tous (pour pondérer le ranking côté lecture).
drop policy if exists "spotlight_read" on public.spotlights;
create policy "spotlight_read" on public.spotlights for select using (true);

-- Visites : seul le profil visité lit ses visiteurs ; insertion par le visiteur.
drop policy if exists "views_read_target" on public.profile_views;
create policy "views_read_target" on public.profile_views for select using (auth.uid() = target_id);
drop policy if exists "views_insert_self" on public.profile_views;
create policy "views_insert_self" on public.profile_views for insert with check (auth.uid() = viewer_id);

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.wallets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.market_listings;
exception when duplicate_object then null; end $$;

-- Verrouillage des droits : on retire toute écriture directe résiduelle.
revoke insert, update, delete on public.wallets from anon, authenticated;
revoke insert, update, delete on public.spark_ledger from anon, authenticated;
revoke insert, update, delete on public.market_listings from anon, authenticated;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : arena.sql                                      ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- FLEX — The Flex Arena : duels de tapotement + paris communautaires.
-- À exécuter APRÈS schema.sql et economy.sql.
--
-- Les mises et gains transitent par des fonctions atomiques (verrous de
-- ligne) qui réutilisent les wallets de la couche économique.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.arena_matches (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null references public.profiles(id) on delete cascade,
  player_b uuid references public.profiles(id) on delete set null,
  stake int not null default 0 check (stake >= 0),
  status text not null default 'waiting' check (status in ('waiting','live','done')),
  a_taps int not null default 0,
  b_taps int not null default 0,
  winner uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  ends_at timestamptz
);
create index if not exists arena_status_idx on public.arena_matches (status, created_at desc);

create table if not exists public.arena_bets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.arena_matches(id) on delete cascade,
  bettor_id uuid not null references public.profiles(id) on delete cascade,
  side char(1) not null check (side in ('a','b')),
  amount int not null check (amount > 0),
  settled boolean not null default false,
  won boolean,
  created_at timestamptz not null default now(),
  unique (match_id, bettor_id)   -- un seul pari par spectateur et par match
);

-- ── Pari communautaire (mise en jeu = escrow immédiat) ──────────
create or replace function public.place_bet(p_match uuid, p_side char, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_status text; v_bal int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_amount <= 0 then raise exception 'Mise invalide'; end if;
  if p_side not in ('a','b') then raise exception 'Camp invalide'; end if;

  select status into v_status from public.arena_matches where id = p_match for update;
  if not found then raise exception 'Match introuvable'; end if;
  if v_status = 'done' then raise exception 'Match terminé'; end if;

  perform public.ensure_wallet(v_uid);
  select sparks into v_bal from public.wallets where user_id = v_uid for update;  -- verrou
  if coalesce(v_bal,0) < p_amount then raise exception 'Solde insuffisant'; end if;

  update public.wallets set sparks = sparks - p_amount, updated_at = now() where user_id = v_uid;
  insert into public.spark_ledger (user_id, delta, reason, ref_id) values (v_uid, -p_amount, 'arena_bet', p_match);
  insert into public.arena_bets (match_id, bettor_id, side, amount) values (p_match, v_uid, p_side, p_amount);
end;$$;

-- ── Clôture du match : paie joueurs + parieurs (cote x2), une seule fois ─
-- NB : en V1 la clôture est déclenchée côté client gagnant. En production,
-- valide les `taps` via une Edge Function "arbitre" pour empêcher la triche.
create or replace function public.settle_match(p_match uuid, p_a_taps int, p_b_taps int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_status text; v_a uuid; v_b uuid; v_stake int; v_winner uuid; v_win_side char; b record;
begin
  select status, player_a, player_b, stake into v_status, v_a, v_b, v_stake
    from public.arena_matches where id = p_match for update;     -- verrou match
  if not found then raise exception 'Match introuvable'; end if;
  if v_status = 'done' then raise exception 'Match déjà réglé'; end if;

  if p_a_taps >= p_b_taps then v_winner := v_a; v_win_side := 'a';
  else v_winner := v_b; v_win_side := 'b'; end if;

  -- Gain du duel : le gagnant rafle la mise de l'adversaire.
  if v_stake > 0 and v_b is not null then
    perform public.award_sparks(v_winner, v_stake, 'arena_win');
    perform public.award_sparks(case when v_winner = v_a then v_b else v_a end, -v_stake, 'arena_loss');
  end if;

  -- Règlement des paris : cote x2 pour le bon camp, 0 sinon.
  for b in select * from public.arena_bets where match_id = p_match and settled = false loop
    if b.side = v_win_side then
      perform public.award_sparks(b.bettor_id, b.amount * 2, 'arena_bet_win');
      update public.arena_bets set settled = true, won = true where id = b.id;
    else
      update public.arena_bets set settled = true, won = false where id = b.id;
    end if;
  end loop;

  update public.arena_matches
     set status = 'done', a_taps = p_a_taps, b_taps = p_b_taps, winner = v_winner
   where id = p_match;
  return v_winner;
end;$$;

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.arena_matches enable row level security;
alter table public.arena_bets enable row level security;

drop policy if exists "arena_read" on public.arena_matches;
create policy "arena_read" on public.arena_matches for select using (true);
drop policy if exists "arena_create" on public.arena_matches;
create policy "arena_create" on public.arena_matches for insert with check (auth.uid() = player_a);
-- mise à jour des taps en direct par les deux joueurs
drop policy if exists "arena_update_players" on public.arena_matches;
create policy "arena_update_players" on public.arena_matches for update
  using (auth.uid() = player_a or auth.uid() = player_b);

drop policy if exists "bets_read" on public.arena_bets;
create policy "bets_read" on public.arena_bets for select using (true);
-- (les insertions de paris passent par place_bet ; pas d'insert direct)

-- Realtime pour le duel + paris en direct
do $$ begin
  alter publication supabase_realtime add table public.arena_matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.arena_bets;
exception when duplicate_object then null; end $$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : growth.sql                                     ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- FLEX — Viralité (parrainage), scalabilité (index) et monétisation
-- locale (Moov/Flooz) + panneau admin. À exécuter en dernier.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. PARRAINAGE ───────────────────────────────────────────────
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
alter table public.profiles add column if not exists is_vip boolean not null default false;

-- Lien de parrainage atomique + idempotent : le filleul ne peut être
-- parrainé qu'une seule fois ; parrain ET filleul reçoivent 50 Sparks.
create or replace function public.redeem_referral(p_referrer text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ref uuid;
begin
  if v_uid is null then return false; end if;
  select id into v_ref from public.profiles where username = lower(p_referrer);
  if v_ref is null or v_ref = v_uid then return false; end if;

  -- garde anti-double : ne lie que si referred_by est encore nul
  update public.profiles set referred_by = v_ref where id = v_uid and referred_by is null;
  if not found then return false; end if;

  perform public.award_sparks(v_uid, 50, 'referral_bonus');   -- filleul
  perform public.award_sparks(v_ref, 50, 'referral_reward');  -- parrain
  return true;
end;$$;

-- ── 2. SCALABILITÉ : index pour rester < 100 ms sous forte charge ─
-- Profils (recherche pseudo, classements, parrainage)
create unique index if not exists profiles_username_uidx on public.profiles (lower(username));
create index if not exists profiles_score_idx on public.profiles (flex_score desc);
create index if not exists profiles_rank_idx on public.profiles (joined_rank);
create index if not exists profiles_referrer_idx on public.profiles (referred_by);
-- Flux (tri par récence déjà indexé) + auteur
create index if not exists flexes_author_idx on public.flexes (author_id, created_at desc);
-- Arène (lobby = matchs live récents ; paris par match)
create index if not exists arena_live_idx on public.arena_matches (status, created_at desc);
create index if not exists arena_players_idx on public.arena_matches (player_a, player_b);
create index if not exists bets_match_idx on public.arena_bets (match_id);
-- Économie : historique d'un wallet (déjà ledger_user_idx) + classement sparks
create index if not exists wallets_sparks_idx on public.wallets (sparks desc);
-- Chat : déjà chat_room_idx (room_id, created_at)

-- Conseil bande passante (plan gratuit) : s'abonner en Realtime avec un
-- `filter` (ex. room_id=eq.X, id=eq.match) — jamais à une table entière.

-- ── 3. MONÉTISATION (Moov / Flooz) + ADMIN ──────────────────────

-- Liste blanche d'administrateurs (insère ton user_id une fois, à la main).
create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- Demandes d'achat (le reçu Flooz/Moov est uploadé dans Storage : bucket "receipts").
create table if not exists public.premium_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product text not null,
  amount_fcfa int not null check (amount_fcfa > 0),
  provider text not null check (provider in ('moov','flooz')),
  receipt_url text,                       -- chemin Storage du reçu
  sparks_reward int not null default 0,
  grants_vip boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists orders_status_idx on public.premium_orders (status, created_at desc);
create index if not exists orders_user_idx on public.premium_orders (user_id, created_at desc);

-- Validation/refus ATOMIQUE par l'admin : crédite Sparks/VIP en une transaction.
create or replace function public.review_order(p_order uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_sparks int; v_vip boolean; v_status text;
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  select user_id, sparks_reward, grants_vip, status
    into v_user, v_sparks, v_vip, v_status
    from public.premium_orders where id = p_order for update;     -- verrou
  if not found then raise exception 'Commande introuvable'; end if;
  if v_status <> 'pending' then raise exception 'Commande déjà traitée'; end if;

  if p_approve then
    if v_sparks > 0 then perform public.award_sparks(v_user, v_sparks, 'premium_purchase'); end if;
    if v_vip then update public.profiles set is_vip = true where id = v_user; end if;
    update public.premium_orders set status = 'approved', reviewed_at = now() where id = p_order;
  else
    update public.premium_orders set status = 'rejected', reviewed_at = now() where id = p_order;
  end if;
end;$$;

-- Compteur d'utilisateurs (temps réel, léger).
create or replace function public.total_users()
returns int language sql security definer stable set search_path = public as $$
  select count(*)::int from public.profiles;
$$;

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.premium_orders enable row level security;
alter table public.app_admins enable row level security;

-- L'utilisateur voit/crée ses commandes ; l'admin voit tout.
drop policy if exists "orders_insert_self" on public.premium_orders;
create policy "orders_insert_self" on public.premium_orders for insert with check (auth.uid() = user_id);
drop policy if exists "orders_read_self_or_admin" on public.premium_orders;
create policy "orders_read_self_or_admin" on public.premium_orders for select
  using (auth.uid() = user_id or public.is_admin());
-- (mise à jour uniquement via review_order)

drop policy if exists "admins_read" on public.app_admins;
create policy "admins_read" on public.app_admins for select using (auth.uid() = user_id or public.is_admin());

-- Realtime pour le dashboard admin (nouvelles commandes en direct)
do $$ begin
  alter publication supabase_realtime add table public.premium_orders;
exception when duplicate_object then null; end $$;

-- ── Storage : bucket privé "receipts" ───────────────────────────
-- À créer dans Dashboard → Storage → New bucket "receipts" (privé).
-- Policies suggérées :
--   insert : auth.uid() = owner (l'utilisateur dépose son reçu)
--   select : owner OU is_admin()  (l'admin consulte les reçus)

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : social.sql                                     ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- FLEX — Modules sociaux : Vibe Audio, Match Spark (drague), Flex Shop,
-- Teufs (événements). À exécuter après schema.sql / economy.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── Vibe Audio ──────────────────────────────────────────────────
alter table public.profiles add column if not exists music_url text;

-- ── Match Spark (drague) ────────────────────────────────────────
create table if not exists public.sparks_match (
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);
create index if not exists spark_to_idx on public.sparks_match (to_id);

-- Vue des matchs mutuels (les deux se sont sparkés)
create or replace view public.spark_matches as
  select s1.from_id as a, s1.to_id as b
  from public.sparks_match s1
  join public.sparks_match s2 on s1.from_id = s2.to_id and s1.to_id = s2.from_id
  where s1.from_id < s1.to_id;

-- ── Flex Shop ───────────────────────────────────────────────────
create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  photo_url text,
  price int not null check (price >= 0),
  currency text not null default 'sparks' check (currency in ('sparks','fcfa')),
  category text not null default 'autre',
  created_at timestamptz not null default now()
);
create index if not exists shop_seller_idx on public.shop_items (seller_id, created_at desc);

-- ── Teufs (événements) ──────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  topic text,
  cover_url text,
  emoji text default '🎉',
  starts_at timestamptz,
  price int not null default 0,
  location text,
  map_url text,
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on public.events (starts_at);

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.sparks_match enable row level security;
alter table public.shop_items enable row level security;
alter table public.events enable row level security;

drop policy if exists "spark_insert_self" on public.sparks_match;
create policy "spark_insert_self" on public.sparks_match for insert with check (auth.uid() = from_id);
drop policy if exists "spark_read_involved" on public.sparks_match;
create policy "spark_read_involved" on public.sparks_match for select
  using (auth.uid() = from_id or auth.uid() = to_id);

drop policy if exists "shop_read" on public.shop_items;
create policy "shop_read" on public.shop_items for select using (true);
drop policy if exists "shop_write_self" on public.shop_items;
create policy "shop_write_self" on public.shop_items for insert with check (auth.uid() = seller_id);
drop policy if exists "shop_delete_self" on public.shop_items;
create policy "shop_delete_self" on public.shop_items for delete using (auth.uid() = seller_id);

drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events for select using (true);
drop policy if exists "events_create_self" on public.events;
create policy "events_create_self" on public.events for insert with check (auth.uid() = host_id);

do $$ begin
  alter publication supabase_realtime add table public.sparks_match;
exception when duplicate_object then null; end $$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : otaku.sql                                      ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- FLEX — Manga & Otaku Sanctuary : titres de prestige + thèmes de profil.
-- À exécuter après economy.sql (utilise les wallets / spark_ledger).
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists otaku_title text;
alter table public.profiles add column if not exists profile_theme text not null default 'none';

-- Dépense atomique de Sparks (sink : achats cosmétiques).
create or replace function public.spend_sparks(p_amount int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_bal int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_amount <= 0 then raise exception 'Montant invalide'; end if;
  perform public.ensure_wallet(v_uid);
  select sparks into v_bal from public.wallets where user_id = v_uid for update;  -- verrou
  if coalesce(v_bal,0) < p_amount then raise exception 'Solde insuffisant'; end if;
  update public.wallets set sparks = sparks - p_amount, updated_at = now() where user_id = v_uid;
  insert into public.spark_ledger (user_id, delta, reason) values (v_uid, -p_amount, p_reason);
end;$$;

-- Achat + équipement d'un titre otaku, en une transaction.
create or replace function public.buy_otaku_title(p_title text, p_price int)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_price > 0 then perform public.spend_sparks(p_price, 'otaku_title'); end if;
  insert into public.user_badges (user_id, badge) values (v_uid, p_title) on conflict do nothing;
  update public.profiles set otaku_title = p_title where id = v_uid;
end;$$;

-- Achat + application d'un thème de profil.
create or replace function public.buy_profile_theme(p_theme text, p_price int)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_price > 0 then perform public.spend_sparks(p_price, 'profile_theme'); end if;
  update public.profiles set profile_theme = p_theme where id = v_uid;
end;$$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : engagement.sql                                 ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
--  FLEX — Moteur d'engagement : rétention/trending, notifications,
--  signalements (modération conforme stores). Après schema/economy.
-- ═══════════════════════════════════════════════════════════════

-- ── Signaux d'engagement sur les posts ──────────────────────────
alter table public.flexes add column if not exists shares_count int not null default 0;
alter table public.flexes add column if not exists views_count int not null default 0;
alter table public.flexes add column if not exists dwell_ms_total bigint not null default 0;

create index if not exists flexes_trending_idx on public.flexes (likes_count desc, created_at desc);

-- Enregistre une vue + temps de rétention (dwell) de façon agrégée.
create or replace function public.record_view(p_post uuid, p_dwell_ms int default 0)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.flexes
     set views_count = views_count + 1,
         dwell_ms_total = dwell_ms_total + greatest(0, p_dwell_ms)
   where id = p_post;
end;$$;

create or replace function public.record_share(p_post uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.flexes set shares_count = shares_count + 1 where id = p_post;
end;$$;

-- ── Score de tendance (rétention + interactivité, décroissance temporelle)
--   Plus un post retient l'attention et fait réagir, plus il est propulsé.
create or replace view public.trending_posts as
  select f.*,
    (
      f.likes_count * 1.0
      + f.comments_count * 2.0
      + f.shares_count * 3.0
      + least(f.dwell_ms_total / 1000.0, 5000) * 0.05      -- rétention (plafonnée)
    ) / power(greatest(extract(epoch from (now() - f.created_at)) / 3600.0, 1) + 2, 1.4) as trend_score
  from public.flexes f;

-- ── Notifications (valorisation + incitation à publier) ─────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'hype',  -- hype | trend | social | system
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications (user_id, created_at desc);

-- Pousse une notification (utilisable par triggers / Edge Functions).
create or replace function public.push_notification(p_user uuid, p_kind text, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body)
  values (p_user, p_kind, p_title, p_body);
end;$$;

-- Quand un post franchit un palier de likes, on félicite l'auteur.
create or replace function public.on_flex_hype() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.likes_count = 50 and old.likes_count < 50 then
    perform public.push_notification(new.author_id, 'trend',
      'Ton post cartonne ! 🔥', 'Partage ton prochain look pour doubler tes vues.');
  elsif new.likes_count = 200 and old.likes_count < 200 then
    perform public.push_notification(new.author_id, 'trend',
      'Tu es en tendance ! ✦', 'Ne t’arrête pas là, montre ton mood du jour.');
  end if;
  return new;
end;$$;
drop trigger if exists trg_flex_hype on public.flexes;
create trigger trg_flex_hype after update of likes_count on public.flexes
  for each row execute function public.on_flex_hype();

-- ── Signalements (modération / conformité Apple & Google) ───────
do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile', 'message')),
  target_id   uuid not null,
  reason      text not null,
  details     text,
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- Traitement d'un signalement par l'admin.
create or replace function public.review_report(p_report uuid, p_status public.report_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  update public.reports set status = p_status, reviewed_at = now() where id = p_report;
end;$$;

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

drop policy if exists "notif_read_self" on public.notifications;
create policy "notif_read_self"   on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notif_update_self" on public.notifications;
create policy "notif_update_self" on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self"  on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports_read_admin" on public.reports;
create policy "reports_read_admin"   on public.reports for select using (public.is_admin() or auth.uid() = reporter_id);

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null; end $$;

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  SECTION : security.sql                                   ║
-- ╚═══════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
--  FLEX — FORTERESSE DE SÉCURITÉ (Zero-Trust + défense active)
--  À exécuter en DERNIER (après growth.sql : utilise is_admin()).
--
--  Contenu :
--   • Audit immuable write-once (security_logs)
--   • Blacklist automatique des comptes (blocked_accounts)
--   • Honey-pots (tables + RPC pièges) → alerte + bannissement instantané
--   • Garde anti-XSS / anti-SQLi sur tout contenu entrant (triggers)
--   • Verrou : un compte blacklisté ne peut plus rien écrire
-- ═══════════════════════════════════════════════════════════════

-- ── 1. AUDIT IMMUABLE (write-once, read-admin-only) ─────────────
create table if not exists public.security_logs (
  id         bigint generated always as identity primary key,
  actor      uuid,                      -- auth.uid() au moment de l'événement (peut être null)
  event      text not null,
  severity   text not null default 'info' check (severity in ('info','warn','critical')),
  ip         inet,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists seclog_event_idx on public.security_logs (event, created_at desc);
create index if not exists seclog_actor_idx on public.security_logs (actor, created_at desc);

-- Écriture EXCLUSIVEMENT via cette fonction (security definer).
create or replace function public.log_security_event(p_event text, p_severity text default 'info', p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.security_logs (actor, event, severity, meta)
  values (auth.uid(), p_event, coalesce(p_severity,'info'), coalesce(p_meta,'{}'::jsonb));
end;$$;

-- ── 2. BLACKLIST AUTOMATIQUE ────────────────────────────────────
create table if not exists public.blocked_accounts (
  user_id    uuid primary key,
  reason     text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_blocked(p_uid uuid default auth.uid())
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.blocked_accounts where user_id = p_uid);
$$;

create or replace function public.blacklist_account(p_uid uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null then return; end if;
  insert into public.blocked_accounts (user_id, reason) values (p_uid, p_reason)
    on conflict (user_id) do nothing;
  perform public.log_security_event('account_blacklisted', 'critical',
    jsonb_build_object('uid', p_uid, 'reason', p_reason));
end;$$;

-- ── 3. HONEY-POTS (pièges) ──────────────────────────────────────
-- Tables d'apparence sensible : RLS active, AUCUNE policy → accès refusé,
-- et toute requête est anormale par nature (rien à y faire de légitime).
create table if not exists public.admin_secrets  (id int primary key, secret text);
create table if not exists public.global_configs (id int primary key, value text);
alter table public.admin_secrets  enable row level security;
alter table public.global_configs enable row level security;
-- (Aucune policy : tout select/insert est bloqué par défaut.)

-- RPC pièges au nom alléchant : quiconque les appelle est banni sur-le-champ.
create or replace function public.get_admin_secrets()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.log_security_event('honeypot_hit', 'critical', jsonb_build_object('endpoint','get_admin_secrets'));
  perform public.blacklist_account(auth.uid(), 'honeypot: get_admin_secrets');
  raise exception 'Access denied';
end;$$;

create or replace function public.dump_all_users()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.log_security_event('honeypot_hit', 'critical', jsonb_build_object('endpoint','dump_all_users'));
  perform public.blacklist_account(auth.uid(), 'honeypot: dump_all_users');
  raise exception 'Access denied';
end;$$;

-- ── 4. GARDE ANTI-XSS / ANTI-SQLi ───────────────────────────────
-- Détecte les signatures d'injection les plus agressives (jamais présentes
-- dans un contenu lifestyle légitime) → log + blacklist + rejet.
create or replace function public.is_malicious(p_text text)
returns boolean language sql immutable set search_path = public as $$
  select p_text ~* '(<\s*script)|(javascript\s*:)|(onerror\s*=)|(onload\s*=)|(union\s+select)|(drop\s+table)|(insert\s+into\s+\w+\s+values)|(pg_sleep\s*\()|(xp_cmdshell)|(;\s*--)';
$$;

create or replace function public.guard_content()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- compte déjà blacklisté ? interdiction totale d'écrire.
  if public.is_blocked(auth.uid()) then
    raise exception 'Account suspended';
  end if;
  -- tentative d'injection ?
  if new.content is not null and public.is_malicious(new.content) then
    perform public.log_security_event('injection_attempt', 'critical',
      jsonb_build_object('table', tg_table_name, 'sample', left(new.content, 120)));
    perform public.blacklist_account(auth.uid(), 'injection: ' || tg_table_name);
    raise exception 'Contenu rejeté (sécurité)';
  end if;
  return new;
end;$$;

-- On garde toutes les surfaces de contenu utilisateur.
drop trigger if exists trg_guard_flexes on public.flexes;
create trigger trg_guard_flexes before insert or update of content on public.flexes
  for each row execute function public.guard_content();

-- 'comments' n'existe pas dans le schéma officiel (schema.sql) ; on protège
-- DROP *et* CREATE pour ne pas casser le run si la table est absente.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='comments') then
    execute 'drop trigger if exists trg_guard_comments on public.comments';
    execute 'create trigger trg_guard_comments before insert or update of content on public.comments for each row execute function public.guard_content()';
  end if;
end $$;

drop trigger if exists trg_guard_chat on public.chat_messages;
create trigger trg_guard_chat before insert or update of content on public.chat_messages
  for each row execute function public.guard_content();

drop trigger if exists trg_guard_secret on public.secret_messages;
create trigger trg_guard_secret before insert or update of content on public.secret_messages
  for each row execute function public.guard_content();

-- ── 5. RLS sur les tables de sécurité (lecture admin uniquement) ─
alter table public.security_logs    enable row level security;
alter table public.blocked_accounts enable row level security;

drop policy if exists "seclog_read_admin" on public.security_logs;
create policy "seclog_read_admin"   on public.security_logs    for select using (public.is_admin());
drop policy if exists "blocked_read_admin" on public.blocked_accounts;
create policy "blocked_read_admin"  on public.blocked_accounts for select using (public.is_admin());
-- Aucune policy insert/update/delete → mutations IMPOSSIBLES hors fonctions
-- security definer. security_logs est donc write-once / read-only.

-- Verrou matériel : on retire tout droit d'écriture direct résiduel.
revoke insert, update, delete on public.security_logs    from anon, authenticated;
revoke insert, update, delete on public.blocked_accounts from anon, authenticated;
revoke all on public.admin_secrets  from anon, authenticated;
revoke all on public.global_configs from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
--  Rappel : la clé service_role contourne TOUT ceci. Ne l'expose JAMAIS
--  côté client. Garde-la côté serveur (Edge Functions / secrets), et
--  rotationne-la au moindre doute.
-- ═══════════════════════════════════════════════════════════════
