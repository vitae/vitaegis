-- Run once in your Supabase SQL editor.
-- Research desk: books, papers, videos and articles go in; verbatim quotes and
-- recurring findings come out; a topic brief is collated and handed to the
-- content pipeline (content_ingest -> content_posts) for branded slides + publishing.

create table if not exists research_sources (
  id uuid default gen_random_uuid() primary key,
  kind text not null,                      -- pdf | youtube | url | text
  title text,
  author text,
  url text,                                -- youtube / article / paper URL
  storage_path text,                       -- path inside the 'content' bucket for uploads
  mime_type text,
  note text default '',                    -- what you want pulled out of it
  topics text[] default '{}',              -- energy | mitochondria | brainwaves | meditation | fitness | recipes | travel | gear
  status text not null default 'queued',   -- queued | extracting | done | failed
  summary text,
  error text,
  findings_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One row per verbatim quote or per scientific finding pulled from a source.
create table if not exists research_findings (
  id uuid default gen_random_uuid() primary key,
  source_id uuid references research_sources(id) on delete cascade,
  kind text not null,                      -- quote | finding
  text text not null,                      -- the quote verbatim, or the finding as a one-line claim
  evidence text,                           -- for findings: the study/mechanism/numbers behind the claim
  location text,                           -- page, chapter, or MM:SS timestamp
  topic text,
  strength text,                           -- strong | moderate | weak (findings only)
  created_at timestamptz default now()
);

-- A collated topic brief: the recurring findings and the best quotes across sources.
create table if not exists research_briefs (
  id uuid default gen_random_uuid() primary key,
  topic text not null,
  title text,
  hook text,
  summary text,
  key_findings jsonb default '[]'::jsonb,  -- [{ claim, recurrence, sources: [title], evidence }]
  quotes jsonb default '[]'::jsonb,        -- [{ text, author, source, location }]
  takeaway text,
  source_ids uuid[] default '{}',
  status text not null default 'queued',   -- queued | ready | posted | failed
  ingest_id uuid references content_ingest(id) on delete set null,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists research_findings_topic_idx on research_findings (topic, kind);
create index if not exists research_findings_source_idx on research_findings (source_id);
create index if not exists research_sources_status_idx on research_sources (status, created_at desc);

alter table research_sources enable row level security;
alter table research_findings enable row level security;
alter table research_briefs enable row level security;
-- No policies: service-role only, like the rest of the pipeline. The desk sits behind CONTENT_ADMIN_KEY.
