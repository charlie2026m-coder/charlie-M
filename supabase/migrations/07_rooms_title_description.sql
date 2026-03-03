-- ============================================
-- ROOMS: add title/description (en/de), remove group_name
-- ============================================

-- Add new columns
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS title_de TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_de TEXT;

-- Backfill from RoomTranslations (match by id)
UPDATE public.rooms SET title_en = 'Single Room with Balcony', title_de = 'Einzelzimmer mit Balkon',
  description_en = 'Designed for one guest, the Single Room with Balcony offers a simple and comfortable space to settle in during your time in Berlin. Alongside a modern bathroom and smart TV, the highlight is the private balcony — a small, cozy escape where you can unwind between meetings or sightseeing.',
  description_de = 'Das Einzelzimmer mit Balkon ist für eine Person konzipiert und bietet einen komfortablen und angenehmen Aufenthalt während Ihrer Zeit in Berlin. Neben einem modernen Badezimmer und einem Smart-TV ist der private Balkon das besondere Highlight – ein kleiner, gemütlicher Ort zum Entspannen zwischen Meetings oder Sightseeing.'
WHERE id = 'CMH-SGB';

UPDATE public.rooms SET title_en = 'Standard Room with King Size Bed and Balcony', title_de = 'Standardzimmer mit Kingsize-Bett und Balkon',
  description_en = 'Ideal for two guests, the Standard Room offers a comfortable king-size bed and all essential amenities for an easy stay. With high-speed Wi-Fi and a stylish bathroom, this room combines comfort and a touch of outdoor space.',
  description_de = 'Ideal für zwei Gäste bietet das Standardzimmer ein komfortables Kingsize-Bett sowie alle wesentlichen Annehmlichkeiten für einen angenehmen Aufenthalt. Highspeed-WLAN und ein stilvolles Badezimmer sorgen für zusätzlichen Komfort, während der Balkon dem Zimmer eine besondere Note verleiht.'
WHERE id = 'CMH-STKB';

UPDATE public.rooms SET title_en = 'Standard Room with King Size Bed and Shared Terrace', title_de = 'Standard Zimmer mit Kingsize-Bett und gemeinsamer Terrasse',
  description_en = 'The room offers a welcoming and comfortable space designed for a relaxing stay in the heart of Berlin. It includes a spacious king-size bed, modern furnishings to ensure a pleasant experience. Guests have access to a shared terrace — a charming outdoor area perfect for enjoying a coffee or connecting with fellow travelers',
  description_de = 'Das Zimmer bietet einen einladenden und komfortablen Raum, der für einen erholsamen Aufenthalt im Herzen Berlins gestaltet wurde. Es verfügt über ein großzügiges Kingsize-Bett sowie moderne Möbel, die ein angenehmes Erlebnis gewährleisten. Gästen steht eine gemeinsame Terrasse zur Verfügung – ein charmanter Außenbereich, der sich perfekt eignet, um einen Kaffee zu genießen oder mit anderen Reisenden ins Gespräch zu kommen.'
WHERE id = 'CMH-STKST';

UPDATE public.rooms SET title_en = 'Business Room with Queen Size Bed', title_de = 'Business Zimmer mit Queensize-Bett',
  description_en = 'Designed for comfort and convenience, the room includes a cozy queen-size bed and practical amenities suited for two guests. With a modern shower, smart TV, and complimentary WiFi, you''ll have everything you need for a smooth, stress-free stay. A comfortable starting point for discovering central Berlin.',
  description_de = 'Für Komfort und Bequemlichkeit gestaltet, verfügt das Zimmer über ein gemütliches Queensize-Bett und praktische Annehmlichkeiten, die für zwei Gäste geeignet sind. Mit einer modernen Dusche, einem Smart-TV und kostenlosem WLAN haben Sie alles, was Sie für einen reibungslosen, stressfreien Aufenthalt benötigen. Ein bequemer Ausgangspunkt, um das Zentrum Berlins zu entdecken.'
WHERE id = 'CMH-BUQ';

UPDATE public.rooms SET title_en = 'Business Room with Queen Size Bed and Balcony', title_de = 'Business Zimmer mit Queensize-Bett und Balkon',
  description_en = 'This Room includes all the essentials for a comfortable stay, plus a private balcony for an extra touch of openness. A queen-size bed, modern bathroom, smart TV, and free WiFi make it an easy choice for two guests looking to enjoy Berlin with a bit of outdoor space.',
  description_de = 'Dieses Zimmer umfasst alle wichtigen Elemente für einen komfortablen Aufenthalt und verfügt zudem über einen privaten Balkon für ein zusätzliches Gefühl von Offenheit. Ein Queensize-Bett, ein modernes Badezimmer, ein Smart-TV und kostenloses WLAN machen es zur einfachen Wahl für zwei Gäste, die Berlin mit einem Hauch von Außenbereich genießen möchten.'
WHERE id = 'CMH-BUQB';

UPDATE public.rooms SET title_en = 'Business Room with King Size Bed', title_de = 'Business Zimmer mit Kingsize-Bett',
  description_en = 'Our Business Room is designed for a smooth and restful stay, complete with a king-size bed perfect for two guests. The room includes a modern bathroom, smart TV, and free WiFi, giving you all the essentials for comfort and convenience. A simple, relaxed base for experiencing Berlin at your own pace.',
  description_de = 'Unser Businesszimmer ist für einen reibungslosen und erholsamen Aufenthalt gestaltet und mit einem Kingsize-Bett ausgestattet, das sich perfekt für zwei Gäste eignet. Das Zimmer verfügt über ein modernes Badezimmer, einen Smart-TV und kostenloses WLAN und bietet Ihnen damit alle wichtigen Annehmlichkeiten für Komfort und Bequemlichkeit. Eine einfache, entspannte Basis, um Berlin in Ihrem eigenen Tempo zu erleben.'
WHERE id = 'CMH-BUK';

UPDATE public.rooms SET title_en = 'Business Room with King Size Bed and Terrace', title_de = 'Business Zimmer mit Kingsize-Bett und Terrasse',
  description_en = 'Equipped with a king-size bed and a contemporary bathroom, this room offers everything you need for a comfortable stay in central Berlin. The private terrace adds an inviting outdoor corner where you can enjoy fresh air or take a quiet moment outside. With its calm atmosphere and practical amenities, it offers a smooth and pleasant base for your visit to the city.',
  description_de = 'Ausgestattet mit einem Kingsize-Bett und einem modernen Badezimmer bietet dieses Zimmer alles, was Sie für einen komfortablen Aufenthalt im Zentrum von Berlin benötigen. Die private Terrasse schafft einen einladenden Außenbereich, in dem Sie frische Luft genießen oder einen ruhigen Moment draußen verbringen können. Mit seiner ruhigen Atmosphäre und den praktischen Annehmlichkeiten bietet es eine reibungslose und angenehme Basis für Ihren Besuch in der Stadt.'
WHERE id = 'CMH-BUKT';

UPDATE public.rooms SET title_en = 'Superior Room with King Size Bed', title_de = 'Superior Zimmer mit Kingsize-Bett',
  description_en = 'The Superior Room offers extra space to settle in comfortably, making it perfect for two guests looking for a relaxed stay in central Berlin. A king-size bed, modern bathroom, and practical amenities — including a coffee machine and kettle — create a smooth experience from the moment you arrive. It''s a cozy and practical starting point for experiencing the city however you like.',
  description_de = 'Mit etwas mehr Platz lädt das Superior Zimmer zum entspannten Ankommen und Wohlfühlen ein – ideal für zwei Gäste im Herzen Berlins. Ein komfortables Kingsize-Bett, ein modernes Badezimmer und praktische Extras wie Kaffeemaschine und Wasserkocher schaffen beste Voraussetzungen für einen angenehmen Aufenthalt. Der perfekte Ort, um die Stadt auf Ihre eigene Art zu erleben.'
WHERE id = 'CMH-SPK';

UPDATE public.rooms SET title_en = 'Superior Room with King Size Bed - Garden Wing', title_de = 'Superior Zimmer mit Kingsize-Bett – Gartenflügel',
  description_en = 'This room sits in a quiet garden wing, giving you extra privacy and a calm atmosphere throughout your stay. With a king-size bed and a modern, thoughtfully arranged interior, it''s ideal for two guests seeking comfort and calm. A simple, comfortable choice if you prefer staying slightly apart from the city buzz.',
  description_de = 'Dieses Zimmer befindet sich in einem ruhigen Gartenflügel und bietet während Ihres gesamten Aufenthalts zusätzliche Privatsphäre und eine entspannte Atmosphäre. Mit einem Kingsize-Bett und einem modernen, durchdacht gestalteten Interieur ist es ideal für zwei Gäste, die Komfort und Ruhe suchen. Eine einfache, komfortable Wahl, wenn Sie es bevorzugen, etwas abseits des städtischen Trubels zu wohnen.'
WHERE id = 'CMH-SPKGW';

UPDATE public.rooms SET title_en = 'Superior Room with King Size Bed and Balcony', title_de = 'Superior Zimmer mit Kingsize-Bett und Balkon',
  description_en = 'The Room offers a comfortable amount of space to unwind, complete with a relaxing king-size bed and a modern bathroom. Practical amenities, including a coffee machine and kettle, make it easy to enjoy quiet moments in your room. The private balcony adds an inviting spot to sip your morning coffee or step outside for some fresh air.',
  description_de = 'Das Zimmer bietet ausreichend Platz zum Entspannen und verfügt über ein erholsames Kingsize-Bett sowie ein modernes Badezimmer. Praktische Annehmlichkeiten, darunter eine Kaffeemaschine und ein Wasserkocher, machen es leicht, ruhige Momente im Zimmer zu genießen. Der private Balkon bietet einen einladenden Platz, um Ihren Morgenkaffee zu trinken oder für etwas frische Luft hinauszutreten'
WHERE id = 'CMH-SPKB';

UPDATE public.rooms SET title_en = 'Superior Room with King Size Bed and Shared Terrace', title_de = 'Superior Zimmer mit Kingsize-Bett und gemeinsamer Terrasse',
  description_en = 'In this Superior category, you''ll find a calm, comfortable space with a modern bathroom and practical touches like a coffee machine and kettle. The shared terrace adds a social element — a relaxed outdoor spot to unwind or occasionally meet other travelers. It''s a pleasant, easygoing room choice for anyone wanting a bit of fresh air during their stay in Berlin.',
  description_de = 'In dieser Superior-Kategorie finden Sie einen ruhigen, komfortablen Raum mit einem modernen Badezimmer und praktischen Details wie einer Kaffeemaschine und einem Wasserkocher. Die gemeinsame Terrasse verleiht dem Aufenthalt eine soziale Note – ein entspannter Außenbereich zum Abschalten oder um gelegentlich andere Reisende zu treffen. Es ist eine angenehme, unkomplizierte Zimmerwahl für alle, die während ihres Aufenthalts in Berlin ein wenig frische Luft genießen möchten.'
WHERE id = 'CMH-SPKST';

UPDATE public.rooms SET title_en = 'Superior Room with King Size Bed and Terrace', title_de = 'Superior Zimmer mit Kingsize-Bett und Terrasse',
  description_en = 'Set in a separate building overlooking the garden wing, this Superior room offers a peaceful and modern place to settle into during your stay. Soft, contemporary design and practical amenities — including a coffee machine and kettle — make the space feel warm and welcoming from the moment you arrive. The small private terrace is a special touch, giving you a quiet outdoor corner to enjoy fresh air and a calm break from the city.',
  description_de = 'In einem separaten Gebäude mit Blick auf den Gartenflügel gelegen, bietet dieses Superior Zimmer einen ruhigen und modernen Rückzugsort für Ihren Aufenthalt. Ein sanftes, zeitgemäßes Design und praktische Annehmlichkeiten – darunter eine Kaffeemaschine und ein Wasserkocher – schaffen vom ersten Moment an eine warme und einladende Atmosphäre. Die kleine private Terrasse ist ein besonderes Highlight und bietet Ihnen eine ruhige Außenecke, um frische Luft zu genießen und eine entspannte Pause vom Stadtleben'
WHERE id = 'CMH-SPKT';

-- Set NOT NULL after backfill (for rows that may exist without match, use coalesce)
UPDATE public.rooms SET title_en = COALESCE(title_en, group_name), title_de = COALESCE(title_de, group_name) WHERE title_en IS NULL OR title_de IS NULL;
ALTER TABLE public.rooms ALTER COLUMN title_en SET NOT NULL;
ALTER TABLE public.rooms ALTER COLUMN title_de SET NOT NULL;

-- Drop old column
ALTER TABLE public.rooms DROP COLUMN IF EXISTS group_name;
