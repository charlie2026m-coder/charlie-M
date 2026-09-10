import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { quoteRebook, applyRebook, datesMoved } from '@/services/apaleo/rebookDates'
import {
  loadReservationForAmend,
  applyStayAmend,
  type StayAmendOffer,
} from '@/services/apaleo/amendStayTime'
// Named for the late-services flow it was written for, but it is not specific
// to services: it captures ONE Adyen authorization onto a reservation's folio,
// idempotently and pending-aware. That is exactly what a top-up needs.
import { payServicesFolioByAuthorization as payFolioByAuthorization } from '@/services/bookReservationServices'
import { reversePayment } from '@/app/actions/adyen/reversePayment'
import { assignUnit } from '@/services/apaleo/assignUnit'
import { getReservationById } from '@/services/getReservation'
import { bookingLog } from '@/lib/logger'
import { notifySlack } from '@/lib/slack'
import { reservationChargeable, isRefusedVerdict } from '@/services/apaleo/reservationChargeable'

/**
 * Applying a date change the guest paid the difference for.
 *
 * Ordering is forced by Apaleo, not chosen: the amend is what raises the folio
 * charges, and only then is there an open balance to capture against. Capturing
 * first is rejected with "cannot pay more than the open balance". So the
 * sequence is amend → capture.
 *
 * ── How a failure ends ──────────────────────────────────────────────────────
 *
 * The row is this reservation's ONE move (UNIQUE reservation_id), so what
 * happens to it on failure decides whether the guest can ever move again. Two
 * endings only, and which one applies turns on a single question — can we PROVE
 * Apaleo is untouched and nobody is owed anything?
 *
 *   release()  the row is DELETED, the guest may try again. Only after the
 *              authorization is confirmed reversed AND Apaleo is provably
 *              unchanged. Anything less would hand back a move while money or
 *              dates are still in motion.
 *
 *   escalate() the row stays 'failed' and a human is paged. Used whenever the
 *              outcome is ambiguous or something did happen. It keeps the
 *              booking locked on purpose: a reservation in an unknown money
 *              state must not be moved again on top of that.
 *
 * An earlier version parked every failure at 'failed' and no sweeper released
 * it, so one transient Apaleo blip barred the guest permanently — in both
 * directions — with no operator path back.
 */

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export type RebookValidation =
  | { status: 'valid'; expectedCents: number }
  | { status: 'mismatch'; clientCents: number; expectedCents: number }
  | { status: 'unavailable'; reason: string }

interface PendingRebookRow {
  reservation_id: string
  new_arrival: string
  new_departure: string
  top_up_cents: number
  status: string
  amend_applied: boolean
}

async function readPending(
  db: SupabaseClient,
  reference: string,
): Promise<PendingRebookRow | null> {
  const { data, error } = await db
    .from('reservation_rebookings')
    .select('reservation_id, new_arrival, new_departure, top_up_cents, status, amend_applied')
    .eq('payment_reference', reference)
    .maybeSingle()
  if (error) throw new Error(`pending rebooking unreadable: ${error.message}`)
  return (data as PendingRebookRow | null) ?? null
}

/**
 * Re-price the move and check the amount the browser is about to authorise.
 *
 * Called before Adyen sees the payment, and again from the webhook. Fails
 * CLOSED: anything it cannot read confidently is 'unavailable', never 'valid'.
 */
export async function validateRebookPayment(
  reference: string | undefined,
  clientAmountCents: number,
): Promise<RebookValidation> {
  if (!reference) return { status: 'unavailable', reason: 'no-reference' }

  try {
    const db = adminClient()
    const row = await readPending(db, reference)
    if (!row) return { status: 'unavailable', reason: 'no-pending-row' }
    if (row.amend_applied === true) {
      return { status: 'unavailable', reason: 'already-applied' }
    }

    // The reservation is read fresh rather than trusted from the row: the
    // eligibility guards (still FLEX, still before the deadline, still ours)
    // have to hold at the moment money is taken, not when the guest opened the
    // calendar.
    const reservation = await getReservationById(row.reservation_id)
    if (!reservation) return { status: 'unavailable', reason: 'reservation-unreadable' }

    const quote = await quoteRebook({
      reservationId: row.reservation_id,
      newArrival: row.new_arrival,
      newDeparture: row.new_departure,
      facts: reservation,
      alreadyRebooked: false,
    })
    if (!quote.ok) return { status: 'unavailable', reason: `not-eligible:${quote.reason}` }
    if (quote.quote.deltaCents <= 0) {
      return { status: 'unavailable', reason: 'no-longer-a-top-up' }
    }

    const expectedCents = quote.quote.deltaCents
    if (expectedCents !== clientAmountCents) {
      return { status: 'mismatch', clientCents: clientAmountCents, expectedCents }
    }
    return { status: 'valid', expectedCents }
  } catch (err) {
    return {
      status: 'unavailable',
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Nothing happened and nobody is owed: give the money back and let go of the
 * guest's move.
 *
 * The delete is conditional on the reversal actually being accepted. If Adyen
 * refuses it the guest is out of pocket, and dropping the only record of that
 * would leave nothing for anyone to work from — so it escalates instead.
 */
async function release(
  db: SupabaseClient,
  reference: string,
  pspReference: string,
  reason: string,
): Promise<void> {
  bookingLog.error('rebook top-up: refusing — reversing and releasing the move', {
    reference,
    pspReference,
    reason,
  })
  const reversal = await reversePayment(pspReference, `rebook-topup:${reference}`)

  if (!reversal.success) {
    await escalate(
      db,
      reference,
      `${reason}; Adyen reversal FAILED`,
      {
        psp: pspReference,
        reason,
        'to do': 'refund this payment by hand in Adyen — the guest was charged and the dates were NOT changed',
      },
    )
    return
  }

  const { error } = await db
    .from('reservation_rebookings')
    .delete()
    .eq('payment_reference', reference)
  if (error) {
    bookingLog.error('rebook top-up: reversed but could not release the row', {
      reference,
      error: error.message,
    })
  }
}

/** Something is unresolved. Keep the row, keep the booking locked, page a human. */
async function escalate(
  db: SupabaseClient,
  reference: string,
  note: string,
  slackFields: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from('reservation_rebookings')
    .update({ status: 'failed', note: note.slice(0, 500), updated_at: new Date().toISOString() })
    .eq('payment_reference', reference)
  if (error) {
    bookingLog.error('rebook top-up: could not record the failure', { reference, error: error.message })
  }
  await notifySlack('error', 'Rebooking top-up needs a human', { reference, ...slackFields })
}

/**
 * Apply a paid date change. Called from the Adyen webhook once the
 * authorization for `reference` has succeeded.
 *
 * Returns whether the reference was OURS, so the webhook knows whether to fall
 * through to its other handlers. Throws on an unreadable ledger rather than
 * guessing — the caller turns that into a redelivery request, which is the only
 * safe answer when we cannot tell whose payment this is.
 *
 * Safe to call twice: the claim below only succeeds for a row still sitting in
 * 'awaiting_payment', so a re-delivered notification is a no-op.
 */
export async function applyRebookFromPending(
  reference: string,
  pspReference: string,
): Promise<boolean> {
  const db = adminClient()

  // readPending throws on a Supabase error, and that propagates on purpose: an
  // earlier version answered "yes, mine" to be safe, but the webhook does not
  // ask for a redelivery on that path, so a blip during an unrelated services
  // payment silently swallowed it.
  const owns = await readPending(db, reference)
  if (!owns) return false

  // Claim it. The WHERE doubles as the duplicate-delivery guard: whichever
  // delivery flips 'awaiting_payment' first owns the move.
  const { data: claimed, error: claimErr } = await db
    .from('reservation_rebookings')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('payment_reference', reference)
    .eq('status', 'awaiting_payment')
    .select('reservation_id, new_arrival, new_departure, top_up_cents')
  if (claimErr) throw new Error(`could not claim pending rebooking: ${claimErr.message}`)
  if (!claimed?.length) {
    bookingLog.info('rebook top-up: nothing to claim (already handled)', { reference })
    return true
  }
  // Same guard as the extras path: no date change and no top-up on a stay that
  // has been cancelled. Straight after the claim, before anything is amended or
  // charged, so `release` can hand the money back with nothing to undo.
  const verdict = await reservationChargeable(String(claimed[0].reservation_id))
  if (isRefusedVerdict(verdict)) {
    await release(db, reference, pspReference, `reservation-${verdict}`)
    return true
  }

  const row = claimed[0] as {
    reservation_id: string
    new_arrival: string
    new_departure: string
    top_up_cents: number
  }
  const reservationId = row.reservation_id

  try {
    // Snapshot the CURRENT stay before touching it — this is what a rollback
    // has to restore, and after the amend it is no longer readable.
    const before = await loadReservationForAmend(reservationId)
    if (!before) {
      await release(db, reference, pspReference, 'reservation unreadable')
      return true
    }
    const restore: StayAmendOffer = {
      arrival: before.arrival,
      departure: before.departure,
      availableUnits: 1,
      timeSlices: before.timeSlices.map((ts) => ({
        ratePlan: { id: ts.ratePlanId },
        from: ts.from,
        to: ts.to,
      })),
    }

    const reservation = await getReservationById(reservationId)
    if (!reservation) {
      await release(db, reference, pspReference, 'reservation unreadable')
      return true
    }

    const quoted = await quoteRebook({
      reservationId,
      newArrival: row.new_arrival,
      newDeparture: row.new_departure,
      facts: reservation,
      alreadyRebooked: false,
    })
    if (!quoted.ok) {
      await release(db, reference, pspReference, `not-eligible:${quoted.reason}`)
      return true
    }
    const quote = quoted.quote

    // The price must still be exactly what the guest authorised. Charging a
    // different number than the one they approved is never acceptable, in
    // either direction.
    if (quote.deltaCents !== row.top_up_cents) {
      await release(
        db,
        reference,
        pspReference,
        `price moved: authorised ${row.top_up_cents}, now ${quote.deltaCents}`,
      )
      return true
    }

    // ── 1. Move the dates. This is what creates the balance to capture. ──────
    let amended = true
    try {
      await applyRebook(quote)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // A throw proves nothing: the PUT may have landed and only the response
      // been lost. Ask the reservation instead of inferring.
      const moved = await datesMoved(reservationId, row.new_arrival, row.new_departure)
      if (moved === false) {
        await release(db, reference, pspReference, `amend rejected: ${message}`)
        return true
      }
      if (moved === null) {
        await escalate(db, reference, `amend outcome UNKNOWN: ${message}`, {
          reservation: reservationId,
          psp: pspReference,
          'to do':
            'check the dates in Apaleo. If they moved, the payment still needs capturing; if not, reverse it',
        })
        return true
      }
      bookingLog.warn('rebook top-up: amend threw but the dates DID move — continuing to capture', {
        reservationId,
        reference,
        error: message,
      })
      amended = true
    }

    if (amended) {
      const { error: flagErr } = await db
        .from('reservation_rebookings')
        .update({ amend_applied: true, updated_at: new Date().toISOString() })
        .eq('payment_reference', reference)
      if (flagErr) {
        bookingLog.error('rebook top-up: dates MOVED but amend_applied not recorded', {
          reference,
          reservationId,
          error: flagErr.message,
        })
      }
    }

    if (quote.unitId) {
      const pinned = await assignUnit(reservationId, quote.unitId)
      if (!pinned) {
        bookingLog.error('rebook top-up: could not pin the guest back to their studio', {
          reservationId,
          unitId: quote.unitId,
        })
      }
    }

    // ── 2. Capture what they authorised, onto the now-open balance. ──────────
    const captured = await payFolioByAuthorization({
      reservationId,
      pspReference,
      expectedChargeCents: row.top_up_cents,
      currency: quote.currency,
    })

    // `skipped` means the folio showed nothing left to pay. For late services
    // that is the benign duplicate-delivery case, but here the amend has just
    // RAISED the balance, so an already-covered folio means something we did
    // not expect — Apaleo not having posted the amended charges yet, or another
    // payment covering them. Money may or may not be in flight, so this neither
    // claims success nor unwinds: it stops and asks.
    if (captured.success && captured.skipped) {
      bookingLog.error('rebook top-up: capture skipped — folio showed no open balance', {
        reservationId,
        reference,
        pspReference,
        expectedCents: row.top_up_cents,
      })
      await escalate(db, reference, 'capture SKIPPED: folio had no open balance after the amend', {
        reservation: reservationId,
        psp: pspReference,
        amount: row.top_up_cents,
        dates: `${row.new_arrival} -> ${row.new_departure}`,
        'to do':
          'guest is on the NEW dates. Check the folio: if the top-up is not on it, capture or reverse the authorization by hand',
      })
      return true
    }

    if (!captured.success) {
      // The guest is on dates they have not paid for. Put them back rather
      // than leave that standing, then reverse the authorization.
      bookingLog.error('rebook top-up: capture failed after the amend — rolling the dates back', {
        reservationId,
        reference,
        error: captured.error,
      })
      let rolledBack = true
      try {
        await applyStayAmend(reservationId, restore, before.adults, before.childrenAges)
        if (quote.unitId) await assignUnit(reservationId, quote.unitId)
      } catch (rollbackErr) {
        rolledBack = false
        bookingLog.error('rebook top-up: ROLLBACK FAILED — guest is on unpaid dates', {
          reservationId,
          error: rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
        })
      }

      if (!rolledBack) {
        await escalate(db, reference, `capture failed AND rollback failed: ${captured.error}`, {
          reservation: reservationId,
          psp: pspReference,
          dates: `STILL MOVED to ${row.new_arrival} -> ${row.new_departure}`,
          'to do': 'restore the original dates in Apaleo, then reverse the payment',
        })
        return true
      }

      // Dates restored, so the move provably did not happen — clear the flag
      // before release, or a row that survives (reversal refused) would still
      // read as "already moved" and bar the guest for good.
      await db
        .from('reservation_rebookings')
        .update({ amend_applied: false, updated_at: new Date().toISOString() })
        .eq('payment_reference', reference)
      await release(db, reference, pspReference, `capture failed, dates restored: ${captured.error}`)
      return true
    }

    const { error: doneErr } = await db
      .from('reservation_rebookings')
      .update({
        status: 'completed',
        // The psp is room money. Cancelling later has to apply the cancellation
        // fee to it as well as to the original booking payment.
        adyen_psp_reference: pspReference,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_reference', reference)
    if (doneErr) {
      bookingLog.error('rebook top-up: applied and captured but not recorded as completed', {
        reference,
        reservationId,
        pspReference,
        error: doneErr.message,
      })
      await notifySlack('error', 'Rebooking top-up: charged but not recorded', {
        reservation: reservationId,
        psp: pspReference,
        'to do':
          'set adyen_psp_reference on this row by hand, or a later cancellation will refund the top-up without the fee',
      })
    }

    bookingLog.success('rebook top-up applied', {
      reservationId,
      reference,
      dates: `${row.new_arrival}->${row.new_departure}`,
      chargedCents: row.top_up_cents,
    })
    return true
  } catch (err) {
    bookingLog.error('rebook top-up: unhandled failure', {
      reference,
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    })
    await escalate(db, reference, `unhandled: ${err instanceof Error ? err.message : String(err)}`, {
      reservation: reservationId,
      psp: pspReference,
      'to do': 'check the reservation dates in Apaleo and whether the payment was captured',
    })
    return true
  }
}
