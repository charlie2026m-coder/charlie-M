-- ============================================
-- BREAKFAST BOOKING — menus, seating slots, attendance
--
-- What this does NOT do: money. Breakfast stays exactly what it is today —
-- two Apaleo services (CMH-BRKF 7% food + CMH-BRKFG 19% beverages) sold per
-- person per night. Apaleo remains the single source of truth for WHO PAID and
-- FOR WHICH DATES. These tables store only what Apaleo cannot: which menu the
-- guest picked, which sitting they take, and whether they actually turned up.
-- Keeping the two apart means a bug here can never mis-bill anyone.
--
-- Writes go through service_role only (the public token page has no user
-- session, exactly like self-checkout). Admin SELECT policies are load-bearing:
-- the admin panel reads these tables with the user's own session.
-- ============================================

-- --------------------------------------------------------------- menus
-- The four menus (A/B/C/D today, more later — the code is free text, not an
-- enum, so adding "E" is an admin action rather than a migration).
CREATE TABLE IF NOT EXISTS public.breakfast_menus (
  code            TEXT PRIMARY KEY,
  name_de         TEXT NOT NULL DEFAULT '',
  name_en         TEXT NOT NULL DEFAULT '',
  description_de  TEXT NOT NULL DEFAULT '',
  description_en  TEXT NOT NULL DEFAULT '',
  -- One dish per line. A textarea beats jsonb here: the kitchen edits this,
  -- and a malformed array should not be able to break the guest page.
  items_de        TEXT NOT NULL DEFAULT '',
  items_en        TEXT NOT NULL DEFAULT '',
  allergens_de    TEXT NOT NULL DEFAULT '',
  allergens_en    TEXT NOT NULL DEFAULT '',
  photo_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Which menus are on offer on which morning. A date with no rows offers
-- nothing — that is how a closed day is expressed, no separate flag needed.
CREATE TABLE IF NOT EXISTS public.breakfast_menu_days (
  service_date  DATE NOT NULL,
  menu_code     TEXT NOT NULL REFERENCES public.breakfast_menus(code) ON DELETE CASCADE,
  PRIMARY KEY (service_date, menu_code)
);

CREATE INDEX IF NOT EXISTS breakfast_menu_days_date_idx
  ON public.breakfast_menu_days (service_date);

-- --------------------------------------------------------------- sittings
-- The dining room seats ~30-35. Splitting the morning into windows is the
-- whole point: without it everybody arrives at 08:30 and the room overflows
-- while 07:15 sits empty.
CREATE TABLE IF NOT EXISTS public.breakfast_slots (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  starts_at   TIME NOT NULL,
  ends_at     TIME NOT NULL,
  capacity    INT  NOT NULL CHECK (capacity > 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  CHECK (starts_at < ends_at)
);

-- --------------------------------------------------------------- bookings
-- One row per (reservation, morning). `persons` is a SNAPSHOT of what Apaleo
-- says is paid for that date, refreshed whenever we read the reservation — it
-- drives seat maths only. If it ever disagrees with Apaleo, Apaleo wins.
CREATE TABLE IF NOT EXISTS public.breakfast_bookings (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id   TEXT NOT NULL,
  service_date     DATE NOT NULL,
  persons          INT  NOT NULL CHECK (persons > 0),
  menu_code        TEXT REFERENCES public.breakfast_menus(code) ON DELETE SET NULL,
  slot_id          BIGINT REFERENCES public.breakfast_slots(id) ON DELETE SET NULL,
  -- Attendance, written by the door scan. attended_persons can be lower than
  -- persons: two paid, one came down.
  attended_at      TIMESTAMPTZ,
  attended_persons INT CHECK (attended_persons IS NULL OR attended_persons >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (reservation_id, service_date)
);

CREATE INDEX IF NOT EXISTS breakfast_bookings_date_slot_idx
  ON public.breakfast_bookings (service_date, slot_id);

CREATE INDEX IF NOT EXISTS breakfast_bookings_reservation_idx
  ON public.breakfast_bookings (reservation_id);

-- --------------------------------------------------------------- tokens
-- One unguessable token per reservation, exactly like self-checkout. It backs
-- BOTH the "choose your menu" link we send through Guestway AND the QR the
-- guest shows at the door — one artefact the guest saves once, and the scanner
-- resolves it against TODAY.
CREATE TABLE IF NOT EXISTS public.breakfast_tokens (
  token           TEXT PRIMARY KEY,
  reservation_id  TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Every scan, accepted or refused. This is the audit trail behind "how many
-- people actually came down" and the only way to explain a disputed refusal.
CREATE TABLE IF NOT EXISTS public.breakfast_scan_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token          TEXT,
  reservation_id TEXT,
  service_date   DATE,
  guest          TEXT,
  menu_code      TEXT,
  persons        INT,
  result         TEXT NOT NULL, -- ok | already | no_booking | not_paid | unknown_token | error
  at             TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS breakfast_scan_log_at_idx
  ON public.breakfast_scan_log (at DESC);

-- --------------------------------------------------------------- RLS
ALTER TABLE public.breakfast_menus      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakfast_menu_days  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakfast_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakfast_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakfast_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakfast_scan_log   ENABLE ROW LEVEL SECURITY;

-- Menus, their calendar and the sittings are public reading matter: the guest
-- page shows them before anyone has logged in. They carry no personal data.
CREATE POLICY "Public can read breakfast menus"
  ON public.breakfast_menus FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public can read breakfast menu days"
  ON public.breakfast_menu_days FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "Public can read breakfast slots"
  ON public.breakfast_slots FOR SELECT TO anon, authenticated USING (TRUE);

-- Bookings, tokens and scans name guests. Admin read only; the guest reaches
-- their own row through the token route, which runs as service_role.
CREATE POLICY "Allow admins to read breakfast bookings"
  ON public.breakfast_bookings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Allow admins to read breakfast tokens"
  ON public.breakfast_tokens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Allow admins to read breakfast scan log"
  ON public.breakfast_scan_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'));

-- No INSERT/UPDATE/DELETE policies anywhere: only service_role writes.

-- --------------------------------------------------------------- seat maths
-- Booking a sitting has to be race-safe. Two guests taking the last seat at the
-- same moment is not hypothetical at 30 seats and a message blast that lands on
-- every phone at once. Counting in application code then inserting cannot be
-- made safe; locking the slot row inside one transaction can.
--
-- Returns the new/updated booking id, or raises with a message the route turns
-- into a friendly refusal.
CREATE OR REPLACE FUNCTION public.book_breakfast_slot(
  p_reservation_id TEXT,
  p_service_date   DATE,
  p_persons        INT,
  p_menu_code      TEXT,
  p_slot_id        BIGINT
) RETURNS BIGINT AS $$
DECLARE
  v_capacity INT;
  v_taken    INT;
  v_id       BIGINT;
BEGIN
  IF p_persons IS NULL OR p_persons <= 0 THEN
    RAISE EXCEPTION 'persons must be positive';
  END IF;

  -- Lock the sitting first: every concurrent booking for this slot queues here,
  -- so the count below cannot go stale between reading and writing.
  SELECT capacity INTO v_capacity
  FROM public.breakfast_slots
  WHERE id = p_slot_id AND is_active
  FOR UPDATE;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'slot_not_found';
  END IF;

  -- Seats already promised for this sitting on this morning, excluding this
  -- reservation's own row so that changing the menu does not count twice.
  SELECT COALESCE(SUM(persons), 0) INTO v_taken
  FROM public.breakfast_bookings
  WHERE service_date = p_service_date
    AND slot_id = p_slot_id
    AND reservation_id <> p_reservation_id;

  IF v_taken + p_persons > v_capacity THEN
    RAISE EXCEPTION 'slot_full';
  END IF;

  INSERT INTO public.breakfast_bookings
    (reservation_id, service_date, persons, menu_code, slot_id, updated_at)
  VALUES
    (p_reservation_id, p_service_date, p_persons, p_menu_code, p_slot_id, timezone('utc'::text, now()))
  ON CONFLICT (reservation_id, service_date) DO UPDATE
    SET persons    = EXCLUDED.persons,
        menu_code  = EXCLUDED.menu_code,
        slot_id    = EXCLUDED.slot_id,
        updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only the server may call it; the guest page reaches it via service_role.
REVOKE ALL ON FUNCTION public.book_breakfast_slot(TEXT, DATE, INT, TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_breakfast_slot(TEXT, DATE, INT, TEXT, BIGINT) FROM anon, authenticated;

-- --------------------------------------------------------------- retention
-- The scan log names guests (GDPR storage limitation). Same 90 days as the
-- self-checkout log, same nightly job style. Bookings themselves are kept:
-- they are part of the stay record, and are cleaned with the reservation.
CREATE OR REPLACE FUNCTION cleanup_breakfast_scan_log()
RETURNS void AS $$
BEGIN
  DELETE FROM public.breakfast_scan_log
  WHERE at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'cleanup-breakfast-scan-log',
  '20 3 * * *',
  $$SELECT cleanup_breakfast_scan_log()$$
);

-- --------------------------------------------------------------- seed
-- Three sittings covering 07:00-10:00 at 12 seats each = 36, just above the
-- 30-35 the room holds, so a full house is reachable without the last guest
-- being told "no". Adjust in the admin, not here.
INSERT INTO public.breakfast_slots (starts_at, ends_at, capacity, sort_order)
SELECT * FROM (VALUES
  ('07:00'::TIME, '08:00'::TIME, 12, 1),
  ('08:00'::TIME, '09:00'::TIME, 12, 2),
  ('09:00'::TIME, '10:00'::TIME, 12, 3)
) AS s(starts_at, ends_at, capacity, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.breakfast_slots);

-- The four menus exist from day one so the admin has something to edit rather
-- than an empty screen; the texts are placeholders on purpose.
INSERT INTO public.breakfast_menus (code, name_de, name_en, sort_order)
VALUES
  ('A', 'Menü A', 'Menu A', 1),
  ('B', 'Menü B', 'Menu B', 2),
  ('C', 'Menü C', 'Menu C', 3),
  ('D', 'Menü D', 'Menu D', 4)
ON CONFLICT (code) DO NOTHING;
