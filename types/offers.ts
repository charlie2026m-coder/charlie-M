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
  amount: Amount;
  name: string;
  // добавьте другие поля если есть
}

export interface RoomOffer extends Offer {
  code: string;
  id: string;
  name: string;
  description: string;
  attributes: string[];
  size: number;
  price: number;
  currency: string;
  maxPersons: number;
  averagePrice: number;
}