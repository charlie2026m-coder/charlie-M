import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');
    const lastName = searchParams.get('lastName');

    if (!reservationId || !lastName) {
      return NextResponse.json(
        { error: 'Reservation ID and Last Name are required' },
        { status: 400 }
      );
    }
    console.log(reservationId, 'reservationId');
    let reservation: any;
    try {
      reservation = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${reservationId}?expand=booker`
      );
      console.log(reservation, 'reservation');
    } catch (error: any) {
      console.error('Fetch error:', error);
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Please check the booking ID' },
          { status: 404 }
        );
      }
      throw error;
    }



    const searchLastName = lastName.toLowerCase();
    const bookerLastName = reservation.booker?.lastName?.toLowerCase();
    const primaryGuestLastName = reservation.primaryGuest?.lastName?.toLowerCase();

    const lastNameMatches = 
      bookerLastName === searchLastName || 
      primaryGuestLastName === searchLastName;

    if (!lastNameMatches) {
      return NextResponse.json(
        { error: 'No matches found' },
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
        { error: 'Please check the booking ID' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to search reservation' },
      { status: 500 }
    );
  }
}
