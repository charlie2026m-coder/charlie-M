-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to room photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to upload room photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update room photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete room photos" ON storage.objects;

-- Create storage bucket for room photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for room photos bucket

-- Policy: Anyone can view room photos
CREATE POLICY "Allow public read access to room photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'room-photos');

-- Policy: Only admins can upload room photos
CREATE POLICY "Allow admins to upload room photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'room-photos'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Only admins can update room photos
CREATE POLICY "Allow admins to update room photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'room-photos'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    bucket_id = 'room-photos'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Only admins can delete room photos
CREATE POLICY "Allow admins to delete room photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'room-photos'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );
