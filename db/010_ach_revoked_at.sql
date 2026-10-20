-- ============================================================
-- 010_ach_revoked_at.sql
-- Run in Supabase Dashboard > SQL Editor.
-- When an ACH payment method stopped being used: deactivated by staff,
-- removed by the customer, or replaced by a newer approved account.
-- ============================================================

alter table payment_methods
  add column if not exists revoked_at timestamptz;
