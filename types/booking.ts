export interface Booking {
  booker?: {
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

    primaryGuest?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };

    guaranteeType: "Prepayment",
    timeSlices: { ratePlanId: string; }[];

    services: {
      serviceId: string; 
    }[];
  }[]

}