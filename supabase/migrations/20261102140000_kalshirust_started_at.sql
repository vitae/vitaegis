-- When the running bot process started; written by the bot at startup so the HUD can
-- show uptime and trades-since-start next to the host status.
alter table kalshirust_config add column if not exists bot_started_at timestamptz;
