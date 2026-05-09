import { NextRequest, NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { ApaleoReservationResponse } from '@/types/apaleo';
import { getReservationById } from '@/services/getReservation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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

    const { data: ownership } = await supabase
      .from('reservations')
      .select('id')
      .eq('reservation_id', id)
      .eq('user_id', user.id)
      .single();

    if (!ownership) {
      // Fallback: lightweight Apaleo fetch for email check only — Guestway not called yet
      try {
        const apaleoRes = await Fetch<ApaleoReservationResponse>(
          `/booking/v1/reservations/${id}?expand=booker`
        );
        const bookerEmail = apaleoRes?.booker?.email?.toLowerCase();
        const userEmail = user.email?.toLowerCase();
        if (!bookerEmail || !userEmail || bookerEmail !== userEmail) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }
    }

    // Ownership confirmed — fetch full data including Guestway accesses
    const reservation = await getReservationById(id);
    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
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
