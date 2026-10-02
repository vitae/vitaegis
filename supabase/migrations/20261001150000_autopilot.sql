-- YouTube autopilot: mark where each ingest came from, and what topic it covered,
-- so the planner can space posts out and never repeat a topic too soon.
alter table content_ingest add column if not exists origin text not null default 'capture'; -- capture | autopilot
alter table content_ingest add column if not exists meta jsonb default '{}'::jsonb;          -- { topic, pillar }

create index if not exists content_ingest_origin_idx on content_ingest (origin, created_at desc);
