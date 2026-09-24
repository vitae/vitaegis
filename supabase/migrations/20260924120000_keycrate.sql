-- KeyCrate: tracks, playlists, playlist items and set studies, all scoped to auth.uid().
-- Apply as one migration. Tables are created with RLS on and get their policies at the end.

create table if not exists kc_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- rekordbox TrackID, or a stable hash of artist+title+duration for CSV rows.
  source_id text not null,
  artist text not null default '',
  title text not null,
  camelot text check (camelot is null or camelot ~ '^([1-9]|1[0-2])[AB]$'),
  bpm numeric(6,2) check (bpm is null or bpm > 0),
  duration_s int check (duration_s is null or duration_s >= 0),
  genre text,
  label text,
  energy smallint check (energy is null or energy between 1 and 10),
  rating smallint check (rating is null or rating between 0 and 5),
  tags text[] not null default '{}',
  location text,
  added_at timestamptz,
  constraint kc_tracks_user_source_key unique (user_id, source_id)
);
create index if not exists kc_tracks_user_camelot_bpm_idx on kc_tracks (user_id, camelot, bpm);

create table if not exists kc_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mode text not null default 'smooth' check (mode in ('smooth', 'dramatic', 'journey')),
  -- The whole PlaylistSettings object: mode, dramaticEvery, bpmTolerance, keyLock, journey curve.
  target_curve jsonb,
  -- Gates the read-only share page at /keycrate/set/[id].
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kc_playlists_user_updated_idx on kc_playlists (user_id, updated_at desc);

create table if not exists kc_playlist_items (
  playlist_id uuid not null references kc_playlists(id) on delete cascade,
  track_id uuid not null references kc_tracks(id) on delete cascade,
  position int not null,
  transition_type text,
  note text,
  primary key (playlist_id, position)
);
create index if not exists kc_playlist_items_track_idx on kc_playlist_items (track_id);

create table if not exists kc_set_studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_text text not null,
  parsed jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists kc_set_studies_user_idx on kc_set_studies (user_id, created_at desc);

-- updated_at bookkeeping
create or replace function kc_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists kc_playlists_touch on kc_playlists;
create trigger kc_playlists_touch before update on kc_playlists
  for each row execute function kc_touch_updated_at();

alter table kc_tracks enable row level security;
alter table kc_playlists enable row level security;
alter table kc_playlist_items enable row level security;
alter table kc_set_studies enable row level security;

-- Cross-table checks go through security-definer helpers so the policies never re-enter each other.
create or replace function kc_owns_track(p_track_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kc_tracks t where t.id = p_track_id and t.user_id = (select auth.uid()));
$$;
create or replace function kc_owns_playlist(p_playlist_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kc_playlists p where p.id = p_playlist_id and p.user_id = (select auth.uid()));
$$;
create or replace function kc_playlist_is_public(p_playlist_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kc_playlists p where p.id = p_playlist_id and p.is_public);
$$;
create or replace function kc_track_in_public_playlist(p_track_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.kc_playlist_items i
    join public.kc_playlists p on p.id = i.playlist_id
    where i.track_id = p_track_id and p.is_public
  );
$$;

-- Owners read and write their own rows.
create policy "kc_tracks owner" on kc_tracks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "kc_playlists owner" on kc_playlists for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "kc_set_studies owner" on kc_set_studies for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "kc_playlist_items owner" on kc_playlist_items for all to authenticated
  using (kc_owns_playlist(playlist_id))
  with check (kc_owns_playlist(playlist_id) and kc_owns_track(track_id));

-- Anyone with the link can read a public playlist, its items, and the tracks they point at.
create policy "kc_playlists public read" on kc_playlists for select to anon, authenticated
  using (is_public);
create policy "kc_playlist_items public read" on kc_playlist_items for select to anon, authenticated
  using (kc_playlist_is_public(playlist_id));
create policy "kc_tracks public read" on kc_tracks for select to anon, authenticated
  using (kc_track_in_public_playlist(id));
