import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership'
import {
  quoteRebook,
  applyRebook,
  datesMoved,
  type RebookQuote,
} from '@/services/apaleo/rebookDates'
import { refundFolioPayment } from '@/services/apaleo/refundFolioPayment'
import { assignUnit } from '@/services/apaleo/assignUnit'
import { bookingLog } from '@/lib/logger'

/**
 * Move a refundable booking to different dates.
 *
 * GET  — quote only, read-only.
 * POST — apply.
 *
 * The client never sends an amount: it sends two dates, and the POST re-quotes
 * from Apaleo rather than trusting anything the GET returned.
 *
 * Lock vs. rule. The UNIQUE row in reservation_rebookings is the in-flight lock,
 * so a double-submit cannot move money twice. The one-move-per-reservation RULE
 * is separate: only a row that actually amended the reservation counts, which is
 * what `amend_applied` records. A run that PROVABLY did not touch Apaleo deletes
 * its own row so a transient outage does not burn the guest's single move — but
 * "provably" means Apaleo was re-read and still shows the old dates, never just
 * "the call threw".
 */

// This path can make a dozen sequential Apaleo calls (quote, amend, refunds).
// The sibling money routes set the same ceiling; the Vercel default would cut a
// POST off mid-refund and strand the row.
export const maxDuration = 120
export const dynamic = 'force-dynamic'

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Has this reservation already been moved?
 *
 * Tri-state on purpose. Only a row that got as far as amending Apaleo counts as
 * 'yes'; a 'processing' row without `amend_applied` is an in-flight or abandoned
 * attempt, which the UNIQUE constraint still serialises but which must not read
 * as "already used". 'unknown' is an unreadable ledger — the caller must answer
 * that as a retryable fault, not tell a guest they have spent a move they never
 * made.
 */
async function alreadyMoved(
  db: SupabaseClient,
  reservationId: string,
): Promise<'yes' | 'no' | 'unknown'> {
  const { data, error } = await db
    .from('reservation_rebookings')
    .select('amend_applied')
    .eq('reservation_id', reservationId)
    .maybeSingle()
  if (error) {
    bookingLog.error('rebook: ledger unreadable', { reservationId, error: error.message })
    return 'unknown'
  }
  return data?.amend_applied === true ? 'yes' : 'no'
}

/**
 * Update the ledger row and say whether it landed.
 *
 * supabase-js resolves with `{ error }` instead of throwing, so an unchecked
 * write is a silent one — and on this path a silent write means real money left
 * Adyen with nothing recording it.
 */
async function updateRow(
  db: SupabaseClient,
  reservationId: string,
  patch: Record<string, unknown>,
  label: string,
): Promise<boolean> {
  const { error } = await db
    .from('reservation_rebookings')
    .update(patch)
    .eq('reservation_id', reservationId)
  if (error) {
    bookingLog.error(`rebook: ledger write failed (${label})`, {
      reservationId,
      patch,
      error: error.message,
    })
    return false
  }
  return true
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const access = await verifyReservationOwnership(supabase, user, id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const from = request.nextUrl.searchParams.get('from')
  const to = request.nextUrl.searchParams.get('to')
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  const moved = await alreadyMoved(adminClient(), id)
  if (moved === 'unknown') {
    return NextResponse.json({ error: 'temporarily-unavailable' }, { status: 503 })
  }

  const result = await quoteRebook({
    reservationId: id,
    newArrival: from,
    newDeparture: to,
    facts: access.reservation,
    alreadyRebooked: moved === 'yes',
  })

  if (!result.ok) {
    return NextResponse.json(
      { eligible: false, reason: result.reason },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const q = result.quote
  return NextResponse.json(
    {
      eligible: true,
      oldRoomCents: q.oldRoomCents,
      newRoomCents: q.newRoomCents,
      deltaCents: q.deltaCents,
      currency: q.currency,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = adminClient()

  // ── Before the lock ────────────────────────────────────────────────────────
  // Deliberately outside the recovery try below: this request owns no row yet,
  // so a failure here must not write to one — an earlier version updated by
  // (reservation_id, status='processing') and could stamp a CONCURRENT
  // attempt's live row as failed.
  let quote: RebookQuote
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const access = await verifyReservationOwnership(supabase, user, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = (await request.json().catch(() => ({}))) as { from?: string; to?: string }
    if (!body.from || !body.to) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const moved = await alreadyMoved(db, id)
    if (moved === 'unknown') {
      return NextResponse.json({ error: 'temporarily-unavailable' }, { status: 503 })
    }

    const result = await quoteRebook({
      reservationId: id,
      newArrival: body.from,
      newDeparture: body.to,
      facts: access.reservation,
      alreadyRebooked: moved === 'yes',
    })
    if (!result.ok) {
      return NextResponse.json({ error: 'not-eligible', reason: result.reason }, { status: 409 })
    }
    quote = result.quote

    // This route only ever pays money BACK. A move that costs more needs the
    // card authorised first, which cannot happen inside one request — it goes
    // through rebook/save-pending and is applied by the Adyen webhook.
    if (quote.deltaCents > 0) {
      return NextResponse.json(
        { error: 'not-eligible', reason: 'top-up-required' },
        { status: 409 },
      )
    }
  } catch (err) {
    bookingLog.error('rebook: failed before taking the lock', {
      reservationId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }

  // ── Take the lock ──────────────────────────────────────────────────────────
  // Only a genuine UNIQUE violation means "already in flight or done" — any
  // other insert error is a server fault and must not be reported to the guest
  // as a permanent refusal.
  const { error: lockError } = await db.from('reservation_rebookings').insert({
    reservation_id: id,
    old_arrival: quote.oldArrival,
    old_departure: quote.oldDeparture,
    new_arrival: quote.newArrival,
    new_departure: quote.newDeparture,
    old_room_cents: quote.oldRoomCents,
    new_room_cents: quote.newRoomCents,
    delta_cents: quote.deltaCents,
    rate_plan_id: quote.ratePlanId,
    unit_id: quote.unitId ?? null,
    status: 'processing',
  })
  if (lockError) {
    if (lockError.code === '23505') {
      return NextResponse.json({ error: 'already-rebooked' }, { status: 409 })
    }
    bookingLog.error('rebook: could not take the lock', { reservationId: id, error: lockError.message })
    return NextResponse.json({ error: 'temporarily-unavailable' }, { status: 503 })
  }

  // ── From here the row exists and this request owns it ──────────────────────
  try {
    // Dates first: this direction only pays money BACK, so a failed amend leaves
    // nothing owed.
    try {
      await applyRebook(quote)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Never infer "nothing happened" from a throw: a gateway timeout on a PUT
      // Apaleo committed looks identical. Re-read and let the reservation say.
      const moved = await datesMoved(id, quote.newArrival, quote.newDeparture)

      if (moved === false) {
        // Provably untouched — release the lock so a transient outage does not
        // consume the guest's one allowance.
        const { error } = await db
          .from('reservation_rebookings')
          .delete()
          .eq('reservation_id', id)
          .eq('status', 'processing')
        if (error) {
          bookingLog.error('rebook: amend failed AND lock release failed — guest is stuck', {
            reservationId: id, error: error.message,
          })
        }
        bookingLog.error('rebook: amend failed — nothing moved, lock released', {
          reservationId: id, error: message,
        })
        return NextResponse.json({ error: 'amend-failed' }, { status: 502 })
      }

      if (moved === null) {
        // Outcome genuinely unknown. Keep the row — deleting it would erase the
        // only trace of an amend that may well have landed.
        await updateRow(db, id, {
          status: 'failed',
          note: `amend outcome UNKNOWN (re-read failed) — verify dates in Apaleo: ${message}`.slice(0, 500),
        }, 'amend-unknown')
        bookingLog.error('rebook: amend outcome unknown — needs a human', {
          reservationId: id, error: message,
        })
        return NextResponse.json({ error: 'amend-uncertain' }, { status: 502 })
      }

      // moved === true: the PUT landed, only the response was lost. The guest is
      // on the new dates and is owed the difference, so carry on and refund.
      bookingLog.warn('rebook: amend threw but the dates DID move — continuing to refund', {
        reservationId: id, error: message,
      })
    }

    // Reached only when the dates are known to have moved: the branches above
    // that could not establish that all return.
    if (!(await updateRow(db, id, { amend_applied: true }, 'amend_applied'))) {
      // The flag that tells "nothing happened" from "we owe money" did not land.
      // Say so loudly rather than continuing to write states that read as the
      // opposite of the truth.
      bookingLog.error('rebook: dates MOVED but amend_applied could not be recorded', {
        reservationId: id,
        dates: `${quote.newArrival}->${quote.newDeparture}`,
      })
    }

    // Put the guest back in their own studio: the amend re-assigns within the
    // category otherwise, and their room number and PIN are already issued.
    // Best-effort — but record a miss, because unit_id holds the studio we
    // INTENDED and would otherwise read as the one they got.
    if (quote.unitId) {
      const pinned = await assignUnit(id, quote.unitId)
      if (!pinned) {
        bookingLog.error('rebook: could not pin the guest back to their studio', {
          reservationId: id, unitId: quote.unitId,
        })
        await updateRow(db, id, {
          unit_id: null,
          note: `unit ${quote.unitId} could not be re-assigned — guest may be in a different studio`,
        }, 'assign-unit-miss')
      }
    }

    if (quote.refundPlan.length === 0) {
      await updateRow(db, id, { status: 'completed' }, 'completed')
      return NextResponse.json({ ok: true, refunded: false })
    }

    // Refund through Apaleo — it executes in Adyen AND records on the folio, so
    // refunding in Adyen as well would pay the guest twice. Every line was
    // already capped at that payment's remaining balance by the planner.
    const refundIds: string[] = []
    const failures: string[] = []
    let refundedCents = 0

    for (const line of quote.refundPlan) {
      const res = await refundFolioPayment({
        folioId: line.folioId,
        paymentId: line.paymentId,
        amountCents: line.amountCents,
        currency: line.currency,
      })
      if (res.success) {
        refundedCents += line.amountCents
        if (res.refundId) refundIds.push(res.refundId)
        // An accepted refund with no id can never be reconciled off the folio;
        // park the sentinel the cron understands so it cannot auto-complete.
        else refundIds.push('NEEDS_FOLIO_CHECK')
      } else {
        failures.push(`${line.paymentId}: ${res.error ?? 'unknown'}`)
      }
    }

    const owedCents = Math.abs(quote.deltaCents)
    const fullyRequested = refundedCents >= owedCents && failures.length === 0

    // 'requested', not 'completed': Apaleo accepts a refund as Pending and Adyen
    // may fail it later. reconcile-refunds reads this status off the folio and
    // settles the row — marking it completed here would hide a failed payout.
    //
    // A partial outcome must still carry its accepted refund ids AND stay
    // visible to the cron, so it is written 'requested' with a note rather than
    // 'failed' (which the cron never scans). The note warns the operator that
    // part of the money is already on its way.
    const partialWarning = refundIds.length
      ? ` — ALREADY REQUESTED ${refundedCents} (refundIds: ${refundIds.join(', ')}); check /folios refunds BEFORE any manual payout, do NOT refund those again`
      : ''
    // Anything Apaleo accepted must stay 'requested' so the cron keeps watching
    // it; only a plan where nothing at all was accepted is terminal here.
    const ok = await updateRow(db, id, {
      status: refundIds.length > 0 ? 'requested' : 'failed',
      adyen_modification_ref: refundIds.length > 0 ? refundIds.join(',') : null,
      refund_cents: refundedCents,
      note: fullyRequested
        ? null
        : `refund incomplete: requested ${refundedCents} of ${owedCents}${failures.length ? ` — ${failures.join('; ')}` : ''}${partialWarning}`.slice(0, 1000),
    }, 'refund-outcome')

    if (!ok) {
      // The refunds are already in flight at Apaleo and the row does not say so.
      // The log line is now the only record — make it complete enough to settle
      // from, and never claim success to the guest.
      bookingLog.error('rebook: REFUNDS ISSUED BUT LEDGER WRITE FAILED — settle by hand', {
        reservationId: id,
        refundIds,
        refundedCents,
        owedCents,
        currency: quote.currency,
      })
      return NextResponse.json({ ok: true, refunded: true, manualReview: true }, { status: 200 })
    }

    if (!fullyRequested) {
      bookingLog.error('rebook: dates moved but refund incomplete — manual payout needed', {
        reservationId: id,
        owedCents,
        refundedCents,
        refundIds,
        failures,
      })
    }

    return NextResponse.json({
      ok: true,
      refunded: true,
      // Apaleo settles refunds asynchronously, so this is what we asked for.
      refundRequestedCents: refundedCents,
      currency: quote.currency,
      manualReview: !fullyRequested,
    })
  } catch (err) {
    // A throw after the amend would otherwise 500 with the dates already moved
    // and the row stuck at 'processing'. Record it so it reaches the work-list.
    // Scoped to 'processing' so it cannot rewrite a row this run already settled.
    bookingLog.error('rebook: unhandled failure', {
      reservationId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    const { error } = await db
      .from('reservation_rebookings')
      .update({ status: 'failed', note: err instanceof Error ? err.message : String(err) })
      .eq('reservation_id', id)
      .eq('status', 'processing')
    if (error) {
      bookingLog.error('rebook: could not record the failure', { reservationId: id, error: error.message })
    }
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
