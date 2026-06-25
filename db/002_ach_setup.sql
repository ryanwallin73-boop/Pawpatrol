-- ============================================================
-- 002_ach_setup.sql
-- Run in Supabase Dashboard > SQL Editor AFTER the base schema.
-- Adds ACH consent tracking and a transient holding table for
-- raw bank numbers (purged once keyed into the bank's payor system).
-- ============================================================

-- Consent tracking on the existing payment_methods table.
alter table payment_methods
  add column if not exists ach_consent_at   timestamptz,
  add column if not exists ach_consent_text text;

-- Transient store for the FULL account/routing numbers. The owner reads
-- these once to set the customer up as a payor in the bank, then purges
-- the row. Full numbers never live in payment_methods (only last4 there).
create table if not exists pending_ach_setups (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references customers(id) on delete cascade,
  payment_method_id uuid references payment_methods(id) on delete cascade,
  account_number    text not null,
  routing_number    text not null,
  created_at        timestamptz not null default now()
);

-- RLS on; authenticated staff only. The service_role key (server-side
-- signup handler) bypasses RLS to insert on the public form's behalf.
alter table pending_ach_setups enable row level security;
create policy pending_ach_setups_staff_all on pending_ach_setups
  for all to authenticated using (true) with check (true);
