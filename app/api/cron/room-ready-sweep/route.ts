import { Fetch } from '@/services/Request'
import { runRoomReady } from '@/services/roomReady'
import { bookingLog } from '@/lib/logger'

/**
 * Re-try the early door for every guest arriving today, all day.
 *
 * Why this exists
 * ---------------
 * The Guestway webhook fires ONCE per room and never retries, and its idea of
 * "the room is clean" can run an hour ahead of Apaleo's. Measured on prod
 * (2026-09-07, DMAPVJFC-1): the webhook arrived at 10:46 and the amend was
 * refused because Apaleo still had the unit dirty; the identical call by hand
 * went through at 11:45. A retry loop inside the webhook was tried and cannot
 * work — it had 30 seconds of budget against a gap of an hour, and on the slow
 * afternoons where refusals actually happen one attempt consumed all of it.
 *
 * Asking again every quarter of an hour does work, and it costs nothing when
 * there is nothing to do: openRoomEarly answers `nothing-earlier-to-gain` for
 * anyone already moved, so a guest is moved once and told once no matter how
 * many passes see them.
 *
 * It also makes the webhook optional. If the Guestway automation is switched
 * off, renamed or simply broken, doors still open — which is worth more than
 * any alert about the webhook's silence would have been.
 *
 * What it does NOT do is page anyone per reservation. Running 36 times a day,
 * a per-attempt alert on "not ready yet" would be a pager storm every morning
 * (measured at Motz19: every unit read Dirty through the whole cleaning shift).
 * The webhook keeps that job: it fires about once per room per day, so the
 * hard reasons still reach a human through it. See lib/roomReadyOutcome.
 */
export const dynamic = 'force-dynamic'
// Each arrival costs several sequential Apaleo round-trips, and Apaleo has been
// seen taking >25s on a busy afternoon. Higher than the other crons because
// this one is the only one whose work scales with the size of the house.
export const maxDuration = 300

// Bound the work per pass. Charlie M is 124 rooms, so a full changeover day is
// well past Motz19's 40 — but the slice always starts at the beginning of the
// list, so a cap below the real arrival count would mean the tail of the day
// never gets looked at, no matter how often the job runs. 120 covers the house;
// the duration below is what actually protects the function.
const MAX_ARRIVALS = 120

// The one pass per day that checks whether the whole feature did anything.
// Chosen at 14:00 Berlin: late enough that housekeeping has finished the
// morning turnovers, early enough to still be actionable before the 15:00
// check-ins start.
const AUDIT_FROM_HHMM = '14:00'
const AUDIT_TO_HHMM = '14:15'

/** Wall-clock date and time in the hotel's timezone. */
function berlinNow(now: Date): { date: string; hhmm: string } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now)
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  return { date, hhmm }
}

interface ArrivalRow {
  id: string
  arrival: string
  status?: string
}

export async function GET(req: Request) {
  // Same guard as the other crons: this endpoint writes to Apaleo.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Shares the room-ready kill switch: one place turns the whole feature off.
  if (process.env.GUESTWAY_ROOM_READY_ENABLED !== 'true') {
    return Response.json({ ok: true, skipped: 'disabled' })
  }

  const propId = process.env.APALEO_PROPERTY_ID
  if (!propId) {
    bookingLog.error('room-ready sweep: APALEO_PROPERTY_ID unset — refusing')
    return Response.json({ ok: false, error: 'not-configured' }, { status: 503 })
  }

  const now = new Date()
  const { date, hhmm } = berlinNow(now)

  let arrivals: ArrivalRow[]
  try {
    // Everyone arriving today. Not filtered to Confirmed here: the audit below
    // needs to see the ones already checked in too, and openRoomEarly refuses
    // any status but Confirmed on its own.
    const res = await Fetch<{ reservations?: ArrivalRow[] }>(
      `/booking/v1/reservations?propertyIds=${propId}&dateFilter=Arrival` +
        `&from=${date}T00:00:00Z&to=${date}T23:59:59Z&pageSize=100`,
    )
    arrivals = res?.reservations ?? []
  } catch (err) {
    // Reaching Apaleo at all is this job's one hard requirement.
    bookingLog.error('room-ready sweep: could not list today arrivals', {
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json({ ok: false }, { status: 500 })
  }

  const moved: string[] = []
  const reasons: Record<string, number> = {}
  // Rooms Apaleo still shows as holding the PREVIOUS guest. Collected by name
  // because, unlike a dirty room, this one does not fix itself: somebody has to
  // check that guest out.
  const occupied: string[] = []
  // Start somewhere different each pass.
  //
  // The work is one Apaleo round-trip per arrival at minimum, and a house this
  // size can hand the function more than it can finish. Always starting at the
  // top of the list would mean the same names are reached every time and the
  // ones after the cut-off are never looked at at all — they would lose the
  // feature entirely, silently. Rotating by the quarter-hour gives every
  // arrival its turn within the hour.
  const rotate = Math.floor(Number(hhmm.slice(3, 5)) / 15) % Math.max(1, arrivals.length)
  const ordered = [...arrivals.slice(rotate), ...arrivals.slice(0, rotate)]

  for (const r of ordered.slice(0, MAX_ARRIVALS)) {
    if (r.status === 'Canceled' || r.status === 'NoShow') continue
    try {
      const out = await runRoomReady(r.id, { alertOnFailure: false })
      if (out.status === 'moved') moved.push(r.id)
      else if (out.status === 'skipped') {
        reasons[out.reason] = (reasons[out.reason] ?? 0) + 1
        if (out.reason === 'unit-occupied') occupied.push(r.id)
      } else reasons.error = (reasons.error ?? 0) + 1
    } catch (err) {
      // One bad reservation must never cost the rest of the pass.
      bookingLog.warn('room-ready sweep: one reservation threw', {
        reservationId: r.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (moved.length) bookingLog.info('room-ready sweep: doors opened', { moved })

  // Once a day: did ANY arriving guest get in before the standard 15:00 today?
  //
  // If not, the feature is dead — Guestway silent AND this sweep refusing
  // everything — and that is exactly the failure that used to be invisible,
  // because every individual refusal looks like an ordinary "not ready yet".
  //
  // Read from the arrival TIME rather than from anything we remember, so it
  // survives a redeploy and needs no state. ⚠️ The one trap: Apaleo rewrites
  // `arrival` to the actual check-in moment when a guest checks in, so an early
  // arrival time is NOT by itself proof that we moved it. That is fine here —
  // the question asked is "did anybody get in early today", and a guest who
  // walked in at 14:00 answers it either way.
  const audited = hhmm >= AUDIT_FROM_HHMM && hhmm < AUDIT_TO_HHMM
  if (audited && arrivals.length > 0) {
    const early = arrivals.filter(
      (r) => r.status !== 'Canceled' && r.status !== 'NoShow' && hhmmOf(r.arrival) < '15:00',
    )
    if (early.length === 0) {
      bookingLog.error('room-ready: nobody got in early today — feature may be dead', {
        arrivalsToday: arrivals.length,
        reasons,
      })
    }
  }

  // Same one pass a day, different question: is a room still held by the guest
  // who left? `unit-occupied` is the one refusal that never clears on its own —
  // Apaleo keeps the previous reservation in the room until somebody checks it
  // out, whether by the QR or at the night audit. Before the reasons were split
  // this hid inside `unit-not-ready` and read like an unmade bed. At 14:00 it
  // is a front-desk task with an hour left to do it in.
  if (audited && occupied.length) {
    bookingLog.error('room-ready: previous guest still checked in — room cannot open', {
      arrivals: occupied,
    })
  }

  return Response.json({
    ok: true,
    arrivals: arrivals.length,
    moved: moved.length,
    reasons,
    audited,
  })
}

/** "HH:mm" of an Apaleo ISO timestamp, which carries the hotel's offset. */
function hhmmOf(iso: string): string {
  return typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : '99:99'
}
