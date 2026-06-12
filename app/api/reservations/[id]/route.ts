import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getReservationAccessesServer } from '@/services/getReservationAccessesServer';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch the reservation first (does NOT expose the door PIN).
    let reservation: ApaleoReservationResponse;
    try {
      reservation = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${id}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker,services`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('404') || message.includes('not found')) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }
      throw error;
    }

    if (!reservation || reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Ownership gate — must pass BEFORE fetching the door PIN / accesses.
    // Pass an email already known to belong to the reservation so ownership
    // can be confirmed without a second Apaleo round-trip.
    const ownerEmails = [reservation.booker?.email, reservation.primaryGuest?.email];
    const cachedBookerEmail =
      ownerEmails.find(
        (e) => e && e.toLowerCase().trim() === (user.email ?? '').toLowerCase().trim()
      ) ?? reservation.booker?.email ?? reservation.primaryGuest?.email;

    const ownership = await verifyReservationOwnership(supabase, user, id, { cachedBookerEmail });
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const [roomsResult, accesses] = await Promise.all([
      supabase.from('rooms').select('*').order('id', { ascending: true }),
      getReservationAccessesServer(id),
    ]);

    const room = roomsResult.data?.find((r: { id: string }) => r.id === reservation.unitGroup?.id);
    const accessInfo = accesses.find(item => item.reservationId === id);

    const formattedReservation = {
      ...reservation,
      name: reservation.unitGroup?.name || '',
      images: room?.photos || [],
      guests: reservation.adults,
      accesses: accessInfo || undefined,
    };

    return NextResponse.json(formattedReservation);
  } catch (error: unknown) {
    console.error('Error fetching reservation:', error instanceof Error ? error.message : 'unknown');

    const message = error instanceof Error ? error.message : '';
    if (message.includes('404') || message.includes('not found')) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch reservation' },
      { status: 500 }
    );
  }
}
