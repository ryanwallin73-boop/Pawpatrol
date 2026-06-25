-- ============================================================
-- 003_service_prices.sql
-- Update service prices: Daycare $50, Boarding $75.
-- (price_cents is in cents.)
-- ============================================================

update services set price_cents = 5000 where name = 'Daycare';
update services set price_cents = 7500 where name = 'Boarding';
