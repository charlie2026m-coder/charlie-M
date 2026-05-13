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
      .single();
    if (!ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = await Fetch(`/booking/v1/reservation-actions/${id}/cancel`, {method: 'PUT' }) ;
    console.log(response, 'cancel response');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}

