import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { pendingServicesPayloadSchema } from '@/types/schemas';
import { bookingLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { reference, reservationId, services } = await request.json();

    if (!reference || !reservationId) {
      return NextResponse.json(
        { error: 'reference and reservationId are required' },
        { status: 400 }
      );
    }

    const parsed = pendingServicesPayloadSchema.safeParse(services);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid services payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: ownership, error: ownershipError } = await supabase
      .from('reservations')
      .select('reservation_id')
      .eq('user_id', user.id)
      .eq('reservation_id', reservationId)
      .maybeSingle();

    if (ownershipError) {
      bookingLog.error('save-pending: ownership check failed', {
        code: ownershipError.code,
        message: ownershipError.message,
      });
      return NextResponse.json(
        { error: 'Failed to verify reservation ownership' },
        { status: 500 }
      );
    }
    if (!ownership) {
      // `maybeSingle()` returns null with no error for both "no matching row"
      // and "RLS hid every row" — same 403 either way so the status code
      // doesn't leak reservation existence to non-owners.
      return NextResponse.json(
        { error: 'Reservation not found or not owned by current user' },
        { status: 403 }
      );
    }

    const lockKey = `${reference}-${reservationId}`;

    const { error } = await supabase.from('pending_services').upsert(
      {
        lock_key: lockKey,
        transaction_reference: reference,
        reservation_id: reservationId,
        service_ids: parsed.data.map(s => s.serviceId),
        services_payload: parsed.data,
        user_id: user.id,
        status: 'pending',
        // Explicitly null the sentinel so a stale value from a prior failed
        // attempt under the same lock_key cannot mislead bookPendingServices
        // into thinking Apaleo was already booked.
        apaleo_booked_at: null,
      },
      { onConflict: 'lock_key' }
    );

    if (error) {
      bookingLog.error('save-pending: insert failed', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to save pending services' },
        { status: 500 }
      );
    }

    bookingLog.success('save-pending: services saved', { reference });
    return NextResponse.json({ success: true });
  } catch (error) {
    bookingLog.error('save-pending: unhandled exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
