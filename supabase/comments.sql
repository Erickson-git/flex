-- ═══════════════════════════════════════════════════════════════
--  FLEX — comments.sql  (ADDITIF, idempotent)
--  Fil de commentaires sous les Flexes (le compteur existait déjà).
--  À exécuter après setup.sql (guard_content y est défini).
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  flex_id    uuid not null references public.flexes(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_flex_idx on public.comments (flex_id, created_at);

alter table public.comments enable row level security;
drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments for select using (true);
drop policy if exists "comments_insert_self" on public.comments;
create policy "comments_insert_self" on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists "comments_delete_self" on public.comments;
create policy "comments_delete_self" on public.comments for delete using (auth.uid() = author_id);

-- Compteur comments_count sur flexes
create or replace function public.bump_comment() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.flexes set comments_count = comments_count + 1 where id = new.flex_id;
  elsif tg_op = 'DELETE' then
    update public.flexes set comments_count = greatest(0, comments_count - 1) where id = old.flex_id;
  end if;
  return null;
end;$$;
drop trigger if exists trg_bump_comment on public.comments;
create trigger trg_bump_comment after insert or delete on public.comments
  for each row execute function public.bump_comment();

-- Garde anti-injection (guard_content défini dans security.sql / setup.sql)
do $$ begin
  if exists (select 1 from pg_proc where proname = 'guard_content') then
    drop trigger if exists trg_guard_comments on public.comments;
    create trigger trg_guard_comments before insert or update of content on public.comments
      for each row execute function public.guard_content();
  end if;
end $$;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; end $$;
