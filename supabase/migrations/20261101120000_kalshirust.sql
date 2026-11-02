-- KALSHIRUST bot (kalshiRUST/): the Rust KXBTC15M bot reads its mode from kalshirust_config and
-- writes telemetry to kalshirust_events with the service role key; /kalshirust reads them back.
create table if not exists kalshirust_config (
  id integer primary key default 1 check (id = 1),
  mode text not null default 'NORMAL' check (mode in ('NORMAL', 'RISK')),
  updated_at timestamptz not null default now()
);
insert into kalshirust_config (id) values (1) on conflict (id) do nothing;

create table if not exists kalshirust_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('status', 'signal', 'settle', 'error', 'watch')),
  source text not null default 'bot' check (source in ('bot', 'sniper')),
  mode text,
  live boolean not null default false,
  ticker text,
  title text,
  subtitle text,
  close_time timestamptz,
  seconds_to_close integer,
  spot numeric,
  strike numeric,              -- floor strike
  cap_strike numeric,
  strike_type text,            -- 'greater' | 'less' | 'between' | 'greater_or_equal'
  vol_window numeric,          -- realized BTC vol scaled to the time left, as a fraction (e.g. 0.0031)
  yes_bid_cents integer,
  yes_ask_cents integer,
  no_ask_cents integer,
  model_prob numeric,          -- bot's P(YES), 0..1
  edge_cents numeric,          -- best side's expected value per contract after taker fee, cents
  side text check (side in ('yes', 'no')),
  price_cents integer,
  count integer,
  cost_cents integer,
  fee_cents integer,
  client_order_id text,
  order_id text,
  result text check (result in ('yes', 'no')),
  pnl_cents integer,           -- realized after fees (settle rows)
  message text
);
create index if not exists kalshirust_events_created_idx on kalshirust_events (created_at desc);
create index if not exists kalshirust_events_kind_idx on kalshirust_events (kind, created_at desc);
create index if not exists kalshirust_events_client_order_idx on kalshirust_events (client_order_id) where client_order_id is not null;
alter table kalshirust_config enable row level security;
alter table kalshirust_events enable row level security;
