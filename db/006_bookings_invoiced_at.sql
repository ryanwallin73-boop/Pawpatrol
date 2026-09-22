-- ============================================================
-- 006_bookings_invoiced_at.sql
-- Run in Supabase Dashboard > SQL Editor.
-- Marks each booking once it has been on an emailed invoice, so it's
-- never invoiced again and can no longer be changed.
-- ============================================================

alter table bookings
  add column if not exists invoiced_at timestamptz;
