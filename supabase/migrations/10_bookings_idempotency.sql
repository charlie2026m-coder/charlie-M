-- Bookings idempotency lock table
-- Prevents duplicate bookings when Adyen fires multiple events or user retries
-- Flow: INSERT status='processing' → create in Apaleo → UPDATE status='completed'
-- If second request tries to INSERT same transaction_reference → 23505 unique violation → skip

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_reference TEXT NOT NULL UNIQUE,   -- Adyen pspReference — uniqueness is the lock
  apaleo_booking_id TEXT,                        -- nullable: filled after Apaleo responds
  reservation_ids TEXT[],
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow booking status updates" ON public.bookings
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS bookings_transaction_reference_idx ON public.bookings(transaction_reference);
CREATE INDEX IF NOT EXISTS bookings_apaleo_booking_id_idx ON public.bookings(apaleo_booking_id);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings(status);
