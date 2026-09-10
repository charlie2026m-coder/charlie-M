import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership';
import { getSecondGuestQuote } from '@/services/apaleo/addSecondGuest';
import { bookingLog } from '@/lib/logger';

/**
 * Quote for adding a second guest to one's own reservation: may they, and what
 * does it cost. READ-ONLY — this endpoint never changes anything.
 *
 * There is deliberately no POST. The surcharge is paid through the cabinet's
 * normal extras flow (Adyen authorization → webhook → capture → amend), so the
 * guest goes through the same Pay button as any other add-on. An endpoint that
 * applied it directly would have to charge the card itself, and the only card
 * handle we hold for an existing reservation — its Apaleo Payment Account — is
 * a one-shot capture already consumed by the room payment.
 *
 * Owner-gated by verifyReservationOwnership, the same guard the cancel route uses:
 * without it any signed-in user could price a stranger's booking.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const access = await verifyReservationOwnership(supabase, user, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
    }

    return NextResponse.json(await getSecondGuestQuote(id), { headers: NO_STORE });
  } catch (error) {
    bookingLog.error('second-guest quote failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to load' }, { status: 500, headers: NO_STORE });
  }
}
