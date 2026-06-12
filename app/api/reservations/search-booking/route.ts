import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { lastNameMatches } from '@/lib/matchLastName';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Single neutral "not found" response. Returned for: reservation missing,
// reservation in another property, OR last-name mismatch. Keeping them
// identical means a brute-forcer can't tell a valid ID + wrong name apart
// from a non-existent ID.
const notFound = () =>
  NextResponse.json({ error: 'Please check the reservation ID and last name' }, { status: 404 });

export async function GET(request: NextRequest) {
  try {
    if (!checkRateLimit('search-booking', getClientIp(request))) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId')?.trim();
    const lastName = searchParams.get('lastName')?.trim();

    // Second factor (last name) is now required — knowing the reservation
    // number alone must NOT grant access to the booking (PIN, guest data).
    if (!reservationId || !lastName) {
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
        `/booking/v1/reservations/${encodeURIComponent(reservationId)}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker,services`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('404') || message.includes('not found')) {
        return notFound();
      }
      throw error;
    }

    // Apaleo's single-resource endpoint ignores propertyIds — enforce it so a
    // reservation from the other hotel (shared Apaleo account) can't be opened.
    if (!reservation?.id || reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
      return notFound();
    }

    // SECOND FACTOR: the typed last name must match the guest or the booker
    // (format/diacritic/transliteration tolerant — see lib/matchLastName).
    if (!lastNameMatches(lastName, [reservation.primaryGuest?.lastName, reservation.booker?.lastName])) {
      return notFound();
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
          last_name: reservation.primaryGuest?.lastName || lastName,
          email: reservation.primaryGuest?.email || '',
        },
        { onConflict: 'user_id,reservation_id', ignoreDuplicates: true }
      );

    if (linkError) {
      console.error('Error linking reservation to guest:', linkError.message);
      return NextResponse.json({ error: 'Failed to open reservation' }, { status: 500 });
    }

    const reservationEmail = reservation.primaryGuest?.email?.toLowerCase() ?? '';
    const userEmail = user.email?.toLowerCase() ?? '';
    const emailBelongsToUser = reservationEmail !== '' && reservationEmail === userEmail;

    return NextResponse.json({ ...reservation, emailBelongsToUser });
  } catch (error: unknown) {
    console.error('Error searching reservation:', error);

    const message = error instanceof Error ? error.message : '';
    if (message.includes('404') || message.includes('not found')) {
      return notFound();
    }

    return NextResponse.json({ error: 'Failed to search reservation' }, { status: 500 });
  }
}
