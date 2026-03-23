// Tax
export const CITY_TAX_RATE = 0.075; // 7.5% city tax on room prices
export const PHONE_NUMBER = "+5 077 6764 8570"
export const EMAIL = "info@charlie-m.de"


export const RATE_PLANS = {
  STANDARD: 'FLEX_WEB',                   // 1 night, refundable
  LONG_STAY2: 'FLEX_WEB2',                // 2 nights, refundable
  LONG_STAY3: 'FLEX_WEB3',                // 3+ nights, refundable
  NON_REFUNDABLE: 'NR_WEB',               // 1 night, non-refundable
  NON_REFUNDABLE_LONG_STAY2: 'NR_WEB2',   // 2 nights, non-refundable
  NON_REFUNDABLE_LONG_STAY3: 'NR_WEB3',   // 3+ nights, non-refundable
}

// Returns the correct rate plan code based on stay length
// Must match rate plan codes configured in the Apaleo dashboard
export const getRatePlanByNights = (nights: number, isRefundable: boolean = true): string => {
  if (isRefundable) {
    if (nights >= 3) return RATE_PLANS.LONG_STAY3;
    if (nights >= 2) return RATE_PLANS.LONG_STAY2;
    return RATE_PLANS.STANDARD;
  }
  if (nights >= 3) return RATE_PLANS.NON_REFUNDABLE_LONG_STAY3;
  if (nights >= 2) return RATE_PLANS.NON_REFUNDABLE_LONG_STAY2;
  return RATE_PLANS.NON_REFUNDABLE;
}
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