-- ============================================
-- ADD NEW ROOM TYPES
-- New unit groups added to Apaleo: CDR, COR, CDRB, SGR, CORB, SRA
-- ============================================

INSERT INTO public.rooms (id, title_en, title_de, description_en, description_de, attributes, max_persons, size, photos)
VALUES
  (
    'CMH-CDR',
    'Classic Double Room',
    'Klassisches Doppelzimmer',
    'A well-proportioned room for two guests, the Classic Double Room provides a comfortable king-size bed, a modern bathroom, smart TV, and free WiFi. Clean, simple, and everything you need for a relaxed stay in the heart of Berlin.',
    'Das Klassische Doppelzimmer bietet zwei Gästen einen angenehmen Aufenthalt mit einem komfortablen Kingsize-Bett, einem modernen Badezimmer, Smart-TV und kostenlosem WLAN. Schlicht, durchdacht und mit allem ausgestattet, was man für einen erholsamen Aufenthalt im Herzen Berlins braucht.',
    ARRAY['king'],
    2,
    14,
    ARRAY[]::text[]
  ),
  (
    'CMH-COR',
    'Comfort Room',
    'Komfortzimmer',
    'The Comfort Room is a step up in space and finish, offering two guests a king-size bed, thoughtful details, and all the essentials for an easy stay. Modern bathroom, smart TV, and free WiFi complete the experience.',
    'Das Komfortzimmer bietet etwas mehr Raum und Ausstattung – mit einem Kingsize-Bett, durchdachten Details und allem Wesentlichen für einen angenehmen Aufenthalt. Modernes Badezimmer, Smart-TV und kostenloses WLAN runden das Erlebnis ab.',
    ARRAY['king'],
    2,
    16,
    ARRAY[]::text[]
  ),
  (
    'CMH-CDRB',
    'Classic Double Room with Balcony',
    'Klassisches Doppelzimmer mit Balkon',
    'All the comfort of the Classic Double Room, plus a private balcony. A nice spot to enjoy a coffee, some fresh Berlin air, or a quiet moment before heading out to explore the city.',
    'Der gesamte Komfort des Klassischen Doppelzimmers, ergänzt durch einen privaten Balkon. Ein schöner Ort für einen Kaffee, frische Berliner Luft oder einen ruhigen Moment, bevor es hinaus in die Stadt geht.',
    ARRAY['balcony', 'king'],
    2,
    15,
    ARRAY[]::text[]
  ),
  (
    'CMH-SGR',
    'Single Room',
    'Einzelzimmer',
    'A compact and well-designed room for solo travellers. Everything you need is here — a comfortable single bed, a modern bathroom, smart TV, and free WiFi. A practical and comfortable base for exploring Berlin.',
    'Ein kompaktes und durchdacht gestaltetes Zimmer für Alleinreisende. Alles, was Sie brauchen, ist vorhanden: ein komfortables Einzelbett, ein modernes Badezimmer, Smart-TV und kostenloses WLAN. Eine praktische und gemütliche Basis zum Erkunden Berlins.',
    ARRAY['single'],
    1,
    10,
    ARRAY[]::text[]
  ),
  (
    'CMH-CORB',
    'Comfort Room with Balcony',
    'Komfortzimmer mit Balkon',
    'The Comfort Room with Balcony adds an outdoor dimension to your stay. Relax on the private balcony after a day in the city, or enjoy your morning coffee with a breath of fresh air. Inside, a king-size bed and modern amenities keep everything easy.',
    'Das Komfortzimmer mit Balkon fügt Ihrem Aufenthalt eine Außendimension hinzu. Entspannen Sie nach einem Tag in der Stadt auf dem privaten Balkon oder genießen Sie Ihren Morgenkaffee an der frischen Luft. Drinnen sorgen ein Kingsize-Bett und moderne Annehmlichkeiten für maximalen Komfort.',
    ARRAY['balcony', 'king'],
    2,
    18,
    ARRAY[]::text[]
  ),
  (
    'CMH-SRA',
    'Superior Room Accessible',
    'Superior Zimmer barrierefrei',
    'The Superior Room Accessible is thoughtfully designed for guests with mobility needs, without compromising on comfort or style. Spacious layout, a king-size bed, adapted bathroom, smart TV, and free WiFi — all in a calm, welcoming environment.',
    'Das Superior Zimmer barrierefrei ist sorgfältig für Gäste mit eingeschränkter Mobilität gestaltet, ohne Abstriche bei Komfort oder Stil. Großzügiger Grundriss, ein Kingsize-Bett, ein barrierefreies Badezimmer, Smart-TV und kostenloses WLAN – alles in einer ruhigen, einladenden Umgebung.',
    ARRAY['king'],
    2,
    22,
    ARRAY[]::text[]
  )
ON CONFLICT (id) DO NOTHING;
