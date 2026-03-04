-- ============================================
-- SERVICES TABLE
-- Extra services (baby bed, breakfast, etc.) with translations and image
-- ============================================

CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_de TEXT NOT NULL,
  description_en TEXT,
  description_de TEXT,
  image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read services
CREATE POLICY "Allow public read access to services"
  ON public.services
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert services
CREATE POLICY "Allow admins to insert services"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Only admins can update services
CREATE POLICY "Allow admins to update services"
  ON public.services
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

-- Policy: Only admins can delete services
CREATE POLICY "Allow admins to delete services"
  ON public.services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Index for lookups
CREATE INDEX IF NOT EXISTS services_id_idx ON public.services(id);

-- Trigger to auto-update updated_at (uses function from 03_rooms_and_storage)
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED: initial service data from ServiceTranslations
-- ============================================

INSERT INTO public.services (id, title_en, title_de, description_en, description_de) VALUES
  ('CMH-BAB', 'Baby Bed', 'Babybett',
   'Baby bed available for an additional cost. Suitable for babies and toddlers from 0 to 3 years old.',
   'Babybett gegen Aufpreis verfügbar. Geeignet für Babys und Kleinkinder von 0 bis 3 Jahren.'),
  ('CMH-ECI', 'Early Check-In', 'Früher Check-in',
   'Check in earlier than the regular time and settle into your room as soon as it''s ready. Ideal for guests arriving before noon who want a smooth, relaxed start to their stay in Berlin. It is possible to move in already at 13:00.',
   'Checken Sie früher als zur regulären Uhrzeit ein und beziehen Sie Ihr Zimmer, sobald es bereit ist. Ideal für Gäste, die vor Mittag ankommen und entspannt in ihren Aufenthalt in Berlin starten möchten. Es ist möglich, bereits um 13:00 Uhr einzuziehen.'),
  ('CMH-LCO', 'Late Check-Out', 'Später Check-out',
   'Extend your stay and check out later than the regular time, giving you extra time to relax, pack, or enjoy your morning in Berlin without rush. Late check out is possible until 13:00.',
   'Verlängern Sie Ihren Aufenthalt und checken Sie später als zur regulären Uhrzeit aus – perfekt, um entspannt zu packen oder den Morgen in Berlin ohne Eile zu genießen. Ein Late Check-out ist bis 13:00 Uhr möglich.'),
  ('CMH-BRKF', 'Breakfast', 'Frühstück',
   'Enjoy a fresh and generous breakfast served every morning, featuring a selection of warm dishes, pastries, fresh fruit, and hot drinks. A simple and delicious way to start your day in Berlin.',
   'Genießen Sie jeden Morgen ein frisches und abwechslungsreiches Frühstück mit warmen Speisen, Gebäck, frischem Obst und heißen Getränken. Der perfekte, unkomplizierte Start in Ihren Tag in Berlin'),
  ('CMH-ADCLN', 'Additional room cleaning', 'Zusätzliche Zimmerreinigung',
   'Request an extra cleaning of your room, including fresh towels, a tidy-up, and a reset of essential amenities. A convenient option for guests who prefer an additional refresh during their stay.',
   'Buchen Sie eine zusätzliche Reinigung Ihres Zimmers, einschließlich frischer Handtücher, einer Auffrischung und dem Auffüllen der wichtigsten Annehmlichkeiten. Eine praktische Option für Gäste, die während ihres Aufenthalts eine weitere Reinigung wünschen.'),
  ('CMH-PRK', 'Parking', 'Parkplatz',
   'Secure on-site parking available for guests who arrive by car. A convenient option that allows you to explore Berlin with ease, knowing your vehicle is safely parked nearby.',
   'Sicherer Parkplatz direkt am Haus für Gäste, die mit dem Auto anreisen. Eine praktische Möglichkeit, Berlin entspannt zu erkunden, während Ihr Fahrzeug in der Nähe sicher abgestellt ist.'),
  ('CMH-PET', 'Pets', 'Haustiere',
   'Bring your pet along for a comfortable stay in Berlin. We welcome well-behaved animals and provide a clean, cozy space for you and your companion.',
   'Bringen Sie Ihr Haustier für einen angenehmen Aufenthalt in Berlin mit. Wir heißen gut erzogene Tiere willkommen und sorgen für einen sauberen, gemütlichen Raum für Sie und Ihren tierischen Begleiter.')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE BUCKET FOR SERVICE IMAGES
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('services', 'services', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view service images
CREATE POLICY "Allow public read access to service images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'services');

-- Policy: Only admins can upload service images
CREATE POLICY "Allow admins to upload service images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'services'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Only admins can update service images
CREATE POLICY "Allow admins to update service images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'services'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    bucket_id = 'services'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Only admins can delete service images
CREATE POLICY "Allow admins to delete service images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'services'
    AND EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = auth.jwt() ->> 'email'
    )
  );
