-- Whole Foods run (/wholefoods): one row per signed-in user holding the whole checklist
-- state (items, trips) as JSON, so a phone and a laptop share one list. The browser writes
-- it directly with the anon key as the signed-in user; RLS scopes rows to auth.uid().
-- Realtime on the table lets the other device pick up a change within a second or two.

create table if not exists public.wf_lists (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- The ListState object from lib/wholefoods.ts: { items, trips, updatedAt }.
  state jsonb not null,
  -- Mirrors state.updatedAt so last-write-wins can be decided without parsing JSON.
  updated_at timestamptz not null default now()
);

alter table public.wf_lists enable row level security;

drop policy if exists "wf_lists owner select" on public.wf_lists;
create policy "wf_lists owner select" on public.wf_lists for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "wf_lists owner insert" on public.wf_lists;
create policy "wf_lists owner insert" on public.wf_lists for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "wf_lists owner update" on public.wf_lists;
create policy "wf_lists owner update" on public.wf_lists for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "wf_lists owner delete" on public.wf_lists;
create policy "wf_lists owner delete" on public.wf_lists for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.wf_lists to authenticated;

-- Push row changes to subscribed browsers (postgres_changes). Safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wf_lists'
  ) then
    alter publication supabase_realtime add table public.wf_lists;
  end if;
end $$;
