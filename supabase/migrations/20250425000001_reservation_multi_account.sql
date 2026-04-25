-- Allow same reservation to exist in multiple accounts
-- BEFORE: reservation_id was globally unique
-- AFTER: unique constraint is on (user_id, reservation_id) pair
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_reservation_id_key;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_user_reservation_unique UNIQUE (user_id, reservation_id);
