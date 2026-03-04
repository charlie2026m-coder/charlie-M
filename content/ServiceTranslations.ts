export interface ServiceTranslation {
  title: {
    en: string;
    de: string;
  };
  description: {
    en: string;
    de: string;
  };
}

export const SERVICE_IDS = {
  BABY_BED: 'CMH-BAB',
  EARLY_CHECK_IN: 'CMH-ECI',
  LATE_CHECK_OUT: 'CMH-LCO',
  BREAKFAST: 'CMH-BRKF',
  CLEANING: 'CMH-ADCLN',
  PARKING: 'CMH-PRK',
  PETS: 'CMH-PET',
} as const;

export type ServiceId = typeof SERVICE_IDS[keyof typeof SERVICE_IDS];

export const serviceTranslations: Record<string, ServiceTranslation> = {
  [SERVICE_IDS.BABY_BED]: {
    title: {
      en: 'Baby Bed',
      de: 'Babybett'
    },
    description: {
      en: 'Baby bed available for an additional cost. Suitable for babies and toddlers from 0 to 3 years old.',
      de: 'Babybett gegen Aufpreis verfügbar. Geeignet für Babys und Kleinkinder von 0 bis 3 Jahren.'
    }
  },
  [SERVICE_IDS.EARLY_CHECK_IN]: {
    title: {
      en: 'Early Check-In',
      de: 'Früher Check-in'
    },
    description: {
      en: "Check in earlier than the regular time and settle into your room as soon as it's ready. Ideal for guests arriving before noon who want a smooth, relaxed start to their stay in Berlin. It is possible to move in already at 13:00.",
      de: 'Checken Sie früher als zur regulären Uhrzeit ein und beziehen Sie Ihr Zimmer, sobald es bereit ist. Ideal für Gäste, die vor Mittag ankommen und entspannt in ihren Aufenthalt in Berlin starten möchten. Es ist möglich, bereits um 13:00 Uhr einzuziehen.'
    }
  },
  [SERVICE_IDS.LATE_CHECK_OUT]: {
    title: {
      en: 'Late Check-Out',
      de: 'Später Check-out'
    },
    description: {
      en: 'Extend your stay and check out later than the regular time, giving you extra time to relax, pack, or enjoy your morning in Berlin without rush. Late check out is possible until 13:00.',
      de: 'Verlängern Sie Ihren Aufenthalt und checken Sie später als zur regulären Uhrzeit aus – perfekt, um entspannt zu packen oder den Morgen in Berlin ohne Eile zu genießen. Ein Late Check-out ist bis 13:00 Uhr möglich.'
    }
  },
  [SERVICE_IDS.BREAKFAST]: {
    title: {
      en: 'Breakfast',
      de: 'Frühstück'
    },
    description: {
      en: 'Enjoy a fresh and generous breakfast served every morning, featuring a selection of warm dishes, pastries, fresh fruit, and hot drinks. A simple and delicious way to start your day in Berlin.',
      de: 'Genießen Sie jeden Morgen ein frisches und abwechslungsreiches Frühstück mit warmen Speisen, Gebäck, frischem Obst und heißen Getränken. Der perfekte, unkomplizierte Start in Ihren Tag in Berlin'
    }
  },

  [SERVICE_IDS.CLEANING]: {
    title: {
      en: 'Additional room cleaning',
      de: 'Zusätzliche Zimmerreinigung'
    },
    description: {
      en: 'Request an extra cleaning of your room, including fresh towels, a tidy-up, and a reset of essential amenities. A convenient option for guests who prefer an additional refresh during their stay.',
      de: 'Buchen Sie eine zusätzliche Reinigung Ihres Zimmers, einschließlich frischer Handtücher, einer Auffrischung und dem Auffüllen der wichtigsten Annehmlichkeiten. Eine praktische Option für Gäste, die während ihres Aufenthalts eine weitere Reinigung wünschen.'
    }
  },
  [SERVICE_IDS.PARKING]: {
    title: {
      en: 'Parking',
      de: 'Parkplatz'
    },
    description: {
      en: 'Secure on-site parking available for guests who arrive by car. A convenient option that allows you to explore Berlin with ease, knowing your vehicle is safely parked nearby.',
      de: 'Sicherer Parkplatz direkt am Haus für Gäste, die mit dem Auto anreisen. Eine praktische Möglichkeit, Berlin entspannt zu erkunden, während Ihr Fahrzeug in der Nähe sicher abgestellt ist.'
    }
  },
  [SERVICE_IDS.PETS]: {
    title: {
      en: 'Pets',
      de: 'Haustiere'
    },
    description: {
      en: 'Bring your pet along for a comfortable stay in Berlin. We welcome well-behaved animals and provide a clean, cozy space for you and your companion.',
      de: 'Bringen Sie Ihr Haustier für einen angenehmen Aufenthalt in Berlin mit. Wir heißen gut erzogene Tiere willkommen und sorgen für einen sauberen, gemütlichen Raum für Sie und Ihren tierischen Begleiter.'
    }
  },
};
