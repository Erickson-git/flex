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
create policy "wallet_read_self" on public.wallets for select using (auth.uid() = user_id);
create policy "ledger_read_self" on public.spark_ledger for select using (auth.uid() = user_id);
create policy "badges_read_all"  on public.user_badges for select using (true);

-- Marché : annonces visibles de tous ; pas d'écriture directe (via list_badge / buy_listing).
create policy "listings_read" on public.market_listings for select using (true);

-- Spotlights : lisibles de tous (pour pondérer le ranking côté lecture).
create policy "spotlight_read" on public.spotlights for select using (true);

-- Visites : seul le profil visité lit ses visiteurs ; insertion par le visiteur.
create policy "views_read_target" on public.profile_views for select using (auth.uid() = target_id);
create policy "views_insert_self" on public.profile_views for insert with check (auth.uid() = viewer_id);

-- Realtime
alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.market_listings;

-- Verrouillage des droits : on retire toute écriture directe résiduelle.
revoke insert, update, delete on public.wallets from anon, authenticated;
revoke insert, update, delete on public.spark_ledger from anon, authenticated;
revoke insert, update, delete on public.market_listings from anon, authenticated;
