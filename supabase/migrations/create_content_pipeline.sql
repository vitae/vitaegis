-- Run once in your Supabase SQL editor.
-- Content pipeline: iPhone Shortcut -> ingest -> Gemini/Nano Banana Pro/Veo -> review -> social.

-- Raw material captured from the phone.
create table if not exists content_ingest (
  id uuid default gen_random_uuid() primary key,
  kind text not null default 'photo',      -- photo | video | voice | text
  storage_path text,                       -- path inside the 'content' bucket
  note text default '',                    -- whatever you dictated or typed in the Shortcut
  captured_at timestamptz default now(),
  status text not null default 'new',      -- new | queued | done | failed
  error text,
  created_at timestamptz default now()
);

-- One row per post we intend to publish.
create table if not exists content_posts (
  id uuid default gen_random_uuid() primary key,
  ingest_id uuid references content_ingest(id) on delete cascade,
  status text not null default 'draft',    -- draft | ready | approved | publishing | published | rejected | failed
  captions jsonb default '{}'::jsonb,      -- { default, instagram, facebook, youtube, tiktok, x }
  media_kind text default 'image',         -- image | video | none
  media_path text,                         -- path inside the 'content' bucket
  media_url text,                          -- public/signed URL handed to the publisher
  platforms text[] default array['instagram','facebook','youtube','tiktok','twitter'],
  ai_disclosure boolean not null default true,
  results jsonb default '{}'::jsonb,       -- publisher response, post ids and permalinks
  error text,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Durable work queue. The cron worker advances one step per run, so nothing
-- depends on a single request staying alive.
create table if not exists content_jobs (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references content_posts(id) on delete cascade,
  ingest_id uuid references content_ingest(id) on delete cascade,
  kind text not null,                      -- caption | image | video | video_poll | publish
  state text not null default 'queued',    -- queued | running | done | failed
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  operation_name text,                     -- Veo long-running operation, polled until done
  payload jsonb default '{}'::jsonb,
  error text,
  run_after timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists content_jobs_pending_idx on content_jobs (state, run_after);
create index if not exists content_posts_status_idx on content_posts (status, created_at desc);

alter table content_ingest enable row level security;
alter table content_posts enable row level security;
alter table content_jobs enable row level security;
-- No policies: every table is service-role only. The pipeline runs server side and
-- the review screen is behind the admin key, so nothing here is publicly readable.

-- Private bucket for captured and generated media.
insert into storage.buckets (id, name, public)
values ('content', 'content', false)
on conflict (id) do nothing;

-- OAuth credentials per social network, one row per connected account.
-- Service-role only: these are publishing credentials, never client readable.
create table if not exists social_accounts (
  platform text primary key,               -- instagram | facebook | youtube | tiktok | twitter
  account_id text,                         -- IG user id, Page id, channel id, open_id, user id
  account_name text,
  access_token text not null,
  refresh_token text,
  expires_at bigint,                       -- unix seconds; null means it does not expire
  scope text,
  meta jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table social_accounts enable row level security;

-- Slide decks: Nano Banana Pro renders several stills for an Instagram carousel,
-- so a post can carry more than one file. media_path stays the first/only one.
alter table content_posts add column if not exists media_paths text[] default '{}';
