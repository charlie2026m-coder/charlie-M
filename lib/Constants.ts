// Tax
export const TAX_RATE = 0;
export const PHONE_NUMBER = "+5 077 6764 8570 "
// Hotel Information
export const HOTEL_INFO = {
  name: "Charlie M Hotel",
  // Contact
  telephone: PHONE_NUMBER, 
  email: "info@charlie-m.de",
  
  address: {
    streetAddress: "Friedrichstraße 33", 
    addressLocality: "Berlin",
    addressRegion: "Berlin",
    postalCode: "10117",
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