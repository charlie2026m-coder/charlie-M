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

// gtag.js is injected asynchronously ONLY after Cookiebot consent resolves,
// which can happen AFTER a tracker component mounts — and after ANY amount of
// time (a first-time visitor can read the banner for minutes). The old
// 40 × 200ms poll silently dropped every mount event once the guest took
// longer than ~8s to accept. Now: immediate check + a CookiebotOnAccept
// listener (the consent handler defines window.gtag synchronously) + a slow
// safety poll (500ms, up to 10 min) as a race net. Returns a cleanup fn.
export function whenGtagReady(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let consentTimer: ReturnType<typeof setTimeout> | undefined;
  let tries = 0;
  const cleanup = () => {
    // done=true here too: a fire() queued by the consent listener must NOT
    // run after the caller's effect cleanup (stale-closure events for
    // screens the guest already left).
    done = true;
    clearTimeout(timer);
    clearTimeout(consentTimer);
    window.removeEventListener('CookiebotOnAccept', onConsent);
    window.removeEventListener('CookiebotOnConsentReady', onConsent);
  };
  const fire = () => {
    if (done) return;
    // Require BOTH the gtag function AND granted statistics consent: the
    // decline path also defines the stub, and firing into its dataLayer
    // would buffer stale events that flush (mis-timed) if the guest later
    // flips consent in the footer settings.
    const consent = (window as unknown as { Cookiebot?: { consent?: { statistics?: boolean } } }).Cookiebot?.consent;
    if (typeof window.gtag === 'function' && consent?.statistics === true) {
      cleanup();
      cb();
    }
  };
  const onConsent = () => { consentTimer = setTimeout(fire, 0); };
  fire();
  if (done) return () => {};
  // Accept covers the click; ConsentReady covers returning visitors whose
  // stored consent resolves without a banner interaction.
  window.addEventListener('CookiebotOnAccept', onConsent);
  window.addEventListener('CookiebotOnConsentReady', onConsent);
  // Short race net only (~30s) — the events above are the primary signal, so
  // ad-blocked/CMP-less sessions no longer churn timers for 10 minutes.
  const tick = () => {
    fire();
    if (!done && tries++ < 60) timer = setTimeout(tick, 500);
  };
  timer = setTimeout(tick, 200);
  return cleanup;
}

// Guest clicked "Book Now" and reached the booking step (/booking/[id]) — the
// GA4 funnel step between view_item and begin_checkout.
export function trackAddToCart({ value, roomName }: { value: number; roomName: string }) {
  window.gtag?.('event', 'add_to_cart', {
    currency: 'EUR',
    value,
    items: [{ item_name: roomName, item_category: 'Hotel Room', price: value }],
  });
}

// Submitted payment details (GA4 standard checkout step — the gap between
// begin_checkout and purchase pinpoints "reached payment but abandoned").
export function trackAddPaymentInfo({ value, roomName }: { value: number; roomName: string }) {
  window.gtag?.('event', 'add_payment_info', {
    currency: 'EUR',
    value,
    items: [{ item_name: roomName, item_category: 'Hotel Room', price: value }],
  });
}

// Payment declined / booking error at the final step — where revenue is lost.
export function trackPaymentFailed({ reason, value, roomName }: { reason: string; value?: number; roomName?: string }) {
  window.gtag?.('event', 'payment_failed', {
    reason,
    ...(value != null && { value, currency: 'EUR' }),
    ...(roomName && { items: [{ item_name: roomName }] }),
  });
}

// A search returned no availability (sold out / min-stay dead-end) — demand we
// could not fulfil, useful for revenue management.
export function trackNoAvailability({ arrival, departure, guests, roomId }: { arrival?: string; departure?: string; guests?: number; roomId?: string }) {
  window.gtag?.('event', 'no_availability', {
    ...(arrival && { arrival }),
    ...(departure && { departure }),
    ...(guests != null && { guests }),
    ...(roomId && { item_id: roomId }),
  });
}

// A sales lead — the group/corporate enquiry form was submitted.
export function trackGenerateLead({ type }: { type: string }) {
  window.gtag?.('event', 'generate_lead', { lead_type: type });
}

// Guest clicked a contact channel (WhatsApp / phone / email) — direct-booking
// or support intent.
export function trackContact({ method }: { method: string }) {
  window.gtag?.('event', 'contact', { method });
}

// Room list viewed / a room card clicked (top-of-funnel e-commerce events).
export function trackViewItemList({ items }: { items: Array<{ item_id: string; item_name: string }> }) {
  window.gtag?.('event', 'view_item_list', { item_list_name: 'Rooms', items });
}
export function trackSelectItem({ roomId, roomName }: { roomId: string; roomName: string }) {
  window.gtag?.('event', 'select_item', { item_list_name: 'Rooms', items: [{ item_id: roomId, item_name: roomName }] });
}

// An extra/service was added in the booking flow (upsell tracking).
export function trackSelectExtra({ name, price }: { name: string; price?: number }) {
  window.gtag?.('event', 'select_extra', { item_name: name, ...(price != null && { price, currency: 'EUR' }) });
}

// Account events (GA4 standard).
export function trackLogin({ method }: { method: string }) {
  window.gtag?.('event', 'login', { method });
}
export function trackSignUp({ method }: { method: string }) {
  window.gtag?.('event', 'sign_up', { method });
}
