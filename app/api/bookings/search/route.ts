import { NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';

export async function GET(request: Request) {
  try {
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
        console.log(bookingId, 'bookingId');
        const booking = await Fetch<any>(
          `/booking/v1/bookings/${bookingId}?expand=reservations`
        );
        
        console.log(booking, 'booking');
        if (booking.booker?.lastName?.toLowerCase() === lastName.toLowerCase()) {
          return booking;
        }
        throw new Error('LastName mismatch');
      })(),
    ];

    const foundBooking = await Promise.any(searchMethods);
    
    return NextResponse.json({ 
      booking: foundBooking,
      count: 1 
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'No booking found with provided details' },
      { status: 404 }
    );
  }
}
