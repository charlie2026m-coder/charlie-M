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

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this reservation is already added for this user
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('user_id', user.id)
      .eq('reservation_id', reservationId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'already_added' }, { status: 409 });
    }

    let reservation: ApaleoReservationResponse;
    try {
      reservation = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${reservationId}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker,services`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('404') || message.includes('not found')) {
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

    const reservationEmail = reservation.primaryGuest?.email?.toLowerCase() ?? '';
    const userEmail = user.email?.toLowerCase() ?? '';
    const emailBelongsToUser = reservationEmail !== '' && reservationEmail === userEmail;

    return NextResponse.json({ ...reservation, emailBelongsToUser });
  } catch (error: unknown) {
    console.error('Error searching reservation:', error);

    const message = error instanceof Error ? error.message : '';
    if (message.includes('404') || message.includes('not found')) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to search reservation' },
      { status: 500 }
    );
  }
}
