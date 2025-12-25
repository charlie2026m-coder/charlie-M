export interface Booking {
  booker: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  },

  reservations: {
    arrival: string;
    departure: string;
    adults: number;
    childrenAges?: number[], // optional maybe
    channelCode: "Direct",

    primaryGuest: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address: {
        addressLine1: string;
        postalCode: string;
        city: string;
        countryCode: string;
      };
    };

    guaranteeType: "Prepayment" | "CreditCard",
    timeSlices: { ratePlanId: string; }[];

    services: {
      serviceId: string; 
    }[];

    prePaymentAmount: {
      amount: number;
      currency: string;
    };
    transactionReference:string;
  }

}