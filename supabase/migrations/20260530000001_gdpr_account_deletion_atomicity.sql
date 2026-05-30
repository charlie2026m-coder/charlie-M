-- ============================================
-- GDPR ACCOUNT DELETION — ATOMICITY & AUDIT TRAIL
--
-- ALTER TABLE acquires ACCESS EXCLUSIVE lock on consents for milliseconds.
-- lock_timeout = 3s: migration fails fast instead of queuing behind long transactions.
SET lock_timeout = '3s';

-- 1. Change consents.user_id FK from CASCADE to SET NULL:
--    ensures the account_deletion consent record survives auth.admin.deleteUser()
--    (currently CASCADE wipes it immediately, destroying the audit trail).
--
-- 2. Add anonymize_user_data_for_deletion() Postgres function:
--    wraps pending_bookings, pending_services, and reservations cleanup in a
--    single DB transaction so all steps succeed or all roll back together.
-- ============================================

-- ============================================
-- 1. CONSENTS: preserve audit records after user deletion
-- ============================================

ALTER TABLE public.consents
  DROP CONSTRAINT IF EXISTS consents_user_id_fkey,
  ADD CONSTRAINT consents_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ============================================
-- 2. ATOMIC ANONYMIZATION FUNCTION
-- Called before auth.admin.deleteUser() — all ops in one transaction.
-- ============================================

CREATE OR REPLACE FUNCTION public.anonymize_user_data_for_deletion(
  target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear PII from pending_bookings; keep rows for financial audit trail
  UPDATE public.pending_bookings
  SET booking_payload = '{"cleared": true}'::jsonb,
      updated_at      = NOW()
  WHERE user_id = target_user_id;

  -- Delete incomplete pending_services (payment never completed — no financial value)
  -- Completed ones retain reservation link; user_id will be NULLed by FK after deleteUser()
  DELETE FROM public.pending_services
  WHERE user_id = target_user_id
    AND status IN ('pending', 'failed');

  -- Anonymize reservations (keep rows for financial records per §147 AO)
  UPDATE public.reservations
  SET last_name = 'DELETED',
      email     = 'deleted@deleted.invalid'
  WHERE user_id = target_user_id;
END;
$$;

COMMENT ON FUNCTION public.anonymize_user_data_for_deletion(UUID) IS
  'Atomically anonymizes all personal data for a given user before account deletion. '
  'Must be called before auth.admin.deleteUser() so the DB changes can be rolled back '
  'if an error occurs (e.g. one table update fails) before the auth user is removed.';
