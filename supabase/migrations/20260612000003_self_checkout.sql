-- ============================================
-- QR SELF-CHECKOUT
--
-- One static unguessable token per Apaleo unit; guests scan
-- /checkout/{token} on departure day to check themselves out.
-- Every attempt is recorded in self_checkout_log.
--
-- Writes happen only via service_role (public API route has no
-- user session; token generation runs server-side after an admin
-- check). Admins may read both tables from the admin panel, so
-- SELECT policies below are load-bearing, not decorative.
-- ============================================

CREATE TABLE IF NOT EXISTS public.self_checkout_tokens (
  token       TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id     TEXT NOT NULL,
  unit_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (property_id, unit_id)
);

CREATE TABLE IF NOT EXISTS public.self_checkout_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token          TEXT NOT NULL,
  reservation_id TEXT,
  unit_id        TEXT,
  guest          TEXT,
  result         TEXT NOT NULL, -- ok | blocked:{reason} | needs_confirm | error:{status}
  at             TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS self_checkout_log_at_idx
  ON public.self_checkout_log (at DESC);

ALTER TABLE public.self_checkout_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_checkout_log ENABLE ROW LEVEL SECURITY;

-- Read: admins only (mirrors the rooms-table pattern). No INSERT/UPDATE/DELETE
-- policies at all -> only service_role (bypasses RLS) can write.
CREATE POLICY "Allow admins to read self checkout tokens"
  ON public.self_checkout_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Allow admins to read self checkout log"
  ON public.self_checkout_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Retention: the log stores guest names (GDPR storage limitation) — keep 90 days.
-- pg_cron extension is already enabled by 20260502000002_gdpr_auto_cleanup.sql.
CREATE OR REPLACE FUNCTION cleanup_self_checkout_log()
RETURNS void AS $$
BEGIN
  DELETE FROM public.self_checkout_log
  WHERE at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'cleanup-self-checkout-log',
  '10 3 * * *',
  $$SELECT cleanup_self_checkout_log()$$
);
