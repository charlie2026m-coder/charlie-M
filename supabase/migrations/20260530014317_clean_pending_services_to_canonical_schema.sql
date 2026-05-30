-- Bring pending_services back to the canonical (Motz19) schema by removing the
-- abandoned CharlieM-only rework (migration 14_pending_services_update.sql):
-- dead columns, the lock_key idempotency key, and the monitoring view.
--
-- The late-add-services flow (services/bookPendingServices.ts) is the SAME
-- robust two-phase idempotent flow as Motz19; it only differed in column names.
-- Dead columns removed (zero code usage): old_reference, old_services,
-- apaleo_charge_id, error_details, service_ids. lock_key dropped in favour of
-- the canonical reference UNIQUE key.
--
-- CharlieM is dev-only with no production data, so transient rows are truncated
-- to re-add NOT NULL / UNIQUE cleanly.

TRUNCATE TABLE public.pending_services;

-- View depends on lock_key/transaction_reference/service_ids/error_details.
DROP VIEW IF EXISTS public.pending_services_requiring_attention;

-- Remove lock_key idempotency key (canonical flow keys off reference UNIQUE).
ALTER TABLE public.pending_services DROP CONSTRAINT IF EXISTS pending_services_lock_key_unique;
DROP INDEX IF EXISTS public.idx_pending_services_lock_key;
DROP INDEX IF EXISTS public.idx_pending_services_transaction_reference;
DROP INDEX IF EXISTS public.idx_pending_services_reservation_id;

-- Drop dead columns (zero code usage). Dropping old_reference also drops
-- idx_pending_services_reference (it sits on old_reference) so the name frees up.
ALTER TABLE public.pending_services
  DROP COLUMN IF EXISTS old_reference,
  DROP COLUMN IF EXISTS old_services,
  DROP COLUMN IF EXISTS apaleo_charge_id,
  DROP COLUMN IF EXISTS error_details,
  DROP COLUMN IF EXISTS service_ids,
  DROP COLUMN IF EXISTS lock_key;

-- Rename the working columns back to canonical names.
ALTER TABLE public.pending_services RENAME COLUMN transaction_reference TO reference;
ALTER TABLE public.pending_services RENAME COLUMN services_payload TO services;

ALTER TABLE public.pending_services
  ALTER COLUMN reference SET NOT NULL,
  ALTER COLUMN services SET NOT NULL;
ALTER TABLE public.pending_services
  ADD CONSTRAINT pending_services_reference_key UNIQUE (reference);

-- Two-phase sentinel column (was missing in this project too).
ALTER TABLE public.pending_services
  ADD COLUMN IF NOT EXISTS apaleo_booked_at TIMESTAMPTZ;

-- Canonical status set (drop unused 'partial_success').
ALTER TABLE public.pending_services DROP CONSTRAINT IF EXISTS pending_services_status_check;
ALTER TABLE public.pending_services
  ADD CONSTRAINT pending_services_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Canonical indexes (match Motz19).
CREATE INDEX IF NOT EXISTS idx_pending_services_reference ON public.pending_services(reference);
CREATE INDEX IF NOT EXISTS idx_pending_services_status ON public.pending_services(status);
