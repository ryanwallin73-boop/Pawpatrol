-- ============================================================
-- 005_boarding_second_dog.sql
-- Run in Supabase Dashboard > SQL Editor.
-- Discounted boarding rate for a second (or later) dog: $70/night.
-- ============================================================

insert into services (name, price_cents, active)
select 'Boarding (2nd+ dog)', 7000, true
where not exists (select 1 from services where name = 'Boarding (2nd+ dog)');
