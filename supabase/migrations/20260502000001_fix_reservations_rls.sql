-- ============================================
-- FIX RESERVATIONS RLS — GDPR COMPLIANCE
-- Replaces public access policies with user-scoped policies.
-- Previously any request with anon key could read ALL guest data.
-- ============================================

-- Drop dangerous public policies
DROP POLICY IF EXISTS "Allow public read access to reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow reservation creation" ON public.reservations;

-- Users can only read their own reservations
CREATE POLICY "Users can view own reservations"
  ON public.reservations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert reservations linked to themselves
CREATE POLICY "Users can insert own reservations"
  ON public.reservations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reservations (needed for account deletion cascade)
CREATE POLICY "Users can delete own reservations"
  ON public.reservations
  FOR DELETE
  USING (auth.uid() = user_id);
