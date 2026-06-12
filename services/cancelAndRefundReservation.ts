import { createClient } from '@supabase/supabase-js'
import { verifyReservationInProperty } from '@/services/verifyReservationInProperty'
import { cancelReservation } from '@/services/apaleo/cancelReservation'
import { refundCapturedReservationPayment } from '@/services/refundReservationPayment'
import { getReservationFolioPayments, type FolioPayment } from '@/services/getReservationFolioPayments'
import { bookingLog } from '@/lib/logger'
import { bookingStatuses } from '@/types/types'

type RefundStatus = 'requested' | 'completed' | 'failed'

interface RefundOutcome {
  amountCents: number
  currency: string
  status: RefundStatus
  // true when the reservation was cancelled but money was NOT (fully) returned
  // automatically (no payment link, Adyen rejected, partial failure) — staff
  // must act.
  manual?: boolean
}

export type CancelAndRefundResult =
  | { ok: false; status: number; error: string }
  | { ok: true; cancelled: true; alreadyHandled?: boolean; refund: RefundOutcome }

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Cancel a single reservation and refund the guest, paying back EACH captured
 * payment on its own Adyen pspReference.
 *
 * Why per-payment: a reservation can be backed by more than one Adyen payment —
 * the room at booking time (one psp) and any services the guest added later
 * (a separate psp). Apaleo's folio is the source of truth: every payment sits
 * there with its own pspReference and the amount on THIS reservation's folio.
 * Refunding the whole gross against the single room psp (the old behaviour)
 * exceeds what that psp captured once a separate services payment exists, so
 * Adyen rejects the entire refund and the guest is left to a manual process.
 *
 * The cancellation penalty (Apaleo's policy verdict) applies to the ROOM
 * payment only — "the room is the room, breakfast is breakfast": services are
 * a separate purchase and are refunded in full on cancellation.
 *
 * Each Adyen refund is asynchronous — this returns 'requested' and the webhook
 * finalizes the row. Every refund carries reference `${reservationId}::${psp}`
 * so the webhook can attribute each per-psp outcome; the row flips to
 * 'completed' only when the SUM of successful refunds covers the planned
 * amount (a multi-psp refund must not look done after its first psp), and any
 * REFUND_FAILED flips it to 'failed' for manual follow-up. Every reversal is
 * also recorded in payment_reversals by its own psp.
 *
 * Idempotency: a UNIQUE row in reservation_refunds(reservation_id) is the lock.
 */
export async function cancelAndRefundReservation(
  reservationId: string,
): Promise<CancelAndRefundResult> {
  const verified = await verifyReservationInProperty(reservationId)
  if (!verified.ok) {
    return { ok: false, status: verified.status, error: verified.error }
  }
  const reservation = verified.reservation
  const supabase = createAdminClient()

  const currency = reservation.totalGrossAmount?.currency || 'EUR'

  // Already cancelled — possibly through ANOTHER path (staff in Apaleo/Adyen,
  // an older flow without a refund row). The folio still lists the original
  // captures, so auto-refunding here would pay the guest twice. Report what
  // our flow knows; anything else is a manual case. (Review finding #3.)
  if (reservation.status === bookingStatuses.Canceled) {
    const { data: existing } = await supabase
      .from('reservation_refunds')
      .select('amount_cents, currency, status')
      .eq('reservation_id', reservationId)
      .maybeSingle()
    if (existing) {
      bookingLog.info('cancel: reservation already cancelled and handled', {
        reservationId,
        status: existing.status,
      })
      return {
        ok: true,
        cancelled: true,
        alreadyHandled: true,
        refund: {
          amountCents: existing.amount_cents ?? 0,
          currency: existing.currency ?? currency,
          status: (existing.status as RefundStatus) ?? 'requested',
        },
      }
    }
    bookingLog.warn('cancel: reservation already cancelled outside this flow — refund (if any is due) is manual', {
      reservationId,
    })
    return {
      ok: true,
      cancelled: true,
      alreadyHandled: true,
      refund: { amountCents: 0, currency, status: 'failed', manual: true },
    }
  }

  // Apaleo's cancellation-policy verdict: 0 before the free-cancellation
  // deadline, the penalty after, the full amount for non-refundable rates.
  // A missing fee (not a legitimate 0), or a fee in a different currency than
  // the captured total, means we cannot trust the verdict — fall through to
  // manual rather than guess against real money.
  const feeAmount = reservation.cancellationFee?.fee?.amount
  const feeCurrency = reservation.cancellationFee?.fee?.currency
  const feeKnown =
    typeof feeAmount === 'number' && Number.isFinite(feeAmount) && feeCurrency === currency
  const feeCents = feeKnown ? Math.round(feeAmount * 100) : 0

  // The room/booking psp — used to apply the penalty to the room only. One
  // booking row (one pspReference) holds an array of reservation ids.
  const { data: bookingRow } = await supabase
    .from('bookings')
    .select('transaction_reference')
    .contains('reservation_ids', [reservationId])
    .limit(1)
    .maybeSingle()
  const roomPsp: string | null = bookingRow?.transaction_reference ?? null

  // Read what was actually captured, per Adyen psp, from the reservation's
  // folio(s). Read-only — safe before the lock/cancel.
  let folioPayments: FolioPayment[] = []
  let unsettledPayments = 0
  try {
    const folio = await getReservationFolioPayments(reservationId)
    folioPayments = folio.payments
    unsettledPayments = folio.unsettled
  } catch (err) {
    bookingLog.error('cancel: failed to read folio payments — refund will be manual', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // NET captured cents per psp (a psp can appear on more than one folio;
  // refunds already on the folio arrive as negative lines and subtract).
  const capturedByPsp = new Map<string, number>()
  for (const p of folioPayments) {
    capturedByPsp.set(p.pspReference, (capturedByPsp.get(p.pspReference) ?? 0) + p.amountCents)
  }

  // Build the refund plan: penalty off the room psp, services psps in full.
  // Clamped at 0 — a psp whose net is already non-positive gets nothing.
  const plan = [...capturedByPsp.entries()].map(([psp, capturedCents]) => {
    const isRoom = roomPsp != null && psp === roomPsp
    const refundCents = Math.max(0, isRoom ? capturedCents - feeCents : capturedCents)
    return { psp, capturedCents, refundCents, isRoom }
  })
  const totalRefundCents = plan.reduce((sum, p) => sum + p.refundCents, 0)

  // We can auto-refund only when the policy verdict is trustworthy AND we can
  // map the room payment (to charge the penalty against it) AND no payment is
  // still in flight (a Pending capture makes every computed amount a guess).
  // Anything else (OTA/bank-transfer with no card psp, missing booking link,
  // folio read failure) cancels the reservation but routes the refund to
  // manual.
  const canAutoRefund =
    feeKnown &&
    roomPsp != null &&
    capturedByPsp.size > 0 &&
    capturedByPsp.has(roomPsp) &&
    unsettledPayments === 0

  // Acquire the idempotency lock. Initial status 'requested'; refined below.
  const { error: lockError } = await supabase.from('reservation_refunds').insert({
    reservation_id: reservationId,
    psp_reference: roomPsp,
    amount_cents: canAutoRefund ? totalRefundCents : 0,
    currency,
    status: 'requested',
  })

  if (lockError) {
    // 23505 = unique violation → already handled. Return the existing state.
    if (lockError.code === '23505') {
      const { data: existing } = await supabase
        .from('reservation_refunds')
        .select('amount_cents, currency, status')
        .eq('reservation_id', reservationId)
        .maybeSingle()
      bookingLog.info('cancel: reservation already handled', { reservationId, status: existing?.status })
      return {
        ok: true,
        cancelled: true,
        alreadyHandled: true,
        refund: {
          amountCents: existing?.amount_cents ?? totalRefundCents,
          currency: existing?.currency ?? currency,
          status: (existing?.status as RefundStatus) ?? 'requested',
        },
      }
    }
    bookingLog.error('cancel: failed to write refund lock', { reservationId, error: lockError.message })
    return { ok: false, status: 500, error: 'Failed to record cancellation' }
  }

  // Cancel in Apaleo. If this fails, nothing irreversible happened — drop the
  // lock so the guest can retry, and surface the error.
  const cancelResult = await cancelReservation(reservationId)
  if (!cancelResult.success) {
    // The cancel call failed, but it may have actually succeeded before the
    // error surfaced (e.g. a timeout after Apaleo processed it). Re-fetch: if
    // already cancelled, treat as done and fall through to the refund.
    const recheck = await verifyReservationInProperty(reservationId)
    const alreadyCancelled = recheck.ok && recheck.reservation.status === bookingStatuses.Canceled
    if (!alreadyCancelled) {
      if (recheck.ok) {
        await supabase
          .from('reservation_refunds')
          .delete()
          .eq('reservation_id', reservationId)
          .eq('status', 'requested')
        bookingLog.error('cancel: Apaleo cancel failed — lock released, no refund', {
          reservationId,
          error: cancelResult.error,
        })
      } else {
        bookingLog.error('cancel: Apaleo cancel failed and recheck failed — lock kept for manual review', {
          reservationId,
          error: cancelResult.error,
        })
      }
      return { ok: false, status: 502, error: cancelResult.error || 'Failed to cancel reservation' }
    }
    bookingLog.warn('cancel: Apaleo cancel reported failure but reservation is already cancelled — proceeding to refund', {
      reservationId,
    })
  }

  // CAS from the 'requested' lock state — the webhook is the single winner: if a
  // REFUND notification already flipped the row, these writes become no-ops.
  const markRow = async (fields: { status?: RefundStatus; adyen_modification_ref?: string; note?: string }) => {
    const { error } = await supabase
      .from('reservation_refunds')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('reservation_id', reservationId)
      .eq('status', 'requested')
    if (error) {
      bookingLog.error('cancel: failed to update refund row — may need manual reconciliation', {
        reservationId,
        fields,
        error: error.message,
      })
    }
  }

  // Reservation is cancelled. Resolve the refund.

  if (!canAutoRefund) {
    const reason = !feeKnown
      ? 'cancellation fee unavailable'
      : !roomPsp
        ? 'no booking/pspReference link'
        : capturedByPsp.size === 0
          ? 'no captured card payments on folio'
          : !capturedByPsp.has(roomPsp)
            ? 'room payment not found on folio'
            : 'pending (unsettled) payments on folio'
    await markRow({ status: 'failed', note: `${reason} — manual refund review` })
    bookingLog.error('cancel: cancelled but refund needs manual review', { reservationId, reason })
    return { ok: true, cancelled: true, refund: { amountCents: totalRefundCents, currency, status: 'failed', manual: true } }
  }

  if (totalRefundCents <= 0) {
    await markRow({ status: 'completed', note: 'no refundable amount (cancellation fee covers paid total)' })
    bookingLog.info('cancel: nothing to refund', { reservationId })
    return { ok: true, cancelled: true, refund: { amountCents: 0, currency, status: 'completed' } }
  }

  // Refund each payment on its own psp. The penalty is already baked into the
  // room line's refundCents.
  const toRefund = plan.filter((p) => p.refundCents > 0)
  const failures: string[] = []
  let roomModificationRef: string | undefined

  for (const line of toRefund) {
    // Per-psp reference: the webhook attributes each REFUND/REFUND_FAILED to
    // this reservation AND knows which payment it was (review finding #4).
    const result = await refundCapturedReservationPayment(
      line.psp,
      line.refundCents,
      currency,
      `${reservationId}::${line.psp}`
    )
    if (!result.success) {
      failures.push(line.psp)
      bookingLog.error('cancel: refund rejected for a payment', {
        reservationId,
        psp: line.psp,
        isRoom: line.isRoom,
        refundCents: line.refundCents,
        error: result.error,
      })
    } else if (line.isRoom) {
      roomModificationRef = result.modificationRef
    }
  }

  if (failures.length > 0) {
    // At least one payment didn't refund. Accepted refunds still finalize via
    // their own REFUND webhook (recorded in payment_reversals); the 'failed'
    // status flags the reservation for a human to settle the rest.
    await markRow({ status: 'failed', note: `partial refund failure on psp(s): ${failures.join(', ')}` })
    return { ok: true, cancelled: true, refund: { amountCents: totalRefundCents, currency, status: 'failed', manual: true } }
  }

  // All accepted by Adyen — final outcome arrives via the REFUND webhook(s).
  // Record the room modification ref WITHOUT rewriting status (the webhook may
  // already have flipped it).
  await markRow({ adyen_modification_ref: roomModificationRef })
  return { ok: true, cancelled: true, refund: { amountCents: totalRefundCents, currency, status: 'requested' } }
}
