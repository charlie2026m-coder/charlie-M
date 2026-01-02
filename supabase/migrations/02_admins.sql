-- ============================================
-- ADMINS TABLE
-- Admin users management
-- ============================================

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can check if someone is admin (needed for other policies)
CREATE POLICY "Allow public read access to admins"
  ON public.admins
  FOR SELECT
  USING (true);

-- Policy: Only existing admins can add new admins
CREATE POLICY "Allow admins to insert admins"
  ON public.admins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Only existing admins can remove admins
CREATE POLICY "Allow admins to delete admins"
  ON public.admins
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS admins_email_idx ON public.admins(email);

-- ============================================
-- INSERT YOUR ADMIN EMAIL HERE!
-- ============================================
INSERT INTO public.admins (email, role) 
VALUES ('charlie2026m@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Uncomment and add your email:
-- INSERT INTO public.admins (email, role) 
-- VALUES ('your-email@gmail.com', 'admin')
-- ON CONFLICT (email) DO NOTHING;

