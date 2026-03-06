-- Run once in your Supabase SQL editor
-- Creates the proverbs table for the Vitaegis Proverbs Oracle

create table if not exists proverbs (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  source text default '',
  tag text default 'Personal',
  note text default '',
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table proverbs enable row level security;

-- Public can read (oracle is public-facing)
create policy "Public can read proverbs"
  on proverbs for select
  using (true);

-- Service role can insert
create policy "Service role can insert proverbs"
  on proverbs for insert
  with check (true);

-- Service role can delete
create policy "Service role can delete proverbs"
  on proverbs for delete
  using (true);
