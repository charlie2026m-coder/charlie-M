import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

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
      // Method 1: Search by Booking.com external code
      (async () => {
        const response = await Fetch<any>(
          `/booking/v1/bookings?externalCode=${bookingId}&textSearch=${lastName}&expand=reservations`
        );
        if (response.bookings && response.bookings.length > 0) {
          return response.bookings[0];
        }
        throw new Error('Not found');
      })(),

      // Method 2: Search by Apaleo booking ID directly
      (async () => {
        const booking = await Fetch<any>(
          `/booking/v1/bookings/${bookingId}?expand=reservations`
        );
        if (booking.booker?.lastName?.toLowerCase() === lastName.toLowerCase()) {
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
