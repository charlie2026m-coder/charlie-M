const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const ADS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;

const CONSENT_KEY = 'charlie_cookie_consent';

export interface ConsentState {
  analytics: boolean;
  ads: boolean;
}

export function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored ? (JSON.parse(stored) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function applyConsent(consent: ConsentState) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));

  window.gtag?.('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.ads ? 'granted' : 'denied',
    ad_user_data: consent.ads ? 'granted' : 'denied',
    ad_personalization: consent.ads ? 'granted' : 'denied',
  });
}

export function trackPageview(url: string) {
  if (!GA_ID) return;
  window.gtag?.('config', GA_ID, { page_path: url });
}

export function trackSearch({
  arrival,
  departure,
  guests,
}: {
  arrival: string;
  departure: string;
  guests: number;
}) {
  window.gtag?.('event', 'search', {
    travel_destination: 'Berlin',
    check_in_date: arrival,
    check_out_date: departure,
    number_of_travelers: guests,
  });
}

export function trackViewRoom({
  roomId,
  roomName,
  price,
}: {
  roomId: string;
  roomName: string;
  price: number;
}) {
  window.gtag?.('event', 'view_item', {
    items: [
      {
        item_id: roomId,
        item_name: roomName,
        item_category: 'Hotel Room',
        price,
      },
    ],
  });
}

export function trackBeginCheckout({
  value,
  roomName,
}: {
  value: number;
  roomName: string;
}) {
  window.gtag?.('event', 'begin_checkout', {
    currency: 'EUR',
    value,
    items: [{ item_name: roomName, item_category: 'Hotel Room', price: value }],
  });
}

export function trackPurchase({
  transactionId,
  value,
  roomName,
  currency = 'EUR',
  checkinDate,
  checkoutDate,
  numberOfNights,
  numberOfRooms,
  propertyId,
}: {
  transactionId: string;
  value: number;
  roomName: string;
  currency?: string;
  checkinDate: string;
  checkoutDate: string;
  numberOfNights: number;
  numberOfRooms: number;
  propertyId?: string;
}) {
  window.gtag?.('event', 'purchase', {
    transaction_id: transactionId,
    currency,
    value,
    items: [
      {
        item_id: propertyId,
        item_name: roomName,
        item_category: 'Hotel Room',
        price: value,
        quantity: numberOfRooms,
      },
    ],
    check_in_date: checkinDate,
    check_out_date: checkoutDate,
    number_of_nights: numberOfNights,
    number_of_rooms: numberOfRooms,
  });

  if (ADS_ID && ADS_LABEL) {
    window.gtag?.('event', 'conversion', {
      send_to: `${ADS_ID}/${ADS_LABEL}`,
      value,
      currency,
      transaction_id: transactionId,
    });
  }
}
