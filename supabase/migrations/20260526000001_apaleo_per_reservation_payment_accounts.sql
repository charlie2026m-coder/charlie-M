-- Per-reservation Apaleo Payment Accounts (apaleo support spec).
--
-- One Adyen pspReference now backs N PaymentAccounts (one per reservation),
-- created via POST /booking/v1/payment-accounts/by-authorization with
-- target.type='Reservation'. Each PA pays its own folio via
-- POST /finance/v1/folios/{folioId}/payments/by-payment-account.
--
-- The array is ordered to match reservation_ids[] in the same row.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS apaleo_payment_account_ids TEXT[];
