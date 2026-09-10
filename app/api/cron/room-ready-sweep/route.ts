import { Fetch } from '@/services/Request'
import { runRoomReady } from '@/services/roomReady'
import { unitReadiness } from '@/services/apaleo/amendStayTime'
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
 * (all 13 units read Dirty at 09:39, 10:00, 10:56 and 11:19 on 2026-09-08).
 * The webhook keeps that job: it fires about once per room per day, so the
 * hard reasons still reach a human through it. See lib/roomReadyOutcome.
 */
export const dynamic = 'force-dynamic'
// Each arrival costs several sequential Apaleo round-trips, and Apaleo has been
// seen taking >25s on a busy afternoon.
export const maxDuration = 300

// Bound the work per pass. Motz19 has 125 studios; a day where more than this
// many people arrive is a day this job should not be holding the function open.
const MAX_ARRIVALS = 120

// Stop STARTING new reservations once the pass has run this long. maxDuration is
// 60s and one reservation can cost several sequential Apaleo calls — >25s has
// been seen on a busy afternoon — so without this the function gets killed
// mid-loop. That is worse than it sounds: Apaleo returns the day's arrivals in a
// stable order, so the same tail of the list would be starved on every single
// pass rather than a different one each time.
const PASS_BUDGET_MS = 240_000

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
  unit?: { id?: string; name?: string }
}

/** The house check-in hour. Anyone whose arrival sits before it has a door that
 *  opens early — whether we moved it or they paid for it. */
const STANDARD_CHECKIN_HHMM = '15:00'

// How long a door may stand open onto a room Apaleo still calls dirty before it
// counts as a real problem rather than the housekeeping flag lagging behind
// Guestway's. The measured lags are an hour (2026-09-07) and an hour and three
// quarters (2026-09-10); three hours clears both with room to spare, and a room
// still unready three hours after its guest was let in is not a lag.
const STALE_AFTER_MIN = 180

/** Minutes since midnight for a zero-padded "HH:mm". */
function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0
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
  const startedAt = Date.now()
  let skippedForTime = 0
  // Start somewhere different each pass.
  //
  // The deadline below stops a pass that is running long, which protects the
  // function — but on its own it does not protect the GUESTS at the end of the
  // list: Apaleo returns the day's arrivals in a stable order, so the same
  // names would be reached every quarter of an hour and the ones after the
  // cut-off never once. They would lose the feature entirely, silently, with
  // every refusal in the log describing somebody else. Rotating by the
  // quarter-hour gives every arrival its turn within the hour.
  const rotate = Math.floor(Number(hhmm.slice(3, 5)) / 15) % Math.max(1, arrivals.length)
  const candidates = [...arrivals.slice(rotate), ...arrivals.slice(0, rotate)]
    .slice(0, MAX_ARRIVALS)
    // openRoomEarly acts on Confirmed only — anyone already checked in, checked
    // out or cancelled costs a reservation fetch just to be refused, on every
    // one of the day's 36 passes. The audit below still reads the full list.
    // An absent status is left in: unknown is not a reason to skip a guest.
    .filter((r) => r.status === undefined || r.status === 'Confirmed')

  for (const r of candidates) {
    if (Date.now() - startedAt > PASS_BUDGET_MS) {
      skippedForTime = candidates.length - candidates.indexOf(r)
      bookingLog.warn('room-ready sweep: out of time, leaving the rest to the next pass', {
        done: candidates.length - skippedForTime,
        left: skippedForTime,
      })
      break
    }
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

  // THE OTHER DIRECTION: a door that is already open onto a room that is not
  // ready. Everything above asks "may this guest come in early yet"; this asks
  // "is the room still fit for the guest we already let in".
  //
  // Nothing was watching that. openRoomEarly re-reads the room immediately
  // before it amends, but once the amend lands the lock is synced and the code
  // has no further say — Apaleo can move the guest to another unit, or the room
  // can stop being clean, and the guest simply walks into it. That is the half
  // of the 2026-09-08 incident the last-look guard cannot reach, and it is the
  // half nobody could see.
  //
  // Only reservations still Confirmed: once a guest checks in Apaleo rewrites
  // `arrival` to the check-in moment, so an early time would no longer mean the
  // door was opened ahead of the hour.
  //
  // This alerts on every pass while it lasts, which is intended — an open door
  // onto a dirty room is an active problem, not a daily digest. Slack throttles
  // per message text and the id is in the text, so it is one line per guest per
  // ten minutes, and it stops the moment the room is fixed or the guest arrives.
  for (const r of arrivals) {
    if (Date.now() - startedAt > PASS_BUDGET_MS) break
    if (r.status !== 'Confirmed') continue
    // Early AND already open. Both halves are needed: `< 15:00` says the door
    // was opened ahead of the hour, `<= now` says it has actually opened.
    //
    // Without the second, a paid early check-in — arrival 13:00, bought, not
    // moved by us — would be read at 08:10 as a door standing open onto a dirty
    // room. It is not: their room has until 13:00 to be cleaned and normally is.
    // Several such arrivals a day would have meant the channel filling up every
    // morning with rooms that were perfectly on schedule.
    const arrivalHHmm = hhmmOf(r.arrival)
    if (arrivalHHmm >= STANDARD_CHECKIN_HHMM) continue
    if (arrivalHHmm > hhmm) continue
    if (!r.unit?.id) continue
    const readiness = await unitReadiness(r.unit.id)
    if (readiness === 'ready') continue

    // `dirty` here is usually not a problem at all any more, and that is new.
    // Since the webhook takes Guestway's word on cleanliness, a door opens the
    // moment Guestway says the room is finished — while Apaleo's own flag can
    // still read Dirty for a good while after. Measured: an hour on 2026-09-07,
    // an hour and three quarters on 2026-09-10. Alerting on that would page for
    // every guest we successfully served, which is the opposite of the job.
    //
    // So the two are treated differently. `occupied` is wrong immediately and
    // unambiguously — the previous guest is still checked in, and no lag
    // explains that. `dirty` and `unknown` only mean something once they have
    // outlasted any plausible lag, so they wait out a grace window and then say
    // so, because a room still unready hours after its door opened is real.
    const openForMin = minutesOf(hhmm) - minutesOf(arrivalHHmm)
    if (readiness !== 'occupied' && openForMin < STALE_AFTER_MIN) continue

    bookingLog.error(`room-ready: door already open onto a room that is not ready — ${r.id}`, {
      reservationId: r.id,
      room: r.unit.name ?? r.unit.id,
      readiness,
      openSince: arrivalHHmm,
      openForMin,
    })
  }

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
    tried: candidates.length - skippedForTime,
    moved: moved.length,
    reasons,
    audited,
  })
}

/** "HH:mm" of an Apaleo ISO timestamp, which carries the hotel's offset. */
function hhmmOf(iso: string): string {
  return typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : '99:99'
}
