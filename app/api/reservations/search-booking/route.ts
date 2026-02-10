import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const lastName = searchParams.get('lastName');

    if (!bookingId || !lastName) {
      return NextResponse.json(
        { error: 'Booking ID and Last Name are required' },
        { status: 400 }
      );
    }

    const searchResponse = await fetch(`${request.nextUrl.origin}/api/bookings/search?externalCode=${bookingId}&lastName=${lastName}`);
    
    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.booking?.reservations || searchData.booking.reservations.length === 0) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const reservationId = searchData.booking.reservations[0].id;
    const reservation = await Fetch<ApaleoReservationResponse>(
      `/booking/v1/reservations/${reservationId}?expand=services`
    );

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    if (reservation.primaryGuest?.lastName?.toLowerCase() !== lastName.toLowerCase()) {
      return NextResponse.json(
        { error: 'Last name does not match' },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')
      .order('id', { ascending: true });

    const room = roomsData?.find((r: any) => r.id === reservation.unitGroup?.id);

    const formattedReservation = {
      ...reservation,
      name: reservation.unitGroup?.name || '',
      images: room?.photos || [],
      guests: reservation.adults,
    };

    return NextResponse.json(formattedReservation);
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
