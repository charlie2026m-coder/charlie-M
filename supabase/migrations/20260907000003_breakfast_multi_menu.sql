-- ============================================
-- BREAKFAST — more than one menu on the same morning
--
-- A room is not one appetite. Two people on one reservation want the eggs and
-- the vegan bowl on the same morning, and until now the booking carried a
-- single `menu_code`, so one of them silently got the other's breakfast.
--
-- The seat record stays one row per (reservation, morning): the sitting and the
-- head count are properties of the party, not of the dish. What splits is WHICH
-- dish, so that moves into a child table holding a count per menu, summing to
-- the party size. The kitchen's morning count is then a plain GROUP BY instead
-- of a guess.
--
-- Safe to restructure rather than migrate: no guest has booked breakfast yet
-- (breakfast_bookings was empty when this was written), so there is no menu_code
-- worth carrying across.
-- ============================================

CREATE TABLE IF NOT EXISTS public.breakfast_booking_menus (
  booking_id BIGINT NOT NULL REFERENCES public.breakfast_bookings(id) ON DELETE CASCADE,
  menu_code  TEXT   NOT NULL REFERENCES public.breakfast_menus(code) ON DELETE CASCADE,
  persons    INT    NOT NULL CHECK (persons > 0),
  PRIMARY KEY (booking_id, menu_code)
);

-- The kitchen asks "how many of each, at which sitting, tomorrow" — that walks
-- bookings by date and joins here, so the join column is the one to index.
CREATE INDEX IF NOT EXISTS breakfast_booking_menus_menu_idx
  ON public.breakfast_booking_menus (menu_code);

ALTER TABLE public.breakfast_booking_menus ENABLE ROW LEVEL SECURITY;

-- Same rule as the parent: it names what a guest eats, so admin read only and
-- service_role writes. No INSERT/UPDATE/DELETE policy on purpose.
DROP POLICY IF EXISTS "Allow admins to read breakfast booking menus" ON public.breakfast_booking_menus;
CREATE POLICY "Allow admins to read breakfast booking menus"
  ON public.breakfast_booking_menus FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'));

-- One source of truth for the split.
ALTER TABLE public.breakfast_bookings DROP COLUMN IF EXISTS menu_code;

-- --------------------------------------------------------------- seat maths
-- Unchanged in substance: lock the sitting, count what is already promised to
-- other reservations, refuse if this party will not fit. What is new is that
-- the menu arrives as {"A": 1, "B": 1} and is written as child rows in the same
-- transaction, so a party can never be half-written across two menus.
DROP FUNCTION IF EXISTS public.book_breakfast_slot(TEXT, DATE, INT, TEXT, BIGINT);

CREATE OR REPLACE FUNCTION public.book_breakfast_slot(
  p_reservation_id TEXT,
  p_service_date   DATE,
  p_persons        INT,
  p_menus          JSONB,
  p_slot_id        BIGINT
) RETURNS BIGINT AS $$
DECLARE
  v_capacity INT;
  v_taken    INT;
  v_id       BIGINT;
  v_sum      INT;
BEGIN
  IF p_persons IS NULL OR p_persons <= 0 THEN
    RAISE EXCEPTION 'persons must be positive';
  END IF;

  IF p_menus IS NULL OR jsonb_typeof(p_menus) <> 'object' THEN
    RAISE EXCEPTION 'menus must be an object';
  END IF;

  -- Every portion is accounted for, or the kitchen cooks the wrong number.
  SELECT COALESCE(SUM(value::INT), 0) INTO v_sum FROM jsonb_each_text(p_menus);
  IF v_sum <> p_persons THEN
    RAISE EXCEPTION 'menu_total_mismatch';
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
    (reservation_id, service_date, persons, slot_id, updated_at)
  VALUES
    (p_reservation_id, p_service_date, p_persons, p_slot_id, timezone('utc'::text, now()))
  ON CONFLICT (reservation_id, service_date) DO UPDATE
    SET persons    = EXCLUDED.persons,
        slot_id    = EXCLUDED.slot_id,
        updated_at = timezone('utc'::text, now())
  RETURNING id INTO v_id;

  -- Replaced wholesale rather than merged: the guest is telling us the complete
  -- split for that morning, and a leftover row from a previous split would feed
  -- someone who is no longer eating.
  DELETE FROM public.breakfast_booking_menus WHERE booking_id = v_id;

  INSERT INTO public.breakfast_booking_menus (booking_id, menu_code, persons)
  SELECT v_id, key, value::INT
  FROM jsonb_each_text(p_menus)
  WHERE value::INT > 0;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only the server may call it; the guest page reaches it via service_role.
REVOKE ALL ON FUNCTION public.book_breakfast_slot(TEXT, DATE, INT, JSONB, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_breakfast_slot(TEXT, DATE, INT, JSONB, BIGINT) FROM anon, authenticated;
