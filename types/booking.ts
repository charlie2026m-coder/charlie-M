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
  // Stay extension: the studio the guest is already in. Carried into
  // pending_bookings so the webhook can pin the new reservation to it — the
  // extension is only offered when that exact unit is free.
  preferredUnitId?: string | null;
  totalAmount?: number; // Total price including rooms, extras and tax
  transactionReference?: string; // Adyen pspReference for transaction tracking
  paymentReference?: string; // client merchantReference (UUID) — key into pending_bookings

  reservations: {
    arrival: string;
    departure: string;
    adults: number;
    // Child count for this reservation. Server-only: used by payment validation
    // to price per-person services (e.g. breakfast) the same way the client does
    // (adults + children). Stripped before the Apaleo POST — Apaleo uses childrenAges.
    children?: number;
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

    prepaymentAmount?: {
      amount: number;
      currency: string;
    };

    reservationAmount?: number; // Price for this specific reservation
  }[]

}