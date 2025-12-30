export interface UrlParams {
  from?: string;
  to?: string;
  adults?: string;
  children?: string;
}


//______________________UNITS (ROOMS)
export interface UnitGroup{
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
}
export interface UnitGroupsResponse {
  timeSlices: {
    unitGroups: {
      from: string;
      to: string;
      availableCount: number;
      unitGroup: UnitGroup;
    }[];
  } []
  count: number;
}
export interface Unit {
  id: string;
  name: string;
  description?: string;

  created: string;
  maxPersons: number;
  unitGroup: { id: string; };
  attributes?: UnitAttribute[];
}
export interface UnitsResponse {
  units: Unit[];
  count: number;
}

export interface RoomGroup extends UnitGroup {
  maxPersons: number;
  size: number;
  price: number;
  attributes: string[];
}



//______________________PRICES (PRICE PLANS)
export interface UnitAttribute {
  id: string;
  name: string;
  description: string;
}
export interface ratePlanResponse {
  ratePlans: [{
    id: string;
    code: string;
    unitGroup: { id: string; }
    price: number;
  }]
}
export interface rateResponse { 
  rates: [{
    price: { amount: number; currency: string; };
    from: string;
    to: string;
  }]
}
export interface PricePlan {
  price: number;
  highestPrice?: number;
  totalPrice?: number;
}
export interface RoomPrices {
  bar_web: PricePlan;
  non_ref_web: PricePlan;
  bar_child_web: PricePlan;
  non_ref_child_web: PricePlan;
  long_stay_web: PricePlan;
}


//______________________SINGLE ROOM
export interface SingleRoom extends UnitGroup {
  name: string;
  description: string;
  available: number;
  maxPersons: number;
  attributes: string[];
  size: number;
  currency: string;
  prices: RoomPrices;
  type: string;
}




//_____________________SERVICES (EXTRAS) 
export interface ServiceDetails {
  id: string;
  name: string;
  description?: string;
  pricingUnit: 'Person' | 'Room';
  defaultGrossPrice: {
    amount: number;
    currency: string;
  };
  availability: {
    mode: PricingType;
    daysOfWeek: string[];
  };
}

export interface ServicesPaidDetails {
  service: ServiceDetails;
  dates: any[];
  totalAmount: {
    grossAmount: number;
    currency: string;
  }
}
type PricingType = "Arrival" | "Departure" | "Daily" ;
export interface ServicesResponse {
  services: ServiceDetails[];
  count: number;
}
export interface Service {
  id: string;
  name: string;
  description?: string;
  pricingUnit: 'Person' | 'Room';
  price: number;
  currency: string;
  pricingType: PricingType;
  daysOfWeek: string[];
}

//_____________________BOOKING PAYLOAD
export interface Money {
  amount: number;
  currency: string;
}



export interface VehicleRegistration {
  number: string;
  countryCode: string;
}

export interface Guest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface Booker extends Guest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface PaymentAccount {
  accountNumber: string;
  accountHolder: string;
  expiryMonth: string;
  expiryYear: string;
  paymentMethod: string;
  payerEmail: string;
  payerReference: string;
  isVirtual: boolean;
}

export interface TimeSlice {
  ratePlanId: string;
  totalAmount?: Money;
}

export interface ServiceDate {
  serviceDate: string;
  amount: Money;
}

export interface ReservationService {
  serviceId: string;
  dates?: ServiceDate[];
}

export interface ExternalReferences {
  globalDistributionSystemId?: string;
  onlineTravelAgencyId?: string;
  onlineBookingToolId?: string;
  channelManagerId?: string;
  centralReservationSystemId?: string;
}

export interface Commission {
  commissionAmount: Money;
  beforeCommissionAmount: Money;
}

export interface Reservation {
  attributes?: string[];
  size?: number;
  arrival: string;
  departure: string;
  adults: number;
  childrenAges?: number[];
  guestComment?: string;
  images?: string[];
  channelCode: string;
  primaryGuest: Guest;
  guaranteeType: string;
  travelPurpose?: string;
  timeSlices: TimeSlice[];
  services?: ReservationService[];
  prePaymentAmount?: Money;
  externalReferences?: ExternalReferences;
  companyId?: string;
  commission?: Commission;
}

export interface BookingPayload {
  paymentAccount: PaymentAccount;
  booker: Booker;
  reservations: Reservation[];
  transactionReference: string;
}

//_____________________________RESERVATION RESPONSE
export interface CancellationFee {
  id: string;
  code: string;
  name: string;
  description: string;
  dueDateTime: string;
}

export interface NoShowFee {
  id: string;
  code: string;
  name: string;
  description: string;
  fee: Money;
}

export interface PayableAmount {
  guest: Money;
}

export interface Property {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface RatePlan {
  id: string;
  code: string;
  name: string;
  description: string;
  isSubjectToCityTax: boolean;
}

export interface UnitGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
}

export interface TaxDetail {
  vatType: string;
  vatPercent: number;
  net: Money;
  gross: Money;
}

export interface ApaleoReservationResponse {
  id: string;
  bookingId: string;
  adults: number;
  childrenAges?: number[];
  arrival: string;
  departure: string;
  status: string;
  channelCode: string;
  guaranteeType: string;
  created: string;
  modified: string;
  balance: Money;
  totalGrossAmount: Money;
  payableAmount: PayableAmount;
  cancellationFee: CancellationFee;
  noShowFee: NoShowFee;
  primaryGuest: Guest;
  property: Property;
  ratePlan: RatePlan;
  unitGroup: UnitGroup;
  taxDetails: TaxDetail[];
  hasCityTax: boolean;
  isOpenForCharges: boolean;
  isPreCheckedIn: boolean;
  allFoliosHaveInvoice: boolean;
}

export interface Reservation extends ApaleoReservationResponse {
  name: string;
  image: string;
  guests: number;
}

//_____________________________OFFERS

export interface OffersResponse {
  offers: Offer[];
  property: any;
}
export interface Offer {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

