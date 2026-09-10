import { createClient } from '@supabase/supabase-js'
import { Fetch } from '@/services/Request'
import { bookingLog } from '@/lib/logger'
import { getFolioRefundStatuses } from '@/services/apaleo/refundFolioPayment'
import { loadReservationForAmend } from '@/services/apaleo/amendStayTime'

// Reconcile cancellation refunds against the Apaleo folio (the source of truth).
//
// Why this exists: cancellation refunds now go THROUGH Apaleo (Apaleo executes
// them via the connected Adyen account). The resulting Adyen REFUND/REFUND_FAILED
// webhook carries Apaleo's OWN reference, not our `${reservationId}::` one — so
// the Adyen webhook can no longer flip reservation_refunds to completed/failed.
// Without this job a row would sit at 'requested' forever, and a refund that
// Apaleo accepted but Adyen later FAILED downstream (e.g. insufficient merchant
// balance) would never surface — a silent guest-not-refunded. Here we read each
// refund's status off the folio (by the refund ids we stored in
// adyen_modification_ref) and advance the row: any Failure → 'failed' (manual);
// all settled → 'completed'; still Pending / not yet visible → leave for next run.
//
// Idempotent and read-mostly: only flips our own 'requested' rows based on
// Apaleo's verdict, so a re-run is harmless. Runs on a Vercel cron (vercel.json).
export const dynamic = 'force-dynamic'
// Three passes now (two refund sweeps + the stale-lock recovery), each costing
// 2-3 sequential Apaleo calls per row. At 60s the first pass could eat the whole
// budget and the others would never run — a rebooking refund that Adyen failed
// would then never surface, which is the exact silence this job exists to break.
export const maxDuration = 300

// Stop starting new rows this late into the run, so a truncated sweep still
// returns its counts instead of being killed mid-write.
const BUDGET_MS = 240 * 1000

// A refund found on the folio but not 'Success' after this long → flag 'failed'
// for a human (covers stuck settlement and the id-less 'NEEDS_FOLIO_CHECK'
// sentinel). Generous, to tolerate normal async settlement.
const STUCK_MS = 72 * 60 * 60 * 1000
// A 'requested' row whose stored ref matches NO folio refund after this long →
// flag 'failed' (drains legacy/direct-Adyen rows so they don't rescan forever).
const LEGACY_MS = 7 * 24 * 60 * 60 * 1000
const SENTINEL = 'NEEDS_FOLIO_CHECK'
// The rebook route runs under maxDuration=120, so a 'processing' row older than
// this cannot still be in flight — the function was killed (timeout, deploy,
// OOM) between taking the lock and settling it.
const STUCK_PROCESSING_MS = 15 * 60 * 1000
// A top-up row the guest never paid for. Generous: 3-D Secure can sit on a
// bank's app for a while, and releasing too early would hand the guest's one
// move back while their authorisation is still in flight.
const ABANDONED_PAYMENT_MS = 60 * 60 * 1000

interface FoliosListResponse {
  folios?: Array<{ id: string }>
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Settle one table's in-flight refunds against the folio.
 *
 * Two tables carry Apaleo refunds now: `reservation_refunds` (cancellations) and
 * `reservation_rebookings` (date changes). They cannot be merged — the former's
 * UNIQUE(reservation_id) is the cancellation lock, so a rebooking refund written
 * there would collide with a later cancellation of the same booking. They do
 * share the four columns this job needs (reservation_id, status,
 * adyen_modification_ref, created_at), so the same verdict logic serves both.
 */
async function reconcileTable(
  supabase: ReturnType<typeof createAdminClient>,
  table: 'reservation_refunds' | 'reservation_rebookings',
  deadline: number,
) {
  // Our own in-flight refunds: status 'requested' AND we stored the Apaleo refund
  // id(s). (Old direct-Adyen rows without a matching folio refund id simply never
  // match below and are left untouched — forward-only.)
  const { data: rows, error } = await supabase
    .from(table)
    .select('reservation_id, adyen_modification_ref, created_at')
    .eq('status', 'requested')
    .not('adyen_modification_ref', 'is', null)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    bookingLog.error('reconcile-refunds: failed to read requested rows', { table, error: error.message })
    return { table, error: error.message, scanned: 0, completed: 0, failed: 0, pending: 0, skipped: 0 }
  }

  let completed = 0
  let failed = 0
  let pending = 0
  let skipped = 0
  let truncated = false

  for (const row of rows ?? []) {
    // Hand the remaining rows to the next run rather than being killed partway
    // through a write. Silent truncation would read as "nothing left to settle".
    if (Date.now() > deadline) {
      truncated = true
      bookingLog.warn('reconcile-refunds: out of time, deferring rows to next run', { table })
      break
    }
    const ids = String(row.adyen_modification_ref ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (ids.length === 0) {
      skipped++
      continue
    }

    const mark = (fields: Record<string, unknown>) =>
      supabase
        .from(table)
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('reservation_id', row.reservation_id)
        .eq('status', 'requested')

    try {
      const list = await Fetch<FoliosListResponse>(
        `/finance/v1/folios?reservationIds=${encodeURIComponent(row.reservation_id)}`,
      )
      const folioIds = (list.folios ?? []).map((f) => f.id).filter(Boolean)
      // No folios returned (transient/archived/scoping) — do NOT treat as "no
      // refund exists", which would wrongly drain a real row to 'failed'. Skip and
      // let a later run see the folios.
      if (folioIds.length === 0) {
        skipped++
        bookingLog.warn('reconcile-refunds: no folios returned for reservation — skipping', {
          reservationId: row.reservation_id,
        })
        continue
      }
      const statusById = await getFolioRefundStatuses(folioIds)

      // The sentinel (an id-less accepted refund) never resolves on its own — its
      // presence alone must block completion and force a timeout to manual.
      const hasSentinel = ids.includes(SENTINEL)
      const realIds = ids.filter((id) => id !== SENTINEL)
      // Apaleo RefundModel.status ∈ {Pending, Success, Failure, Canceled}.
      // Success = money returned; Failure/Canceled = it did NOT; Pending = money is
      // en route (wait — never time it out); undefined = not yet visible on folio.
      const failedIds = realIds.filter((id) => {
        const s = statusById.get(id)
        return s === 'Failure' || s === 'Canceled'
      })
      const allSuccess = realIds.length > 0 && realIds.every((id) => statusById.get(id) === 'Success')
      const anyFound = realIds.some((id) => statusById.get(id) != null)
      const anyPending = realIds.some((id) => statusById.get(id) === 'Pending')
      const ageMs = Date.now() - Date.parse(row.created_at)

      if (failedIds.length > 0) {
        // A refund Apaleo accepted but that FAILED/was Canceled downstream — the
        // guest was NOT refunded. Flag for a human; never silently complete.
        // Name the slices that DID settle: a refund plan can span several
        // payments, so "guest not refunded" flat-out would invite an operator to
        // pay the whole amount again on top of the part already returned.
        const settledIds = realIds.filter((id) => statusById.get(id) === 'Success')
        await mark({
          status: 'failed',
          note: `Apaleo refund FAILED/Canceled downstream (refundIds: ${failedIds.join(', ')}) — settle manually${
            settledIds.length
              ? `. ALREADY SETTLED, do NOT refund again: ${settledIds.join(', ')}`
              : ' — guest not refunded'
          }`.slice(0, 500),
        })
        failed++
        bookingLog.error('reconcile-refunds: refund failed downstream', {
          reservationId: row.reservation_id,
          failedIds,
        })
      } else if (allSuccess && !hasSentinel) {
        await mark({ status: 'completed' })
        completed++
      } else if (anyPending) {
        // At least one refund is still 'Pending' — money is en route and WILL
        // resolve to Success/Failure. Never time this out to 'failed' (a human
        // seeing 'failed' might re-refund → double-pay). Wait for the next run.
        pending++
      } else if ((anyFound || hasSentinel) && ageMs > STUCK_MS) {
        // Found on the folio but stuck not-Success with NOTHING pending after 72h
        // (an id that never reached a terminal state, or an unverifiable id-less
        // slice) → surface for a human, with an explicit do-not-double-refund note.
        await mark({
          status: 'failed',
          note: `reconcile timeout: refund(s) not Success after 72h${hasSentinel ? ' (includes an id-less slice)' : ''} — CHECK /folios refunds BEFORE any manual refund; it may have settled, do NOT double-refund`.slice(
            0,
            500,
          ),
        })
        failed++
        bookingLog.error('reconcile-refunds: refund stuck — timed out to manual', {
          reservationId: row.reservation_id,
          hasSentinel,
        })
      } else if (!anyFound && !hasSentinel && ageMs > LEGACY_MS) {
        // Stored ref matches no folio refund after 7d (legacy direct-Adyen row, or
        // a lost reference) → drain to manual so it stops rescanning forever.
        await mark({
          status: 'failed',
          note: 'reconcile: no matching folio refund after 7d — verify/resolve manually',
        })
        failed++
      } else {
        pending++ // still settling, or an id not yet visible — next run picks it up
      }
    } catch (err) {
      skipped++
      bookingLog.error('reconcile-refunds: row check failed', {
        reservationId: row.reservation_id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { table, scanned: rows?.length ?? 0, completed, failed, pending, skipped, truncated }
}

/**
 * Recover rebooking rows stranded at 'processing'.
 *
 * The route deletes its own row only when it can PROVE Apaleo was untouched, so
 * a row can outlive its request when the function is killed outright. Left
 * alone that row is a dead end in both directions: `alreadyMoved` reads
 * amend_applied=false so the cabinet keeps offering the move, while the UNIQUE
 * lock makes every retry 409 — and if the amend HAD landed, a refund is owed
 * and nothing is watching for it.
 *
 * Apaleo is the arbiter, same test the route uses: do the reservation's dates
 * match what the row asked for?
 */
async function sweepStuckRebookings(
  supabase: ReturnType<typeof createAdminClient>,
  deadline: number,
) {
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_MS).toISOString()
  const { data: rows, error } = await supabase
    .from('reservation_rebookings')
    .select('reservation_id, new_arrival, new_departure, delta_cents, created_at')
    .eq('status', 'processing')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    bookingLog.error('reconcile-refunds: failed to read stuck rebookings', { error: error.message })
    return { error: error.message, scanned: 0, released: 0, flagged: 0, skipped: 0 }
  }

  let released = 0
  let flagged = 0
  let skipped = 0

  // Top-ups the guest walked away from. Nothing reached Apaleo for these — the
  // row is only a claim on their single move — so the whole repair is to let
  // go of it. Left alone it would bar them from ever moving that booking.
  const payCutoff = new Date(Date.now() - ABANDONED_PAYMENT_MS).toISOString()
  const { data: abandoned, error: abandonedErr } = await supabase
    .from('reservation_rebookings')
    .delete()
    .eq('status', 'awaiting_payment')
    .eq('amend_applied', false)
    // updated_at, not created_at: re-entering the flow with new dates re-points
    // the SAME row and refreshes only updated_at, so ageing by creation could
    // delete a claim whose authorization is in flight right now.
    .lt('updated_at', payCutoff)
    .select('reservation_id')
  if (abandonedErr) {
    bookingLog.error('reconcile-refunds: could not release abandoned top-ups', {
      error: abandonedErr.message,
    })
    // Surfaced, not swallowed: GET turns any error here into a non-2xx, so a
    // broken sweep is visible to cron monitoring instead of reading as healthy.
    return { error: abandonedErr.message, scanned: 0, released: 0, flagged: 0, skipped: 0 }
  } else if (abandoned?.length) {
    released += abandoned.length
    bookingLog.info('reconcile-refunds: released abandoned top-up claims', {
      count: abandoned.length,
      reservationIds: abandoned.map((r) => r.reservation_id),
    })
  }

  for (const row of rows ?? []) {
    if (Date.now() > deadline) break
    try {
      const res = await loadReservationForAmend(row.reservation_id)
      if (!res) {
        skipped++
        continue
      }
      const moved =
        res.arrival.slice(0, 10) === String(row.new_arrival) &&
        res.departure.slice(0, 10) === String(row.new_departure)

      if (moved) {
        // The dates DID move. Money is owed and no refund reference was ever
        // stored, so this needs a human — but the flag must say what happened.
        const { error: e } = await supabase
          .from('reservation_rebookings')
          .update({
            status: 'failed',
            amend_applied: true,
            note: `stranded mid-run: dates MOVED in Apaleo but the refund was never recorded — owe ${Math.abs(
              Number(row.delta_cents ?? 0),
            )} cents; CHECK /folios refunds before paying, it may have partly settled`,
            updated_at: new Date().toISOString(),
          })
          .eq('reservation_id', row.reservation_id)
          .eq('status', 'processing')
        if (e) {
          skipped++
          bookingLog.error('reconcile-refunds: could not flag stranded rebooking', {
            reservationId: row.reservation_id,
            error: e.message,
          })
          continue
        }
        flagged++
        bookingLog.error('reconcile-refunds: stranded rebooking — dates moved, refund owed', {
          reservationId: row.reservation_id,
          deltaCents: row.delta_cents,
        })
      } else {
        // Apaleo never moved: nothing happened, nothing is owed. Release the
        // lock so the guest is not permanently barred from their one move.
        const { error: e } = await supabase
          .from('reservation_rebookings')
          .delete()
          .eq('reservation_id', row.reservation_id)
          .eq('status', 'processing')
        if (e) {
          skipped++
          bookingLog.error('reconcile-refunds: could not release stuck rebooking lock', {
            reservationId: row.reservation_id,
            error: e.message,
          })
          continue
        }
        released++
        bookingLog.warn('reconcile-refunds: released a stuck rebooking lock (nothing moved)', {
          reservationId: row.reservation_id,
        })
      }
    } catch (err) {
      skipped++
      bookingLog.error('reconcile-refunds: stuck-rebooking check failed', {
        reservationId: row.reservation_id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { scanned: rows?.length ?? 0, released, flagged, skipped }
}

export async function GET(req: Request) {
  // If CRON_SECRET is set, require Vercel's cron bearer (this endpoint writes).
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const deadline = Date.now() + BUDGET_MS

  // Sequential on purpose: both sweeps hit Apaleo per row, and running them
  // together would double the burst against the shared rate limit.
  //
  // Alternating which goes first matters. A fixed order means a persistent
  // backlog in the first table starves the second on EVERY run, and the cron
  // fires every 15 minutes — so the starved table would never be swept at all.
  const cancellationsFirst = Math.floor(Date.now() / 900_000) % 2 === 0
  const order: Array<'reservation_refunds' | 'reservation_rebookings'> = cancellationsFirst
    ? ['reservation_refunds', 'reservation_rebookings']
    : ['reservation_rebookings', 'reservation_refunds']

  const results: Record<string, Awaited<ReturnType<typeof reconcileTable>>> = {}
  for (const table of order) {
    results[table] = await reconcileTable(supabase, table, deadline)
  }

  const cancellations = results['reservation_refunds']
  const rebookings = results['reservation_rebookings']
  const stuck = await sweepStuckRebookings(supabase, deadline)

  // A sweep that could not even read its table must not report success: the
  // Vercel cron monitor only sees the status code and this flag, and a silently
  // broken reconciler means guests sit unrefunded with nobody alerted.
  const ok = !cancellations.error && !rebookings.error && !stuck.error

  return Response.json(
    { ok, order, cancellations, rebookings, stuck },
    { status: ok ? 200 : 500 },
  )
}
