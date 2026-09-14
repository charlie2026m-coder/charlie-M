-- A picture for each breakfast menu.
--
-- `breakfast_menus.photo_url` has existed since the table was created and was
-- never filled: there was nowhere to put a file. This is that place. Public
-- bucket, because the pictures are shown to guests before they have booked
-- anything; writes only through the API with the service role, so no
-- insert/update/delete policies are needed here.

INSERT INTO storage.buckets (id, name, public)
VALUES ('breakfast-menus', 'breakfast-menus', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view breakfast menu photos" ON storage.objects;
CREATE POLICY "Anyone can view breakfast menu photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'breakfast-menus');
