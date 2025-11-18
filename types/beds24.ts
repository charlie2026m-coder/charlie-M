export interface Beds24PropertyResponse {
  count: number
  pages:{nextPageExists: boolean, nextPageLink: string | null}
  success : boolean, 
  type : string,
  data:{

    id: number;
    name: string;
    city: string;
    country: string;
    address: string;
    postcode: string;
    state: string;
    latitude: number;
    longitude: number;

    email: string;
    mobile: string;
    fax: string;
    phone: string;

    offerType: string;
    propertyType: string;

    checkInStart: string;
    checkInEnd: string;
    checkOutEnd: string;

    account: { ownerId: number };
    bookingQuestions: BookingQuestions;
    bookingRules: {
      allowGuestCancellation: Record<string, any>;
      bookingType: string;
      bookingNearTypeDays: number | null;
      bookingNearType: string;
      bookingExceptionalType: string;
      [key: string]: any;
    };
    cardSettings: {
      cardRequireCVV: boolean;
      cardAcceptAmex: boolean;
      cardAcceptDiners: boolean;
      cardAcceptDiscover: boolean;
      cardAcceptEnroute: boolean;
      [key: string]: any;
    };

    discountVouchers: {
      number: number;
      phrase: string;
      discount: number;
      type: string;
    }[];

    oneTimeVouchers: any[];

    paymentCollection: {
      depositNonPayment: string;
      depositPayment1: {
        fixedAmount: number;
        variableAmount: Record<string, any>;
      };
    };
    paymentGateways: Record<string, {
      type: string;
      [key: string]: any;
    }>;

    featureCodes: string[][];
    groupKeywords: string[];

    templates: Record<string, string>;
    texts: Texts[];

    upsellItems: ExtrasItem[];

    roomTypes: Beds24RoomType[];

    sellPriority: number;
    controlPriority: number;
    roomChargeDisplay: string;

    permit: string;
    bookingPageMultiplier: string;
    web: string;
  }[],
}

export interface BookingQuestions {
  guestTitle: {
    enabled: boolean;
    required: boolean;
  };
  guestFirstName: {
    enabled: boolean;
    required: boolean;
  };
  guestLastName: {
    enabled: boolean;
    required: boolean;
  };
  guestEmail: {
    enabled: boolean;
    required: boolean;
  };
  guestPhone: {
    enabled: boolean;
    required: boolean;
  };
  [key: string]: {
    enabled: boolean;
    required: boolean;
  };
}

export type Availability = Record<string, boolean> 

export interface Beds24RoomType {
  id: string | number;
  propertyId: string | number;
  name: string;
  roomType: string;
  minPrice: number;

  adults: number;
  children: number;
  people: number;

  maxAdult: number;
  maxChildren: number;
  maxPeople: number;
  qty: number;
  roomSize: number;

  featureCodes?: string[];
  hasBalcony?: boolean;
  unitsAvailable?: {
    total: number;
    free: number;
    availability: Record<string | number, Availability>;
  };
  extras?: ExtrasItem[];
}

export interface Beds24PropertyWithRooms {
  propertyId: string | number;
  propertyName?: string;
  roomTypes?: Beds24RoomType[];
  [key: string]: unknown;
}

export interface Beds24PropertiesResponse {
  data?: Beds24PropertyWithRooms[];
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface Beds24AvailabilityResponse {
  success: boolean;
  type: "availability";
  count: number;
  pages: {
    nextPageExists: boolean;
    nextPageLink: string | null;
  };
  data: RoomAvailability[];
}

export interface RoomAvailability {
  roomId: number;
  propertyId: number;
  name: string;
  availability: Record<string, boolean>; 
}

export interface UrlParams {
  from: string | undefined;
  to: string | undefined;
  adults: string | undefined;
  children: string | undefined;
}




export type Texts = Record<string, string>;

export interface ExtrasItem {
  index: number;
  enable: boolean;

  type:
    | "notUsed"
    | "optional"
    | "optionalQty"
    | "optionalPercentage"
    | "obligatory"
    | "obligatoryCleaning"
    | "obligatoryTax"
    | "obligatoryPercentTax"
    | "obligatoryPercent";

  amount: number;

  per: "booking" | "room" | "person" | "adult" | "child";

  period:
    | "oneTime"
    | "daily"
    | "dailyPlusOne"
    | "weekly"
    | "refundable";


  name: string;
}

export interface BookingPayload {
  roomId: number;
  status: 'confirmed' | 'request' | 'new' | 'cancelled' | 'black' | 'inquiry' ;
  arrival: string;      
  departure: string;    
  numAdult: number;
  numChild: number;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: number | string; 
  address: string;
  city: string;
  state: string;
  postcode: string | number;
  country: string;
}