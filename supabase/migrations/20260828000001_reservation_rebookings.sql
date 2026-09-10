-- Date changes on a refundable reservation ("Umbuchung").
--
-- Deliberately NOT stored in reservation_refunds: that table's UNIQUE
-- (reservation_id) is the cancellation lock, so writing a rebooking refund there
-- would make a later cancellation of the same reservation collide with its own
-- idempotency key. Instead this table mirrors the columns reconcile-refunds
-- needs (status + adyen_modification_ref), and that cron sweeps both.
--
-- Two things are tracked separately on purpose:
--   * `status` is the LOCK. 'processing' means in flight; a terminal row is
--     'requested' (refund accepted, settling), 'completed' or 'failed'.
--   * `amend_applied` records whether Apaleo actually moved the dates. Without
--     it, 'failed' is ambiguous — it could mean "nothing happened, guest still
--     on the old dates, owes nothing" or "dates moved and we owe money". Those
--     need opposite human responses.
--
-- The one-move-per-reservation rule is enforced by the UNIQUE constraint, but a
-- row that provably never moved anything is deleted so the guest can retry —
-- by the route when it can re-read Apaleo, and otherwise by the stale-lock pass
-- in reconcile-refunds (sweepStuckRebookings).
--
-- Written to be re-runnable over an earlier shape of this same table: the first
-- draft of this file shipped different column names, so every column and the
-- status CHECK are (re)applied explicitly rather than relying on CREATE TABLE,
-- which no-ops once the table exists.

CREATE TABLE IF NOT EXISTS public.reservation_rebookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id TEXT NOT NULL UNIQUE,          -- Apaleo reservation id (lock key)

  old_arrival DATE NOT NULL,
  old_departure DATE NOT NULL,
  new_arrival DATE NOT NULL,
  new_departure DATE NOT NULL,

  old_room_cents BIGINT NOT NULL,               -- accommodation before, from time slices
  new_room_cents BIGINT NOT NULL,               -- accommodation after, from the offer
  delta_cents BIGINT NOT NULL,                  -- <=0 only: a top-up is refused before a quote exists

  rate_plan_id TEXT,
  unit_id TEXT,                                 -- studio we pinned it back to (NULL if the pin failed)

  -- Did Apaleo actually move the dates? Decides what a 'failed' row means.
  amend_applied BOOLEAN NOT NULL DEFAULT FALSE,

  status TEXT NOT NULL DEFAULT 'processing',

  -- Comma-joined Apaleo refund ids, same shape and name as
  -- reservation_refunds.adyen_modification_ref so reconcile-refunds can read
  -- both tables with one code path.
  adyen_modification_ref TEXT,
  refund_cents BIGINT NOT NULL DEFAULT 0,       -- what we asked Apaleo to pay back
  note TEXT,                                    -- audit detail for manual cases

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bring an already-created table up to the shape above. Each is a no-op on a
-- fresh database and the repair on an older one.
ALTER TABLE public.reservation_rebookings
  ADD COLUMN IF NOT EXISTS old_room_cents BIGINT,
  ADD COLUMN IF NOT EXISTS new_room_cents BIGINT,
  ADD COLUMN IF NOT EXISTS unit_id TEXT,
  ADD COLUMN IF NOT EXISTS amend_applied BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS adyen_modification_ref TEXT,
  ADD COLUMN IF NOT EXISTS refund_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS rate_plan_id TEXT;

-- Carry over values from the first draft's names, then drop them so the table
-- cannot end up with two competing sources for the same number.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_rebookings'
      AND column_name = 'old_total_cents'
  ) THEN
    UPDATE public.reservation_rebookings
      SET old_room_cents = COALESCE(old_room_cents, old_total_cents),
          new_room_cents = COALESCE(new_room_cents, new_total_cents);
    ALTER TABLE public.reservation_rebookings
      DROP COLUMN old_total_cents,
      DROP COLUMN new_total_cents;
  END IF;

  -- NOTE: this block used to drop `payment_reference`, a column the very first
  -- draft of this table carried and never used. A LATER migration
  -- (20260901000001) adds a column of that name for real — it is how the Adyen
  -- webhook finds a pending top-up. Re-running this file must therefore not
  -- touch it: dropping it would silently orphan every in-flight payment. The
  -- drop is gone rather than made conditional, because the two columns cannot
  -- be told apart by name.

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservation_rebookings'
      AND column_name = 'refund_id'
  ) THEN
    UPDATE public.reservation_rebookings
      SET adyen_modification_ref = COALESCE(adyen_modification_ref, refund_id);
    ALTER TABLE public.reservation_rebookings DROP COLUMN refund_id;
  END IF;
END $$;

ALTER TABLE public.reservation_rebookings
  ALTER COLUMN old_room_cents SET NOT NULL,
  ALTER COLUMN new_room_cents SET NOT NULL;

-- 'requested' is the status the route writes once Apaleo has ACCEPTED a refund;
-- the first draft's CHECK did not allow it, which would reject every write.
ALTER TABLE public.reservation_rebookings
  DROP CONSTRAINT IF EXISTS reservation_rebookings_status_check;
ALTER TABLE public.reservation_rebookings
  ADD CONSTRAINT reservation_rebookings_status_check
  CHECK (status IN ('processing', 'requested', 'completed', 'failed'));

ALTER TABLE public.reservation_rebookings ENABLE ROW LEVEL SECURITY;

-- SELECT only, and only for a reservation linked to the caller's account, so the
-- cabinet can show "already moved". Every write goes through service_role, which
-- bypasses RLS — a guest can never insert or update here.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservation_rebookings'
      AND policyname = 'rebookings_select_own'
  ) THEN
    CREATE POLICY rebookings_select_own
      ON public.reservation_rebookings
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.reservations r
          WHERE r.reservation_id = reservation_rebookings.reservation_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- reconcile-refunds scans status='requested'; its stale-lock pass scans
-- status='processing' older than 15 minutes. Both filter on status, so the
-- index earns its keep here.
CREATE INDEX IF NOT EXISTS reservation_rebookings_status_idx
  ON public.reservation_rebookings(status);

-- updated_at must move on every write: the manual-payout work-list is aged by
-- it, and a stuck 'processing' row is only detectable by how long it has sat.
DROP TRIGGER IF EXISTS set_reservation_rebookings_updated_at ON public.reservation_rebookings;
CREATE TRIGGER set_reservation_rebookings_updated_at
  BEFORE UPDATE ON public.reservation_rebookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
