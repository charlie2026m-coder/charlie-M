-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id TEXT NOT NULL UNIQUE,
  booking_id TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can view reservations (search by reservation_id, booking_id, email, last_name)
CREATE POLICY "Allow public read access to reservations"
  ON public.reservations
  FOR SELECT
  USING (true);

-- Anyone can insert reservations (for guest checkouts)
CREATE POLICY "Allow reservation creation"
  ON public.reservations
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS reservations_reservation_id_idx ON public.reservations(reservation_id);
CREATE INDEX IF NOT EXISTS reservations_booking_id_idx ON public.reservations(booking_id);
CREATE INDEX IF NOT EXISTS reservations_email_idx ON public.reservations(email);
CREATE INDEX IF NOT EXISTS reservations_last_name_idx ON public.reservations(last_name);

