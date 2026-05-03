-- ============================================
-- INVOICE STATES — per-reservation lock for billing data editing
-- Once a user generates an invoice, the row is inserted and editing
-- billing data (debitor) for that reservation is permanently disabled.
-- Apaleo doesn't track this reliably (eventual consistency, no
-- "downloaded" flag), so we own the lock here.
-- ============================================

CREATE TABLE IF NOT EXISTS public.invoice_states (
  reservation_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,           -- Apaleo invoice id, used for downloads
  language_code TEXT NOT NULL,        -- 'en' | 'de' chosen at creation
  edited_debitor JSONB,               -- snapshot of debitor sent to Apaleo (audit)
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_states_user_id_idx ON public.invoice_states(user_id);

ALTER TABLE public.invoice_states ENABLE ROW LEVEL SECURITY;

-- SELECT: any user that has the reservation linked to their account can see
-- the lock — multi-account model means several users may share a reservation
-- and they all need to know it's been locked.
CREATE POLICY "Users can view invoice state for their reservations"
  ON public.invoice_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.reservation_id = invoice_states.reservation_id
        AND r.user_id = auth.uid()
    )
  );

-- INSERT: only allowed when current user owns the reservation locally and
-- the row's user_id matches. PRIMARY KEY on reservation_id means only the
-- first user to lock wins; subsequent INSERTs fail with PK conflict, which
-- matches the desired "lock once" semantics.
CREATE POLICY "Users can lock invoice for their reservations"
  ON public.invoice_states
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.reservation_id = invoice_states.reservation_id
        AND r.user_id = auth.uid()
    )
  );

-- No UPDATE / DELETE policies — locks are immutable. Account deletion
-- cascades via the user_id FK.
