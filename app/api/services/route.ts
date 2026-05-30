import { NextResponse } from 'next/server';
import { Fetch } from '@/services/Request';
import { bookPendingServices } from '@/services/bookPendingServices';
import { bookingLog } from '@/lib/logger';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { assertReservationAccess } from '@/lib/assertReservationAccess';

// Late-services flow: client calls this after Adyen authorises the dedicated
// services payment. Delegates to `bookPendingServices` so the client and the
// Adyen webhook compete for the SAME `pending_services` row (keyed by
// `reference`, the UUID the client minted before
// payment). Whichever path arrives first takes the two-phase CAS lock; the
// other observes `processing`/`completed` and no-ops. Without this, the
// client's request would self-lock under a `pspReference`-keyed row while
// the webhook locked the UUID-keyed save-pending row — two rows, two books,
// double folio attach. See docs/payments-validation-hardening.md (CharlieM
// audit follow-up #1).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, transactionReference, reference, amountCents } = body;

    bookingLog.info('▶ POST /api/services — late-services request received', {
      reference,
      pspReference: transactionReference,
      reservationId,
      amountCents,
    });

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 }
      );
    }

    if (!transactionReference) {
      return NextResponse.json(
        { error: 'transactionReference is required' },
        { status: 400 }
      );
    }

    if (!reference) {
      // `reference` is the merchant UUID generated client-side and written
      // to pending_services by /api/services/save-pending. Without it the
      // route would self-lock a different row from the webhook and double-
      // book. Hard-reject rather than fall back to a pspReference-keyed
      // lock that breaks the shared-key invariant.
      bookingLog.error('services: missing reference (merchant UUID)', {
        transactionReference,
        reservationId,
      });
      return NextResponse.json(
        { error: 'reference is required' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      bookingLog.error('services: invalid amountCents', {
        reference,
        transactionReference,
        amountCents,
      });
      return NextResponse.json(
        { error: 'amountCents must be a positive integer' },
        { status: 400 }
      );
    }

    const result = await bookPendingServices(reference, transactionReference, amountCents);

    bookingLog.info('◀ POST /api/services — bookPendingServices returned', {
      reference,
      result,
    });

    if (result.notFound) {
      return NextResponse.json(
        { error: 'No pending services found for this reference' },
        { status: 404 }
      );
    }
    if (result.alreadyExists) {
      // Webhook (or a previous client call) already booked. Idempotent OK.
      return NextResponse.json(
        {
          success: true,
          reservationId,
          alreadyProcessed: true,
          message: 'Services already added',
        },
        { status: 200 }
      );
    }
    if (result.alreadyFailed) {
      return NextResponse.json(
        {
          error: 'PreviouslyFailed',
          message: 'A previous attempt for this payment was rolled back. Please contact support.',
        },
        { status: 410 }
      );
    }
    if (result.alreadyProcessing) {
      return NextResponse.json(
        { message: 'Services are being processed by another request' },
        { status: 409 }
      );
    }
    if (result.error) {
      // bookPendingServices already refunded on its error paths. Don't
      // refund again here — that would double-issue a reversal.
      return NextResponse.json(
        {
          error: 'Failed to add services',
          message: result.error,
        },
        { status: 500 }
      );
    }
    if (result.success) {
      const responseBody: Record<string, unknown> = {
        success: true,
        reservationId,
      };
      if (result.degraded) {
        // Apaleo booked + customer charged, but a Supabase status flip
        // failed. Operator alarm already fired inside bookPendingServices;
        // surface it to the client so the success UI can warn the user
        // about reconciliation lag.
        responseBody.degraded = result.degraded;
      }
      return NextResponse.json(responseBody, { status: 200 });
    }

    // Defensive: unreachable if bookPendingServices return type stays
    // exhaustive. If a future variant is added without updating the checks
    // above, surface loudly rather than returning an empty 200.
    bookingLog.error('services: unhandled bookPendingServices outcome', {
      reference,
      transactionReference,
      result,
    });
    return NextResponse.json(
      { error: 'Unknown booking outcome' },
      { status: 500 }
    );
  } catch (error) {
    bookingLog.error('services: unhandled exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add services' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');
    const serviceId = searchParams.get('serviceId');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    // Ownership gate: only the booking's owner (email match) or a user with an
    // explicit reservations link may delete services from this reservation.
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const access = await assertReservationAccess(supabase, user, reservationId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await Fetch(`/booking/v1/reservations/${reservationId}/services?serviceId=${serviceId}`, {
      method: 'DELETE'
    });

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete service' },
      { status: 500 }
    );
  }
}
