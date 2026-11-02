-- UFC picks copied from mma-ai.net are recorded under their own source.
alter table kalshirust_events drop constraint if exists kalshirust_events_source_check;
alter table kalshirust_events add constraint kalshirust_events_source_check
  check (source in ('bot', 'sniper', 'backtest', 'ufc'));
