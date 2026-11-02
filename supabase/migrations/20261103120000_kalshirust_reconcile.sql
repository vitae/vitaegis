-- The bot's periodic check of Kalshi's fills and settlements against its own book.
alter table kalshirust_events drop constraint if exists kalshirust_events_kind_check;
alter table kalshirust_events add constraint kalshirust_events_kind_check
  check (kind in ('status', 'signal', 'settle', 'error', 'watch', 'reconcile'));
