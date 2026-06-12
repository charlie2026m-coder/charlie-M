import { NextResponse } from 'next/server';
import { cancelAndRefundReservation } from '@/services/cancelAndRefundReservation';
import { bookingLog } from '@/lib/logger';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Ownership gate — only the owner may cancel + refund this reservation.
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ownership = await verifyReservationOwnership(supabase, user, id);
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const result = await cancelAndRefundReservation(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      cancelled: result.cancelled,
      alreadyHandled: result.alreadyHandled ?? false,
      refund: result.refund,
    });
  } catch (error) {
    // Log only the message string — a raw error object can carry PII from
    // upstream (e.g. Supabase constraint messages echoing row data).
    bookingLog.error('cancel route unhandled exception', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}
