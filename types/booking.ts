import { Address, Company } from './apaleo'

export interface Booking {
  booker?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: Address;
    company?: Company;
  },

  consent?: boolean; // GDPR consent flag
  totalAmount?: number; // Total price including rooms, extras and tax
  transactionReference?: string; // Adyen pspReference for transaction tracking

  reservations: {
    arrival: string;
    departure: string;
    adults: number;
    childrenAges?: number[], // optional maybe
    channelCode: "IBE",

    primaryGuest?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address?: Address;
      company?: Company;
    };

    guaranteeType: "Prepayment",
    timeSlices: { ratePlanId: string; }[];

    services: {
      serviceId: string; 
    }[];

    reservationAmount?: number; // Price for this specific reservation
  }[]

}