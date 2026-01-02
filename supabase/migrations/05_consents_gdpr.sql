-- ============================================
-- CONSENTS TABLE (GDPR COMPLIANCE)
-- Stores user consent records for data processing
-- ============================================

CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id TEXT,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('registration', 'booking', 'marketing', 'cookies', 'account_deletion')),
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  consent_revoked BOOLEAN DEFAULT false,
  consent_revoked_date TIMESTAMP WITH TIME ZONE,
  privacy_policy_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own consents
CREATE POLICY "Users can view own consents" 
  ON public.consents 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    (user_id IS NULL AND booking_id IS NOT NULL)
  );

-- Policy: Users can insert their own consents
CREATE POLICY "Users can insert own consents" 
  ON public.consents 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    user_id IS NULL
  );

-- Policy: Users can update their own consents (for revocation)
CREATE POLICY "Users can update own consents" 
  ON public.consents 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS consents_user_id_idx ON public.consents(user_id);
CREATE INDEX IF NOT EXISTS consents_booking_id_idx ON public.consents(booking_id);
CREATE INDEX IF NOT EXISTS consents_consent_type_idx ON public.consents(consent_type);
CREATE INDEX IF NOT EXISTS consents_consent_date_idx ON public.consents(consent_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_consents_updated_at_trigger
  BEFORE UPDATE ON public.consents
  FOR EACH ROW
  EXECUTE FUNCTION update_consents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.consents IS 'Stores user consent data for GDPR compliance. Tracks consent history including registration, booking, and marketing consents.';
COMMENT ON COLUMN public.consents.user_id IS 'References authenticated user. NULL for guest bookings.';
COMMENT ON COLUMN public.consents.booking_id IS 'References booking for guest consents.';
COMMENT ON COLUMN public.consents.consent_type IS 'Type of consent: registration, booking, marketing, cookies, or account_deletion.';
COMMENT ON COLUMN public.consents.ip_address IS 'IP address when consent was given (optional, for audit trail).';
COMMENT ON COLUMN public.consents.consent_revoked IS 'Whether the consent has been revoked by user.';
COMMENT ON COLUMN public.consents.privacy_policy_version IS 'Version of Privacy Policy when consent was given.';

