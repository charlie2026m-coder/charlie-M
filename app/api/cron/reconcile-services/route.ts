import { createClient } from '@supabase/supabase-js'
import { bookingLog } from '@/lib/logger'
import { notifySlack } from '@/lib/slack'

// Reconcile extras purchases that died mid-flight.
//
// Why this exists: bookPendingServices claims a row with a CAS lock
// (pending → processing) and only flips it to 'completed' after Apaleo has
// booked AND the folio capture succeeded. If the serverless function is killed
// in between — Vercel execution limit, a deploy, an Apaleo call that hangs —
// the row stays 'processing' forever and NOTHING retries it:
//   - Adyen redelivers, but the redelivery sees status='processing', logs a
//     duplicate, and the webhook still answers [accepted] — so Adyen stops.
//   - No other job looks at these rows.
// That window matters more since the cabinet can add a SECOND GUEST: the amend
// reprices the reservation for two BEFORE the money is captured, so a death in
// that window leaves the guest with a second person on the booking that nobody
// ever charged for.
//
// What this job does, conservatively:
//   - apaleo_booked_at set  → Apaleo booked and the capture returned; the guest
//     is correctly charged and only the status write was lost. Safe to finish
//     the job: flip to 'completed'.
//   - apaleo_booked_at null → we genuinely do not know how far it got. Never
//     guess: page a human with the reservation id so they can read the folio.
// It never refunds and never touches Apaleo — a wrong automatic refund here
// would cost real money (live Adyen).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// A 'processing' row younger than this is most likely a delivery still in
// flight, not a corpse. Generous: the whole book+capture path is seconds.
const STUCK_AFTER_MS = 15 * 60 * 1000
// Stop re-reporting ancient rows. Past this they are a data-cleanup task, not
// an incident, and re-alerting every run would train people to ignore the channel.
const GIVE_UP_AFTER_MS = 7 * 24 * 60 * 60 * 1000
// Bound the work per run.
const MAX_ROWS = 50

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(req: Request) {
  // If CRON_SECRET is set, require Vercel's cron bearer (this endpoint writes).
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const now = Date.now()

  const { data: rows, error } = await supabase
    .from('pending_services')
    .select('reference, reservation_id, updated_at, apaleo_booked_at, services')
    .eq('status', 'processing')
    .lt('updated_at', new Date(now - STUCK_AFTER_MS).toISOString())
    .order('updated_at', { ascending: true })
    .limit(MAX_ROWS)

  if (error) {
    bookingLog.error('reconcile-services: query failed', { error: error.message })
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  let promoted = 0
  let paged = 0
  let aged = 0

  for (const row of rows ?? []) {
    const ageMs = now - new Date(row.updated_at).getTime()
    if (ageMs > GIVE_UP_AFTER_MS) {
      aged++
      continue
    }

    // Apaleo booked and the capture returned — only the status write was lost.
    if (row.apaleo_booked_at) {
      const { error: flipError } = await supabase
        .from('pending_services')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('reference', row.reference)
        .eq('status', 'processing')
      if (flipError) {
        bookingLog.error('reconcile-services: could not promote a booked row', {
          reference: row.reference,
          error: flipError.message,
        })
        continue
      }
      promoted++
      bookingLog.warn('reconcile-services: promoted a stuck-but-booked row to completed', {
        reference: row.reference,
        reservationId: row.reservation_id,
        stuckForMin: Math.round(ageMs / 60000),
      })
      continue
    }

    // Unknown how far it got. The folio is the only truth and reading it wrong
    // costs money either way, so hand it to a human with everything they need.
    paged++
    const serviceIds = Array.isArray(row.services)
      ? row.services.map((s: { serviceId?: string }) => s?.serviceId).filter(Boolean).join(', ')
      : ''
    bookingLog.error('reconcile-services: stuck row needs a human', {
      reference: row.reference,
      reservationId: row.reservation_id,
      stuckForMin: Math.round(ageMs / 60000),
      services: serviceIds,
    })
    await notifySlack('critical', 'Extras: purchase stuck — needs a decision', {
      reservation: row.reservation_id,
      reference: row.reference,
      stuck_for: `${Math.round(ageMs / 60000)} min`,
      ...(serviceIds && { bought: serviceIds }),
      'to do':
        'open the Apaleo folio for this reservation: if the extras/second guest are on it and paid, set the row to completed; if they are on it UNPAID, capture or remove them; if nothing landed, refund the Adyen payment and set the row to failed',
    })
  }

  bookingLog.info('reconcile-services: run complete', {
    scanned: rows?.length ?? 0,
    promoted,
    paged,
    aged,
  })
  return Response.json({ ok: true, scanned: rows?.length ?? 0, promoted, paged, aged })
}
