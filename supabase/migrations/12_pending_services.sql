-- Pending services — post-payment extras fallback
-- Stores services that need to be booked after payment completes.
-- Used as a fallback if the client-side service booking call fails
-- (e.g. network error after payment but before /api/services call).

CREATE TABLE IF NOT EXISTS public.pending_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,          -- same reference used in pending_bookings / Adyen merchantReference
  reservation_id TEXT NOT NULL,            -- Apaleo reservation ID
  services JSONB NOT NULL,                 -- array of { serviceId, count?, dates? }
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pending_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow pending services creation" ON public.pending_services
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own pending services" ON public.pending_services
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow pending services updates" ON public.pending_services
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pending_services_reference ON public.pending_services(reference);
CREATE INDEX IF NOT EXISTS idx_pending_services_status ON public.pending_services(status);
CREATE INDEX IF NOT EXISTS idx_pending_services_reservation_id ON public.pending_services(reservation_id);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_pending_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_services_updated_at_trigger
  BEFORE UPDATE ON public.pending_services
  FOR EACH ROW EXECUTE FUNCTION update_pending_services_updated_at();
