-- ============================================
-- GDPR AUTO-CLEANUP — GDPR Art. 5(1)(e) Storage Limitation
-- 1. pending_bookings — delete stale personal data after 48h
-- 2. consents — anonymize IP addresses after 6 months
-- ============================================

-- ============================================
-- 1. PENDING_BOOKINGS: Auto-cleanup stale records
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_stale_pending_bookings()
RETURNS void AS $$
BEGIN
  -- Delete pending/failed records older than 48 hours
  DELETE FROM public.pending_bookings
  WHERE status IN ('pending', 'failed')
    AND created_at < NOW() - INTERVAL '48 hours';

  -- Clear personal data from completed records older than 7 days
  -- Keep reference and status for audit trail, wipe the JSONB payload
  UPDATE public.pending_bookings
  SET booking_payload = '{"cleared": true}'::jsonb,
      updated_at = NOW()
  WHERE status = 'completed'
    AND booking_payload != '{"cleared": true}'::jsonb
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CONSENTS: Auto-anonymize old IP addresses
-- ============================================

CREATE OR REPLACE FUNCTION anonymize_old_consent_ips()
RETURNS void AS $$
BEGIN
  UPDATE public.consents
  SET ip_address = NULL,
      updated_at = NOW()
  WHERE ip_address IS NOT NULL
    AND consent_date < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. SCHEDULE CRON JOBS — runs daily at 03:00 UTC
-- Requires pg_cron extension (enable in Supabase Dashboard > Database > Extensions)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-stale-pending-bookings',
  '0 3 * * *',
  $$SELECT cleanup_stale_pending_bookings()$$
);

SELECT cron.schedule(
  'anonymize-old-consent-ips',
  '0 3 * * *',
  $$SELECT anonymize_old_consent_ips()$$
);
