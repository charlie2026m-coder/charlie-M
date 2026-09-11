import { Fetch } from '@/services/Request'
import { runRoomReady } from '@/services/roomReady'
import { unitReadiness } from '@/services/apaleo/amendStayTime'
import { bookingLog } from '@/lib/logger'
import { notifySlack } from '@/lib/slack'
import { sameGuest } from '@/lib/sameGuest'

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
 * The kill switch (GUESTWAY_ROOM_READY_ENABLED) turns off the DOORS, not the
 * eyes. Opening a room early is one job; noticing that a guest is nearly here
 * and the room is not ready, or that a late checkout and an early check-in were
 * sold on the same room, needs nothing but Apaleo and is owed to every hotel —
 * including the ones where early doors are switched off. So with the switch off
 * this still watches; it merely opens nothing and skips the audits that only
 * make sense when the doors are live.
 *
 * What it does NOT do is page anyone per reservation. Running 44 times a day,
 * a per-attempt alert on "not ready yet" would be a pager storm every morning
 * (all 13 units read Dirty at 09:39, 10:00, 10:56 and 11:19 on 2026-09-08).
 * The webhook keeps that job: it fires about once per room per day, so the
 * hard reasons still reach a human through it. See lib/roomReadyOutcome.
 */
export const dynamic = 'force-dynamic'
// Each arrival costs several sequential Apaleo round-trips, and Apaleo has been
// seen taking >25s on a busy afternoon.
export const maxDuration = 60

// Bound the work per pass. A day where more than this
// many people arrive is a day this job should not be holding the function open.
// The cap ROTATES with the pass (see below): Apaleo returns the day in a stable
// order, and a fixed `slice(0, 40)` meant guest #41 was never tried all day.
const MAX_ARRIVALS = 40

// Apaleo has no page ceiling (1000 is accepted) but it truncates SILENTLY —
// pageSize=100 against a count of 150 returns 100 rows and a 200. A full
// turnover day at 125 studios must still come back whole.
const PAGE_SIZE = 500

// ONE morning report, on the first pass after Apaleo has assigned the day's
// rooms (night audit). Before that most arrivals have no unit at all — 55 of 63
// upcoming ones on 2026-09-11 — so nothing room-specific can be said earlier.
// Both seasons have a pass at 08:10 Berlin (the cron runs on UTC hours).
const MORNING_FROM_HHMM = '08:00'
const MORNING_TO_HHMM = '08:15'

// Stop STARTING new reservations once the pass has run this long. maxDuration is
// 60s and one reservation can cost several sequential Apaleo calls — >25s has
// been seen on a busy afternoon — so without this the function gets killed
// mid-loop. That is worse than it sounds: Apaleo returns the day's arrivals in a
// stable order, so the same tail of the list would be starved on every single
// pass rather than a different one each time.
const PASS_BUDGET_MS = 45_000

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
  primaryGuest?: { email?: string; lastName?: string }
  departure?: string
}

/** The house checkout hour. A departure later than this was bought. */
const DEFAULT_CHECKOUT_HHMM = '11:00'

/**
 * Is this arrival the same guest simply carrying on in the same room?
 *
 * A stay can be split across two reservations — a guest who books four nights
 * and later adds the night before ends up with two, back to back, in one room.
 * Apaleo treats the seam as a checkout and a check-in: the first reservation
 * closes at 11:00, the room is marked Dirty because every checkout is, and the
 * second opens at 15:00. Nobody has left, nobody is locked out, and no turnover
 * clean is owed.
 *
 * Measured on prod 2026-09-10, room 310: `AVVEXQIM-1` 09.09→10.09 and
 * `NSMDXCVX-1` 10.09→14.09, same room, same address
 * (ackerbauer.michael@gmx.at). The urgent alert called that "guest was due 21
 * min ago and cannot get in" — he had been in the room since the day before.
 *
 * Matched on email, falling back to surname when the address is missing. A
 * false match costs a silenced alert on a genuinely unready room, so it takes
 * the same unit AND the departure being today AND the guest agreeing.
 */
function isSameGuestCarryingOn(r: ArrivalRow, departures: ArrivalRow[]): boolean {
  const unitId = r.unit?.id
  if (!unitId) return false
  // Only a POSITIVE match counts. Unknown means "not proven to be a
  // continuation", so the alert still goes out — a needless page beats a guest
  // locked out in silence.
  return departures.some(
    (other) =>
      other.id !== r.id &&
      other.unit?.id === unitId &&
      other.status !== 'Canceled' &&
      other.status !== 'NoShow' &&
      sameGuest(r.primaryGuest, other.primaryGuest) === true,
  )
}

/** The reservation leaving this guest's room today LATER than the house hour —
 *  a bought late checkout, or the shape of one. Undefined when nobody is. */
function lateCheckoutToday(r: ArrivalRow, departures: ArrivalRow[]): ArrivalRow | undefined {
  const unitId = r.unit?.id
  if (!unitId) return undefined
  return departures.find(
    (d) =>
      d.id !== r.id &&
      d.unit?.id === unitId &&
      d.status !== 'Canceled' &&
      d.status !== 'NoShow' &&
      !!d.departure &&
      hhmmOf(d.departure) > DEFAULT_CHECKOUT_HHMM,
  )
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

// How close to a guest's arrival an unready room stops being housekeeping's
// ordinary morning and becomes something somebody has to act on now.
//
// Before this, "no early door yet" is not a problem at all — the room is simply
// being cleaned in time for the booked hour, which is what the hour is for.
// Saying otherwise is what made a normal 14:10 read as two broken rooms.
const URGENT_BEFORE_MIN = 30

/** Plain words for the reasons a door stayed shut. The alert is read by whoever
 *  can fix it, not by whoever wrote the code. */
const PLAIN: Record<string, string> = {
  'unit-dirty': 'not cleaned yet',
  'unit-occupied': 'previous guest still checked in',
  'unit-unknown': 'room status unreadable',
  'unit-reassigned': 'guest moved to another room',
  'unit-no-longer-ready': 'room stopped being ready',
  'no-unit-assigned': 'no room assigned yet',
  'no-offer': 'Apaleo offered nothing for the earlier time',
  'price-drift': 'price would change — refused',
  'opposite-extension-conflict': 'departing guest bought a late checkout',
  'nothing-earlier-to-gain': 'nothing earlier to gain',
  opened: 'opened',
}

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
  // Shares the room-ready kill switch — for the DOORS. The watches below run
  // regardless (see the header).
  const doorsEnabled = process.env.GUESTWAY_ROOM_READY_ENABLED === 'true'

  const propId = process.env.APALEO_PROPERTY_ID
  if (!propId) {
    bookingLog.error('room-ready sweep: APALEO_PROPERTY_ID unset — refusing')
    return Response.json({ ok: false, error: 'not-configured' }, { status: 503 })
  }

  const now = new Date()
  const { date, hhmm } = berlinNow(now)

  // One day of reservations, whole. Every check below runs over this list, so a
  // row Apaleo quietly dropped off the end of a page is a guest nobody watches —
  // say so at error level, because the list itself looks perfectly healthy.
  const listToday = async (dateFilter: 'Arrival' | 'Departure'): Promise<ArrivalRow[]> => {
    const res = await Fetch<{ count?: number; reservations?: ArrivalRow[] }>(
      `/booking/v1/reservations?propertyIds=${propId}&dateFilter=${dateFilter}` +
        `&from=${date}T00:00:00Z&to=${date}T23:59:59Z&expand=primaryGuest&pageSize=${PAGE_SIZE}`,
    )
    const rows = res?.reservations ?? []
    if (typeof res?.count === 'number' && res.count > rows.length) {
      bookingLog.error(`room-ready sweep: today's ${dateFilter.toLowerCase()} list is truncated`, {
        count: res.count,
        returned: rows.length,
      })
    }
    return rows
  }

  let arrivals: ArrivalRow[]
  try {
    // Everyone arriving today. Not filtered to Confirmed here: the audit below
    // needs to see the ones already checked in too, and openRoomEarly refuses
    // any status but Confirmed on its own.
    arrivals = await listToday('Arrival')
  } catch (err) {
    // Reaching Apaleo at all is this job's one hard requirement.
    bookingLog.error('room-ready sweep: could not list today arrivals', {
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json({ ok: false }, { status: 500 })
  }

  // Today's departures, read once per pass and only when somebody asks. Two
  // questions need them: is an arriving guest simply the departing one carrying
  // on, and did a late checkout eat an early check-in's cleaning window.
  let departuresPromise: Promise<ArrivalRow[]> | undefined
  const departuresToday = (): Promise<ArrivalRow[]> =>
    (departuresPromise ??= listToday('Departure')
      .catch((err) => {
        // Unknown is not proof of anything: the alerts that ask go out anyway.
        bookingLog.warn('room-ready sweep: could not list today departures', {
          error: err instanceof Error ? err.message : String(err),
        })
        return [] as ArrivalRow[]
      }))

  // Did this guest PAY for their early hour? The folio says: both purchase paths
  // post the fee under this exact name (services/apaleo/amendStayTime.ts). Read
  // only when it matters — an early arrival into a room that is not ready — and
  // once per reservation per pass. `null` when the folio could not be read.
  const paidEciMemo = new Map<string, Promise<boolean | null>>()
  const paidEarlyCheckIn = (reservationId: string): Promise<boolean | null> => {
    let p = paidEciMemo.get(reservationId)
    if (!p) {
      p = Fetch<{ folios?: Array<{ charges?: Array<{ name?: string }> }> }>(
        `/finance/v1/folios?reservationIds=${encodeURIComponent(reservationId)}&expand=charges`,
      )
        .then((res) =>
          (res?.folios ?? []).some((f) => (f.charges ?? []).some((c) => c.name === 'Early Check-In')),
        )
        .catch((err) => {
          bookingLog.warn('room-ready sweep: could not read the folio', {
            reservationId,
            error: err instanceof Error ? err.message : String(err),
          })
          return null
        })
      paidEciMemo.set(reservationId, p)
    }
    return p
  }

  const moved: string[] = []
  const reasons: Record<string, number> = {}
  // Rooms Apaleo still shows as holding the PREVIOUS guest. Collected by name
  // because, unlike a dirty room, this one does not fix itself: somebody has to
  // check that guest out.
  const occupied: string[] = []
  // What happened to each guest this pass, for the once-a-day summary. Kept per
  // reservation rather than as counts: "four of five opened" is not an answer to
  // "did it work for MY guest", and the fifth is the one worth naming.
  const outcome = new Map<string, string>()
  const startedAt = Date.now()
  let skippedForTime = 0
  // openRoomEarly acts on Confirmed only — anyone already checked in, checked
  // out or cancelled costs a reservation fetch just to be refused, on every
  // one of the day's 44 passes. The audit below still reads the full list.
  // An absent status is left in: unknown is not a reason to skip a guest.
  const confirmed = arrivals.filter((r) => r.status === undefined || r.status === 'Confirmed')
  // Cap the pass, but start somewhere else each time. Apaleo hands the day back
  // in a stable order, so a fixed `slice(0, MAX_ARRIVALS)` is not a cap — it is
  // a list of guests who never get an early door. Each pass starts 40 rows
  // further in (modulo the day), so every guest is reached within the hour.
  const shift =
    confirmed.length > MAX_ARRIVALS
      ? (Math.floor(minutesOf(hhmm) / 15) * MAX_ARRIVALS) % confirmed.length
      : 0
  const candidates = [...confirmed.slice(shift), ...confirmed.slice(0, shift)].slice(0, MAX_ARRIVALS)

  for (const r of doorsEnabled ? candidates : []) {
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
      if (out.status === 'moved') {
        moved.push(r.id)
        outcome.set(r.id, 'opened')
      } else if (out.status === 'skipped') {
        reasons[out.reason] = (reasons[out.reason] ?? 0) + 1
        outcome.set(r.id, out.reason)
        if (out.reason === 'unit-occupied') occupied.push(r.id)
      } else {
        reasons.error = (reasons.error ?? 0) + 1
        outcome.set(r.id, 'error')
      }
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
  //
  // Doors only: with the switch off nothing was opened by us, and a paid early
  // hour belongs to the urgent alert below either way.
  for (const r of doorsEnabled ? arrivals : []) {
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
    // A PAID early hour is not ours to be patient about. The grace below exists
    // for doors we opened on Guestway's word while Apaleo's flag lags; a guest
    // who bought 13:00 got no such word — their room simply is not ready, and
    // the urgent alert below owns them from thirty minutes out. Not both.
    if ((await paidEarlyCheckIn(r.id)) === true) continue

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

  // THE ONE THAT MATTERS: the guest is nearly here and the room is not ready.
  //
  // Not "no early door" — that is a bonus nobody is owed. This is the booked
  // hour approaching with nothing to walk into, which is the only room-ready
  // outcome a person has to act on, and it says so plainly: room, minutes,
  // reason in words. Runs every pass so it stays true rather than being a
  // snapshot; Slack throttles per text and the room is in the text, so a room
  // that stays dirty says so about twice before the guest is at the door.
  for (const r of arrivals) {
    if (Date.now() - startedAt > PASS_BUDGET_MS) break
    if (r.status !== 'Confirmed') continue
    if (!r.unit?.id) continue
    const arrivalHHmm = hhmmOf(r.arrival)
    const minsToArrival = minutesOf(arrivalHHmm) - minutesOf(hhmm)
    // No lower bound, on purpose. The first version stopped at the arrival time
    // and went silent exactly when the guest reached the door — measured live on
    // 2026-09-10: room 310 was still dirty at 15:17, seventeen minutes after its
    // booked hour, and nothing had said so since 15:00. A guest standing outside
    // is more urgent than a guest on their way, not less.
    //
    // It ends by itself: once they check in Apaleo leaves `Confirmed` and the
    // filter above drops them, and the sweep's last pass is 16:55 Berlin in
    // winter and 17:55 in summer (the cron runs on UTC hours).
    if (minsToArrival > URGENT_BEFORE_MIN) continue
    const readiness = await unitReadiness(r.unit.id)
    if (readiness === 'ready') continue
    // An hour before 15:00 is one of two very different things, and only the
    // folio tells them apart.
    //
    // Either WE moved it, on Guestway's word that the room was finished — then
    // Apaleo's own flag routinely lags an hour or two behind and a dirty reading
    // means nothing. Those belong to the open-door watch above and its grace.
    //
    // Or the guest PAID for it. Nobody said the room was clean; the hour was
    // sold, and a dirty room at 12:40 with a 13:00 early check-in is the guest
    // at the door in twenty minutes. Before this, the paid case fell under the
    // same three-hour grace as the moved one, and room 12 on 2026-09-11 would
    // have gone unmentioned until 16:10.
    //
    // An unreadable folio counts as not paid: the common early arrival is a
    // moved one, and paging on every folio hiccup would page for every guest we
    // successfully served. The open-door watch still speaks for them later.
    if (arrivalHHmm < STANDARD_CHECKIN_HHMM && (await paidEarlyCheckIn(r.id)) !== true) continue
    const departures = await departuresToday()
    // The room reads Dirty because Apaleo marks every checkout Dirty — including
    // the seam between two reservations of one continuous stay. Nobody left.
    if (isSameGuestCarryingOn(r, departures)) continue
    const room = r.unit.name ?? r.unit.id
    const when =
      minsToArrival >= 0
        ? `guest arrives in ${minsToArrival} min`
        : `guest was due ${-minsToArrival} min ago and cannot get in`
    // Say WHY when the reason is on record: a late checkout on this room today.
    // With a paid early check-in on the other side that is a room sold twice
    // over — 13:00 promised to the guest leaving and to the guest arriving, and
    // the minutes between are all the cleaning time there is. Room 12,
    // 2026-09-11: zero. There is a guard against selling that; it could not see
    // in-house guests until that day (Apaleo honours only the first `status`
    // parameter), and a room assigned after both sales still gets past it. This
    // is where the collision is caught while somebody can still be sent.
    const lateCheckout = lateCheckoutToday(r, departures)
    const outAt = lateCheckout ? hhmmOf(lateCheckout.departure ?? '') : ''
    const soldTwiceOver = !!lateCheckout && arrivalHHmm < STANDARD_CHECKIN_HHMM
    const text = soldTwiceOver
      ? `Room ${room}: not ready, ${when} — sold twice over: late checkout ${outAt} + early check-in ${arrivalHHmm}, ${minutesOf(arrivalHHmm) - minutesOf(outAt)} min to clean`
      : `Room ${room}: not ready, ${when}`
    bookingLog.error(text, {
      reservationId: r.id,
      room,
      arrival: arrivalHHmm,
      problem: PLAIN[`unit-${readiness}`] ?? readiness,
      ...(lateCheckout ? { 'late checkout': `${lateCheckout.id} until ${outAt}` } : {}),
    })
  }

  // ONE morning report: rooms sold twice over today, while there is a morning
  // left to do something about it.
  //
  // The guard at the point of sale can only see a collision once Apaleo has
  // assigned the room, and for most bookings that happens on the day of
  // arrival — so an early check-in bought in advance goes through unchecked, and
  // the amend offer does not refuse it either (Apaleo's availability is per
  // night, not per hour; room 12, 2026-09-11). The first pass after the rooms
  // are known is therefore the first moment anybody can say "these two guests
  // were promised the same room at the same hour". Said once, at 08:10, it
  // leaves the morning to move the arriving guest to a clean room — the
  // cheapest fix there is. The urgent alert above still fires from 12:30 for
  // anything sold after this pass.
  //
  // Only PAID early check-ins count on the arriving side (the folio says). A
  // door we opened ourselves sits before 15:00 too, but it was opened onto a
  // clean, empty room — there is no collision to report.
  const morning = hhmm >= MORNING_FROM_HHMM && hhmm < MORNING_TO_HHMM
  if (morning) {
    try {
      const departures = await departuresToday()
      const lines: Record<string, string> = {}
      for (const r of arrivals) {
        if (Date.now() - startedAt > PASS_BUDGET_MS) break
        if (r.status === 'Canceled' || r.status === 'NoShow') continue
        if (!r.unit?.id) continue
        const arrivalHHmm = hhmmOf(r.arrival)
        if (arrivalHHmm >= STANDARD_CHECKIN_HHMM) continue
        const leaving = lateCheckoutToday(r, departures)
        if (!leaving) continue
        if (isSameGuestCarryingOn(r, departures)) continue
        if ((await paidEarlyCheckIn(r.id)) !== true) continue
        const outAt = hhmmOf(leaving.departure ?? '')
        const gap = minutesOf(arrivalHHmm) - minutesOf(outAt)
        const room = r.unit.name ?? r.unit.id
        lines[`room ${room}`] =
          `${leaving.id} out ${outAt} → ${r.id} in ${arrivalHHmm} · ` +
          (gap < 0 ? `arrives ${-gap} min BEFORE the room is vacated` : `${gap} min to clean`)
      }
      if (Object.keys(lines).length > 0) {
        await notifySlack('warn', 'Room-ready: zero cleaning time sold today', {
          ...lines,
          'to do':
            'move the arriving guest to a clean room, or have housekeeping at the door the minute the room is vacated',
        })
      }
    } catch (err) {
      bookingLog.warn('room-ready sweep: morning collision report failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
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

  // ONE report a day, naming every arriving guest and what happened to them.
  //
  // The alerts elsewhere each catch a specific breakage. None of them answers
  // the question an owner actually asks — "did it work today, for everyone?" —
  // because a guest who quietly never got an early door is not a breakage
  // anywhere: the amend was refused for an ordinary reason, the sweep retried
  // all day, and every individual step behaved. Four of five opening looks
  // identical to five of five from the inside.
  //
  // So this says it plainly, once, at the audit hour. `warn` when somebody is
  // still waiting, `info` when nobody is — the level carries the headline and
  // the body carries the names.
  if (audited && doorsEnabled && arrivals.length > 0) {
    const live = arrivals.filter((r) => r.status !== 'Canceled' && r.status !== 'NoShow')
    const lines: Record<string, string> = {}
    let waiting = 0
    for (const r of live) {
      const room = r.unit?.name ?? r.unit?.id ?? '—'
      const at = hhmmOf(r.arrival)
      if (at < STANDARD_CHECKIN_HHMM) {
        lines[`room ${room}`] = `opened ${at} · ${r.id}`
      } else {
        waiting += 1
        // The reason from this pass. Absent means the guest was not a candidate
        // at all — already checked in, or the pass ran out of time.
        const why = outcome.get(r.id)
        lines[`room ${room}`] = `${at} as booked · ${why ? (PLAIN[why] ?? why) : 'not tried this pass'} · ${r.id}`
      }
    }
    // Always info. A guest without an early door has lost a bonus, not a room —
    // they walk in at the booked hour like every hotel guest ever. Levelling this
    // by "somebody is still waiting" made an ordinary day look like a fault, and
    // it did: a 14:10 report with two rooms not yet cleaned was read as two rooms
    // broken. The alarm for a room that will genuinely not be ready is separate,
    // fires close to the arrival, and says so in words.
    await notifySlack('info', 'Room-ready: today in full', {
      arrivals: live.length,
      'opened early': live.length - waiting,
      'arriving at the normal hour': waiting,
      ...lines,
    })
  }

  if (audited && doorsEnabled && arrivals.length > 0) {
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
  if (audited && doorsEnabled && occupied.length) {
    bookingLog.error('room-ready: previous guest still checked in — room cannot open', {
      arrivals: occupied,
    })
  }

  return Response.json({
    ok: true,
    doors: doorsEnabled ? 'on' : 'off',
    arrivals: arrivals.length,
    tried: doorsEnabled ? candidates.length - skippedForTime : 0,
    moved: moved.length,
    reasons,
    audited,
  })
}

/** "HH:mm" of an Apaleo ISO timestamp, which carries the hotel's offset. */
function hhmmOf(iso: string): string {
  return typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : '99:99'
}
