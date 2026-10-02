-- Daily growth research: one row per morning run, so each run can see what was
-- already suggested and never pitch the same idea twice. Service-role only.
create table if not exists growth_briefs (
  id uuid default gen_random_uuid() primary key,
  run_date date not null default (now() at time zone 'Pacific/Honolulu')::date,
  headline text,
  ideas jsonb not null default '[]'::jsonb,  -- [{ title, channel, why, first_step, effort, revenue_path }]
  brief text,                                -- the full markdown report
  created_at timestamptz default now()
);

create index if not exists growth_briefs_date_idx on growth_briefs (run_date desc);

alter table growth_briefs enable row level security;