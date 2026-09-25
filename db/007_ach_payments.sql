-- ============================================================
-- 007_ach_payments.sql
-- Run in Supabase Dashboard > SQL Editor.
-- The app now initiates every ACH debit itself, so customer bank numbers
-- are kept (the account number encrypted by the app) instead of purged
-- after bank entry, and each debit is recorded against the bookings it pays.
-- ============================================================

-- Bank numbers on the payment method. The account number is AES-GCM
-- ciphertext written by the app (key in the ACH_ENCRYPTION_KEY env var);
-- the routing number identifies the bank and is not secret.
alter table payment_methods
  add column if not exists account_number_enc text,
  add column if not exists routing_number     text;

-- New signups no longer put full numbers in pending_ach_setups; its rows
-- are just the "review new bank details" list. Existing rows keep their
-- numbers until they're approved, which encrypts them onto the payment method.
alter table pending_ach_setups
  alter column account_number drop not null,
  alter column routing_number drop not null;

-- One row per customer debit in an uploaded ACH file.
create table if not exists ach_payments (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references customers(id),
  payment_method_id uuid not null references payment_methods(id),
  -- Our reference, sent as the entry's individual ID; the bank echoes it back
  -- in status so each entry can be matched to this row.
  reference         text not null unique,
  amount_cents      integer not null,
  effective_date    date not null,
  file_name         text not null,
  file_id           text,
  -- uploading, then the bank's entry status (Received, Accepted, Rejected,
  -- Transmitted, Settled, Returned, ...).
  status            text not null default 'uploading',
  status_detail     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table ach_payments enable row level security;
create policy ach_payments_staff_all on ach_payments
  for all to authenticated using (true) with check (true);

-- Which debit paid each booking, so a booking is never charged twice.
alter table bookings
  add column if not exists ach_payment_id uuid references ach_payments(id);
