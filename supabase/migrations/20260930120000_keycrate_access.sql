-- KeyCrate paywall: one row per signed-in user with the free-day start and the Stripe
-- subscription. Written only by the server with the service role (GET /api/keycrate/access
-- creates the row on first sign-in; the Stripe webhook keeps the subscription fields current).
-- Users can read their own row; nobody else can read or write it through the Data API.

create table if not exists public.kc_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  trial_started_at timestamptz not null default now(),
  stripe_customer_id text,
  subscription_id text,
  -- Stripe's status: active, trialing, past_due, canceled, unpaid, incomplete, ...
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The webhook and the portal look customers up by their Stripe id.
create unique index if not exists kc_access_stripe_customer_idx
  on public.kc_access (stripe_customer_id)
  where stripe_customer_id is not null;

-- updated_at bookkeeping (kc_touch_updated_at comes from 20260924120000_keycrate.sql).
drop trigger if exists kc_access_touch on public.kc_access;
create trigger kc_access_touch before update on public.kc_access
  for each row execute function public.kc_touch_updated_at();

alter table public.kc_access enable row level security;

-- Read-only for the owner. No insert/update/delete policies: only the service role
-- (which bypasses RLS) writes, so nobody can grant themselves a subscription.
drop policy if exists "kc_access owner read" on public.kc_access;
create policy "kc_access owner read" on public.kc_access for select to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete, truncate on public.kc_access from anon, authenticated;
grant select on public.kc_access to authenticated;
