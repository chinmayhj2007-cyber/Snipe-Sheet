-- ============================================================================
-- Snipe Shield — Database Schema & Row Level Security (RLS)
-- Avishkar'26 | Team DedSec (AV26-7C477410E5)
--
-- Tables: public.profiles, public.auctions, public.bids, public.proxy_bids
-- Safe to re-run (idempotent).
-- ============================================================================

-- 1. PROFILES TABLE (1-to-1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null default 'bidder' check (role in ('bidder', 'seller')),
  created_at timestamptz not null default now()
);

revoke all on table public.profiles from public, anon;
grant select, insert, update on table public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Private schema for security-definer trigger helpers
create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := case
    when lower(coalesce(new.raw_user_meta_data->>'role', 'bidder')) = 'seller' then 'seller'
    else 'bidder'
  end;

  insert into public.profiles (id, email, role)
  values (
    new.id,
    coalesce(new.email, new.phone, ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- Prevent bidders from directly promoting themselves to seller via client API
create or replace function private.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Profile role cannot be modified directly.';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_profile_role_escalation() from public, anon, authenticated;

drop trigger if exists trg_prevent_profile_role_escalation on public.profiles;
create trigger trg_prevent_profile_role_escalation
  before update on public.profiles
  for each row
  execute function private.prevent_profile_role_escalation();

-- 2. AUCTIONS TABLE
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  image_url text,
  starting_price numeric(12, 2) not null check (starting_price > 0),
  reserve_price numeric(12, 2) check (reserve_price is null or reserve_price >= starting_price),
  current_price numeric(12, 2) not null check (current_price >= starting_price),
  highest_bidder_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('draft', 'active', 'ended', 'cancelled')),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auctions_status_ends_at on public.auctions(status, ends_at);
create index if not exists idx_auctions_seller_id on public.auctions(seller_id);

revoke all on table public.auctions from public;
grant select on table public.auctions to anon, authenticated;
grant insert, update, delete on table public.auctions to authenticated;

alter table public.auctions enable row level security;

drop policy if exists "auctions_select_visible" on public.auctions;
create policy "auctions_select_visible"
  on public.auctions
  for select
  to anon, authenticated
  using (status in ('active', 'ended') or (select auth.uid()) = seller_id);

drop policy if exists "auctions_insert_seller_only" on public.auctions;
create policy "auctions_insert_seller_only"
  on public.auctions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = seller_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'seller'
    )
  );

drop policy if exists "auctions_update_own_seller" on public.auctions;
create policy "auctions_update_own_seller"
  on public.auctions
  for update
  to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

drop policy if exists "auctions_delete_own_draft" on public.auctions;
create policy "auctions_delete_own_draft"
  on public.auctions
  for delete
  to authenticated
  using ((select auth.uid()) = seller_id and status = 'draft');

-- 3. BIDS TABLE
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  is_auto_proxy boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_bids_auction_created on public.bids(auction_id, created_at desc);
create index if not exists idx_bids_bidder_id on public.bids(bidder_id);

revoke all on table public.bids from public, anon;
grant select, insert on table public.bids to authenticated;

alter table public.bids enable row level security;

drop policy if exists "bids_select_authenticated" on public.bids;
create policy "bids_select_authenticated"
  on public.bids
  for select
  to authenticated
  using (true);

drop policy if exists "bids_insert_own" on public.bids;
create policy "bids_insert_own"
  on public.bids
  for insert
  to authenticated
  with check ((select auth.uid()) = bidder_id);

-- 4. PROXY BIDS TABLE (Private max bid ceilings — strictly own-row RLS)
create table if not exists public.proxy_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  max_amount numeric(12, 2) not null check (max_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auction_id, bidder_id)
);

create index if not exists idx_proxy_bids_auction_id on public.proxy_bids(auction_id);

revoke all on table public.proxy_bids from public, anon;
grant select, insert, update, delete on table public.proxy_bids to authenticated;

alter table public.proxy_bids enable row level security;

drop policy if exists "proxy_bids_select_own" on public.proxy_bids;
create policy "proxy_bids_select_own"
  on public.proxy_bids
  for select
  to authenticated
  using ((select auth.uid()) = bidder_id);

drop policy if exists "proxy_bids_insert_own" on public.proxy_bids;
create policy "proxy_bids_insert_own"
  on public.proxy_bids
  for insert
  to authenticated
  with check ((select auth.uid()) = bidder_id);

drop policy if exists "proxy_bids_update_own" on public.proxy_bids;
create policy "proxy_bids_update_own"
  on public.proxy_bids
  for update
  to authenticated
  using ((select auth.uid()) = bidder_id)
  with check ((select auth.uid()) = bidder_id);

drop policy if exists "proxy_bids_delete_own" on public.proxy_bids;
create policy "proxy_bids_delete_own"
  on public.proxy_bids
  for delete
  to authenticated
  using ((select auth.uid()) = bidder_id);
