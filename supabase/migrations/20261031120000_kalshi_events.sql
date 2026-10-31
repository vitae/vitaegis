-- Kalshi bot telemetry. scripts/kalshi_bot.py writes one row per market change, order or
-- error with the service role key; /admin/kalshi reads them back. Service-role only.
create table if not exists kalshi_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('tick', 'order', 'error', 'status')),
  live boolean not null default false,       -- false while the bot runs in dry-run mode
  ticker text,
  close_time timestamptz,
  yes_ask_cents integer,
  no_ask_cents integer,
  outcome text check (outcome in ('yes', 'no')),
  price_cents integer,
  count integer,
  order_id text,
  fill_count integer,
  remaining_count integer,
  avg_fill_cents integer,
  balance_cents integer,
  message text
);

create index if not exists kalshi_events_created_idx on kalshi_events (created_at desc);
create index if not exists kalshi_events_kind_idx on kalshi_events (kind, created_at desc);

alter table kalshi_events enable row level security;
