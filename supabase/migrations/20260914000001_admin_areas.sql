-- Staff: who may log in, and what each person may do.
--
-- Until now `admins` was a list of e-mails with a free-text `role`, and any
-- row could do everything the panel offers (the kitchen's login was the one
-- exception, special-cased in code). The owner wants to add managers and
-- decide per person what they can touch, so each row now carries its AREAS:
--   breakfast  numbers, kitchen sheet, bookings, door, setup
--   hotel      rooms, extras and QR codes on the website
--   kitchen    the restaurant's own screen and door scanner
--   team       add people and decide what they can do
-- An empty list means the account can log in nowhere.

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS areas text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.admins.areas IS
  'What this person may do: breakfast, hotel, kitchen, team. Empty = no access.';
COMMENT ON COLUMN public.admins.user_id IS
  'The auth account this login belongs to, when known. Never deleted from here.';

-- Everybody who exists today keeps exactly what they had: the kitchen login
-- its screens, every other row the whole panel.
UPDATE public.admins
   SET areas = CASE WHEN role = 'kitchen' THEN ARRAY['kitchen']
                    ELSE ARRAY['breakfast', 'hotel', 'kitchen', 'team'] END
 WHERE areas = '{}';

UPDATE public.admins a
   SET user_id = u.id
  FROM auth.users u
 WHERE lower(u.email) = lower(a.email) AND a.user_id IS NULL;

ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_areas_known;
ALTER TABLE public.admins ADD CONSTRAINT admins_areas_known
  CHECK (areas <@ ARRAY['breakfast', 'hotel', 'kitchen', 'team']::text[]);

-- Does the signed-in person have this area? SECURITY DEFINER so that the
-- policies on rooms, services and photos can ask even though the staff list
-- itself is no longer readable (below).
CREATE OR REPLACE FUNCTION public.admin_has_area(p_area text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
     WHERE a.email = (auth.jwt() ->> 'email') AND p_area = ANY (a.areas)
  );
$$;
REVOKE ALL ON FUNCTION public.admin_has_area(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_has_area(text) TO authenticated, service_role;

-- Look an auth account up by e-mail, for the team screen. Service role only:
-- it answers "does this person have an account on the site", which is not a
-- question to hand to anybody.
CREATE OR REPLACE FUNCTION public.auth_user_id_by_email(p_email text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.id FROM auth.users u
   WHERE lower(u.email) = lower(p_email)
   ORDER BY u.created_at
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.auth_user_id_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id_by_email(text) TO service_role;

-- The staff list is not public any more. Each person can read their own row
-- (that is all the panel's own checks need); the team screen goes through the
-- service role. Adding and removing people is no longer something any row may
-- do from the browser.
DROP POLICY IF EXISTS "Allow public read access to admins" ON public.admins;
DROP POLICY IF EXISTS "Allow admins to insert admins" ON public.admins;
DROP POLICY IF EXISTS "Allow admins to delete admins" ON public.admins;
DROP POLICY IF EXISTS "Staff read their own row" ON public.admins;
CREATE POLICY "Staff read their own row" ON public.admins
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Editing the website's rooms, extras and their pictures needs the Hotel
-- area, not merely a login. (The kitchen's account could do this before.)
ALTER POLICY "Allow admins to insert rooms" ON public.rooms
  WITH CHECK (public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to update rooms" ON public.rooms
  USING (public.admin_has_area('hotel')) WITH CHECK (public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to delete rooms" ON public.rooms
  USING (public.admin_has_area('hotel'));

ALTER POLICY "Allow admins to insert services" ON public.services
  WITH CHECK (public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to update services" ON public.services
  USING (public.admin_has_area('hotel')) WITH CHECK (public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to delete services" ON public.services
  USING (public.admin_has_area('hotel'));

ALTER POLICY "Allow admins to upload room photos" ON storage.objects
  WITH CHECK (bucket_id = 'room-photos' AND public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to update room photos" ON storage.objects
  USING (bucket_id = 'room-photos' AND public.admin_has_area('hotel'))
  WITH CHECK (bucket_id = 'room-photos' AND public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to delete room photos" ON storage.objects
  USING (bucket_id = 'room-photos' AND public.admin_has_area('hotel'));

ALTER POLICY "Allow admins to upload service images" ON storage.objects
  WITH CHECK (bucket_id = 'services' AND public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to update service images" ON storage.objects
  USING (bucket_id = 'services' AND public.admin_has_area('hotel'))
  WITH CHECK (bucket_id = 'services' AND public.admin_has_area('hotel'));
ALTER POLICY "Allow admins to delete service images" ON storage.objects
  USING (bucket_id = 'services' AND public.admin_has_area('hotel'));
