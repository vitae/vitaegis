-- Kalshi bot telemetry. scripts/kalshi_bot.py writes one row per market change, order,
-- settlement or error with the service role key; /kalshi and /admin/kalshi read them back.
-- Service-role only.
create table if not exists kalshi_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('tick', 'order', 'settle', 'error', 'status')),
  live boolean not null default false,       -- false while the bot runs in dry-run mode
  ticker text,
  title text,                                -- Kalshi's market title
  close_time timestamptz,
  seconds_to_close integer,                  -- at the tick, or at order entry
  yes_ask_cents integer,
  no_ask_cents integer,
  -- orders
  client_order_id text,                      -- our UUID; settlement updates the row by it
  outcome text check (outcome in ('yes', 'no')),
  price_cents integer,                       -- limit price we asked for
  count integer,                             -- contracts we asked for
  order_id text,
  fill_count integer,
  remaining_count integer,
  avg_fill_cents integer,
  fee_cents integer,                         -- total fee paid on the fills
  latency_ms integer,                        -- opportunity seen -> order acknowledged
  -- settlement (orders and settle rows)
  result text check (result in ('yes', 'no')),
  pnl_cents integer,                         -- realized, after fees
  settled_at timestamptz,
  path jsonb,                                -- settle rows: [[seconds_to_close, yes_ask, no_ask], ...]
  balance_cents integer,
  message text
);

create index if not exists kalshi_events_created_idx on kalshi_events (created_at desc);
create index if not exists kalshi_events_kind_idx on kalshi_events (kind, created_at desc);
create index if not exists kalshi_events_client_order_idx on kalshi_events (client_order_id)
  where client_order_id is not null;

alter table kalshi_events enable row level security;
