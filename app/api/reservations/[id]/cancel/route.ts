import { NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      // Fallback: fetch reservation from Apaleo to check booker email
      try {
        const reservation = await Fetch<{ booker?: { email?: string } }>(
          `/booking/v1/reservations/${id}?expand=booker`
        );
        const bookerEmail = reservation?.booker?.email?.toLowerCase();
        const userEmail = user.email?.toLowerCase();
        if (!bookerEmail || !userEmail || bookerEmail !== userEmail) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }
    }

    await Fetch(`/booking/v1/reservation-actions/${id}/cancel`, { method: 'PUT' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}
