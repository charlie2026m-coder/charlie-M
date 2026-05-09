import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';

// In-memory rate limiter: 10 requests per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('externalCode');
    const lastName = searchParams.get('lastName');

    if (!bookingId || !lastName) {
      return NextResponse.json(
        { error: 'bookingId and lastName are required' },
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
  } catch (error) {
    return NextResponse.json(
      { error: 'No booking found with provided details' },
      { status: 404 }
    );
  }
}
