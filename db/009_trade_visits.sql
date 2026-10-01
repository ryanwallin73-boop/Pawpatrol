-- ============================================================
-- 009_trade_visits.sql
-- Run in Supabase Dashboard > SQL Editor.
-- Free visits each month in exchange for a trade. The first N completed
-- visits of a month (by date) are covered on that customer's invoice and
-- never charged; unused ones don't carry over.
-- ============================================================

alter table customers
  add column if not exists free_visits_per_month integer not null default 0,
  add column if not exists trade_label           text;

-- Set when a visit is covered on an emailed invoice.
alter table bookings
  add column if not exists trade_credit boolean not null default false;

-- Katherine Wallin: 4 visits a month for building the website.
-- Should report "UPDATE 1".
update customers
  set free_visits_per_month = 4, trade_label = 'website trade'
  where first_name = 'Katherine' and last_name = 'Wallin';
