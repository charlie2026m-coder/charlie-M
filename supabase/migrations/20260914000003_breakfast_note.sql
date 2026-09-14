-- A note from the guest to the kitchen, per morning: "no onions", "gluten-free
-- bread", "coffee very hot". Free text, short, and read by people — it is
-- printed on the kitchen sheet and shown at the door, never interpreted.

ALTER TABLE public.breakfast_bookings
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE public.breakfast_bookings DROP CONSTRAINT IF EXISTS breakfast_bookings_note_short;
ALTER TABLE public.breakfast_bookings ADD CONSTRAINT breakfast_bookings_note_short
  CHECK (note IS NULL OR char_length(note) <= 300);
