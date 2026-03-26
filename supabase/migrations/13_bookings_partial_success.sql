-- Add support for partial_success status and error tracking
-- This allows bookings where payment succeeded but folio payment failed

-- Add new status option
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('processing', 'completed', 'partial_success', 'failed'));

-- Add error_details column to store folio payment failures
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS error_details JSONB;

-- Add index for monitoring partial_success bookings
CREATE INDEX IF NOT EXISTS bookings_partial_success_idx 
  ON public.bookings(status) 
  WHERE status = 'partial_success';

-- Add updated_at for tracking when status changes
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bookings_updated_at_trigger ON public.bookings;
CREATE TRIGGER update_bookings_updated_at_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_bookings_updated_at();

-- Create view for monitoring failed folio payments
CREATE OR REPLACE VIEW public.bookings_requiring_attention AS
SELECT 
  id,
  transaction_reference,
  apaleo_booking_id,
  reservation_ids,
  status,
  error_details,
  created_at,
  updated_at
FROM public.bookings
WHERE status = 'partial_success'
ORDER BY created_at DESC;

COMMENT ON VIEW public.bookings_requiring_attention IS 
  'Bookings where payment succeeded but folio payment failed - requires manual intervention';
