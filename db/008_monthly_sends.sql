-- ============================================================
-- 008_monthly_sends.sql
-- Run in Supabase Dashboard > SQL Editor.
-- One row per month the real invoice + schedule emails went out, so a
-- second send (button or the automatic 8 AM run) is blocked instead of
-- emailing every customer their schedule again.
-- ============================================================

create table if not exists monthly_sends (
  month_start date primary key,
  sent_at     timestamptz not null default now()
);

alter table monthly_sends enable row level security;
create policy monthly_sends_staff_all on monthly_sends
  for all to authenticated using (true) with check (true);
