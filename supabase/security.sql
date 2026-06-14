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
