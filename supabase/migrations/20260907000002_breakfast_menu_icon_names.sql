-- ============================================
-- BREAKFAST — the icon column now holds a NAME, not an emoji
--
-- 20260907000001 seeded emoji because they need no upload and render anywhere.
-- They also render as a different cartoon on every phone and match nothing else
-- on the site. The column keeps doing its job — the kitchen still changes the
-- picture without a deploy — but it now names a line icon from the same family
-- as the rest of the UI, resolved in app/_components/breakfast/MenuIcon.tsx.
--
-- Valid names are the keys of that map; an unknown one draws a neutral plate
-- rather than nothing, so a typo here is visible but harmless.
--
-- Only the seeded emoji are replaced: anything the kitchen has already set by
-- hand is left alone.
-- ============================================

UPDATE public.breakfast_menus SET icon = 'croissant'  WHERE code = 'A' AND icon IN ('', '🥐');
UPDATE public.breakfast_menus SET icon = 'egg-fried'  WHERE code = 'B' AND icon IN ('', '🍳');
UPDATE public.breakfast_menus SET icon = 'salad'      WHERE code = 'C' AND icon IN ('', '🥑');
UPDATE public.breakfast_menus SET icon = 'cake-slice' WHERE code = 'D' AND icon IN ('', '🥞');
