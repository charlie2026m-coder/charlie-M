import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    // Fetch reservation by ID only
    let reservation: ApaleoReservationResponse;
    try {
      reservation = await Fetch<ApaleoReservationResponse>(`/booking/v1/reservations/${reservationId}?expand=booker,services`);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Please check the reservation ID' },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!reservation || !reservation.id) {
      return NextResponse.json(
        { error: 'Please check the reservation ID' },
        { status: 404 }
      );
    }

    // Return reservation data directly
    return NextResponse.json(reservation);
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
