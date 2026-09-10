-- Remember WHICH Adyen payment paid a date-change top-up.
--
-- Cancelling a booking deducts the cancellation fee from the "room" payment,
-- which services/cancelAndRefundReservation identifies as the ONE psp stored on
-- bookings.transaction_reference — the payment made at booking time. A top-up is
-- also money for the room, but it arrives as a second, later payment with its
-- own psp, so that check classifies it as a service and refunds it in full.
--
-- The effect on a booking cancelled AFTER free cancellation ends: the original
-- payment is correctly kept as the 100% fee, and the top-up is handed straight
-- back. On a 200 EUR booking with a 130 EUR top-up the guest walks away with
-- 130 EUR despite a full-penalty cancellation.
--
-- Storing the psp here lets the cancellation path recognise that payment as
-- room money and apply the fee across both.
ALTER TABLE public.reservation_rebookings
  ADD COLUMN IF NOT EXISTS adyen_psp_reference TEXT;

COMMENT ON COLUMN public.reservation_rebookings.adyen_psp_reference IS
  'Adyen psp of a captured top-up. Room money: the cancellation fee applies to it.';

CREATE INDEX IF NOT EXISTS reservation_rebookings_psp_idx
  ON public.reservation_rebookings(adyen_psp_reference)
  WHERE adyen_psp_reference IS NOT NULL;
