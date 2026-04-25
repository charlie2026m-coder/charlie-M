import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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

    // Get current user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if this user already added this reservation
    const { data: existingReservation } = await supabase
      .from('reservations')
      .select('id')
      .eq('user_id', user.id)
      .eq('reservation_id', reservationId)
      .maybeSingle();

    if (existingReservation) {
      return NextResponse.json(
        { error: 'already_added' },
        { status: 409 }
      );
    }

    // Fetch reservation from Apaleo
    let reservation: ApaleoReservationResponse;
    try {
      reservation = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${reservationId}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker,services`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('404') || message.includes('not found')) {
        return NextResponse.json(
          { error: 'Please check the booking ID' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Check if reservation email matches current user's email
    const reservationEmail = reservation.primaryGuest?.email?.toLowerCase() || '';
    const userEmail = user.email?.toLowerCase() || '';
    const emailBelongsToUser = reservationEmail === userEmail && reservationEmail !== '';

    // Get room data for photos
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')
      .order('id', { ascending: true });

    const room = roomsData?.find((r: { id: string }) => r.id === reservation.unitGroup?.id);

    const formattedReservation = {
      ...reservation,
      name: reservation.unitGroup?.name || '',
      images: room?.photos || [],
      guests: reservation.adults,
      emailBelongsToUser,
    };

    return NextResponse.json(formattedReservation);
  } catch (error: unknown) {
    console.error('Error searching reservation:', error);

    const message = error instanceof Error ? error.message : '';
    if (message.includes('404') || message.includes('not found')) {
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
