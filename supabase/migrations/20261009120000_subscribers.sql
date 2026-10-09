-- Newsletter subscribers from the home page form and from Vitae. Written only by the
-- server with the service role; RLS on with no policies, so the Data API exposes nothing.

create table if not exists public.subscribers (
  email text primary key,
  source text not null default 'home',
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;
