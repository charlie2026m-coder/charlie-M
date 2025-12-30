-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  group_name TEXT NOT NULL,
  attributes TEXT[] NOT NULL DEFAULT '{}',
  max_persons INTEGER NOT NULL,
  size INTEGER NOT NULL,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow admins to insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow admins to update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow admins to delete rooms" ON public.rooms;

-- Policy: Everyone can read rooms
CREATE POLICY "Allow public read access to rooms"
  ON public.rooms
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert/update/delete rooms
CREATE POLICY "Allow admins to insert rooms"
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Allow admins to update rooms"
  ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Allow admins to delete rooms"
  ON public.rooms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create index on id for faster lookups
CREATE INDEX IF NOT EXISTS rooms_id_idx ON public.rooms(id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data
INSERT INTO public.rooms (id, group_name, attributes, max_persons, size) VALUES
  ('CMH-SGB', 'Single Room with Balcony', ARRAY['balcony', 'single'], 1, 11),
  ('CMH-BUQ', 'Business Room with Queen Size Bed', ARRAY['queen'], 2, 14),
  ('CMH-BUK', 'Business Room with King Size Bed', ARRAY['king'], 2, 14),
  ('CMH-BUQB', 'Business Room with Queen Size Bed and Balcony', ARRAY['balcony', 'queen'], 2, 14),
  ('CMH-SPKB', 'Superior Room with King Size Bed and Balcony', ARRAY['balcony', 'king'], 2, 18),
  ('CMH-SPK', 'Superior Room with King Size Bed', ARRAY['king'], 2, 22),
  ('CMH-STKST', 'Standard Room with King Size Bed and Shared Terrace', ARRAY['shared', 'king'], 2, 12),
  ('CMH-SPKT', 'Superior Room with King Size Bed and Terrace', ARRAY['terrace', 'king'], 2, 18),
  ('CMH-SPKGW', 'Superior Room with King Size Bed - Garden Wing', ARRAY['garden', 'king'], 2, 18),
  ('CMH-SPKST', 'Superior Room with King Size Bed and Shared Terrace', ARRAY['shared', 'king'], 2, 22),
  ('CMH-STKB', 'Standard Room with King Size Bed and Balcony', ARRAY['balcony', 'king'], 2, 11),
  ('CMH-BUKT', 'Business Room with King Size Bed and Terrace', ARRAY['terrace', 'king'], 2, 15)
ON CONFLICT (id) DO NOTHING;
