import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { lastNameMatches } from '@/lib/matchLastName';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Neutral "not found" — same body for missing / wrong-property / name-mismatch
// so the endpoint can't be used to enumerate valid reservation IDs.
const notFound = () =>
  NextResponse.json({ error: 'Please check the booking ID and last name' }, { status: 404 });

export async function GET(request: NextRequest) {
  try {
    if (!checkRateLimit('search-reservation', getClientIp(request))) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId')?.trim();
    const lastName = searchParams.get('lastName')?.trim();

    // Second factor (last name) is required so a reservation can't be added to
    // an account by knowing only its number.
    if (!reservationId || !lastName) {
      return NextResponse.json(
        { error: 'Reservation ID and last name are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Fetch Apaleo reservation and room photos in parallel
    const [reservationResult, roomsResult] = await Promise.allSettled([
      Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${encodeURIComponent(reservationId)}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker,services`
      ),
      supabase.from('rooms').select('*').order('id', { ascending: true }),
    ]);

    if (reservationResult.status === 'rejected') {
      const message = reservationResult.reason instanceof Error ? reservationResult.reason.message : '';
      if (message.includes('404') || message.includes('not found')) {
        return notFound();
      }
      throw reservationResult.reason;
    }

    const reservation = reservationResult.value;

    // Apaleo's single-resource endpoint ignores propertyIds — enforce it so a
    // reservation from the other hotel (shared Apaleo account) can't be added.
    if (reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
      return notFound();
    }

    // SECOND FACTOR: typed last name must match guest or booker (format/
    // diacritic/transliteration tolerant — see lib/matchLastName).
    if (!lastNameMatches(lastName, [reservation.primaryGuest?.lastName, reservation.booker?.lastName])) {
      return notFound();
    }

    // Identity verified — only now check whether it's already linked to this
    // user. Done AFTER the last-name check so a bare ID can't reveal "you
    // already have this booking" without proving the name.
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

    const roomsData = roomsResult.status === 'fulfilled' ? roomsResult.value.data : [];

    const reservationEmail = reservation.primaryGuest?.email?.toLowerCase() || '';
    const userEmail = user.email?.toLowerCase() || '';
    const emailBelongsToUser = reservationEmail === userEmail && reservationEmail !== '';

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
      return notFound();
    }

    return NextResponse.json(
      { error: 'Failed to search reservation' },
      { status: 500 }
    );
  }
}
