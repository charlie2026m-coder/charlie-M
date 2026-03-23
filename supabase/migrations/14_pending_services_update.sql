-- Update pending_services table to match new structure with lock_key
-- This allows webhook to process services just like bookings

-- Add new columns if they don't exist
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS lock_key TEXT;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS services_payload JSONB;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS service_ids TEXT[];
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS apaleo_charge_id TEXT;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS error_details JSONB;

-- Drop old unique constraint on reference if exists
ALTER TABLE public.pending_services DROP CONSTRAINT IF EXISTS pending_services_reference_key;

-- Add unique constraint on lock_key
ALTER TABLE public.pending_services ADD CONSTRAINT pending_services_lock_key_unique UNIQUE (lock_key);

-- Add new status values
ALTER TABLE public.pending_services DROP CONSTRAINT IF EXISTS pending_services_status_check;
ALTER TABLE public.pending_services ADD CONSTRAINT pending_services_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'partial_success', 'failed'));

-- Create index on lock_key
CREATE INDEX IF NOT EXISTS idx_pending_services_lock_key ON public.pending_services(lock_key);
CREATE INDEX IF NOT EXISTS idx_pending_services_transaction_reference ON public.pending_services(transaction_reference);

-- Create view for monitoring pending services
CREATE OR REPLACE VIEW public.pending_services_requiring_attention AS
SELECT 
  id,
  lock_key,
  transaction_reference,
  reservation_id,
  service_ids,
  status,
  error_details,
  created_at,
  updated_at
FROM public.pending_services
WHERE status IN ('partial_success', 'failed')
ORDER BY created_at DESC;

COMMENT ON VIEW public.pending_services_requiring_attention IS 
  'Services where payment succeeded but booking or rollback failed - requires manual intervention';
