-- Bitcoin daily closes read from the Chainlink BTC/USD feed, for /crypto. A past close
-- never changes, so each day is searched on-chain once and kept here. Service-role only.
create table if not exists btc_daily (
  day date primary key,               -- UTC date
  close double precision not null,    -- feed price at 23:59:59 UTC that day
  phase integer,                      -- Chainlink phase and round the price came from
  round integer,
  round_at timestamptz,               -- when that round was written
  created_at timestamptz default now()
);

alter table btc_daily enable row level security;
