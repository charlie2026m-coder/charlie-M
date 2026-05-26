-- ============================================
-- APALEO BOOKING-LEVEL AUTHORIZATION
-- Stores the single Apaleo-managed authorization ID created from the
-- Adyen pspReference via POST /booking/v1/authorizations/by-authorization.
-- A booking-level authorization covers folios across all reservations in
-- the booking, so a single ID is enough for multi-folio capture.
-- ============================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS apaleo_authorization_id TEXT;
