-- Tables the Rust Kalshi bot (kalshi-bot.service on the Lightsail VPS) writes with the
-- service role key; vitaegis.com/kalshi reads them with the anon key and subscribes to
-- inserts and updates over Realtime. Contract: docs/kalshi-hud.md. Money in integer cents,
-- probabilities 0–1. None of these tables carries the account balance.

-- One row per 15-minute contract window.
create table if not exists market_windows (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  ticker text not null unique,               -- KXBTC15M-26NOV010115-15
  event_ticker text,
  title text,
  open_time timestamptz,
  close_time timestamptz not null,
  strike numeric,                            -- Kalshi floor_strike (BRTI at open)
  strike_type text,                          -- greater_or_equal | less | ...
  spot_open numeric,
  spot_close numeric,
  status text not null default 'open' check (status in ('open', 'closed', 'settled')),
  result text check (result in ('yes', 'no')),
  bets_placed integer not null default 0,
  max_bets integer not null default 2,       -- the 2-bet circuit breaker
  pnl_cents integer
);

-- One row per inference tick: GBM (40%) + XGBoost (60%) against the book.
create table if not exists bot_signals (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  ticker text not null,
  spot numeric,
  strike numeric,
  seconds_to_close integer,
  yes_ask_cents integer,
  no_ask_cents integer,
  gbm_prob numeric check (gbm_prob between 0 and 1),
  ml_prob numeric check (ml_prob between 0 and 1),
  composite_prob numeric check (composite_prob between 0 and 1),
  market_prob numeric check (market_prob between 0 and 1),
  edge numeric,                              -- composite − market, as a fraction
  kelly numeric,                             -- Kelly fraction, 0–1
  side text check (side in ('yes', 'no')),
  action text check (action in ('buy', 'hold', 'skip')),
  reason text,
  kalshi_ws boolean,                         -- bot's Kalshi WebSocket is connected
  live boolean not null default false
);

-- One row per order sent to Kalshi; settlement updates the row.
create table if not exists trade_executions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  ticker text not null,
  window_id uuid references market_windows (id) on delete set null,
  bet_number integer not null check (bet_number between 1 and 2),
  side text not null check (side in ('yes', 'no')),
  price_cents integer not null,
  count integer not null,
  fill_count integer,
  avg_fill_cents integer,
  fee_cents integer,
  stake_cents integer,
  latency_ms integer,                        -- signal seen -> order acknowledged
  order_id text,
  client_order_id text,
  status text not null default 'filled'
    check (status in ('filled', 'partial', 'rejected', 'dry_run', 'settled')),
  result text check (result in ('yes', 'no')),
  pnl_cents integer,                         -- realized, after fees
  settled_at timestamptz,
  live boolean not null default false
);

create index if not exists market_windows_close_idx on market_windows (close_time desc);
create index if not exists bot_signals_created_idx on bot_signals (created_at desc);
create index if not exists bot_signals_ticker_idx on bot_signals (ticker, created_at desc);
create index if not exists trade_executions_created_idx on trade_executions (created_at desc);
create index if not exists trade_executions_ticker_idx on trade_executions (ticker, created_at desc);
create unique index if not exists trade_executions_client_order_idx
  on trade_executions (client_order_id) where client_order_id is not null;

-- Public read, service-role write. The HUD is a public page.
alter table market_windows enable row level security;
alter table bot_signals enable row level security;
alter table trade_executions enable row level security;

drop policy if exists "public read market_windows" on market_windows;
create policy "public read market_windows" on market_windows
  for select to anon, authenticated using (true);
drop policy if exists "public read bot_signals" on bot_signals;
create policy "public read bot_signals" on bot_signals
  for select to anon, authenticated using (true);
drop policy if exists "public read trade_executions" on trade_executions;
create policy "public read trade_executions" on trade_executions
  for select to anon, authenticated using (true);

grant select on market_windows, bot_signals, trade_executions to anon, authenticated;

-- Realtime: the HUD listens for inserts and updates on all three.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'market_windows'
  ) then
    alter publication supabase_realtime add table market_windows;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bot_signals'
  ) then
    alter publication supabase_realtime add table bot_signals;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'trade_executions'
  ) then
    alter publication supabase_realtime add table trade_executions;
  end if;
end $$;

-- Updates must carry the full old row for Realtime UPDATE payloads.
alter table market_windows replica identity full;
alter table trade_executions replica identity full;
