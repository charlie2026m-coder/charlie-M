-- ============================================
-- Tighten pending_services RLS (audit finding #3)
--
-- 12_pending_services.sql left INSERT and UPDATE world-writable
-- (WITH CHECK (true) / USING (true)), so any authenticated or anonymous user
-- could overwrite another guest's pending-services row (which the Adyen
-- webhook later trusts as server truth). Scope writes to the owning user.
--
-- The webhook (bookPendingServices) writes with the service_role client, which
-- bypasses RLS, so its processing is unaffected. /api/services/save-pending
-- writes with the user's session and sets user_id = auth.uid(), so the
-- scoped policies still allow the legitimate upsert. The SELECT policy
-- ("Users can view their own pending services") is already user-scoped.
-- ============================================

DROP POLICY IF EXISTS "Allow pending services creation" ON public.pending_services;
DROP POLICY IF EXISTS "Allow pending services updates" ON public.pending_services;

CREATE POLICY "Users can create their own pending services"
  ON public.pending_services
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending services"
  ON public.pending_services
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
