import { NextRequest, NextResponse } from 'next/server';
import { getReservationById } from '@/services/getReservation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
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

    const access = await verifyReservationOwnership(supabase, user, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

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
