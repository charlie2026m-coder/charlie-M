-- ============================================
-- RESERVATION REFUNDS — guest-initiated cancellation refunds
-- One row per cancelled reservation. reservation_id is UNIQUE so the cancel
-- route can use an INSERT as an idempotency lock (a second click / webhook
-- retry hits a 23505 and is treated as a no-op), mirroring the
-- bookings.transaction_reference pattern.
--
-- The Adyen refund is asynchronous: the cancel route inserts status
-- 'requested' (or 'completed' when nothing is refundable), and the Adyen
-- webhook flips it to 'completed' / 'failed' on the REFUND notification.
-- bookings.status is deliberately NOT touched here — one pspReference backs
-- N reservations, so a single cancellation must not mark the whole booking.
-- ============================================

CREATE TABLE IF NOT EXISTS public.reservation_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id TEXT NOT NULL UNIQUE,        -- Apaleo reservation id (lock key)
  psp_reference TEXT,                          -- original Adyen payment pspReference
  amount_cents BIGINT NOT NULL,                -- refundable amount per Apaleo policy
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'completed', 'failed')),
  adyen_modification_ref TEXT,                 -- Adyen refund pspReference (from accept / webhook)
  note TEXT,                                    -- audit detail for manual-action cases
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reservation_refunds ENABLE ROW LEVEL SECURITY;

-- SELECT: a user may read the refund for a reservation linked to their
-- account. Service-role (used by the cancel route + webhook) bypasses RLS.
DO $$
BEGIN
  CREATE POLICY "Users can view refunds for their reservations"
    ON public.reservation_refunds
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.reservations r
        WHERE r.reservation_id = reservation_refunds.reservation_id
          AND r.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;  -- re-run safe (CREATE POLICY has no IF NOT EXISTS)
END $$;

-- No anon/authenticated INSERT/UPDATE policies — only service_role writes
-- (it moves real money and must not be triggerable from the client).

CREATE INDEX IF NOT EXISTS reservation_refunds_psp_reference_idx
  ON public.reservation_refunds(psp_reference);
CREATE INDEX IF NOT EXISTS reservation_refunds_status_idx
  ON public.reservation_refunds(status);
