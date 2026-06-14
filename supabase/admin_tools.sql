-- ═══════════════════════════════════════════════════════════════
--  FLEX — admin_tools.sql  (ADDITIF, idempotent)
--  À exécuter APRÈS security.sql, dans Supabase → SQL Editor.
--  Ajoute : ban temporaire, RPC admin-gated (ban/unban/warn/stats/logs)
--  et CORRIGE une faille : blacklist_account() était appelable par
--  n'importe quel compte authentifié (→ bannir autrui). On la verrouille.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Ban temporaire : colonne d'expiration ───────────────────
alter table public.blocked_accounts add column if not exists until timestamptz;

-- is_blocked respecte l'expiration (un ban temporaire se lève tout seul)
create or replace function public.is_blocked(p_uid uuid default auth.uid())
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.blocked_accounts
    where user_id = p_uid and (until is null or until > now())
  );
$$;

-- ── 2. DURCISSEMENT : blacklist_account ne doit JAMAIS être appelée
--     directement par un client. Elle reste utilisable en interne
--     (honeypots, guard_content) car celles-ci sont security definer.
revoke execute on function public.blacklist_account(uuid, text) from anon, authenticated;

-- ── 3. RPC admin-gated : sanctions ─────────────────────────────
-- Ban définitif (p_until null) ou temporaire (p_until = date d'expiration).
create or replace function public.admin_ban_user(p_uid uuid, p_reason text, p_until timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  if p_uid is null then return; end if;
  insert into public.blocked_accounts (user_id, reason, until)
    values (p_uid, coalesce(p_reason,'sanction admin'), p_until)
    on conflict (user_id) do update set reason = excluded.reason, until = excluded.until;
  perform public.log_security_event('admin_ban', 'critical',
    jsonb_build_object('uid', p_uid, 'reason', p_reason, 'until', p_until));
end;$$;

create or replace function public.admin_unban_user(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  delete from public.blocked_accounts where user_id = p_uid;
  perform public.log_security_event('admin_unban', 'warn', jsonb_build_object('uid', p_uid));
end;$$;

-- Avertissement : pas de blocage, juste une trace d'audit (+ notif si dispo).
create or replace function public.admin_warn_user(p_uid uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  perform public.log_security_event('admin_warn', 'warn',
    jsonb_build_object('uid', p_uid, 'reason', p_reason));
  -- Notifie l'utilisateur (best-effort).
  begin
    insert into public.notifications (user_id, kind, title, body)
    values (p_uid, 'system', 'Avertissement', p_reason);
  exception when others then null; end;
end;$$;

-- ── 4. Métriques agrégées (admin only) ─────────────────────────
create or replace function public.admin_stats()
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  select jsonb_build_object(
    'users',       (select count(*) from public.profiles),
    'pending',     (select count(*) from public.premium_orders where status = 'pending'),
    'signups24h',  (select count(*) from public.profiles where created_at > now() - interval '24 hours'),
    'signups7d',   (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'openReports', (select count(*) from public.reports where status = 'open'),
    'blocked',     (select count(*) from public.blocked_accounts where until is null or until > now())
  ) into result;
  return result;
end;$$;

-- ── 5. Logs d'activité récents (admin only) ────────────────────
create or replace function public.admin_recent_logs(p_limit int default 25)
returns setof public.security_logs language sql security definer stable set search_path = public as $$
  select * from public.security_logs
  where public.is_admin()
  order by created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

-- Droits d'exécution : réservés aux comptes authentifiés (la garde
-- is_admin() à l'intérieur fait le tri ; anon n'a aucun accès).
revoke execute on function public.admin_ban_user(uuid, text, timestamptz)   from anon;
revoke execute on function public.admin_unban_user(uuid)                     from anon;
revoke execute on function public.admin_warn_user(uuid, text)               from anon;
revoke execute on function public.admin_stats()                             from anon;
revoke execute on function public.admin_recent_logs(int)                    from anon;
