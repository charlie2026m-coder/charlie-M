import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getOrRefreshToken } from "@/services/Request"
import { payFolioByPaymentAccount } from "@/services/bookReservationServices"
import { bookPendingServices, refundAndMarkFailed } from "@/services/bookPendingServices"
import { adyenLog, bookingLog, apaleoLog } from "@/lib/logger"
import { reversePayment } from "@/app/actions/adyen/reversePayment"
import { createPaymentAccount } from "@/services/apaleo/createPaymentAccount"
import { cancelReservation } from "@/services/apaleo/cancelReservation"
import crypto from "crypto"

// Webhook has no user session — must use service_role to bypass RLS
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const APALEO_API_URL = 'https://api.apaleo.com'
const ADYEN_HMAC_KEY = process.env.ADYEN_HMAC_KEY || ''

function verifyHmacSignature(notificationItem: any, hmacKey: string): boolean {
  if (!hmacKey) {
    if (process.env.NODE_ENV === 'production') {
      adyenLog.error('ADYEN_HMAC_KEY not set in production — rejecting webhook')
      return false
    }
    return true // Skip verification if no key configured (dev mode).
  }

  try {
    const additionalData = notificationItem.additionalData || {}
    const hmacSignature = additionalData.hmacSignature

    if (!hmacSignature) return false

    const payload = [
      notificationItem.pspReference,
      notificationItem.originalReference || '',
      notificationItem.merchantAccountCode,
      notificationItem.merchantReference,
      notificationItem.amount?.value,
      notificationItem.amount?.currency,
      notificationItem.eventCode,
      notificationItem.success,
    ].join(':')

    const key = Buffer.from(hmacKey, 'hex')
    const expectedSignature = crypto
      .createHmac('sha256', key)
      .update(payload)
      .digest('base64')

    return hmacSignature === expectedSignature
  } catch (error) {
    adyenLog.error('HMAC verification threw', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

async function createBookingFromPending(
  reference: string,
  pspReference: string
) {
  const supabase = createAdminClient()

  // 1. Check if booking already exists or is being processed
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('apaleo_booking_id, status')
    .eq('transaction_reference', pspReference)
    .single()

  if (existingBooking) {
    if (existingBooking.status === 'completed') {
      bookingLog.info('webhook: booking already completed', { apaleoBookingId: existingBooking.apaleo_booking_id })
      return { alreadyExists: true, bookingId: existingBooking.apaleo_booking_id }
    }
    if (existingBooking.status === 'processing') {
      bookingLog.info('webhook: booking processing — skipping', { pspReference })
      return { alreadyProcessing: true }
    }
  }

  // 2. Get pending booking payload
  const { data: pendingBooking, error: pendingError } = await supabase
    .from('pending_bookings')
    .select('booking_payload, status')
    .eq('reference', reference)
    .single()

  if (pendingError || !pendingBooking) {
    bookingLog.info('webhook: no pending booking found — client likely handled it', { reference })
    return { noPending: true }
  }

  if (pendingBooking.status === 'completed') {
    bookingLog.info('webhook: pending booking already completed', { reference })
    return { alreadyExists: true }
  }

  // GDPR-deleted payload: the user wiped their account between save-pending
  // and the Adyen authorisation. We cannot reconstruct the booking, so the
  // only correct move is to refund and mark the row failed. Without this
  // guard the next `booking_payload` spread would expand `{ cleared: true }`
  // into the Apaleo POST and throw later — leaving money captured with no
  // Apaleo state and no refund.
  const rawPayload = pendingBooking.booking_payload as unknown
  if (
    rawPayload &&
    typeof rawPayload === 'object' &&
    (rawPayload as { cleared?: unknown }).cleared === true
  ) {
    bookingLog.error('webhook: pending payload was cleared (GDPR delete) — refunding', {
      reference,
      pspReference,
    })
    await supabase
      .from('pending_bookings')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('reference', reference)
    const reversal = await reversePayment(pspReference, { internalReference: reference })
    if (!reversal.success) {
      bookingLog.error('webhook: refund failed for cleared payload — manual action required', {
        pspReference,
        refundError: reversal.error,
      })
    }
    return { cleared: true }
  }

  // 3. Acquire lock — insert with status 'processing'
  const { error: lockError } = await supabase.from('bookings').insert({
    transaction_reference: pspReference,
    status: 'processing',
    user_id: null,
    created_at: new Date().toISOString(),
  })

  if (lockError) {
    if (lockError.code === '23505') {
      bookingLog.info('webhook: lock taken by another process — skipping', { pspReference })
      return { alreadyProcessing: true }
    }
    // Non-conflict lock error — proceed anyway so we don't drop a paid booking.
    bookingLog.error('webhook: lock insert failed — proceeding without lock', { error: lockError })
  }

  // 4. Create booking in Apaleo. Spread to avoid mutating the cached payload.
  const booking = {
    ...pendingBooking.booking_payload,
    transactionReference: pspReference,
  }

  apaleoLog.info('webhook → Apaleo POST /bookings', {
    reference,
    pspReference,
    totalAmount: booking.totalAmount,
    reservationsCount: booking.reservations?.length,
    reservations: booking.reservations?.map((r: any) => ({
      adults: r.adults,
      prepayment: r.prepaymentAmount?.amount,
      timeSlicesCount: r.timeSlices?.length,
      ratePlanId: r.timeSlices?.[0]?.ratePlanId,
      servicesCount: r.services?.length,
    })),
  })

  const token = await getOrRefreshToken()

  const response = await fetch(`${APALEO_API_URL}/booking/v1/bookings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Idempotency-Key': pspReference,
    },
    body: JSON.stringify(booking),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    bookingLog.error('webhook: Apaleo POST /bookings failed', {
      pspReference,
      status: response.status,
      error: errorData,
    })

    await supabase
      .from('bookings')
      .update({ status: 'failed' })
      .eq('transaction_reference', pspReference)
      .eq('status', 'processing')

    await supabase
      .from('pending_bookings')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('reference', reference)

    bookingLog.warn('webhook: initiating reversal — payment charged but booking never created', { pspReference })
    await reversePayment(pspReference, { internalReference: reference })

    return { error: 'Failed to create booking', details: errorData }
  }

  const apaleoData = await response.json()
  const apaleoReservationIds: string[] = apaleoData.reservationIds?.map((r: any) => r.id) || []
  apaleoLog.success('webhook: booking created', {
    id: apaleoData.id,
    reservationIds: apaleoReservationIds,
  })

  // Track PAs at outer scope so the cleanup helper sees them even if the
  // post-booking block throws.
  let paymentAccountIds: string[] = []

  const cleanup = async () => {
    bookingLog.error('webhook cleanup initiated', {
      pspReference,
      apaleoBookingId: apaleoData.id,
      reservationIds: apaleoReservationIds,
      paymentAccountIds,
    })

    await Promise.allSettled(apaleoReservationIds.map((id: string) => cancelReservation(id)))

    await reversePayment(pspReference, {
      apaleoPaymentAccountIds: paymentAccountIds,
      internalReference: reference,
    })

    await supabase
      .from('bookings')
      .update({ status: 'failed' })
      .eq('transaction_reference', pspReference)
    await supabase
      .from('pending_bookings')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('reference', reference)
  }

  // Apaleo returned a booking without reservations — impossible per spec, but
  // a defensive guard against silent success with zero PAs/captures.
  if (apaleoReservationIds.length === 0) {
    bookingLog.error('webhook: Apaleo returned no reservation IDs — rolling back', {
      apaleoBookingId: apaleoData.id,
    })
    await cleanup()
    return { error: 'Apaleo returned a booking without reservation IDs' }
  }

  // Atomic post-booking block: any throw → cleanup + structured error return.
  try {
    // 5. Persist Apaleo IDs but keep status='processing' until all captures land.
    await supabase
      .from('bookings')
      .update({
        apaleo_booking_id: apaleoData.id,
        reservation_ids: apaleoReservationIds,
      })
      .eq('transaction_reference', pspReference)

    // 6. Resume from any state persisted by a previous attempt so retries don't
    // double-register PAs.
    const { data: existing } = await supabase
      .from('bookings')
      .select('apaleo_payment_account_ids')
      .eq('transaction_reference', pspReference)
      .maybeSingle()
    paymentAccountIds = existing?.apaleo_payment_account_ids ?? []

    // 7. For each reservation, register the Adyen authorization as a
    // per-reservation Apaleo Payment Account.
    bookingLog.info('webhook: STEP 7 — Apaleo payment accounts (per reservation)', {
      apaleoBookingId: apaleoData.id,
      pspReference,
      reservationCount: apaleoReservationIds.length,
      reusing: paymentAccountIds.length,
    })
    for (let i = paymentAccountIds.length; i < apaleoReservationIds.length; i++) {
      const reservationId = apaleoReservationIds[i]
      const paymentAccountId = await createPaymentAccount({
        reservationId,
        pspReference,
      })
      paymentAccountIds.push(paymentAccountId)
      await supabase
        .from('bookings')
        .update({ apaleo_payment_account_ids: paymentAccountIds })
        .eq('transaction_reference', pspReference)
    }

    // 8. Capture each reservation folio via its Payment Account.
    bookingLog.info('webhook: STEP 8 — folio captures via payment account', {
      pspReference,
      reservationCount: apaleoReservationIds.length,
    })
    for (let i = 0; i < apaleoReservationIds.length; i++) {
      const reservationId = apaleoReservationIds[i]
      const paymentAccountId = paymentAccountIds[i]
      const reservation = booking.reservations[i]
      const amount = reservation?.prepaymentAmount?.amount
      const currency = reservation?.prepaymentAmount?.currency || 'EUR'

      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error(`webhook: reservation ${i + 1} (${reservationId}) has no prepayment amount`)
      }

      const folioResult = await payFolioByPaymentAccount({
        reservationId,
        paymentAccountId,
        amount,
        currency,
      })

      if (!folioResult.success) {
        throw new Error(`webhook: folio capture failed for reservation ${reservationId}: ${folioResult.error}`)
      }
    }

    // 9. All captures succeeded — flip to completed.
    await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('transaction_reference', pspReference)
    await supabase
      .from('pending_bookings')
      .update({
        status: 'completed',
        apaleo_booking_id: apaleoData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)

    return { success: true, bookingId: apaleoData.id }
  } catch (postBookingError) {
    bookingLog.error('webhook: post-booking flow failed — running cleanup', {
      apaleoBookingId: apaleoData.id,
      paymentAccountCount: paymentAccountIds.length,
      error: postBookingError instanceof Error ? postBookingError.message : String(postBookingError),
    })
    await cleanup()
    return {
      error: 'Booking rolled back — payment refunded',
      details: postBookingError instanceof Error ? postBookingError.message : 'Unknown error',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const notificationItems = body.notificationItems || []

    for (const item of notificationItems) {
      const notification = item.NotificationRequestItem

      if (!verifyHmacSignature(notification, ADYEN_HMAC_KEY)) {
        adyenLog.error('webhook: invalid HMAC signature')
        continue
      }

      const { eventCode, success, merchantReference, pspReference } = notification

      adyenLog.info('webhook received', {
        eventCode,
        success,
        amountEUR: notification.amount ? notification.amount.value / 100 : null,
        amountCents: notification.amount?.value,
        merchantReference,
        pspReference,
      })

      // Reversal & dispute events. reversePayment / refundCapturedPayment are
      // asynchronous — Adyen reports the final outcome here. Without this they
      // are "fire and forget": a failed refund or a chargeback would be lost.
      // Every such event is recorded durably in payment_reversals (idempotent
      // on its own pspReference), failures/disputes are flagged needs_action
      // for a manual work-list, and guest-cancel refund rows are finalized.
      const isReversalEvent =
        eventCode === 'REFUND' ||
        eventCode === 'CANCELLATION' ||
        eventCode === 'REFUND_FAILED' ||
        eventCode === 'REFUNDED_REVERSED'
      const isDisputeEvent =
        eventCode === 'NOTIFICATION_OF_CHARGEBACK' ||
        eventCode === 'CHARGEBACK' ||
        eventCode === 'CHARGEBACK_REVERSED' ||
        eventCode === 'SECOND_CHARGEBACK' ||
        eventCode === 'PREARBITRATION_WON' ||
        eventCode === 'PREARBITRATION_LOST'

      if (isReversalEvent || isDisputeEvent) {
        const supabase = createAdminClient()
        // A clean reversal = a refund/cancellation that succeeded. REFUND_FAILED
        // and REFUNDED_REVERSED are never clean. Disputes resolved in our favor
        // need no action; every other dispute does.
        const reversalSucceeded = (eventCode === 'REFUND' || eventCode === 'CANCELLATION') && success === 'true'
        const disputeResolvedFavorably = eventCode === 'CHARGEBACK_REVERSED' || eventCode === 'PREARBITRATION_WON'
        const needsAction = isDisputeEvent ? !disputeResolvedFavorably : !reversalSucceeded

        // Match a guest-cancel refund row if this event corresponds to one.
        // Guest-cancel refunds are partial refunds of CAPTURED payments, so
        // Adyen reports REFUND / REFUND_FAILED, then REFUNDED_REVERSED if the
        // bank bounces an already-settled refund. The cancel route set the
        // refund reference to `${reservationId}::${psp}` (older in-flight rows:
        // plain reservation id), so recover the reservation id from the prefix;
        // for a follow-up event that doesn't echo our reference, fall back to
        // the reservation we already linked to this psp on the first event.
        let matchedReservationId: string | null = null
        let refundRow: { amount_cents: number | null; status: string; currency: string | null } | null = null
        const refundCandidateId = (merchantReference ?? '').split('::')[0]
        const isRefundLike =
          eventCode === 'REFUND' || eventCode === 'REFUND_FAILED' || eventCode === 'REFUNDED_REVERSED'
        if (isRefundLike) {
          try {
            const candidates: string[] = refundCandidateId ? [refundCandidateId] : []
            // Follow-up events (REFUNDED_REVERSED / REFUND_FAILED) may not echo
            // our `${id}::psp` merchantReference. Recover the reservation from
            // the prior payment_reversals row we wrote for the original REFUND,
            // keyed on the event's pspReference OR its originalReference — BUT
            // only against payment_reversals.psp_reference, which is UNIQUE.
            // (We deliberately do NOT fall back on original_reference: that is
            // the shared capture psp — one booking's capture backs N
            // reservations — so it is non-unique and would both mis-attribute a
            // reversal to a sibling reservation AND make maybeSingle() return
            // null over >1 row, silently dropping the match — review-fix #2.)
            if (eventCode === 'REFUNDED_REVERSED' || eventCode === 'REFUND_FAILED') {
              const fallbackKeys = [pspReference, notification.originalReference]
              for (const key of fallbackKeys) {
                if (!key) continue
                const { data: prior } = await supabase
                  .from('payment_reversals')
                  .select('reservation_id')
                  .eq('psp_reference', key)
                  .maybeSingle()
                if (prior?.reservation_id) {
                  if (!candidates.includes(prior.reservation_id)) candidates.push(prior.reservation_id)
                  break
                }
              }
            }
            for (const candId of candidates) {
              const { data } = await supabase
                .from('reservation_refunds')
                .select('reservation_id, amount_cents, status, currency')
                .eq('reservation_id', candId)
                .maybeSingle()
              if (data) {
                matchedReservationId = candId
                refundRow = {
                  amount_cents: data.amount_cents,
                  status: data.status,
                  currency: data.currency,
                }
                break
              }
            }
            if (!matchedReservationId && eventCode === 'REFUND_FAILED') {
              // A failed refund matching no row is the most sensitive miss —
              // the guest may not have their money back. needs_action also
              // flags it, but log it explicitly.
              adyenLog.warn('webhook: REFUND_FAILED with no matching refund row — verify manually', {
                merchantReference,
                pspReference,
              })
            }
          } catch (error: unknown) {
            adyenLog.error('webhook: reservation_refunds match threw', {
              reservationId: refundCandidateId,
              pspReference,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        // A failed OR bank-reversed refund fails the WHOLE reservation refund —
        // a human settles it. (Review finding #2.)
        //   REFUND_FAILED: a refund ATTEMPT that failed — only meaningful
        //   before completion, so it flips ONLY a still-'requested' row. Without
        //   that guard an out-of-order REFUND_FAILED for an abandoned earlier
        //   modification could clobber a legitimately 'completed' refund.
        //   REFUNDED_REVERSED: the bank clawed back an already-settled refund —
        //   it MUST flip even a 'completed' row, so no status guard.
        // For REFUND_FAILED, only auto-fail when the failing refund is one WE
        // initiated — our refunds ALWAYS carry exactly `${id}::${psp}`. We
        // require that `::` form (not a bare `${id}`, which a staff/dashboard
        // refund would naturally use): a foreign refund tagged with just the
        // reservation id that fails at the bank must not flip our healthy
        // in-flight refund to 'failed' (review-fix #2). REFUNDED_REVERSED is
        // matched only via our `::` reference or the psp we recorded, so it is
        // already proven ours and needs no extra check.
        const failRefIsOurs = (merchantReference ?? '').startsWith(`${matchedReservationId}::`)
        if (
          matchedReservationId &&
          ((eventCode === 'REFUND_FAILED' && failRefIsOurs) || eventCode === 'REFUNDED_REVERSED')
        ) {
          try {
            const failUpdate = supabase
              .from('reservation_refunds')
              .update({
                status: 'failed',
                adyen_modification_ref: pspReference,
                note:
                  eventCode === 'REFUNDED_REVERSED'
                    ? 'refund reversed by bank (REFUNDED_REVERSED) — money returned to merchant, verify'
                    : `Adyen ${eventCode} success=${success}`,
                updated_at: new Date().toISOString(),
              })
              .eq('reservation_id', matchedReservationId)
            if (eventCode === 'REFUND_FAILED') {
              await failUpdate.eq('status', 'requested')
            } else {
              await failUpdate
            }
          } catch (error: unknown) {
            adyenLog.error('webhook: reservation_refunds fail-update threw', {
              reservationId: matchedReservationId,
              pspReference,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        // Durable system of record — idempotent on the event's own pspReference.
        // Insert first; on a duplicate (Adyen redelivers at-least-once, or a
        // later-stage event shares the psp) refresh the volatile fields and DO
        // NOT overwrite reservation_id: a redelivery can't re-match and a blind
        // upsert would wipe the link. Whether or not this write lands, the
        // completion check below decides what to count by psp_reference (not by
        // a "did my write succeed" flag), so a transient failure here cannot
        // double-count or strand the refund (review-fix finding #1).
        try {
          const { error: insertErr } = await supabase.from('payment_reversals').insert({
            psp_reference: pspReference,
            original_reference: notification.originalReference ?? null,
            merchant_reference: merchantReference ?? null,
            reservation_id: matchedReservationId,
            event_code: eventCode,
            success: success === 'true',
            amount_cents: notification.amount?.value ?? null,
            currency: notification.amount?.currency ?? null,
            needs_action: needsAction,
          })
          if (insertErr?.code === '23505') {
            const { error: updErr } = await supabase
              .from('payment_reversals')
              .update({
                event_code: eventCode,
                success: success === 'true',
                needs_action: needsAction,
                note: `latest event: ${eventCode}`,
                updated_at: new Date().toISOString(),
              })
              .eq('psp_reference', pspReference)
            if (updErr) {
              adyenLog.error('webhook: payment_reversals dup-update failed', { pspReference, error: updErr.message })
            }
          } else if (insertErr) {
            adyenLog.error('webhook: payment_reversals insert failed — event not durably recorded', {
              eventCode,
              pspReference,
              error: insertErr.message,
            })
          }
        } catch (error: unknown) {
          adyenLog.error('webhook: payment_reversals write threw — event not durably recorded', {
            eventCode,
            pspReference,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        // A multi-psp refund is 'completed' only when EVERY cent of the plan has
        // a successful REFUND behind it — the first psp arriving must not flip
        // the row while the rest is in flight (review finding #4). Count ONLY
        // refunds WE initiated for this reservation — reference `${id}::${psp}`
        // (or the legacy bare id) — and only in the row's currency, so an
        // unrelated dashboard refund that merely carries the reservation id
        // can't mark it done (review finding #10).
        if (eventCode === 'REFUND' && success === 'true' && matchedReservationId && refundRow?.status === 'requested') {
          try {
            const { data: settled } = await supabase
              .from('payment_reversals')
              .select('amount_cents, merchant_reference, currency, psp_reference')
              .eq('reservation_id', matchedReservationId)
              .eq('event_code', 'REFUND')
              .eq('success', true)
            const plannedCurrency = refundRow.currency
            // Count ONLY refunds WE initiated for this reservation — reference
            // `${id}::${psp}` (or the legacy bare id) — and ONLY in the row's
            // currency. A null currency does NOT pass: plannedCurrency is always
            // set (NOT NULL default), and the sum has no FX conversion, so a
            // null/foreign-currency amount must never count (review-fix #10).
            const isOurs = (ref: string | null, currency: string | null): boolean => {
              const r = ref ?? ''
              const refIsOurs = r === matchedReservationId || r.startsWith(`${matchedReservationId}::`)
              const currencyOk = !plannedCurrency || currency === plannedCurrency
              return refIsOurs && currencyOk
            }
            const ours = (settled ?? []).filter(
              (r: { merchant_reference: string | null; currency: string | null }) =>
                isOurs(r.merchant_reference, r.currency)
            )
            let settledCents = ours.reduce(
              (sum: number, r: { amount_cents: number | null }) => sum + (r.amount_cents ?? 0),
              0
            )
            // Count THIS event in-memory only if its psp is NOT already in the
            // query — otherwise a redelivery whose insert THREW (so
            // reversalRecorded is false) but whose row a CONCURRENT handler
            // already persisted would be summed twice and wrongly complete the
            // plan (review-fix #1). Keying on psp, not the flag, makes the
            // in-memory add idempotent regardless of insert outcome/ordering.
            const thisPspAlreadyCounted = (settled ?? []).some(
              (r: { psp_reference: string | null }) => r.psp_reference === pspReference
            )
            if (
              !thisPspAlreadyCounted &&
              isOurs(merchantReference, notification.amount?.currency ?? null)
            ) {
              settledCents += notification.amount?.value ?? 0
            }
            if (settledCents >= (refundRow.amount_cents ?? 0)) {
              await supabase
                .from('reservation_refunds')
                .update({
                  status: 'completed',
                  adyen_modification_ref: pspReference,
                  updated_at: new Date().toISOString(),
                })
                .eq('reservation_id', matchedReservationId)
                .eq('status', 'requested')
            } else {
              adyenLog.info('webhook: partial refund settled — waiting for remaining psp(s)', {
                reservationId: matchedReservationId,
                settledCents,
                plannedCents: refundRow.amount_cents,
              })
            }
          } catch (error: unknown) {
            adyenLog.error('webhook: refund completion check threw', {
              reservationId: matchedReservationId,
              pspReference,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        if (needsAction) {
          adyenLog.error('webhook: reversal/dispute needs manual action', {
            eventCode,
            success,
            pspReference,
            originalReference: notification.originalReference ?? null,
            merchantReference,
            reservationId: matchedReservationId,
          })
        } else {
          adyenLog.success('webhook: reversal/dispute recorded', {
            eventCode,
            pspReference,
            originalReference: notification.originalReference ?? null,
            reservationId: matchedReservationId,
          })
        }
        continue
      }

      // We only act on successful authorisations; remaining event codes are
      // recorded above (reversals/disputes) or intentionally ignored.
      if (eventCode === 'AUTHORISATION' && success === 'true') {
        try {
          const result = await createBookingFromPending(merchantReference, pspReference)
          if (result.alreadyExists) { bookingLog.info('webhook: booking already exists', { bookingId: result.bookingId }); continue }
          if (result.alreadyProcessing) { bookingLog.info('webhook: booking already processing'); continue }
          if (result.cleared) { bookingLog.warn('webhook: pending payload cleared — refunded and skipped', { reference: merchantReference, pspReference }); continue }
          if (result.error) { bookingLog.error('webhook: booking failed — already refunded, not attempting services', { reference: merchantReference, error: result.error }); continue }
          else if (result.success) { bookingLog.success('webhook: booking created', { bookingId: result.bookingId }); continue }
        } catch (error: any) {
          bookingLog.error('webhook: booking threw', { reference: merchantReference, error: error.message })
        }

        // Fallback: no booking — assume payment was for a late-services add.
        const amountCents = notification.amount?.value
        if (!Number.isInteger(amountCents) || amountCents <= 0) {
          bookingLog.error('webhook: invalid amount.value — skipping services flow', {
            reference: merchantReference,
            pspReference,
            amountCents,
          })
          continue
        }
        try {
          const result = await bookPendingServices(merchantReference, pspReference, amountCents)
          if (result.notFound) bookingLog.info('webhook: no pending services', { reference: merchantReference })
          else if (result.alreadyExists) bookingLog.info('webhook: services already booked', { reference: merchantReference })
          else if (result.alreadyFailed) bookingLog.warn('webhook: services row already failed — duplicate delivery', { reference: merchantReference, pspReference })
          else if (result.alreadyProcessing) bookingLog.info('webhook: services already processing', { reference: merchantReference })
          else if (result.error) bookingLog.error('webhook: services failed', { reference: merchantReference })
        } catch (error: unknown) {
          // Outer catch covers anything inside bookPendingServices that didn't
          // already refund — DB transient errors, unexpected exceptions. We
          // must refund here too: returning [accepted] to Adyen otherwise
          // means money captured with no Apaleo state.
          bookingLog.error('webhook: services threw — fallback refund', {
            reference: merchantReference,
            pspReference,
            error: error instanceof Error ? error.message : String(error),
          })
          try {
            const supabase = createAdminClient()
            await refundAndMarkFailed(
              supabase,
              merchantReference,
              pspReference,
              'outer catch fallback',
            )
          } catch (refundErr: unknown) {
            bookingLog.error('webhook: fallback refund itself failed — manual intervention required', {
              reference: merchantReference,
              pspReference,
              error: refundErr instanceof Error ? refundErr.message : String(refundErr),
            })
          }
        }
      }
    }

    // Adyen requires a plaintext [accepted] response on every delivery.
    return new NextResponse('[accepted]', { status: 200 })
  } catch (error) {
    adyenLog.error('webhook: unhandled exception', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new NextResponse('[accepted]', { status: 200 })
  }
}
