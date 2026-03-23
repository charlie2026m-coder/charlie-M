-- Pending bookings — webhook fallback safety net
-- Before submitting payment to Adyen, we save the full booking payload here.
-- If the client tab closes or network fails after payment, the Adyen webhook
-- looks up this record by merchantReference and recreates the booking in Apaleo.

CREATE TABLE IF NOT EXISTS public.pending_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,          -- matches crypto.randomUUID() sent as Adyen merchantReference
  booking_payload JSONB NOT NULL,          -- full booking object from Zustand store
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  apaleo_booking_id TEXT,                  -- filled after successful Apaleo booking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow pending booking creation" ON public.pending_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own pending bookings" ON public.pending_bookings
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow pending booking updates" ON public.pending_bookings
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pending_bookings_reference ON public.pending_bookings(reference);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_status ON public.pending_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_created_at ON public.pending_bookings(created_at DESC);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_pending_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_bookings_updated_at_trigger
  BEFORE UPDATE ON public.pending_bookings
  FOR EACH ROW EXECUTE FUNCTION update_pending_bookings_updated_at();
