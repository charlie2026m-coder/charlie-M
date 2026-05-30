-- ============================================
-- CMH-CDR (Classic Double Room) — content update
-- Upserts the room row so this works whether or not
-- 20260510000001_add_new_room_types.sql has been applied.
-- ============================================

INSERT INTO public.rooms (
  id,
  group_name,
  attributes,
  max_persons,
  size,
  photos,
  title_en,
  title_de,
  description_en,
  description_de
) VALUES (
  'CMH-CDR',
  'Classic Double Room',
  ARRAY[]::text[],
  2,
  14, -- TODO: confirm actual size in m² before applying
  ARRAY[]::text[],
  'Classic Double Room',
  'Klassisches Doppelzimmer',
  'Designed for comfort and convenience, the room includes a cozy queen-size bed and practical amenities suited for two guests. With a modern shower, smart TV, and complimentary WiFi, you''ll have everything you need for a smooth, stress-free stay. A comfortable starting point for discovering central Berlin.',
  'Für Komfort und Bequemlichkeit gestaltet, verfügt das Zimmer über ein gemütliches Queensize-Bett und praktische Annehmlichkeiten, die für zwei Gäste geeignet sind. Mit einer modernen Dusche, einem Smart-TV und kostenlosem WLAN haben Sie alles, was Sie für einen reibungslosen, stressfreien Aufenthalt benötigen. Ein bequemer Ausgangspunkt, um das Zentrum Berlins zu entdecken.'
)
ON CONFLICT (id) DO UPDATE SET
  group_name      = EXCLUDED.group_name,
  attributes      = EXCLUDED.attributes,
  max_persons     = EXCLUDED.max_persons,
  size            = EXCLUDED.size,
  title_en        = EXCLUDED.title_en,
  title_de        = EXCLUDED.title_de,
  description_en  = EXCLUDED.description_en,
  description_de  = EXCLUDED.description_de,
  updated_at      = NOW();
-- photos intentionally NOT updated on conflict — keeps existing uploads intact.
