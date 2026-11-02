-- KALSHIRUST backtests (kalshiRUST/src/bin/backtest.rs) replay settled KXBTC15M windows and
-- write their trades with source 'backtest'; /kalshirust shows them apart from live paper.
alter table kalshirust_events drop constraint if exists kalshirust_events_source_check;
alter table kalshirust_events add constraint kalshirust_events_source_check check (source in ('bot', 'sniper', 'backtest'));
create index if not exists kalshirust_events_source_idx on kalshirust_events (source, created_at desc);
