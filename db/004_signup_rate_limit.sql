-- ============================================================
-- 004_signup_rate_limit.sql
-- Run in Supabase Dashboard > SQL Editor.
-- Per-IP rate limiting for the public signup endpoint.
-- ============================================================

create table if not exists signup_attempts (
  id         uuid primary key default gen_random_uuid(),
  ip         text not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_attempts_ip_time
  on signup_attempts (ip, created_at);

-- RLS on, no policies: anon/authenticated get nothing. The signup route
-- handler uses the service_role key, which bypasses RLS.
alter table signup_attempts enable row level security;
