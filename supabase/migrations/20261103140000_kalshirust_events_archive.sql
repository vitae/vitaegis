-- Moves everything except real filled trades out of the HUD's table. Nothing is destroyed.
create table if not exists kalshirust_events_archive (like kalshirust_events including defaults including constraints);
alter table kalshirust_events_archive add column if not exists archived_at timestamptz not null default now();
alter table kalshirust_events_archive enable row level security;
with moved as (
  delete from kalshirust_events
  where not (live and kind in ('signal', 'settle') and order_id is not null)
  returning id, created_at, kind, source, mode, live, ticker, title, subtitle, close_time, seconds_to_close, spot, strike, cap_strike, strike_type, vol_window, yes_bid_cents, yes_ask_cents, no_ask_cents, model_prob, edge_cents, side, price_cents, count, cost_cents, fee_cents, client_order_id, order_id, result, pnl_cents, message
)
insert into kalshirust_events_archive (id, created_at, kind, source, mode, live, ticker, title, subtitle, close_time, seconds_to_close, spot, strike, cap_strike, strike_type, vol_window, yes_bid_cents, yes_ask_cents, no_ask_cents, model_prob, edge_cents, side, price_cents, count, cost_cents, fee_cents, client_order_id, order_id, result, pnl_cents, message)
select * from moved;
