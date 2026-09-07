-- ============================================
-- BREAKFAST — seed content for testing
--
-- PLACEHOLDER TEXT. Four plausible menus and a calendar that offers all four
-- every morning, so the picker, the sittings and the seat maths can be
-- exercised end to end before the kitchen has written a word. Every string
-- here is meant to be replaced in the admin — none of it was supplied by the
-- hotel, so do not print it, mail it to a guest, or treat an allergen line as
-- authoritative.
--
-- Re-runnable: menus are upserted by code, calendar rows are ON CONFLICT
-- DO NOTHING, so applying this twice changes nothing.
-- ============================================

INSERT INTO public.breakfast_menus
  (code, name_de, name_en, description_de, description_en, items_de, items_en, allergens_de, allergens_en, is_active, sort_order)
VALUES
  ('A',
   'Kontinental', 'Continental',
   'Der Klassiker: Backwaren, Aufschnitt, Käse und Obst.',
   'The classic: bakery, cold cuts, cheese and fruit.',
   E'Brötchen, Croissant und Vollkornbrot\nButter, Konfitüre und Honig\nAufschnitt und Käse\nJoghurt mit Müsli\nObstteller der Saison\nKaffee, Tee, Orangensaft',
   E'Rolls, croissant and wholegrain bread\nButter, jam and honey\nCold cuts and cheese\nYoghurt with muesli\nSeasonal fruit plate\nCoffee, tea, orange juice',
   'Gluten, Milch, Nüsse', 'Gluten, milk, nuts',
   TRUE, 1),

  ('B',
   'Herzhaft', 'Hearty',
   'Warm und sättigend, für einen langen Tag.',
   'Warm and filling, for a long day.',
   E'Rührei oder Spiegelei\nGebratener Speck\nBratkartoffeln\nGegrillte Tomate und Champignons\nBrot nach Wahl\nKaffee, Tee, Orangensaft',
   E'Scrambled or fried eggs\nPan-fried bacon\nRoast potatoes\nGrilled tomato and mushrooms\nBread of your choice\nCoffee, tea, orange juice',
   'Ei, Gluten, Milch', 'Egg, gluten, milk',
   TRUE, 2),

  ('C',
   'Vegan', 'Vegan',
   'Vollständig pflanzlich, ohne Ei und ohne Milch.',
   'Entirely plant-based, no egg and no dairy.',
   E'Sauerteigbrot und Vollkornbrötchen\nAvocado und gegrilltes Gemüse\nHummus und Oliventapenade\nHaferjoghurt mit Beeren\nObstteller der Saison\nKaffee mit Hafermilch, Tee, Orangensaft',
   E'Sourdough bread and wholegrain rolls\nAvocado and grilled vegetables\nHummus and olive tapenade\nOat yoghurt with berries\nSeasonal fruit plate\nCoffee with oat milk, tea, orange juice',
   'Gluten, Sesam', 'Gluten, sesame',
   TRUE, 3),

  ('D',
   'Süß', 'Sweet',
   'Für alle, die morgens lieber süß anfangen.',
   'For anyone who would rather start the day sweet.',
   E'Pancakes mit Ahornsirup\nfranzösischer Toast\nQuark mit Beerenkompott\nSchokoladencroissant\nObstteller der Saison\nKaffee, Tee, Orangensaft',
   E'Pancakes with maple syrup\nFrench toast\nQuark with berry compote\nChocolate croissant\nSeasonal fruit plate\nCoffee, tea, orange juice',
   'Gluten, Ei, Milch', 'Gluten, egg, milk',
   TRUE, 4)
ON CONFLICT (code) DO UPDATE SET
  name_de        = EXCLUDED.name_de,
  name_en        = EXCLUDED.name_en,
  description_de = EXCLUDED.description_de,
  description_en = EXCLUDED.description_en,
  items_de       = EXCLUDED.items_de,
  items_en       = EXCLUDED.items_en,
  allergens_de   = EXCLUDED.allergens_de,
  allergens_en   = EXCLUDED.allergens_en,
  is_active      = EXCLUDED.is_active,
  sort_order     = EXCLUDED.sort_order,
  updated_at     = timezone('utc'::text, now());

-- Calendar: all four menus every morning for a year from today.
--
-- Deliberately permissive rather than clever. A rotation invented here would
-- be guesswork about how the kitchen actually works, and guesswork in seed data
-- has a habit of surviving into production. Restricting a day is one row
-- deleted in the admin; an empty day is a closed day.
INSERT INTO public.breakfast_menu_days (service_date, menu_code)
SELECT d::DATE, m.code
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', INTERVAL '1 day') AS d
CROSS JOIN public.breakfast_menus AS m
WHERE m.is_active
ON CONFLICT (service_date, menu_code) DO NOTHING;
