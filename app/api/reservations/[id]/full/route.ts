import { NextRequest, NextResponse } from 'next/server';
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
      .single();
    if (!ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reservation = await getReservationById(id);
    console.log(reservation, 'reservation');
    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error('Error fetching reservation:', error);
    
    // Check if it's a 404 from Apaleo
    if (error.message?.includes('404') || error.message?.includes('not found')) {
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
