-- ============================================
-- BREAKFAST — remember who has already been nudged
--
-- The reminder runs every evening for the morning after. Without a record of
-- what has been sent, a guest on a five-night stay who never opens the link
-- would be told to choose their breakfast five evenings running, and the fifth
-- message would be the one that teaches them to ignore us.
--
-- One row per (reservation, morning) written after a successful send, so the
-- job is idempotent: running it twice sends nothing twice. That idempotency is
-- also what makes the endpoint safe while CRON_SECRET is unset — the worst a
-- stranger can do by calling it is make it do its job early.
--
-- Not a column on breakfast_bookings, because the guests who need reminding are
-- exactly the ones with no booking row.
-- ============================================

CREATE TABLE IF NOT EXISTS public.breakfast_reminders (
  reservation_id TEXT NOT NULL,
  service_date   DATE NOT NULL,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (reservation_id, service_date)
);

ALTER TABLE public.breakfast_reminders ENABLE ROW LEVEL SECURITY;

-- It names a reservation, so admin read only; the job writes as service_role.
DROP POLICY IF EXISTS "Allow admins to read breakfast reminders" ON public.breakfast_reminders;
CREATE POLICY "Allow admins to read breakfast reminders"
  ON public.breakfast_reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'));

-- Same retention as the scan log: it is an operational trace, not a record the
-- hotel needs to keep.
CREATE OR REPLACE FUNCTION cleanup_breakfast_reminders()
RETURNS void AS $$
BEGIN
  DELETE FROM public.breakfast_reminders
  WHERE sent_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'cleanup-breakfast-reminders',
  '25 3 * * *',
  $$SELECT cleanup_breakfast_reminders()$$
);
