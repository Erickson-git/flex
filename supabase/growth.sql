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
create policy "orders_insert_self" on public.premium_orders for insert with check (auth.uid() = user_id);
create policy "orders_read_self_or_admin" on public.premium_orders for select
  using (auth.uid() = user_id or public.is_admin());
-- (mise à jour uniquement via review_order)

create policy "admins_read" on public.app_admins for select using (auth.uid() = user_id or public.is_admin());

-- Realtime pour le dashboard admin (nouvelles commandes en direct)
alter publication supabase_realtime add table public.premium_orders;

-- ── Storage : bucket privé "receipts" ───────────────────────────
-- À créer dans Dashboard → Storage → New bucket "receipts" (privé).
-- Policies suggérées :
--   insert : auth.uid() = owner (l'utilisateur dépose son reçu)
--   select : owner OU is_admin()  (l'admin consulte les reçus)
