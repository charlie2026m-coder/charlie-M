-- Update pending_services table to match new structure with lock_key
-- This allows webhook to process services just like bookings

-- Add new columns if they don't exist
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS lock_key TEXT;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS services_payload JSONB;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS service_ids TEXT[];
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS apaleo_charge_id TEXT;
ALTER TABLE public.pending_services ADD COLUMN IF NOT EXISTS error_details JSONB;

-- Rename old 'reference' column to avoid confusion (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'pending_services' AND column_name = 'reference') THEN
    ALTER TABLE public.pending_services RENAME COLUMN reference TO old_reference;
  END IF;
END $$;

-- Rename old 'services' column to avoid confusion (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'pending_services' AND column_name = 'services') THEN
    ALTER TABLE public.pending_services RENAME COLUMN services TO old_services;
  END IF;
END $$;

-- Drop old unique constraint on reference if exists
ALTER TABLE public.pending_services DROP CONSTRAINT IF EXISTS pending_services_reference_key;

-- Add unique constraint on lock_key
ALTER TABLE public.pending_services DROP CONSTRAINT IF EXISTS pending_services_lock_key_unique;
ALTER TABLE public.pending_services ADD CONSTRAINT pending_services_lock_key_unique UNIQUE (lock_key);

-- Add new status values
ALTER TABLE public.pending_services DROP CONSTRAINT IF EXISTS pending_services_status_check;
ALTER TABLE public.pending_services ADD CONSTRAINT pending_services_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'partial_success', 'failed'));

-- Create index on lock_key
CREATE INDEX IF NOT EXISTS idx_pending_services_lock_key ON public.pending_services(lock_key);
CREATE INDEX IF NOT EXISTS idx_pending_services_transaction_reference ON public.pending_services(transaction_reference);

-- Create view for monitoring pending services
DROP VIEW IF EXISTS public.pending_services_requiring_attention;
CREATE VIEW public.pending_services_requiring_attention AS
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
