-- ============================================================================
-- Snipe Shield — Authoritative Database Schema, RLS, Triggers, RPCs & Storage
-- Avishkar'26 | Team DedSec (AV26-7C477410E5)
--
-- See supabase/migrations/20261125_complete_ecosystem.sql for incremental DDL.
-- Safe to re-run (idempotent).
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- 1. PROFILES TABLE (1-to-1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null default 'bidder' check (role in ('bidder', 'seller', 'admin')),
  full_name text not null default '',
  phone text not null default '',
  avatar_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'identity_submitted', 'under_review', 'verified', 'restricted')),
  bio text not null default '',
  specialization text not null default '',
  is_demo boolean not null default false,
  is_suspended boolean not null default false,
  suspended_reason text,
  trust_score integer not null default 50 check (trust_score >= 0 and trust_score <= 100),
  response_rate integer not null default 95 check (response_rate >= 0 and response_rate <= 100),
  avg_response_minutes integer not null default 25,
  created_at timestamptz not null default now()
);

-- NOTE: Full migration statements including all 17 tables, ShieldLock place_bid RPC,
-- finalize_auction RPC, record_auction_view RPC, RLS policies, and Storage rules
-- are maintained in supabase/migrations/20261125_complete_ecosystem.sql.
