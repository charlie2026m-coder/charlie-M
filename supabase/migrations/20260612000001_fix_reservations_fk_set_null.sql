-- ============================================
-- GDPR FIX (R3) — stop the reservations cascade from wiping anonymized rows
--
-- Background: account deletion calls anonymize_user_data_for_deletion()
-- (migration 20260530134427) which sets reservations.last_name='DELETED' /
-- email='deleted@deleted.invalid' and is meant to RETAIN the row for legal
-- record-keeping (§147 AO). But reservations.user_id was created with
-- ON DELETE CASCADE (migration 20250203_add_user_id_to_reservations.sql), so
-- the moment auth.admin.deleteUser() runs the anonymized row is deleted to
-- zero — defeating the anonymization. The consents FK was already fixed to
-- SET NULL in 20260530134427; reservations was forgotten.
--
-- This mirrors the consents fix: flip the reservations.user_id FK to
-- ON DELETE SET NULL so the anonymized row survives user deletion with
-- user_id detached. The unique (user_id, reservation_id) constraint
-- (20250425000001) is unaffected — Postgres treats NULL user_id as distinct.
--
-- ACCESS EXCLUSIVE on reservations is held only for the constraint swap
-- (metadata + a validation scan); lock_timeout fails fast instead of queuing.
-- ============================================

SET lock_timeout = '3s';

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_user_id_fkey,
  ADD CONSTRAINT reservations_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
