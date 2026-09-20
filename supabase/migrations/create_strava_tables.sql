-- Run once in your Supabase SQL editor
-- Strava live sync for vitaegis.com/run: one connected athlete, activities pushed by Strava webhooks.

create table if not exists strava_tokens (
  athlete_id bigint primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,            -- unix seconds
  athlete jsonb default '{}'::jsonb,     -- profile as returned by Strava at auth time
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists strava_activities (
  id bigint primary key,                 -- Strava activity id
  athlete_id bigint not null,
  name text not null,
  sport_type text not null,              -- Run, TrailRun, Walk, Ride, ...
  distance_m double precision not null default 0,
  moving_time_s integer not null default 0,
  elapsed_time_s integer not null default 0,
  elevation_gain_m double precision not null default 0,
  start_date timestamptz not null,
  start_date_local timestamptz not null,
  timezone text,
  average_speed double precision,        -- m/s
  average_heartrate double precision,
  max_heartrate double precision,
  device_name text,
  summary_polyline text,
  raw jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists strava_activities_start_date_idx on strava_activities (start_date desc);

alter table strava_tokens enable row level security;
alter table strava_activities enable row level security;

-- Tokens: service role only (no policies for anon/authenticated).

-- Activities are shown publicly on /run.
create policy "Public can read strava_activities"
  on strava_activities for select
  using (true);
