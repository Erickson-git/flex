-- ═══════════════════════════════════════════════════════════════
-- FLEX — Retrait des Sparks en FCFA (mobile money Moov / Flooz).
-- Économie créateur : convertir ses Sparks en argent réel.
-- À exécuter APRÈS economy.sql et growth.sql (SQL Editor → Run).
--
-- Principe de sécurité (identique au reste de l'économie) :
--   • Le client ne modifie JAMAIS un solde directement (RLS lecture seule).
--   • Demander un retrait DÉBITE les Sparks immédiatement (mise en séquestre)
--     via une fonction `security definer` atomique avec verrou de ligne
--     (SELECT ... FOR UPDATE) → impossible de retirer deux fois les mêmes
--     Sparks ou de les redépenser pendant que la demande est en attente.
--   • L'admin envoie le mobile money À LA MAIN, puis marque « payé ».
--   • Un refus RECRÉDITE les Sparks atomiquement.
--
-- Taux : 1 FCFA = 5 Sparks (retrait volontairement moins avantageux que
-- l'achat ~2,4–3,2 Sparks/FCFA → marge plateforme + pas d'arbitrage).
-- Minimum : 10 000 Sparks (= 2 000 FCFA).
-- ═══════════════════════════════════════════════════════════════

-- Paramètres économiques (constantes serveur, source de vérité).
create or replace function public.payout_sparks_per_fcfa()
returns int language sql immutable set search_path = public as $$ select 5 $$;
create or replace function public.payout_min_sparks()
returns int language sql immutable set search_path = public as $$ select 10000 $$;

-- ── Demandes de retrait ─────────────────────────────────────────
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sparks_amount int not null check (sparks_amount > 0),
  amount_fcfa int not null check (amount_fcfa > 0),
  provider text not null check (provider in ('moov','flooz')),
  payout_number text not null,            -- numéro mobile money du créateur
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists payouts_status_idx on public.payout_requests (status, created_at desc);
create index if not exists payouts_user_idx on public.payout_requests (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════
-- FONCTIONS ATOMIQUES
-- ═══════════════════════════════════════════════════════════════

-- DEMANDE DE RETRAIT : débite (séquestre) les Sparks et crée la demande.
-- Verrou du wallet → pas de double-retrait, pas de solde négatif.
create or replace function public.request_payout(p_sparks int, p_provider text, p_number text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bal int;
  v_rate int := public.payout_sparks_per_fcfa();
  v_min int := public.payout_min_sparks();
  v_fcfa int;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_provider not in ('moov','flooz') then raise exception 'Opérateur invalide'; end if;
  if coalesce(btrim(p_number), '') = '' then raise exception 'Numéro requis'; end if;
  if p_sparks < v_min then
    raise exception 'Minimum de retrait : % Sparks', v_min;
  end if;
  -- Le montant FCFA est calculé SERVEUR (le client ne le fixe jamais).
  v_fcfa := floor(p_sparks / v_rate);
  if v_fcfa <= 0 then raise exception 'Montant trop faible'; end if;
  -- On ne retient que les Sparks réellement convertibles (multiple du taux).
  p_sparks := v_fcfa * v_rate;

  perform public.ensure_wallet(v_uid);
  select sparks into v_bal from public.wallets where user_id = v_uid for update;  -- verrou
  if coalesce(v_bal, 0) < p_sparks then raise exception 'Solde insuffisant'; end if;

  -- Séquestre : on débite tout de suite, la demande "porte" les Sparks.
  update public.wallets set sparks = sparks - p_sparks, updated_at = now() where user_id = v_uid;
  insert into public.payout_requests (user_id, sparks_amount, amount_fcfa, provider, payout_number)
    values (v_uid, p_sparks, v_fcfa, p_provider, btrim(p_number)) returning id into v_id;
  insert into public.spark_ledger (user_id, delta, reason, ref_id)
    values (v_uid, -p_sparks, 'payout_hold', v_id);
  return v_id;
end;$$;

-- VALIDATION / REFUS par l'admin (atomique).
--   approve = true  → marque « payé » (les Sparks restent débités).
--   approve = false → REMBOURSE les Sparks au créateur.
create or replace function public.review_payout(p_payout uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_sparks int; v_status text;
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  select user_id, sparks_amount, status
    into v_user, v_sparks, v_status
    from public.payout_requests where id = p_payout for update;   -- verrou
  if not found then raise exception 'Demande introuvable'; end if;
  if v_status <> 'pending' then raise exception 'Demande déjà traitée'; end if;

  if p_approve then
    update public.payout_requests
       set status = 'paid', reviewed_at = now(), admin_note = p_note
     where id = p_payout;
    -- Trace comptable du décaissement effectif (les Sparks étaient déjà retirés).
    insert into public.spark_ledger (user_id, delta, reason, ref_id)
      values (v_user, 0, 'payout_paid', p_payout);
  else
    -- Remboursement intégral du séquestre.
    perform public.award_sparks(v_user, v_sparks, 'payout_refund');
    update public.payout_requests
       set status = 'rejected', reviewed_at = now(), admin_note = p_note
     where id = p_payout;
  end if;
end;$$;

-- ═══════════════════════════════════════════════════════════════
-- RLS — lecture seule côté client ; mutations via RPC uniquement
-- ═══════════════════════════════════════════════════════════════
alter table public.payout_requests enable row level security;

-- L'utilisateur voit ses retraits ; l'admin voit tout.
drop policy if exists "payouts_read_self_or_admin" on public.payout_requests;
create policy "payouts_read_self_or_admin" on public.payout_requests for select
  using (auth.uid() = user_id or public.is_admin());
-- (aucune policy INSERT/UPDATE/DELETE → impossible hors request_payout / review_payout)

-- Realtime pour le dashboard admin (nouvelles demandes en direct).
do $$ begin
  alter publication supabase_realtime add table public.payout_requests;
exception when duplicate_object then null; end $$;

-- Verrouillage des droits : aucune écriture directe.
revoke insert, update, delete on public.payout_requests from anon, authenticated;
