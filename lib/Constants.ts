// Hotel pricing rule: double-occupancy = single-occupancy + this amount per night
// (gross, includes any taxes). Used as a fallback when Apaleo's adults=2 offer
// query is unavailable for a rate plan.
export const DOUBLE_OCCUPANCY_SURCHARGE_PER_NIGHT = 9;

export const PHONE_NUMBER = "+5 077 6764 8570"
export const WHATSAPP_NUMBER = "+5 077 6764 8570"
export const EMAIL = "info@charlie-m.de"


export const RATE_PLANS = {
  FLEX_WEB: 'FLEX_WEB',    // 1 night, refundable
  FLEX_WEB2: 'FLEX_WEB2',  // 2 nights, refundable
  FLEX_WEB3: 'FLEX_WEB3',  // 3+ nights, refundable
  NR_WEB: 'NR_WEB',        // 1 night, non-refundable
  NR_WEB2: 'NR_WEB2',      // 2 nights, non-refundable
  NR_WEB3: 'NR_WEB3',      // 3+ nights, non-refundable
  // Extension plans — cheaper than the web rates and NOT length-tiered: Apaleo
  // offers a single FLEX_EXTN / NR_EXTN whatever the stay length. Only reached
  // when the guest arrives from "Extend Your Stay" (?extend=1); a normal search
  // must never pick them or the tiered web rates become pointless.
  //
  // NOTE: these plans must exist on the Ibe channel in Apaleo for CMH. Until
  // they do, resolveRatePlan finds no match and falls through to the web rates
  // — the behaviour we have today — so shipping this early is harmless.
  FLEX_EXTN: 'FLEX_EXTN',
  NR_EXTN: 'NR_EXTN',
}

/** True for the plans sold only as a stay extension. */
export const isExtensionRatePlan = (code?: string): boolean =>
  code === RATE_PLANS.FLEX_EXTN || code === RATE_PLANS.NR_EXTN

// Returns the correct refundable rate plan code based on stay length
export const getRatePlanByNights = (nights: number): string => {
  if (nights >= 3) return RATE_PLANS.FLEX_WEB3;
  if (nights >= 2) return RATE_PLANS.FLEX_WEB2;
  return RATE_PLANS.FLEX_WEB;
}

// Returns the correct non-refundable rate plan code based on stay length
export const getNonRefundableRatePlanByNights = (nights: number): string => {
  if (nights >= 3) return RATE_PLANS.NR_WEB3;
  if (nights >= 2) return RATE_PLANS.NR_WEB2;
  return RATE_PLANS.NR_WEB;
}

// Picks the correct rate plan from a list of offers.
// Returns null if no matching plan found — never picks a random room.
//
// `isExtension` switches to the extension plans, which are not length-tiered.
// It falls through to the web rates when Apaleo does not offer one, so a
// missing extension rate degrades to the old behaviour instead of "sold out".
export const resolveRatePlan = <T extends { ratePlan: { code: string } }>(
  rooms: T[],
  nights: number,
  isRefundable: boolean,
  isExtension = false,
): T | null => {
  if (isExtension) {
    const extensionCode = isRefundable ? RATE_PLANS.FLEX_EXTN : RATE_PLANS.NR_EXTN;
    const match = rooms.find(r => r.ratePlan.code === extensionCode);
    if (match) return match;
  }

  const preferred = isRefundable
    ? getRatePlanByNights(nights)
    : getNonRefundableRatePlanByNights(nights);
  const base = isRefundable ? RATE_PLANS.FLEX_WEB : RATE_PLANS.NR_WEB;

  return (
    rooms.find(r => r.ratePlan.code === preferred) ??
    (preferred !== base ? rooms.find(r => r.ratePlan.code === base) ?? null : null)
  );
};
export const DEFAULT_CHECKIN_TIME = "15:00 - 00:00"
export const DEFAULT_CHECKOUT_TIME = "11:00"
// Hotel Information
export const HOTEL_INFO = {
  name: "Charlie M Hotel",
  // Contact
  telephone: PHONE_NUMBER, 
  email: EMAIL,
  
  address: {
    streetAddress: "Friedrichstraße 33", 
    addressLocality: "Berlin",
    addressRegion: "Berlin",
    postalCode: "10969",
    addressCountry: "DE"
  },
  
  geo: {
    latitude: 52.5076,
    longitude: 13.3908
  },
  
  checkinTime: "15:00",
  checkoutTime: "11:00",
  
  numberOfRooms: 125,
  priceRange: "$$",
  starRating: 5,
  
  amenities: [
    "Automated check-in",
    "Automated check-out",
    "Smart door locks",
    "Kettle",
    "Coffee machine",
    "Fresh towels & bed linen",
    "Mini Fridge",
    "Hairdryer",
    "Smart TV",
    "High-speed Wi-Fi",
    "Air Conditioning",
    "Blackout curtains",
    "Self-Service Closet",
    "Elevator",
    "Weekly cleaning (for stays of 7+ nights)",
    "Luggage Storage",
    "Bicycle parking",
    "Community area with co-working space",
    "Virtual concierge \"Charlie\" available 24/7"
  ],
  
  social: {
    facebook: "https://facebook.com/charliem",
    instagram: "https://instagram.com/charliem",
    twitter: "https://twitter.com/charliem"
  }
} as const;

/**
 * Edition of the privacy notice a consent was given against. Written to the
 * `consents` table on registration, booking and account deletion, so a stored
 * consent stays attributable to the exact text the guest saw (Art. 5(2), 7(1)
 * GDPR). It was a hard-coded '1.0' that never moved — including when the whole
 * notice was replaced with the lawyer-reviewed version. Bump this whenever the
 * published text changes; the value is the Stand date of that text.
 */
export const PRIVACY_POLICY_VERSION = '2026-07-24';

