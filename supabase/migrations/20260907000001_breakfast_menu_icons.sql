-- ============================================
-- BREAKFAST — an icon per menu
--
-- Four pills reading "Continental / Hearty / Vegan / Sweet" make the guest read
-- four words to tell them apart. An icon is recognised before the word is read,
-- and on a phone it is the difference between scanning and squinting.
--
-- A column rather than a lookup in code: the menus are the kitchen's to edit,
-- and a fifth menu should not need a deploy to get a picture. Emoji rather than
-- an image asset for the same reason — it is one keystroke in the admin, needs
-- no upload, no storage bucket and no CDN, and renders on every phone.
-- ============================================

ALTER TABLE public.breakfast_menus
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '';

-- Seeded to match the placeholder menus. Like the rest of that seed, these are
-- a starting point for the kitchen, not a decision.
UPDATE public.breakfast_menus SET icon = '🥐' WHERE code = 'A' AND icon = '';
UPDATE public.breakfast_menus SET icon = '🍳' WHERE code = 'B' AND icon = '';
UPDATE public.breakfast_menus SET icon = '🥑' WHERE code = 'C' AND icon = '';
UPDATE public.breakfast_menus SET icon = '🥞' WHERE code = 'D' AND icon = '';
