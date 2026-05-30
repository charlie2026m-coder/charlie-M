import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { pendingServicesPayloadSchema } from '@/types/schemas';
import { bookingLog } from '@/lib/logger';
import { assertReservationAccess } from '@/lib/assertReservationAccess';

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

    // Centralized ownership: email match (same trust as the profile listing)
    // OR an explicit `reservations` link (anonymous guests / added bookings).
    const access = await assertReservationAccess(supabase, user, reservationId);
    if (!access.ok) {
      bookingLog.error('save-pending: access denied', {
        reservationId,
        status: access.status,
      });
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { error } = await supabase.from('pending_services').upsert(
      {
        reference,
        reservation_id: reservationId,
        services: parsed.data,
        user_id: user?.id ?? null,
        status: 'pending',
        // Explicitly null the sentinel so a stale value from a prior failed
        // attempt under the same reference cannot mislead bookPendingServices
        // into thinking Apaleo was already booked.
        apaleo_booked_at: null,
      },
      { onConflict: 'reference' }
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
