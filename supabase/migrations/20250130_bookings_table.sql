-- Create bookings table for booking history
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can view bookings (search by booking_id)
CREATE POLICY "Allow public read access to bookings"
  ON public.bookings
  FOR SELECT
  USING (true);

-- Anyone can insert bookings (for guest checkouts)
CREATE POLICY "Allow booking creation"
  ON public.bookings
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS bookings_email_idx ON public.bookings(email);
CREATE INDEX IF NOT EXISTS bookings_booking_id_idx ON public.bookings(booking_id);
CREATE INDEX IF NOT EXISTS bookings_last_name_idx ON public.bookings(last_name);

