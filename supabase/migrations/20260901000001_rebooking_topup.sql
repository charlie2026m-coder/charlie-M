-- Paying the difference when a date change costs MORE.
--
-- The refund direction settles inside one request: the amend only ever gives
-- money back, so nothing has to be collected first. Charging more cannot work
-- that way — the guest has to authorise a payment, and that lands on a webhook
-- minutes later, or never if they abandon the card form.
--
-- So a top-up claims the SAME one-move lock up front, in a new state:
--
--   awaiting_payment  the row holds the guest's single move while their card
--                     is authorised. No Apaleo call has happened yet, so an
--                     abandoned payment must release it — reconcile-refunds
--                     sweeps these by age, exactly as it does stale
--                     'processing'.
--
-- `payment_reference` is the Adyen merchantReference, and it is what the
-- webhook has in hand when the authorisation arrives — it carries no
-- reservation id. UNIQUE so a re-delivered notification cannot start a second
-- move, which is the same reason `reservation_id` is unique.

ALTER TABLE public.reservation_rebookings
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS top_up_cents BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.reservation_rebookings.payment_reference IS
  'Adyen merchantReference for a top-up; how the webhook finds this row.';
COMMENT ON COLUMN public.reservation_rebookings.top_up_cents IS
  'What the guest owes for the new dates. 0 for a refund or a straight swap.';

-- Partial: many rows legitimately have no payment reference (every refund
-- move), and NULLs must not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS reservation_rebookings_payment_reference_idx
  ON public.reservation_rebookings(payment_reference)
  WHERE payment_reference IS NOT NULL;

ALTER TABLE public.reservation_rebookings
  DROP CONSTRAINT IF EXISTS reservation_rebookings_status_check;
ALTER TABLE public.reservation_rebookings
  ADD CONSTRAINT reservation_rebookings_status_check
  CHECK (status IN ('awaiting_payment', 'processing', 'requested', 'completed', 'failed'));

-- The sweeper ages abandoned top-ups by created_at and the work-list by
-- updated_at; both already filter on status, which is indexed.
