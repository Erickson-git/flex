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
