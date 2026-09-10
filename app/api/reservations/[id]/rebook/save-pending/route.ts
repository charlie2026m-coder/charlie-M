import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { verifyReservationOwnership } from '@/lib/verifyReservationOwnership'
import { quoteRebook } from '@/services/apaleo/rebookDates'
import { bookingLog } from '@/lib/logger'

/**
 * Claim a date change that COSTS MORE, before the guest's card is authorised.
 *
 * The refund direction settles inside one request. Collecting money cannot:
 * the guest has to approve an authorisation, which reaches us on a webhook
 * minutes later — or never, if they close the card form. So the intent is
 * written down first, keyed by the Adyen merchantReference, and the webhook
 * applies it.
 *
 * What this endpoint does NOT do: touch Apaleo. Nothing is moved and nothing
 * is charged here, so an abandoned attempt costs the guest nothing and the
 * sweeper can release the row.
 *
 * The amount is returned by the server and re-derived again inside
 * make-payment and once more in the webhook. The browser never contributes a
 * number to what gets charged.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const access = await verifyReservationOwnership(supabase, user, id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = (await request.json().catch(() => ({}))) as {
      reference?: string
      from?: string
      to?: string
    }
    if (!body.from || !body.to) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const db = adminClient()

    // Has a move already been APPLIED? A row still waiting for payment has not,
    // and is handled below — the guest may well be retrying it.
    const { data: prior, error: priorErr } = await db
      .from('reservation_rebookings')
      .select('status, amend_applied')
      .eq('reservation_id', id)
      .maybeSingle()
    if (priorErr) {
      bookingLog.error('rebook top-up: ledger unreadable', { reservationId: id, error: priorErr.message })
      return NextResponse.json({ error: 'temporarily-unavailable' }, { status: 503 })
    }
    if (prior?.amend_applied === true) {
      return NextResponse.json({ error: 'already-rebooked' }, { status: 409 })
    }

    const result = await quoteRebook({
      reservationId: id,
      newArrival: body.from,
      newDeparture: body.to,
      facts: access.reservation,
      alreadyRebooked: false,
    })
    if (!result.ok) {
      return NextResponse.json({ error: 'not-eligible', reason: result.reason }, { status: 409 })
    }
    const quote = result.quote

    // Only the paying direction belongs here; a refund goes through the other
    // route, which can settle it immediately and without a card.
    if (quote.deltaCents <= 0) {
      return NextResponse.json({ error: 'no-top-up-needed' }, { status: 409 })
    }

    const row = {
      reservation_id: id,
      old_arrival: quote.oldArrival,
      old_departure: quote.oldDeparture,
      new_arrival: quote.newArrival,
      new_departure: quote.newDeparture,
      old_room_cents: quote.oldRoomCents,
      new_room_cents: quote.newRoomCents,
      delta_cents: quote.deltaCents,
      top_up_cents: quote.deltaCents,
      rate_plan_id: quote.ratePlanId,
      unit_id: quote.unitId ?? null,
      status: 'awaiting_payment',
      // `payment_reference` is set ONLY when an attempt is actually being
      // submitted. Writing it when the page merely loads meant a guest pressing
      // Back after paying re-mounted the page, minted a new reference and
      // re-pointed the row onto it — orphaning the authorization that was
      // already in flight, which the webhook could then no longer match to
      // anything.
      ...(body.reference ? { payment_reference: body.reference } : {}),
    }

    const { error: insertErr } = await db.from('reservation_rebookings').insert(row)

    if (insertErr) {
      if (insertErr.code !== '23505') {
        bookingLog.error('rebook top-up: could not claim the move', {
          reservationId: id,
          error: insertErr.message,
        })
        return NextResponse.json({ error: 'temporarily-unavailable' }, { status: 503 })
      }

      // A row already holds this reservation. If it is an unpaid attempt the
      // guest abandoned (or is redoing with different dates), re-point it at
      // the new reference — nothing was moved or charged for it, so there is
      // nothing to preserve. Anything further along is a genuine refusal.
      if (prior?.status !== 'awaiting_payment') {
        return NextResponse.json({ error: 'already-rebooked' }, { status: 409 })
      }
      // Scoped to a row still awaiting payment: once the webhook has claimed
      // it (status 'processing') an authorization is being applied, and its
      // reference must not be moved out from under it.
      const { error: updateErr } = await db
        .from('reservation_rebookings')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('reservation_id', id)
        .eq('status', 'awaiting_payment')
        .eq('amend_applied', false)
      if (updateErr) {
        bookingLog.error('rebook top-up: could not re-point the pending move', {
          reservationId: id,
          error: updateErr.message,
        })
        return NextResponse.json({ error: 'temporarily-unavailable' }, { status: 503 })
      }
    }

    bookingLog.info('rebook top-up pending', {
      reservationId: id,
      reference: body.reference,
      dates: `${quote.newArrival}->${quote.newDeparture}`,
      topUpCents: quote.deltaCents,
    })

    // The client charges THIS number, and make-payment re-derives it again
    // before Adyen ever sees it.
    return NextResponse.json({
      ok: true,
      amountCents: quote.deltaCents,
      currency: quote.currency,
      oldRoomCents: quote.oldRoomCents,
      newRoomCents: quote.newRoomCents,
    })
  } catch (err) {
    bookingLog.error('rebook top-up: save-pending failed', {
      reservationId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
