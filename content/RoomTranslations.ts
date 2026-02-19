export interface RoomTranslation {
  title: {
    en: string;
    de: string;
  };
  description: {
    en: string;
    de: string;
  };
}

export const ROOM_IDS = {
  SINGLE_BALCONY: 'CMH-SGB',
  STANDARD_KING_BALCONY: 'CMH-STKB',
  STANDARD_KING_SHARED_TERRACE: 'CMH-STKST',
  BUSINESS_QUEEN: 'CMH-BUQ',
  BUSINESS_QUEEN_BALCONY: 'CMH-BUQB',
  BUSINESS_KING: 'CMH-BUK',
  BUSINESS_KING_TERRACE: 'CMH-BUKT',
  SUPERIOR_KING: 'CMH-SPK',
  SUPERIOR_KING_GARDEN_WING: 'CMH-SPKGW',
  SUPERIOR_KING_BALCONY: 'CMH-SPKB',
  SUPERIOR_KING_SHARED_TERRACE: 'CMH-SPKST',
  SUPERIOR_KING_TERRACE: 'CMH-SPKT',
} as const;

export type RoomId = typeof ROOM_IDS[keyof typeof ROOM_IDS];

export const roomTranslations: Record<RoomId, RoomTranslation> = {
  [ROOM_IDS.SINGLE_BALCONY]: {
    title: {
      en: 'Single Room with Balcony',
      de: 'Einzelzimmer mit Balkon'
    },
    description: {
      en: 'Designed for one guest, the Single Room with Balcony offers a simple and comfortable space to settle in during your time in Berlin. Alongside a modern bathroom and smart TV, the highlight is the private balcony — a small, cozy escape where you can unwind between meetings or sightseeing.',
      de: 'Das Einzelzimmer mit Balkon ist für eine Person konzipiert und bietet einen komfortablen und angenehmen Aufenthalt während Ihrer Zeit in Berlin. Neben einem modernen Badezimmer und einem Smart-TV ist der private Balkon das besondere Highlight – ein kleiner, gemütlicher Ort zum Entspannen zwischen Meetings oder Sightseeing.'
    }
  },
  [ROOM_IDS.STANDARD_KING_BALCONY]: {
    title: {
      en: 'Standard Room with King Size Bed and Balcony',
      de: 'Standardzimmer mit Kingsize-Bett und Balkon'
    },
    description: {
      en: 'Ideal for two guests, the Standard Room offers a comfortable king-size bed and all essential amenities for an easy stay. With high-speed Wi-Fi and a stylish bathroom, this room combines comfort and a touch of outdoor space.',
      de: 'Ideal für zwei Gäste bietet das Standardzimmer ein komfortables Kingsize-Bett sowie alle wesentlichen Annehmlichkeiten für einen angenehmen Aufenthalt. Highspeed-WLAN und ein stilvolles Badezimmer sorgen für zusätzlichen Komfort, während der Balkon dem Zimmer eine besondere Note verleiht.'
    }
  },
  [ROOM_IDS.STANDARD_KING_SHARED_TERRACE]: {
    title: {
      en: 'Standard Room with King Size Bed and Shared Terrace',
      de: 'Standard Zimmer mit Kingsize-Bett und gemeinsamer Terrasse'
    },
    description: {
      en: 'The room offers a welcoming and comfortable space designed for a relaxing stay in the heart of Berlin. It includes a spacious king-size bed, modern furnishings to ensure a pleasant experience. Guests have access to a shared terrace — a charming outdoor area perfect for enjoying a coffee or connecting with fellow travelers',
      de: 'Das Zimmer bietet einen einladenden und komfortablen Raum, der für einen erholsamen Aufenthalt im Herzen Berlins gestaltet wurde. Es verfügt über ein großzügiges Kingsize-Bett sowie moderne Möbel, die ein angenehmes Erlebnis gewährleisten. Gästen steht eine gemeinsame Terrasse zur Verfügung – ein charmanter Außenbereich, der sich perfekt eignet, um einen Kaffee zu genießen oder mit anderen Reisenden ins Gespräch zu kommen.'
    }
  },
  [ROOM_IDS.BUSINESS_QUEEN]: {
    title: {
      en: 'Business Room with Queen Size Bed',
      de: 'Business Zimmer mit Queensize-Bett'
    },
    description: {
      en: 'Designed for comfort and convenience, the room includes a cozy queen-size bed and practical amenities suited for two guests. With a modern shower, smart TV, and complimentary WiFi, you\'ll have everything you need for a smooth, stress-free stay. A comfortable starting point for discovering central Berlin.',
      de: 'Für Komfort und Bequemlichkeit gestaltet, verfügt das Zimmer über ein gemütliches Queensize-Bett und praktische Annehmlichkeiten, die für zwei Gäste geeignet sind. Mit einer modernen Dusche, einem Smart-TV und kostenlosem WLAN haben Sie alles, was Sie für einen reibungslosen, stressfreien Aufenthalt benötigen. Ein bequemer Ausgangspunkt, um das Zentrum Berlins zu entdecken.'
    }
  },
  [ROOM_IDS.BUSINESS_QUEEN_BALCONY]: {
    title: {
      en: 'Business Room with Queen Size Bed and Balcony',
      de: 'Business Zimmer mit Queensize-Bett und Balkon'
    },
    description: {
      en: 'This Room includes all the essentials for a comfortable stay, plus a private balcony for an extra touch of openness. A queen-size bed, modern bathroom, smart TV, and free WiFi make it an easy choice for two guests looking to enjoy Berlin with a bit of outdoor space.',
      de: 'Dieses Zimmer umfasst alle wichtigen Elemente für einen komfortablen Aufenthalt und verfügt zudem über einen privaten Balkon für ein zusätzliches Gefühl von Offenheit. Ein Queensize-Bett, ein modernes Badezimmer, ein Smart-TV und kostenloses WLAN machen es zur einfachen Wahl für zwei Gäste, die Berlin mit einem Hauch von Außenbereich genießen möchten.'
    }
  },
  [ROOM_IDS.BUSINESS_KING]: {
    title: {
      en: 'Business Room with King Size Bed',
      de: 'Business Zimmer mit Kingsize-Bett'
    },
    description: {
      en: 'Our Business Room is designed for a smooth and restful stay, complete with a king-size bed perfect for two guests. The room includes a modern bathroom, smart TV, and free WiFi, giving you all the essentials for comfort and convenience. A simple, relaxed base for experiencing Berlin at your own pace.',
      de: 'Unser Businesszimmer ist für einen reibungslosen und erholsamen Aufenthalt gestaltet und mit einem Kingsize-Bett ausgestattet, das sich perfekt für zwei Gäste eignet. Das Zimmer verfügt über ein modernes Badezimmer, einen Smart-TV und kostenloses WLAN und bietet Ihnen damit alle wichtigen Annehmlichkeiten für Komfort und Bequemlichkeit. Eine einfache, entspannte Basis, um Berlin in Ihrem eigenen Tempo zu erleben.'
    }
  },
  [ROOM_IDS.BUSINESS_KING_TERRACE]: {
    title: {
      en: 'Business Room with King Size Bed and Terrace',
      de: 'Business Zimmer mit Kingsize-Bett und Terrasse'
    },
    description: {
      en: 'Equipped with a king-size bed and a contemporary bathroom, this room offers everything you need for a comfortable stay in central Berlin. The private terrace adds an inviting outdoor corner where you can enjoy fresh air or take a quiet moment outside. With its calm atmosphere and practical amenities, it offers a smooth and pleasant base for your visit to the city.',
      de: 'Ausgestattet mit einem Kingsize-Bett und einem modernen Badezimmer bietet dieses Zimmer alles, was Sie für einen komfortablen Aufenthalt im Zentrum von Berlin benötigen. Die private Terrasse schafft einen einladenden Außenbereich, in dem Sie frische Luft genießen oder einen ruhigen Moment draußen verbringen können. Mit seiner ruhigen Atmosphäre und den praktischen Annehmlichkeiten bietet es eine reibungslose und angenehme Basis für Ihren Besuch in der Stadt.'
    }
  },
  [ROOM_IDS.SUPERIOR_KING]: {
    title: {
      en: 'Superior Room with King Size Bed',
      de: 'Superior Zimmer mit Kingsize-Bett'
    },
    description: {
      en: 'The Superior Room offers extra space to settle in comfortably, making it perfect for two guests looking for a relaxed stay in central Berlin. A king-size bed, modern bathroom, and practical amenities — including a coffee machine and kettle — create a smooth experience from the moment you arrive. It\'s a cozy and practical starting point for experiencing the city however you like.',
      de: 'Mit etwas mehr Platz lädt das Superior Zimmer zum entspannten Ankommen und Wohlfühlen ein – ideal für zwei Gäste im Herzen Berlins. Ein komfortables Kingsize-Bett, ein modernes Badezimmer und praktische Extras wie Kaffeemaschine und Wasserkocher schaffen beste Voraussetzungen für einen angenehmen Aufenthalt. Der perfekte Ort, um die Stadt auf Ihre eigene Art zu erleben.'
    }
  },
  [ROOM_IDS.SUPERIOR_KING_GARDEN_WING]: {
    title: {
      en: 'Superior Room with King Size Bed - Garden Wing',
      de: 'Superior Zimmer mit Kingsize-Bett – Gartenflügel'
    },
    description: {
      en: 'This room sits in a quiet garden wing, giving you extra privacy and a calm atmosphere throughout your stay. With a king-size bed and a modern, thoughtfully arranged interior, it\'s ideal for two guests seeking comfort and calm. A simple, comfortable choice if you prefer staying slightly apart from the city buzz.',
      de: 'Dieses Zimmer befindet sich in einem ruhigen Gartenflügel und bietet während Ihres gesamten Aufenthalts zusätzliche Privatsphäre und eine entspannte Atmosphäre. Mit einem Kingsize-Bett und einem modernen, durchdacht gestalteten Interieur ist es ideal für zwei Gäste, die Komfort und Ruhe suchen. Eine einfache, komfortable Wahl, wenn Sie es bevorzugen, etwas abseits des städtischen Trubels zu wohnen.'
    }
  },
  [ROOM_IDS.SUPERIOR_KING_BALCONY]: {
    title: {
      en: 'Superior Room with King Size Bed and Balcony',
      de: 'Superior Zimmer mit Kingsize-Bett und Balkon'
    },
    description: {
      en: 'The Room offers a comfortable amount of space to unwind, complete with a relaxing king-size bed and a modern bathroom. Practical amenities, including a coffee machine and kettle, make it easy to enjoy quiet moments in your room. The private balcony adds an inviting spot to sip your morning coffee or step outside for some fresh air.',
      de: 'Das Zimmer bietet ausreichend Platz zum Entspannen und verfügt über ein erholsames Kingsize-Bett sowie ein modernes Badezimmer. Praktische Annehmlichkeiten, darunter eine Kaffeemaschine und ein Wasserkocher, machen es leicht, ruhige Momente im Zimmer zu genießen. Der private Balkon bietet einen einladenden Platz, um Ihren Morgenkaffee zu trinken oder für etwas frische Luft hinauszutreten'
    }
  },
  [ROOM_IDS.SUPERIOR_KING_SHARED_TERRACE]: {
    title: {
      en: 'Superior Room with King Size Bed and Shared Terrace',
      de: 'Superior Zimmer mit Kingsize-Bett und gemeinsamer Terrasse'
    },
    description: {
      en: 'In this Superior category, you\'ll find a calm, comfortable space with a modern bathroom and practical touches like a coffee machine and kettle. The shared terrace adds a social element — a relaxed outdoor spot to unwind or occasionally meet other travelers. It\'s a pleasant, easygoing room choice for anyone wanting a bit of fresh air during their stay in Berlin.',
      de: 'In dieser Superior-Kategorie finden Sie einen ruhigen, komfortablen Raum mit einem modernen Badezimmer und praktischen Details wie einer Kaffeemaschine und einem Wasserkocher. Die gemeinsame Terrasse verleiht dem Aufenthalt eine soziale Note – ein entspannter Außenbereich zum Abschalten oder um gelegentlich andere Reisende zu treffen. Es ist eine angenehme, unkomplizierte Zimmerwahl für alle, die während ihres Aufenthalts in Berlin ein wenig frische Luft genießen möchten.'
    }
  },
  [ROOM_IDS.SUPERIOR_KING_TERRACE]: {
    title: {
      en: 'Superior Room with King Size Bed and Terrace',
      de: 'Superior Zimmer mit Kingsize-Bett und Terrasse'
    },
    description: {
      en: 'Set in a separate building overlooking the garden wing, this Superior room offers a peaceful and modern place to settle into during your stay. Soft, contemporary design and practical amenities — including a coffee machine and kettle — make the space feel warm and welcoming from the moment you arrive. The small private terrace is a special touch, giving you a quiet outdoor corner to enjoy fresh air and a calm break from the city.',
      de: 'In einem separaten Gebäude mit Blick auf den Gartenflügel gelegen, bietet dieses Superior Zimmer einen ruhigen und modernen Rückzugsort für Ihren Aufenthalt. Ein sanftes, zeitgemäßes Design und praktische Annehmlichkeiten – darunter eine Kaffeemaschine und ein Wasserkocher – schaffen vom ersten Moment an eine warme und einladende Atmosphäre. Die kleine private Terrasse ist ein besonderes Highlight und bietet Ihnen eine ruhige Außenecke, um frische Luft zu genießen und eine entspannte Pause vom Stadtleben'
    }
  }
};
