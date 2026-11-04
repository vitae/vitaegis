-- The shadow rule (narrow 20c rule logged beside NORMAL) records its paper trades under source 'shadow'.
alter table kalshirust_events drop constraint if exists kalshirust_events_source_check;
alter table kalshirust_events add constraint kalshirust_events_source_check
  check (source in ('bot', 'sniper', 'backtest', 'ufc', 'shadow'));
