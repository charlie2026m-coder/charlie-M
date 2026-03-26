import { Rate } from "./ratePlans";

export interface OfferResponse {
  offers: Offer[];
  property: any;
}

export interface Offer {
  arrival: string; // ISO 8601 datetime
  departure: string; // ISO 8601 datetime
  availableUnits: number;
  isCorporate: boolean;
  minGuaranteeType: string; // "CreditCard" | "PM6Hold" | etc.
  prePaymentAmount: Amount;
  totalGrossAmount: Amount;
  cancellationFee: CancellationFee;
  noShowFee: NoShowFee;
  ratePlan: RatePlan;
  unitGroup: UnitGroup;
  timeSlices: TimeSlice[];
  taxDetails: TaxDetail[];
  cityTaxes: CityTax[];
}

interface CityTax {
  totalGrossAmount: {
    amount: number;
    currency: string;
  };
  dates: {
    amount: {
      grossAmount: number;
      netAmount: number;
      currency: string;
    };
  }[];
}



interface Amount {
  amount: number;
  currency: string; // "EUR" | "USD" | etc.
}

interface CancellationFee {
  code: string;
  name: string;
  description: string;
  dueDateTime: string; // ISO 8601 datetime
  fee: Fee;
}

interface NoShowFee {
  code: string;
  name: string;
  description: string;
  fee: Fee;
}

interface Fee {
  type: string; // "Percentage" | "Fixed"
  value: number;
}

interface RatePlan {
  id: string;
  code: string;
  name: string;
  description: string;
  isSubjectToCityTax: boolean;
}

interface UnitGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  maxPersons: number;
  type: string; // "BedRoom" | "Suite" | etc.
}

interface TimeSlice {
  from: string; // ISO 8601 datetime
  to: string; // ISO 8601 datetime
  availableUnits: number;
  baseAmount: BaseAmount;
  totalGrossAmount: Amount;
}

interface BaseAmount {
  grossAmount: number;
  netAmount: number;
  currency: string;
  vatPercent: number;
  vatType: string; // "Null" | "Normal" | "Reduced"
}

interface TaxDetail {
  vatType: string;
  vatPercent: number;
  net: { amount: number; currency: string };
  tax: { amount: number; currency: string };
}

export interface RoomOffer extends Offer {
  images: string[];
  id: string;
  name: string;
  description: string;
  attributes: string[];
  size: number;
  maxPersons: number;
  price?: number;              // total for 1 guest (all nights, city tax included)
  priceForTwo?: number;        // total for 2 guests (all nights, city tax included)
  oneNightPrice: number;       // price for first night, 1 guest (city tax included)
  oneNightPriceForTwo?: number;
  averagePrice?: number;       // avg per night, 1 guest (city tax included)
  averagePriceForTwo?: number; // avg per night, 2 guests (city tax included)
  taxes?: { vatTax: number; cityTax: number; cityTaxForTwo: number };
}

// Used on the home page — always shows all rooms from Supabase.
// Apaleo pricing is optional: if unavailable, oneNightPrice=0 and isBooked=true.
export interface HomeRoomCard {
  id: string;
  name: string;
  images: string[];
  attributes: string[];
  size: number;
  maxPersons: number;
  unitGroup: { id: string };
  oneNightPrice: number;
  isBooked: boolean;
}

// Simple room type for displaying room cards (without full Apaleo offer data)
export interface SimpleRoom {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  images: string[];
  maxPersons: number;
  attributes: string[];
  size: number;
  price: Rate;
}