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

create policy "spark_insert_self" on public.sparks_match for insert with check (auth.uid() = from_id);
create policy "spark_read_involved" on public.sparks_match for select
  using (auth.uid() = from_id or auth.uid() = to_id);

create policy "shop_read" on public.shop_items for select using (true);
create policy "shop_write_self" on public.shop_items for insert with check (auth.uid() = seller_id);
create policy "shop_delete_self" on public.shop_items for delete using (auth.uid() = seller_id);

create policy "events_read" on public.events for select using (true);
create policy "events_create_self" on public.events for insert with check (auth.uid() = host_id);

alter publication supabase_realtime add table public.sparks_match;
