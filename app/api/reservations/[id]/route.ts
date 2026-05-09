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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [reservation, roomsResult] = await Promise.all([
      Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${id}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker,services`
      ),
      supabase.from('rooms').select('*').order('id', { ascending: true }),
    ]);

    if (!reservation || reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    const access = await verifyReservationOwnership(supabase, user, id, {
      cachedBookerEmail: reservation.booker?.email,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Guestway only after ownership confirmed
    const accesses = await getReservationAccessesServer(id);

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
    console.error('Error fetching reservation:', error);

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
