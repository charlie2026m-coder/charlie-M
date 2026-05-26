import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getReservationAccessesServer } from '@/services/getReservationAccessesServer';

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

    const [reservation, roomsResult, accesses] = await Promise.all([
      Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${id}?propertyIds=${process.env.APALEO_PROPERTY_ID}&expand=booker,services`
      ),
      supabase.from('rooms').select('*').order('id', { ascending: true }),
      getReservationAccessesServer(id),
    ]);

    if (!reservation || reservation.property?.id !== process.env.APALEO_PROPERTY_ID) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

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
