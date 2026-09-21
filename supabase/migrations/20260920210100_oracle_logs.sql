-- Creates the oracle_logs table for tracking all CONSULT queries
-- Run once in your Supabase SQL editor

create table if not exists oracle_logs (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  reply text,
  error text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table oracle_logs enable row level security;

-- Service role can insert logs
create policy "Service role can insert oracle_logs"
  on oracle_logs for insert
  with check (true);

-- Service role can read logs
create policy "Service role can select oracle_logs"
  on oracle_logs for select
  using (true);
