import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('bookingId');
    const lastName = searchParams.get('lastName');

    if (!id || !lastName) {
      return NextResponse.json(
        { error: 'Booking ID and Last Name are required' },
        { status: 400 }
      );
    }

    // Try all three methods in parallel
    const [reservationResult, bookingResult, externalCodeResult] = await Promise.allSettled([
      // Method 1: Try as Reservation ID
      Fetch<ApaleoReservationResponse>(`/booking/v1/reservations/${id}?expand=booker,services`),
      // Method 2: Try as Booking ID
      Fetch<any>(`/booking/v1/bookings/${id}?expand=reservations,booker`),
      // Method 3: Try as External Code via reservations search
      (async () => {
        const reservations = await Fetch<any>(`/booking/v1/reservations?externalCode=${id}&expand=booker,services`);
        if (reservations.reservations && reservations.reservations.length > 0) {
          return reservations.reservations[0];
        }
        throw new Error('No reservations found');
      })()
    ]);

    let result: any = null;
    let isReservation = false;

    // Check reservation ID result first
    if (reservationResult.status === 'fulfilled' && reservationResult.value?.id) {
      result = reservationResult.value;
      isReservation = true;
    } 
    // If reservation ID failed, check booking ID result
    else if (bookingResult.status === 'fulfilled' && bookingResult.value?.id) {
      result = bookingResult.value;
      isReservation = false;
    }
    // If both failed, check external code result
    else if (externalCodeResult.status === 'fulfilled' && externalCodeResult.value?.id) {
      result = externalCodeResult.value;
      isReservation = true;
    }

    // If both failed, return error
    if (!result || !result.id) {
      return NextResponse.json(
        { error: 'Please check the booking ID' },
        { status: 404 }
      );
    }

    // Check lastName match (priority: booker > guest > primaryGuest)
    const searchLastName = lastName.toLowerCase();
    let lastNameMatches = false;

    if (isReservation) {
      // For reservation: check in priority order
      const bookerLastName = result.booker?.lastName?.toLowerCase();
      const primaryGuestLastName = result.primaryGuest?.lastName?.toLowerCase();
      
      // Check additional guests if available
      const guestLastNames = result.additionalGuests?.map((guest: any) => guest.lastName?.toLowerCase()).filter(Boolean) || [];
      
      lastNameMatches = 
        bookerLastName === searchLastName ||
        guestLastNames.includes(searchLastName) ||
        primaryGuestLastName === searchLastName;
    } else {
      // For booking: check booker first, then reservations' guests
      const bookerLastName = result.booker?.lastName?.toLowerCase();
      
      if (bookerLastName === searchLastName) {
        lastNameMatches = true;
      } else if (result.reservations && result.reservations.length > 0) {
        // Check primaryGuest and additionalGuests in reservations
        for (const reservation of result.reservations) {
          const primaryGuestLastName = reservation.primaryGuest?.lastName?.toLowerCase();
          const guestLastNames = reservation.additionalGuests?.map((guest: any) => guest.lastName?.toLowerCase()).filter(Boolean) || [];
          
          if (primaryGuestLastName === searchLastName || guestLastNames.includes(searchLastName)) {
            lastNameMatches = true;
            break;
          }
        }
      }
    }

    if (!lastNameMatches) {
      return NextResponse.json(
        { error: 'No matches found' },
        { status: 403 }
      );
    }

    // Return what we found: either reservation or booking
    return NextResponse.json({
      type: isReservation ? 'reservation' : 'booking',
      data: result
    });
  } catch (error: any) {
    console.error('Error searching reservation:', error);
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search reservation' },
      { status: 500 }
    );
  }
}
