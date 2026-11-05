-- Fresh start for the HUD: every row moves to kalshirust_events_archive. Nothing is destroyed.
-- The archive was copied before the 'backtest', 'ufc' and 'shadow' sources existed, so it takes them first.
alter table kalshirust_events_archive drop constraint if exists kalshirust_events_source_check;
alter table kalshirust_events_archive add constraint kalshirust_events_source_check
  check (source in ('bot', 'sniper', 'backtest', 'ufc', 'shadow'));
alter table kalshirust_events_archive drop constraint if exists kalshirust_events_kind_check;
alter table kalshirust_events_archive add constraint kalshirust_events_kind_check
  check (kind in ('status', 'signal', 'settle', 'error', 'watch', 'reconcile'));
with moved as (
  delete from kalshirust_events
  returning id, created_at, kind, source, mode, live, ticker, title, subtitle, close_time, seconds_to_close, spot, strike, cap_strike, strike_type, vol_window, yes_bid_cents, yes_ask_cents, no_ask_cents, model_prob, edge_cents, side, price_cents, count, cost_cents, fee_cents, client_order_id, order_id, result, pnl_cents, message
)
insert into kalshirust_events_archive (id, created_at, kind, source, mode, live, ticker, title, subtitle, close_time, seconds_to_close, spot, strike, cap_strike, strike_type, vol_window, yes_bid_cents, yes_ask_cents, no_ask_cents, model_prob, edge_cents, side, price_cents, count, cost_cents, fee_cents, client_order_id, order_id, result, pnl_cents, message)
select * from moved;
