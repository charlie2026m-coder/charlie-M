import { createClient } from '@supabase/supabase-js'
import { verifyReservationInProperty } from '@/services/verifyReservationInProperty'
import { cancelReservation } from '@/services/apaleo/cancelReservation'
import { refundFolioPayment, getFolioRefundsByPayment } from '@/services/apaleo/refundFolioPayment'
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
 * Cancel a single reservation and refund the guest by refunding EACH captured
 * folio payment THROUGH Apaleo.
 *
 * Why through Apaleo (not Adyen directly): Apaleo's payment account is connected
 * to Adyen, so POST /finance/v1/folios/{folioId}/payments/{paymentId}/refunds
 * BOTH executes the refund in Adyen AND records it on the folio. It is therefore
 * the single source of truth — refunding in Adyen ourselves *as well* would
 * re-run the refund and double-pay the guest (verified: Apaleo returns a refund
 * that fails "Already fully refunded" when the psp was already refunded in Adyen).
 *
 * Why per-payment: a reservation can be backed by more than one capture — the
 * room at booking time (one psp) and any services added later (a separate psp).
 * Apaleo's folio holds each as a payment with its own id + pspReference and the
 * amount on THIS reservation's folio; we refund each payment for its planned
 * amount.
 *
 * The cancellation penalty (Apaleo's policy verdict) applies to the ROOM payment
 * only — services are refunded in full on cancellation.
 *
 * Each Apaleo refund is asynchronous (Pending → settles via Adyen). This returns
 * 'requested'; the truth lives on the Apaleo folio. 'failed' (+ a note) flags
 * any payment Apaleo rejected for a human to settle.
 *
 * Idempotency: a UNIQUE row in reservation_refunds(reservation_id) is the lock;
 * a re-run also can't double-refund because Apaleo rejects an already-refunded
 * payment.
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
  // our flow knows; anything else is a manual case.
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
    // Cancelled elsewhere AND we have no record of it. Persist a durable
    // manual-review row so it lands in the reservation_refunds work-list
    // (status='failed') instead of living only in a transient log — a human
    // must check whether a refund is still owed. Swallow 23505 in case a row
    // was created concurrently.
    const { error: insertErr } = await supabase.from('reservation_refunds').insert({
      reservation_id: reservationId,
      psp_reference: null,
      amount_cents: 0,
      currency,
      status: 'failed',
      note: 'cancelled outside this flow — manual refund review',
    })
    if (insertErr && insertErr.code !== '23505') {
      bookingLog.error('cancel: failed to persist manual-review row for outside-flow cancel', {
        reservationId,
        error: insertErr.message,
      })
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

  // Apaleo's cancellation policy: `cancellationFee.fee` is the penalty that
  // becomes due AT `cancellationFee.dueDateTime` (the free-cancellation
  // deadline) — it is NOT already 0 before that moment. So while we are still
  // inside the free window (now < dueDateTime) the ACTUAL fee is 0 and the guest
  // is owed a FULL refund; only at/after the deadline does the penalty apply.
  // (The earlier code applied fee.amount unconditionally, so guests who
  // cancelled during the free window were wrongly refunded €0 — verified on
  // live FLEX reservations whose fee.amount is non-zero before their deadline.)
  // A missing fee, a fee in a different currency than the captured total, falls
  // through to manual rather than guessing against real money.
  const feeAmount = reservation.cancellationFee?.fee?.amount
  const feeCurrency = reservation.cancellationFee?.fee?.currency
  const dueDateTime = reservation.cancellationFee?.dueDateTime
  const dueMs = dueDateTime ? Date.parse(dueDateTime) : NaN
  const withinFreeWindow = Number.isFinite(dueMs) && Date.now() < dueMs
  const feeKnown =
    typeof feeAmount === 'number' && Number.isFinite(feeAmount) && feeCurrency === currency
  const feeCents = feeKnown && !withinFreeWindow ? Math.round(feeAmount * 100) : 0

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

  // NET of the folio /payments per psp: positive captures plus any negative
  // reversal/chargeback lines (refunds do NOT live here — they are on
  // /folios/{id}/refunds — so this is gross captures net of bank reversals only).
  const capturedByPsp = new Map<string, number>()
  for (const p of folioPayments) {
    capturedByPsp.set(p.pspReference, (capturedByPsp.get(p.pspReference) ?? 0) + p.amountCents)
  }

  // How much is ALREADY refunded per folio payment (Pending + Success only). Read
  // BEFORE the plan so the target reflects what's still owed, and reused as the
  // per-payment remaining cap so we never over-refund and never re-refund on a
  // retry. Read-only, before the lock; a read failure routes to manual.
  const folioIds = [...new Set(folioPayments.filter((p) => p.amountCents > 0).map((p) => p.folioId))]
  let refundedByPayment = new Map<string, number>()
  let refundsReadOk = true
  if (folioIds.length > 0) {
    try {
      refundedByPayment = await getFolioRefundsByPayment(folioIds)
    } catch (err) {
      refundsReadOk = false
      bookingLog.error('cancel: failed to read existing folio refunds — routing to manual', {
        reservationId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Already-refunded cents per psp (sum of its capture payments' prior refunds).
  const refundedByPsp = new Map<string, number>()
  for (const p of folioPayments) {
    if (p.amountCents <= 0 || !p.paymentId) continue
    const r = refundedByPayment.get(p.paymentId) ?? 0
    if (r > 0) refundedByPsp.set(p.pspReference, (refundedByPsp.get(p.pspReference) ?? 0) + r)
  }

  // Refund target per psp = what's STILL owed: net payments − already-refunded,
  // minus the cancellation penalty on the room psp only (services in full).
  // Clamped at 0 — a psp already settled gets nothing. Separately track any psp
  // where prior refunds EXCEED the entitlement (guest was already over-refunded):
  // this flow can't claw it back, but it must be surfaced, not silently swallowed.
  let priorOverRefundCents = 0
  const plan = [...capturedByPsp.entries()].map(([psp, netPaymentsCents]) => {
    const isRoom = roomPsp != null && psp === roomPsp
    const entitlementCents = Math.max(0, isRoom ? netPaymentsCents - feeCents : netPaymentsCents)
    const refundedForPsp = refundedByPsp.get(psp) ?? 0
    if (refundedForPsp > entitlementCents) priorOverRefundCents += refundedForPsp - entitlementCents
    const refundCents = Math.max(0, entitlementCents - refundedForPsp)
    return { psp, refundCents, isRoom }
  })
  const totalRefundCents = plan.reduce((sum, p) => sum + p.refundCents, 0)

  // A negative /payments line (reversal/chargeback/payout) has an unverified
  // cardholder-direction semantic — netting it could under-refund. And a capture
  // in a non-reservation currency would be refunded in the wrong currency. Either
  // → route to manual rather than auto-net against real money.
  const hasNegativeLine = folioPayments.some((p) => p.amountCents < 0)
  const currencyMismatch = folioPayments.some((p) => p.amountCents > 0 && p.currency !== currency)

  // Refundable capture payments (positive, with an Apaleo payment id) and their
  // REMAINING balance (capture − already-refunded), grouped per psp.
  const capturesByPsp = new Map<
    string,
    Array<{ folioId: string; paymentId: string; remainingCents: number }>
  >()
  for (const p of folioPayments) {
    if (p.amountCents <= 0 || !p.paymentId) continue
    const remainingCents = Math.max(0, p.amountCents - (refundedByPayment.get(p.paymentId) ?? 0))
    if (remainingCents <= 0) continue
    const arr = capturesByPsp.get(p.pspReference) ?? []
    arr.push({ folioId: p.folioId, paymentId: p.paymentId, remainingCents })
    capturesByPsp.set(p.pspReference, arr)
  }

  // Distribute each psp's target across its captures, capped at each payment's
  // remaining balance. `coverable` is false if any psp's target can't be fully
  // met by id-bearing captures with remaining balance (id-less capture, or a
  // prior refund already consumed the balance) → route to manual up front.
  const execution: Array<{ folioId: string; paymentId: string; amountCents: number; isRoom: boolean }> = []
  let coverable = true
  for (const line of plan) {
    if (line.refundCents <= 0) continue
    let need = line.refundCents
    for (const cap of capturesByPsp.get(line.psp) ?? []) {
      if (need <= 0) break
      const amountCents = Math.min(need, cap.remainingCents)
      if (amountCents <= 0) continue
      execution.push({ folioId: cap.folioId, paymentId: cap.paymentId, amountCents, isRoom: line.isRoom })
      need -= amountCents
    }
    if (need > 0) coverable = false
  }

  // We can auto-refund only when the policy verdict is trustworthy, the room
  // payment is mapped (to charge the penalty), no payment is in flight, existing
  // refunds were readable, and every psp's target is fully coverable by
  // refundable captures. Anything else cancels but routes the refund to manual.
  const canAutoRefund =
    feeKnown &&
    roomPsp != null &&
    capturedByPsp.size > 0 &&
    capturedByPsp.has(roomPsp) &&
    unsettledPayments === 0 &&
    refundsReadOk &&
    !hasNegativeLine &&
    !currencyMismatch &&
    coverable

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
        // Cancel call failed AND we couldn't verify the reservation state. Keep
        // the lock (a racing retry must not double-act) but flip it to 'failed'
        // with a note, so it surfaces in the work-list instead of masquerading as
        // a healthy 'requested'/handled row on a later retry.
        await supabase
          .from('reservation_refunds')
          .update({
            status: 'failed',
            note: `cancel uncertain — verify in Apaleo, then cancel/refund manually (${cancelResult.error || 'cancel + recheck both failed'})`.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('reservation_id', reservationId)
          .eq('status', 'requested')
        bookingLog.error('cancel: Apaleo cancel failed and recheck failed — lock kept, marked failed for manual review', {
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
  const markRow = async (fields: {
    status?: RefundStatus
    adyen_modification_ref?: string
    note?: string
    amount_cents?: number
  }) => {
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
            : unsettledPayments !== 0
              ? 'pending (unsettled) payments on folio'
              : !refundsReadOk
                ? 'could not read existing folio refunds'
                : hasNegativeLine
                  ? 'reversal/chargeback line on folio — review before refunding'
                  : currencyMismatch
                    ? 'capture currency differs from reservation currency'
                    : 'refundable balance below computed refund (prior partial refund or id-less capture)'
    await markRow({ status: 'failed', note: `${reason} — manual refund review` })
    bookingLog.error('cancel: cancelled but refund needs manual review', { reservationId, reason })
    return { ok: true, cancelled: true, refund: { amountCents: totalRefundCents, currency, status: 'failed', manual: true } }
  }

  if (totalRefundCents <= 0) {
    if (priorOverRefundCents > 0) {
      // Nothing more to refund, but prior refunds already exceeded what the guest
      // was entitled to — a possible over-payment this flow cannot claw back. Mark
      // completed (no action) but flag loudly for finance.
      bookingLog.error('cancel: prior refunds EXCEED entitlement — possible over-payment, review', {
        reservationId,
        overByCents: priorOverRefundCents,
        currency,
      })
      await markRow({
        status: 'completed',
        note: `no refund due; prior refunds EXCEED entitlement by ${(priorOverRefundCents / 100).toFixed(2)} ${currency} — review for over-payment`,
      })
      return { ok: true, cancelled: true, refund: { amountCents: 0, currency, status: 'completed' } }
    }
    await markRow({ status: 'completed', note: 'no refundable amount (cancellation fee covers paid total)' })
    bookingLog.info('cancel: nothing to refund', { reservationId })
    return { ok: true, cancelled: true, refund: { amountCents: 0, currency, status: 'completed' } }
  }

  // Refund THROUGH Apaleo: posting a refund on a folio payment makes Apaleo
  // execute it via the connected Adyen payment account AND record it on the folio
  // — ONE source of truth, no double. We must NOT also refund in Adyen directly
  // (that re-runs the refund and double-pays the guest). `execution` is the
  // pre-computed plan (penalty already baked into the room amount, each line
  // capped at its payment's remaining balance, so Apaleo never has to clamp).
  const refundIds: string[] = []
  let refundedCents = 0
  let unverified = 0 // accepted by Apaleo but returned no id (can't be tracked)
  const failures: string[] = []

  for (const line of execution) {
    const result = await refundFolioPayment({
      folioId: line.folioId,
      paymentId: line.paymentId,
      amountCents: line.amountCents,
      currency,
    })
    if (!result.success) {
      failures.push(`${line.paymentId}: ${result.error ?? 'rejected'}`)
      bookingLog.error('cancel: Apaleo folio refund rejected', {
        reservationId,
        folioId: line.folioId,
        paymentId: line.paymentId,
        isRoom: line.isRoom,
        amountCents: line.amountCents,
        error: result.error,
      })
    } else {
      refundedCents += line.amountCents
      if (result.refundId) refundIds.push(result.refundId)
      else unverified++
    }
  }

  // A refund Apaleo accepted but returned no id can't be confirmed by the
  // reconcile job. Park a sentinel in the ref so the row can NEVER auto-complete
  // on the trackable ids alone — the reconcile job will time it out to 'failed'
  // (manual folio check) instead of silently reporting a full refund.
  const refundRefParts = [...refundIds]
  if (unverified > 0) refundRefParts.push('NEEDS_FOLIO_CHECK')
  const refundRef = refundRefParts.join(',') || undefined

  if (failures.length > 0) {
    // Some payments refunded, some didn't. Apaleo already executed the accepted
    // ones via Adyen (visible on the folio) — record exactly what went out and the
    // REMAINING owed, so a human settles only the rest and never re-refunds the
    // succeeded slices.
    const owed = Math.max(0, totalRefundCents - refundedCents)
    const refundedNote =
      refundedCents > 0
        ? ` Already refunded ${(refundedCents / 100).toFixed(2)} ${currency} (refundIds: ${refundIds.join(', ')}) — do NOT refund those again.`
        : ''
    await markRow({
      status: 'failed',
      amount_cents: owed,
      adyen_modification_ref: refundRef,
      note: `Apaleo refund failure(s): ${failures.join('; ')}.${refundedNote}`.slice(0, 500),
    })
    return { ok: true, cancelled: true, refund: { amountCents: owed, currency, status: 'failed', manual: true } }
  }

  // All accepted by Apaleo — it executes each via Adyen and records it on the
  // folio (settles asynchronously). Store EVERY refund id so the reconcile job
  // can confirm each settled (or surface a downstream Adyen failure).
  await markRow({
    adyen_modification_ref: refundRef,
    ...(unverified > 0
      ? { note: `${unverified} refund(s) accepted without an id — verify on folio (reconcile will time out to manual)` }
      : {}),
  })
  return { ok: true, cancelled: true, refund: { amountCents: totalRefundCents, currency, status: 'requested' } }
}
