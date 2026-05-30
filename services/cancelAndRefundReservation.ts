import { createClient } from '@supabase/supabase-js'
import { verifyReservationInProperty } from '@/services/verifyReservationInProperty'
import { cancelReservation } from '@/services/apaleo/cancelReservation'
import { refundCapturedReservationPayment } from '@/services/refundReservationPayment'
import { bookingLog } from '@/lib/logger'
import { bookingStatuses } from '@/types/types'

type RefundStatus = 'requested' | 'completed' | 'failed'

interface RefundOutcome {
  amountCents: number
  currency: string
  status: RefundStatus
  // true when the reservation was cancelled but money was NOT returned
  // automatically (no payment link, or Adyen rejected) — staff must act.
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
 * Cancel a single reservation and refund the guest the amount Apaleo says is
 * owed back. Apaleo is the source of truth for the refundable amount (its
 * cancellation-policy verdict via reservation.cancellationFee.fee); Adyen is
 * the executor (partial refund of the captured payment). The Adyen refund is
 * asynchronous — this returns 'requested' and the webhook finalizes the row.
 *
 * Idempotency: a UNIQUE row in reservation_refunds(reservation_id) is the
 * lock. The row is inserted before the Apaleo cancel; if the cancel itself
 * fails (nothing irreversible happened), the lock is removed so the guest can
 * retry. A second concurrent/duplicate call hits the lock and returns the
 * existing outcome instead of cancelling twice.
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

  // Refundable amount = what was captured on the card minus the cancellation
  // penalty Apaleo's policy applies as of now.
  //
  // What was captured = the prepayment at booking = room + extras gross, which
  // is exactly reservation.totalGrossAmount. City tax is intentionally NOT
  // charged through Adyen (it is added manually / settled at the hotel, not
  // part of the prepayment), so it must never enter the card refund.
  // reservation.balance reflects that unpaid city tax, NOT the card payment —
  // it is deliberately unused here. Adyen also rejects any refund above the
  // captured amount, so it is the final backstop against over-refund.
  const currency = reservation.totalGrossAmount?.currency || 'EUR'
  const capturedAmount = reservation.totalGrossAmount?.amount ?? 0
  // Apaleo's policy verdict: 0 before the free-cancellation deadline, the
  // penalty after, the full amount for non-refundable rates.
  const feeAmount = reservation.cancellationFee?.fee?.amount
  const feeCurrency = reservation.cancellationFee?.fee?.currency

  // A missing fee (not the legitimate 0), or a fee in a different currency than
  // the captured total, means we cannot trust the policy verdict — do not guess
  // a refund amount against real money; fall through to manual review.
  const feeKnown =
    typeof feeAmount === 'number' && Number.isFinite(feeAmount) && feeCurrency === currency
  // Convert each side to integer cents BEFORE subtracting. Subtracting two
  // IEEE-754 euro floats first can land on an off-by-one-cent result.
  const refundCents = feeKnown
    ? Math.max(0, Math.round(capturedAmount * 100) - Math.round(feeAmount * 100))
    : 0

  // Link the reservation to its Adyen payment. One booking row (one
  // pspReference) holds an array of reservation ids.
  const { data: bookingRow } = await supabase
    .from('bookings')
    .select('transaction_reference')
    .contains('reservation_ids', [reservationId])
    .limit(1)
    .maybeSingle()
  const pspReference: string | null = bookingRow?.transaction_reference ?? null

  // Acquire the idempotency lock. Initial status 'requested'; refined below.
  const { error: lockError } = await supabase.from('reservation_refunds').insert({
    reservation_id: reservationId,
    psp_reference: pspReference,
    amount_cents: refundCents,
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
          amountCents: existing?.amount_cents ?? refundCents,
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
    // the reservation is already cancelled, treat it as done and fall through
    // to the refund. Otherwise a transient failure would strand the guest's
    // money: lock deleted → retry re-cancels an already-cancelled reservation
    // → Apaleo 422 forever → refund never issued.
    const recheck = await verifyReservationInProperty(reservationId)
    const alreadyCancelled = recheck.ok && recheck.reservation.status === bookingStatuses.Canceled
    if (!alreadyCancelled) {
      if (recheck.ok) {
        // Recheck succeeded and the reservation is NOT cancelled — the cancel
        // genuinely did nothing. Release the lock so the guest can retry.
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
        // Recheck itself failed — state is unknown. Do NOT delete the lock: the
        // cancel may actually have succeeded, and dropping it could strand the
        // guest's money with no record. Keep the 'requested' row as a durable
        // signal for manual reconciliation; idempotency blocks a blind re-cancel.
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

  // All transitions are CAS from the 'requested' lock state. The guard makes
  // the webhook the single winner: if a REFUND notification already flipped the
  // row to completed/failed, these writes become no-ops instead of clobbering it.
  const markRow = async (fields: { status?: RefundStatus; adyen_modification_ref?: string; note?: string }) => {
    const { error } = await supabase
      .from('reservation_refunds')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('reservation_id', reservationId)
      .eq('status', 'requested')
    if (error) {
      // The row update is the only audit trail for manual-action cases (note +
      // status). If it fails, surface it loudly rather than leaving the row
      // silently stuck in 'requested'.
      bookingLog.error('cancel: failed to update refund row — may need manual reconciliation', {
        reservationId,
        fields,
        error: error.message,
      })
    }
  }

  // Reservation is cancelled. Resolve the refund.
  if (!feeKnown) {
    await markRow({ status: 'failed', note: 'cancellation fee unavailable — manual refund review' })
    bookingLog.error('cancel: fee unknown — cancelled but refund needs manual review', { reservationId })
    return { ok: true, cancelled: true, refund: { amountCents: 0, currency, status: 'failed', manual: true } }
  }

  if (refundCents <= 0) {
    await markRow({ status: 'completed', note: 'no refundable amount (cancellation fee covers paid total)' })
    bookingLog.info('cancel: nothing to refund', { reservationId })
    return { ok: true, cancelled: true, refund: { amountCents: 0, currency, status: 'completed' } }
  }

  if (!pspReference) {
    await markRow({ status: 'failed', note: 'no booking/pspReference link — manual refund required' })
    bookingLog.error('cancel: no pspReference — cancelled but refund needs manual action', { reservationId, refundCents })
    return { ok: true, cancelled: true, refund: { amountCents: refundCents, currency, status: 'failed', manual: true } }
  }

  const refund = await refundCapturedReservationPayment(pspReference, refundCents, currency, reservationId)
  if (!refund.success) {
    await markRow({ status: 'failed', note: `Adyen refund rejected: ${refund.error ?? 'unknown'}` })
    return { ok: true, cancelled: true, refund: { amountCents: refundCents, currency, status: 'failed', manual: true } }
  }

  // Accepted by Adyen — final outcome arrives via the REFUND webhook. Record
  // the modification ref WITHOUT rewriting status: the webhook may have already
  // flipped the row to completed/failed, and forcing 'requested' here would
  // clobber that. The row is already 'requested' from the initial lock insert.
  await markRow({ adyen_modification_ref: refund.modificationRef })
  return { ok: true, cancelled: true, refund: { amountCents: refundCents, currency, status: 'requested' } }
}
