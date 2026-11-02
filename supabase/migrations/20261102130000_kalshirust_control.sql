-- RUN / STOP for the KALSHIRUST bot from vitaegis.com/kalshirust. The page writes
-- desired_state; a supervisor on the bot's host (scripts/kalshirust/supervisor.ps1 or
-- supervisor.sh) polls it every 10 s, starts or stops the bot, and reports back.
alter table kalshirust_config
  add column if not exists desired_state text not null default 'stopped' check (desired_state in ('running', 'stopped')),
  add column if not exists command_at timestamptz,
  add column if not exists host_name text,
  add column if not exists host_status text,
  add column if not exists host_seen_at timestamptz;
