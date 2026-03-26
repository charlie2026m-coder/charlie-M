import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { reference, reservationId, services } = await request.json();

    if (!reference || !reservationId || !services) {
      return NextResponse.json(
        { error: 'reference, reservationId and services are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const lockKey = `${reference}-${reservationId}`;

    const { error } = await supabase.from('pending_services').upsert(
      {
        lock_key: lockKey,
        transaction_reference: reference,
        reservation_id: reservationId,
        service_ids: services.map((s: any) => s.serviceId),
        services_payload: services,
        user_id: user?.id || null,
        status: 'pending',
      },
      { onConflict: 'lock_key' }
    );

    if (error) {
      console.error('[PENDING SERVICES] Failed to save:', error);
      return NextResponse.json({ error: 'Failed to save pending services' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PENDING SERVICES] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
