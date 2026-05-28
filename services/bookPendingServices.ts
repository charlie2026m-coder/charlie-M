import { createClient } from "@supabase/supabase-js"
import { Fetch } from "@/services/Request"
import { bookReservationServicesLegacy } from "@/services/bookReservationServices"
import { reversePayment } from "@/app/actions/adyen/reversePayment"
import { validateServicesPayment } from "@/lib/payments-validation"
import { bookingLog, apaleoLog, priceLog } from "@/lib/logger"

// No user session in the webhook (and the late-services API route runs
// server-side) — both claim the same lock via service_role to bypass RLS.
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Best-effort rollback of services already attached to an Apaleo reservation
// after a partial-success book or a folio-capture failure. Apaleo may refuse
// the delete if the service was already paid via a partial folio capture; we
// log loudly and keep going so the refund still happens. Callers should run
// this BEFORE refundAndMarkFailed so the guest doesn't end up with both
// orphaned folio services and a full Adyen refund.
async function rollbackBookedServices(
  reservationId: string,
  bookedServiceIds: readonly string[],
) {
  for (const serviceId of bookedServiceIds) {
    try {
      await Fetch(
        `/booking/v1/reservations/${reservationId}/services?serviceId=${encodeURIComponent(serviceId)}`,
        { method: 'DELETE' },
      )
      apaleoLog.warn('services: rolled back booked service after partial failure', {
        reservationId,
        serviceId,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // Apaleo returns 404 when the service is already gone (e.g. a retry
      // delivery after we already rolled it back). That's the desired end
      // state — log at info, don't page ops.
      if (/Apaleo API error:\s*404/.test(message)) {
        apaleoLog.info('services: service already absent from folio — idempotent rollback', {
          reservationId,
          serviceId,
        })
        continue
      }
      apaleoLog.error('services: failed to roll back booked service — manual reconciliation required', {
        reservationId,
        serviceId,
        error: message,
      })
    }
  }
}

export async function refundAndMarkFailed(
  supabase: ReturnType<typeof createAdminClient>,
  reference: string,
  pspReference: string,
  reason: string,
) {
  // DB update first so even if the Adyen call fails the row is no longer
  // `pending` and won't be picked up by a retry as a fresh delivery.
  // Supabase JS returns `{ error }` instead of throwing on query failure —
  // check it explicitly so a DB error isn't silently absorbed.
  const { error: updateError } = await supabase
    .from('pending_services')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('transaction_reference', reference)
  if (updateError) {
    bookingLog.error('services: failed to mark pending_services as failed', {
      reference,
      pspReference,
      reason,
      error: updateError.message,
    })
  }

  // reversePayment returns `{ success: false, error }` on Adyen failure
  // (it does NOT throw — see app/actions/adyen/reversePayment.ts). Inspect
  // the result explicitly: warn on success, escalate to error on failure so
  // the operator sees BOTH this log and the MANUAL ACTION log inside
  // reversePayment.ts without a misleading "rolled back" warn in the middle.
  let reversal: Awaited<ReturnType<typeof reversePayment>>
  try {
    reversal = await reversePayment(pspReference, { internalReference: reference })
  } catch (reverseErr: unknown) {
    bookingLog.error('services: reversePayment threw — manual intervention required', {
      reference,
      pspReference,
      reason,
      error: reverseErr instanceof Error ? reverseErr.message : String(reverseErr),
    })
    return
  }
  if (reversal.success) {
    bookingLog.warn('services: flow rolled back', {
      reference,
      pspReference,
      reason,
      status: reversal.status,
    })
  } else {
    bookingLog.error('services: refund FAILED — manual intervention required', {
      reference,
      pspReference,
      reason,
      refundError: reversal.error,
    })
  }
}

/**
 * Single source of truth for booking late-added services to an existing
 * reservation's folio. Called by BOTH the Adyen webhook and the client-driven
 * /api/services route. Both paths share ONE idempotency key — the
 * `pending_services.transaction_reference` CAS lock (pending → processing) —
 * so for a given payment only one path books; the other observes
 * status != 'pending' and no-ops.
 *
 * Reads the services + reservation from the `pending_services` row (server
 * truth) — callers don't supply them, which also prevents a client from
 * booking arbitrary services.
 */
export async function bookPendingServices(
  reference: string,
  pspReference: string,
  amountCents: number,
) {
  const supabase = createAdminClient()

  // 1. Get pending services payload — lookup by transaction_reference per
  // CharlieM schema (see migration 14_pending_services_update.sql).
  const { data: pendingServices, error } = await supabase
    .from('pending_services')
    .select('reservation_id, services_payload, status, updated_at, apaleo_booked_at')
    .eq('transaction_reference', reference)
    .single()

  if (error || !pendingServices) {
    bookingLog.info('services: no pending services found', { reference })
    return { notFound: true }
  }

  if (pendingServices.status === 'completed') {
    bookingLog.info('services: already booked', { reference })
    return { alreadyExists: true }
  }
  if (pendingServices.status === 'failed') {
    bookingLog.info('services: row already failed — skipping', { reference })
    return { alreadyFailed: true }
  }
  if (pendingServices.status === 'processing') {
    // Another concurrent delivery has claimed this row and is mid-flight,
    // OR a previous attempt crashed and left it stuck. We skip without
    // touching it so that whichever delivery (if any) is still executing
    // can finish.
    const updatedAtStr = pendingServices.updated_at
    if (!updatedAtStr) {
      bookingLog.error('services: processing row has null updated_at — manual intervention required', {
        reference,
        pspReference,
        apaleoBookedAt: pendingServices.apaleo_booked_at,
        hint: pendingServices.apaleo_booked_at
          ? 'Apaleo booked, status update failed — flip to completed'
          : 'unknown state — verify Apaleo folio before deciding refund vs flip',
      })
      return { alreadyProcessing: true }
    }
    const ageMs = Date.now() - new Date(updatedAtStr).getTime()
    const STUCK_AFTER_MS = 10 * 60 * 1000
    if (ageMs > STUCK_AFTER_MS) {
      bookingLog.error('services: stuck processing row — manual intervention required', {
        reference,
        pspReference,
        ageMs,
        apaleoBookedAt: pendingServices.apaleo_booked_at,
        hint: pendingServices.apaleo_booked_at
          ? 'Apaleo booked, status update failed — flip to completed'
          : 'crashed before Apaleo — refund and mark failed',
      })
    } else {
      bookingLog.info('services: row processing — duplicate delivery', {
        reference,
        ageMs,
      })
    }
    return { alreadyProcessing: true }
  }

  // Defence in depth: re-run the same amount validator that protects
  // /api/payments/make-payment. A throw here (Apaleo down, supabase blip,
  // unexpected exception) must NOT fall through to the outer caller — that
  // would return [accepted] to Adyen with no refund. Treat any throw as
  // `unavailable` and refund.
  let validation: Awaited<ReturnType<typeof validateServicesPayment>>
  try {
    validation = await validateServicesPayment(reference, amountCents)
  } catch (err: unknown) {
    priceLog.error('services: re-validation threw — refunding', {
      reference,
      pspReference,
      error: err instanceof Error ? err.message : String(err),
    })
    await refundAndMarkFailed(supabase, reference, pspReference, 'validation threw')
    return { error: 'Validation threw — refunded' }
  }

  if (validation.status !== 'valid') {
    priceLog.error('services: amount re-validation failed — refunding', {
      reference,
      pspReference,
      amountCents,
      status: validation.status,
      ...(validation.status === 'mismatch' && {
        expectedCents: validation.expectedCents,
        clientCents: validation.clientCents,
      }),
      ...(validation.status === 'unavailable' && { reason: validation.reason }),
    })
    await refundAndMarkFailed(
      supabase,
      reference,
      pspReference,
      `validation ${validation.status}`,
    )
    return { error: 'Amount validation failed — refunded' }
  }

  // Two-phase atomic lock: pending → processing inside the CAS, then
  // processing → completed only after Apaleo confirms the booking.
  // PostgreSQL serializes row updates, so two concurrent deliveries
  // can't both win: the loser sees affected_rows == 0 and exits cleanly.
  // A crash between the CAS and the Apaleo call leaves the row in
  // 'processing' — visible to ops and a reconciliation script, instead of
  // a misleading 'completed' that implies a successful booking.
  const { data: locked, error: lockError } = await supabase
    .from('pending_services')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('transaction_reference', reference)
    .eq('status', 'pending')
    .select('transaction_reference')

  if (lockError) {
    bookingLog.error('services: lock query failed — aborting to avoid double-charge', {
      reference,
      error: lockError.message,
    })
    await refundAndMarkFailed(supabase, reference, pspReference, 'lock query failed')
    return { error: 'Lock acquisition failed — refunded' }
  }
  if (!locked || locked.length === 0) {
    bookingLog.info('services: row no longer pending — duplicate delivery', { reference })
    return { alreadyExists: true }
  }

  try {
    const bookResult = await bookReservationServicesLegacy(
      pendingServices.reservation_id,
      pendingServices.services_payload,
      pspReference,
    )

    // bookReservationServicesLegacy swallows per-service failures into its
    // result. Inspect result.services and result.payment explicitly and treat
    // any failure as a refund condition. Without this check we would mark the
    // row 'completed' even though no folio was captured.
    // Before issuing the Adyen refund, attempt to roll back any services that
    // DID get booked in this partial-failure run, so the hotel doesn't end up
    // with orphaned folio entries against a fully-refunded auth.
    const bookedServiceIds = bookResult.services
      .filter(s => s.success)
      .map(s => s.serviceId)
    const failedServices = bookResult.services.filter(s => !s.success)
    if (failedServices.length > 0) {
      bookingLog.error('services: bookReservationServicesLegacy returned per-service failures', {
        reservationId: pendingServices.reservation_id,
        failedServices,
        bookedServiceIds,
      })
      await rollbackBookedServices(pendingServices.reservation_id, bookedServiceIds)
      await refundAndMarkFailed(supabase, reference, pspReference, 'per-service booking failures')
      return { error: 'Some services could not be booked — refunded' }
    }
    if (bookResult.payment && !bookResult.payment.success) {
      bookingLog.error('services: folio capture reported failure', {
        reservationId: pendingServices.reservation_id,
        payment: bookResult.payment,
        bookedServiceIds,
      })
      await rollbackBookedServices(pendingServices.reservation_id, bookedServiceIds)
      await refundAndMarkFailed(supabase, reference, pspReference, 'folio capture failed')
      return { error: 'Folio capture failed — refunded' }
    }

    // All services booked and folio captured (or skipped because already
    // covered). Two-phase post-success update so the sentinel is actually
    // reachable:
    //   Phase 1: stamp apaleo_booked_at. If we crash now, reconciliation
    //     sees status='processing' + apaleo_booked_at NOT NULL → Apaleo
    //     definitely booked, customer is correctly billed, just needs the
    //     status flip.
    //   Phase 2: flip status to 'completed'. Failure here leaves the
    //     sentinel set — same diagnosis as above.
    const apaleoBookedAt = new Date().toISOString()
    const { error: stampError } = await supabase
      .from('pending_services')
      .update({ apaleo_booked_at: apaleoBookedAt, updated_at: apaleoBookedAt })
      .eq('transaction_reference', reference)
    if (stampError) {
      bookingLog.error('services: failed to stamp apaleo_booked_at — apaleo booked but sentinel missing', {
        reference,
        pspReference,
        reservationId: pendingServices.reservation_id,
        error: stampError.message,
        manual: 'apaleo IS booked, customer IS charged — flip status to completed manually, do NOT refund',
      })
      return { success: true, degraded: 'sentinel-stamp-failed' as const }
    }

    const { error: completeError } = await supabase
      .from('pending_services')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('transaction_reference', reference)
    if (completeError) {
      bookingLog.error('services: failed to flip status after stamp — sentinel safe', {
        reference,
        pspReference,
        reservationId: pendingServices.reservation_id,
        error: completeError.message,
        manual: 'apaleo IS booked, sentinel IS set — safe to flip status to completed',
      })
      return { success: true, degraded: 'status-flip-failed' as const }
    }
    bookingLog.success('services: booked', { reservationId: pendingServices.reservation_id })
    return { success: true }
  } catch (err) {
    bookingLog.error('services: booking threw', {
      reservationId: pendingServices.reservation_id,
      error: err instanceof Error ? err.message : String(err),
    })
    await refundAndMarkFailed(supabase, reference, pspReference, 'Apaleo services book threw')
    return { error: 'Failed to book services' }
  }
}
