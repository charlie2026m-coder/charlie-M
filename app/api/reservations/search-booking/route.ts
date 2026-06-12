import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const normalize = (v: string | null | undefined): string =>
  v?.toLowerCase().trim() ?? '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');
    const lastName = searchParams.get('lastName');

    // Second factor (last name) is now required — knowing the reservation
    // number alone must NOT grant access to the booking (PIN, guest data).
    if (!reservationId || !lastName || !lastName.trim()) {
      return NextResponse.json(
        { error: 'Reservation ID and last name are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    if (!reservation || !reservation.id || reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
      return NextResponse.json(
        { error: 'Please check the reservation ID' },
        { status: 404 }
      );
    }

    // Verify the last name against the reservation. Return the SAME 404 as a
    // wrong id so the response can't be used as an oracle to confirm a number
    // without the matching name.
    const candidateNames = [
      normalize(reservation.primaryGuest?.lastName),
      normalize(reservation.booker?.lastName),
    ];
    if (!candidateNames.includes(normalize(lastName))) {
      return NextResponse.json(
        { error: 'Please check the reservation ID' },
        { status: 404 }
      );
    }

    // Last name verified — link this reservation to the (possibly anonymous)
    // user so the ownership-gated routes (/[id], /[id]/full, /[id]/cancel)
    // recognise them. Idempotent: re-submitting is a no-op.
    const { error: linkError } = await supabase
      .from('reservations')
      .upsert(
        {
          user_id: user.id,
          reservation_id: reservation.id,
          booking_id: reservation.bookingId || '',
          last_name: reservation.primaryGuest?.lastName || lastName.trim(),
          email: reservation.primaryGuest?.email || '',
        },
        { onConflict: 'user_id,reservation_id', ignoreDuplicates: true }
      );

    if (linkError) {
      console.error('Error linking reservation to guest:', linkError.message);
      return NextResponse.json(
        { error: 'Failed to open reservation' },
        { status: 500 }
      );
    }

    const emailBelongsToUser =
      normalize(reservation.primaryGuest?.email) !== '' &&
      normalize(reservation.primaryGuest?.email) === normalize(user.email);

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
