-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- STEP 7 — APPLY ONLY AFTER CODE IS DEPLOYED
-- Run AFTER deploying bookings/create and save-pending changes.
-- Safe to skip if code is not yet live.
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

-- ============================================
-- TIGHTEN BOOKINGS + PENDING_BOOKINGS RLS
-- All writes must go through service_role only.
-- Code changes required first:
--   app/api/bookings/create/route.ts    — uses supabaseAdmin for DB writes
--   app/api/bookings/save-pending/route.ts — uses supabaseAdmin for DB writes
--   app/api/webhooks/adyen/route.ts     — already uses service_role
-- ============================================

-- ============================================
-- 1. BOOKINGS: revoke direct insert/update from users
-- ============================================

-- Drop old permissive write policies
DROP POLICY IF EXISTS "Service role can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow booking status updates" ON public.bookings;
DROP POLICY IF EXISTS "Allow booking creation" ON public.bookings;
DROP POLICY IF EXISTS "Allow booking updates" ON public.bookings;

-- Only service_role can write — it bypasses RLS by default
REVOKE INSERT, UPDATE ON public.bookings FROM anon, authenticated;

-- ============================================
-- 2. PENDING_BOOKINGS: revoke direct update from users
-- ============================================

-- Drop old permissive write policies
DROP POLICY IF EXISTS "Allow pending booking creation" ON public.pending_bookings;
DROP POLICY IF EXISTS "Allow pending booking updates" ON public.pending_bookings;
DROP POLICY IF EXISTS "Allow pending bookings" ON public.pending_bookings;

-- Revoke update — webhook uses service_role for all updates
REVOKE UPDATE ON public.pending_bookings FROM anon, authenticated;

-- Revoke insert — save-pending route now uses service_role
REVOKE INSERT ON public.pending_bookings FROM anon, authenticated;
