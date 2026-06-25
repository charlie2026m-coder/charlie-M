// Google Analytics 4 + Google Ads helpers. Consent is managed by Cookiebot:
// app/_components/CookieConsent/GoogleAnalytics.tsx only injects gtag.js after
// the visitor opts in and keeps Consent Mode v2 in sync, so these helpers simply
// push events to window.gtag (a no-op until consent has loaded gtag).
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const ADS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;

export function trackPageview(url: string) {
  if (!GA_MEASUREMENT_ID) return;
  window.gtag?.('config', GA_MEASUREMENT_ID, { page_path: url });
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

  if (GOOGLE_ADS_ID && ADS_LABEL) {
    window.gtag?.('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${ADS_LABEL}`,
      value,
      currency,
      transaction_id: transactionId,
    });
  }
}
