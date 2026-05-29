-- ============================================
-- PAYMENT REVERSALS — system of record for Adyen reversal & dispute events
-- Adyen reversals (refundOrCancelPayment) and disputes are asynchronous and
-- delivered as webhook notifications (REFUND, CANCELLATION, REFUND_FAILED,
-- CHARGEBACK, ...). reversePayment is otherwise "fire and forget": it logs
-- "accepted, final result via webhook" but nothing durably records that final
-- result. This table is that record.
--
-- Why a table and not just logs: a failed refund or a chargeback has no
-- automated remedy — it must be resolved manually in the Adyen dashboard.
-- needs_action = true turns those into a queryable work-list that survives log
-- rotation and does not depend on log alerting being wired up.
--
-- Idempotency: psp_reference is the notification's OWN pspReference (unique per
-- event), so a duplicate/at-least-once delivery upserts the same row instead
-- of double-processing.
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psp_reference TEXT NOT NULL UNIQUE,          -- the event's own Adyen pspReference (idempotency key)
  original_reference TEXT,                      -- original payment pspReference (links to bookings.transaction_reference)
  merchant_reference TEXT,                      -- our reference echoed by Adyen
  reservation_id TEXT,                          -- set when the reversal matches a guest-cancel refund row
  event_code TEXT NOT NULL,                     -- REFUND | CANCELLATION | REFUND_FAILED | CHARGEBACK | ...
  success BOOLEAN NOT NULL,
  amount_cents BIGINT,
  currency TEXT,
  needs_action BOOLEAN NOT NULL DEFAULT FALSE,  -- failed reversal / open dispute → manual handling
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_reversals ENABLE ROW LEVEL SECURITY;

-- No client policies: only the webhook (service_role) writes/reads this, and
-- service_role bypasses RLS. An ops dashboard, if added later, gets an explicit
-- admin SELECT policy then — not an open default now.

CREATE INDEX IF NOT EXISTS payment_reversals_original_reference_idx
  ON public.payment_reversals(original_reference);
CREATE INDEX IF NOT EXISTS payment_reversals_event_code_idx
  ON public.payment_reversals(event_code);
-- Partial index for the "open work-list" query (failed reversals / disputes).
CREATE INDEX IF NOT EXISTS payment_reversals_needs_action_idx
  ON public.payment_reversals(needs_action)
  WHERE needs_action = TRUE;
