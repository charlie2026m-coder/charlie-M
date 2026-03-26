import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { reference, booking } = await request.json();

    if (!reference || !booking) {
      return NextResponse.json({ error: 'reference and booking are required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('pending_bookings').upsert(
      {
        reference,
        booking_payload: booking,
        user_id: user?.id || null,
        status: 'pending',
      },
      { onConflict: 'reference' }
    );

    if (error) {
      console.error('[PENDING BOOKING] Failed to save:', error);
      return NextResponse.json({ error: 'Failed to save pending booking' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PENDING BOOKING] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
