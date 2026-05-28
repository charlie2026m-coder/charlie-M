-- Adds the `apaleo_booked_at TIMESTAMPTZ` sentinel column to pending_services
-- so the Adyen webhook can record when Apaleo confirmed the booking, BEFORE
-- flipping `status` to 'completed'. Reconciliation can then distinguish:
--   apaleo_booked_at IS NOT NULL and status='processing'
--     → Apaleo succeeded, status update failed — safe to flip to
--       completed, customer was correctly charged.
--   apaleo_booked_at IS NULL and status='processing'
--     → crashed before Apaleo — needs refund and mark failed.
--
-- The two-phase lock pattern (pending → processing → completed) used by
-- bookPendingServices relies on the 'processing' value being part of the
-- status CHECK constraint. CharlieM migration 14_pending_services_update.sql
-- already added it, so no constraint change is needed here.
--
-- Safety notes:
--   * Idempotent: ADD COLUMN IF NOT EXISTS — re-running is a no-op.
--   * Nullable column with no default — existing rows stay valid, no
--     rewrite, no long ACCESS EXCLUSIVE.
--   * Old code that doesn't read this column is unaffected.

ALTER TABLE public.pending_services
  ADD COLUMN IF NOT EXISTS apaleo_booked_at TIMESTAMPTZ;
