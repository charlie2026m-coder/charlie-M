import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { lastNameMatches } from '@/lib/matchLastName';

interface ApaleoBookingNames {
  booker?: { lastName?: string | null };
  reservations?: Array<{ primaryGuest?: { lastName?: string | null } }>;
}

// Every last name Apaleo exposes on a booking (booker + each reservation's
// primary guest) — the payer and the staying guest are often different people.
function bookingLastNames(booking: ApaleoBookingNames | null | undefined): Array<string | null | undefined> {
  const reservationGuests = booking?.reservations?.map((r) => r?.primaryGuest?.lastName) ?? [];
  return [booking?.booker?.lastName, ...reservationGuests];
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (!checkRateLimit('bookings-search', ip)) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('externalCode');
    const lastName = searchParams.get('lastName');

    // Public endpoint by design, but the last name is a required second factor
    // so a booking can't be looked up by guessing only its code.
    if (!bookingId || !lastName) {
      return NextResponse.json(
        { error: 'externalCode and lastName are required' },
        { status: 400 }
      );
    }

    const searchMethods = [
      // Method 1: Search by Booking.com external code. Apaleo's textSearch is
      // FUZZY — it can return a booking whose name merely resembles the input,
      // so the last name MUST be re-verified locally before anything is
      // returned (same trust model as search-booking / search-reservation).
      (async () => {
        const response = await Fetch<{ bookings?: ApaleoBookingNames[] }>(
          `/booking/v1/bookings?externalCode=${encodeURIComponent(bookingId)}&textSearch=${encodeURIComponent(lastName)}&expand=reservations`
        );
        const match = (response.bookings ?? []).find((b: ApaleoBookingNames) =>
          lastNameMatches(lastName, bookingLastNames(b))
        );
        if (match) return match;
        throw new Error('Not found');
      })(),

      // Method 2: Search by Apaleo booking ID directly
      (async () => {
        const booking = await Fetch<ApaleoBookingNames>(
          `/booking/v1/bookings/${encodeURIComponent(bookingId)}?expand=reservations`
        );
        if (lastNameMatches(lastName, bookingLastNames(booking))) {
          return booking;
        }
        throw new Error('LastName mismatch');
      })(),
    ];

    const foundBooking = await Promise.any(searchMethods);

    return NextResponse.json({
      booking: foundBooking,
      count: 1,
    });
  } catch {
    return NextResponse.json(
      { error: 'No booking found with provided details' },
      { status: 404 }
    );
  }
}
