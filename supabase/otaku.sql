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
