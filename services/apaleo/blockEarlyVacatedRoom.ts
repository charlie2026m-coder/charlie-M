import { Fetch } from '@/services/Request';
import { apaleoLog } from '@/lib/logger';
import { notifySlack } from '@/lib/slack';

/**
 * A room a guest left EARLY does not go back on sale tonight — it reopens
 * tomorrow morning.
 *
 * The hole this closes
 * --------------------
 * Apaleo counts an early-vacated room as available for the CURRENT night even
 * though the reservation's time slices still cover it. Measured on prod
 * (2026-09-07, WCHZCZAP-1 / room 308): the guest self-checked out at 19:46, and
 * at 21:37 the availability grid offered one sellable SKB for that night — while
 * all seven SKB units were held by reservations and the only physically empty
 * one was 308, still dirty. A channel booking landed on that very unit 47
 * minutes after the checkout. Nobody bought the dirty night itself, but nothing
 * stood in the way of it.
 *
 * (This contradicts releaseRoomEarly's old header, which claimed the unit stays
 * `soldCount` until the original departure. That reading was taken the morning
 * after, when availability is recomputed from the stored slices; it never
 * described the live night. See the corrected note in that file.)
 *
 * The rule
 * --------
 *     left today  →  back on sale tomorrow at 11:00
 *
 * Deliberately a clock, not a cleanliness flag. Housekeeping comes in the
 * morning regardless, so "clean" and "tomorrow" resolve to the same moment in
 * practice — and a rule that reads the condition field would hand the decision
 * to a flag somebody has to remember to set, on a system that has already been
 * seen disagreeing with Apaleo about whether a room is ready. A fixed window
 * cannot get stuck: it expires on its own, with nothing to un-set and no job to
 * come back and release it.
 *
 * Once per departure, never renewed. The window is anchored to the moment the
 * guest left, so after it has passed this declines to act again rather than
 * blocking the room for another day — which would turn the clock back into the
 * cleanliness flag by the back door.
 *
 * Capped only by the next arrival on that unit, so a block can never take away a
 * room somebody has already booked. Nothing here ever runs longer than ~35
 * hours, which is what makes it safe to run unattended.
 *
 * The lever is an `OutOfService` maintenance — the one thing that removes a room
 * from sale on every channel at once (our IBE, the channel manager, walk-ins).
 * A guard inside our own booking engine could not have stopped the booking that
 * landed on 308: it came from the channel manager.
 *
 * It costs nothing. Those nights are already sold to the departing guest and
 * still charged, so re-selling them tonight is a bonus, never budgeted revenue.
 *
 * Contract: best-effort. Never throws, never blocks a guest's checkout. Any
 * failure leaves exactly today's behaviour — the room sellable while dirty.
 */

const propId = process.env.APALEO_PROPERTY_ID;

/**
 * Conditions that mean the room is ready for a guest. Mirrors amendStayTime.
 *
 * `Clean` alone, and it must stay in step with room-ready's set: these two
 * answer the same question — is this room fit for a guest — one for the door
 * and one for whether it may be SOLD. Letting them drift means refusing the
 * door while putting the room back on sale.
 *
 * The enum is Clean | CleanToBeInspected | Dirty. An uninspected room is not
 * treated as ready, which is the safe direction for both.
 */
const CLEAN_CONDITIONS = new Set(['Clean']);

/**
 * When a room handed back early goes on sale again: the house checkout hour,
 * the morning after. Written out rather than taken from DEFAULT_CHECKOUT_TIME
 * because those constants are display strings — its sibling DEFAULT_CHECKIN_TIME
 * is "15:00 - 00:00", which would not survive being parsed as a clock time.
 */
const REOPEN_HHMM = '11:00';

/**
 * Stamped into every block we create, and the ONLY thing that makes one ours.
 * The property has two dozen hand-made maintenances (OutOfOrder,
 * OutOfInventory, "the shower is clocked", "Occupied by tenants") — treating one
 * of those as ours would eventually put a broken room back on sale.
 */
const MARKER = '[auto:early-departure]';
const BLOCK_TYPE = 'OutOfService';

export interface Maintenance {
  id: string;
  unit?: { id?: string };
  from: string;
  to: string;
  type?: string;
  description?: string;
}

export type BlockOutcome =
  | { status: 'blocked'; id: string; until: string }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; reason: string };

/** Is this maintenance one of ours? Marker only — never type or timing. */
export function isOurBlock(m: Maintenance): boolean {
  return typeof m.description === 'string' && m.description.includes(MARKER);
}

/** Apaleo needs full ISO timestamps on these endpoints; a bare date is a 422. */
function isoAt(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Berlin's UTC offset ON A GIVEN DATE ("+02:00" / "+01:00"). A block opened on
 * the evening before a DST switch ends on the other side of it, so the offset
 * has to be derived for the TARGET date or the room reopens an hour off.
 */
function berlinOffsetOn(isoDate: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(`${isoDate}T12:00:00Z`));
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = tz.match(/GMT([+-]\d{2}:\d{2})/);
  return m ? m[1] : '+01:00';
}

/** Calendar date (YYYY-MM-DD) in the hotel's timezone. */
function berlinDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d);
}

/** A wall-clock time in Berlin, `days` from `now`. */
function berlinDayAt(now: Date, days: number, hhmm: string): Date {
  const base = Date.parse(`${berlinDate(now)}T00:00:00Z`);
  const day = new Date(base + days * 86_400_000).toISOString().slice(0, 10);
  return new Date(`${day}T${hhmm}:00${berlinOffsetOn(day)}`);
}

/** Tomorrow at the house checkout hour, Berlin — the moment the room reopens. */
export function reopensAt(now: Date): Date {
  return berlinDayAt(now, 1, REOPEN_HHMM);
}

/** Midnight tonight, Berlin — the earliest departure that is still "early". */
export function earliestEarlyDeparture(now: Date): Date {
  return berlinDayAt(now, 1, '00:00');
}

/** Unknown condition is NOT clean: an unreadable unit must never look ready. */
export function isCleanCondition(condition: string | null): boolean {
  return condition !== null && CLEAN_CONDITIONS.has(condition);
}

async function unitCondition(unitId: string): Promise<string | null> {
  try {
    const unit = await Fetch<{ status?: { condition?: string } }>(
      `/inventory/v1/units/${encodeURIComponent(unitId)}`,
    );
    return unit?.status?.condition ?? null;
  } catch (err) {
    apaleoLog.warn('early-vacated: unit status read failed', {
      unitId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Our active blocks in a window.
 *
 * ⚠️ The property filter is `propertyId` here — SINGULAR. Apaleo silently
 * ignores the plural on this endpoint: measured 2026-09-08, both
 * a real property id and a nonsense one both answer HTTP 200 with all the
 * maintenances on the shared account, Prenzl Place's included. The reservations
 * endpoint is the exact opposite — there `propertyIds` is right and the
 * singular is the one being ignored — so neither name may be copied from one to
 * the other. Both failures are silent and look like a working call.
 */
export async function listOurBlocks(from: Date, to: Date): Promise<Maintenance[]> {
  if (!propId) return [];
  try {
    const res = await Fetch<{ maintenances?: Maintenance[] }>(
      `/operations/v1/maintenances?propertyId=${propId}` +
        `&from=${encodeURIComponent(isoAt(from))}&to=${encodeURIComponent(isoAt(to))}&pageSize=200`,
    );
    return (res?.maintenances ?? []).filter(isOurBlock);
  } catch (err) {
    apaleoLog.warn('early-vacated: listing maintenances failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** Earliest arrival on this unit after `after`, so a block can never take away
 *  a room somebody has already booked. */
async function nextArrivalOn(unitId: string, after: Date, until: Date): Promise<Date | null> {
  if (!propId) return null;
  try {
    const res = await Fetch<{ reservations?: { arrival: string; status?: string }[] }>(
      `/booking/v1/reservations?propertyIds=${propId}&unitIds=${encodeURIComponent(unitId)}` +
        `&dateFilter=Arrival&from=${encodeURIComponent(isoAt(after))}` +
        `&to=${encodeURIComponent(isoAt(until))}&pageSize=50`,
    );
    const times = (res?.reservations ?? [])
      .filter((r) => r.status !== 'Canceled' && r.status !== 'NoShow')
      .map((r) => new Date(r.arrival).getTime())
      .filter((t) => Number.isFinite(t) && t > after.getTime());
    return times.length ? new Date(Math.min(...times)) : null;
  } catch (err) {
    apaleoLog.warn('early-vacated: next-arrival lookup failed', {
      unitId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Hold `unitId` off sale until tomorrow morning, for a stay that ended early.
 *
 * `departure` is the reservation's booked departure — only used to tell an early
 * departure from an ordinary one. Idempotent: a second call while our block is
 * still standing does nothing, which is what lets the checkout hook and the
 * reconcile cron both call it.
 */
export async function blockRoomUntilNextMorning(
  unitId: string,
  departure: string,
  opts: { now?: Date; checkedOutAt?: string; reservationId?: string } = {},
): Promise<BlockOutcome> {
  if (!propId) return { status: 'skipped', reason: 'not-configured' };
  if (!unitId) return { status: 'skipped', reason: 'no-unit-assigned' };

  const now = opts.now ?? new Date();
  const departureAt = new Date(departure);
  if (!Number.isFinite(departureAt.getTime())) {
    return { status: 'skipped', reason: 'bad-departure' };
  }
  // An early departure is decided by DATE, never by clock time. A guest whose
  // booked departure is TODAY is an ordinary checkout however early in the
  // morning they walk out: the room is already on the cleaning list, and
  // tonight is exactly when it is meant to be sold.
  //
  // Comparing timestamps instead is not a theoretical mistake — it shipped.
  // On 2026-09-08 the 10:50 cron pass blocked rooms 15 and 308 because their
  // 11:00 departures had not struck yet, and read "departure in the future" as
  // "left early". Both happened to have a 15:00 arrival that capped the damage;
  // a departure with no arrival behind it would have lost the whole night.
  if (berlinDate(departureAt) <= berlinDate(now)) {
    return { status: 'skipped', reason: 'departure-not-beyond-today' };
  }

  // Already clean — an early departure from a room serviced mid-stay. Nothing
  // to protect anyone from, and blocking it would be pure lost revenue.
  const condition = await unitCondition(unitId);
  if (isCleanCondition(condition)) {
    return { status: 'skipped', reason: `already-clean-${condition}` };
  }

  // The reopening is anchored to WHEN THE GUEST LEFT, not to when this runs.
  //
  // Two things fall out of that, and both matter. The cron can pick up a
  // checkout from last night and still reopen the room this morning rather than
  // pushing it a day further. And once that moment has passed, this returns
  // early for good — so a room is held back exactly once per departure and
  // never renewed.
  //
  // Renewal is the failure worth spelling out: if this re-blocked every pass
  // while the room still read Dirty, the rule would quietly turn back into
  // "reopens once Apaleo says clean", which is precisely what a fixed window
  // was chosen to avoid. That flag is not dependable here — three readings on
  // 2026-09-08 (09:39, 10:00, 10:56) had all 13 units Dirty, in-house ones
  // included — so a renewing block could sit on a perfectly clean room for days.
  const leftAtRaw = opts.checkedOutAt ? new Date(opts.checkedOutAt) : now;
  const leftAt = Number.isFinite(leftAtRaw.getTime()) ? leftAtRaw : now;
  let end = reopensAt(leftAt);
  if (end.getTime() <= now.getTime()) {
    return { status: 'skipped', reason: 'reopening-already-due' };
  }

  const standing = (await listOurBlocks(now, end)).find(
    (m) => m.unit?.id === unitId && new Date(m.to).getTime() > now.getTime(),
  );
  if (standing) return { status: 'skipped', reason: 'already-blocked' };

  const nextArrival = await nextArrivalOn(unitId, now, end);
  if (nextArrival && nextArrival.getTime() < end.getTime()) end = nextArrival;
  if (end.getTime() <= now.getTime()) return { status: 'skipped', reason: 'no-window-left' };

  try {
    const created = await Fetch<{ id?: string }>('/operations/v1/maintenances', {
      method: 'POST',
      body: {
        unitId,
        from: isoAt(now),
        to: isoAt(end),
        type: BLOCK_TYPE,
        // German: the hotel team reads this in the Apaleo UI.
        description: `Fruehzeitige Abreise - Zimmer ungereinigt, wieder buchbar ab morgen ${MARKER}`,
      },
    });
    const id = created?.id ?? '';
    apaleoLog.info('early-vacated: room held off sale until tomorrow', {
      unitId,
      until: end.toISOString(),
      reservationId: opts.reservationId,
      id,
    });
    return { status: 'blocked', id, until: end.toISOString() };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Worth a human: the room is empty, dirty and sellable right now. This is
    // also where an Apaleo refusal to overlap the departing reservation would
    // surface — the one step of this path that has never run against prod.
    await notifySlack('error', 'Early departure: could NOT block the dirty room', {
      unit: unitId,
      reservation: opts.reservationId ?? '—',
      'wanted until': end.toISOString().slice(0, 16).replace('T', ' '),
      apaleo: reason.slice(0, 200),
      effect: 'room is empty, unclean and still sellable — block it by hand in Apaleo',
    });
    apaleoLog.error('early-vacated: creating the block failed', { unitId, error: reason });
    return { status: 'error', reason };
  }
}

/** How far ahead an early departure can sit. A guest leaving a month early is
 *  already an outlier; beyond that it is a data problem, not a cleaning one. */
const HORIZON_DAYS = 30;

export interface ReconcileResult {
  blocked: string[];
  earlyDepartures: number;
}

/**
 * The safety net behind the checkout hook, and the only cover for what that
 * hook can never see: an early departure entered at the desk in Apaleo or done
 * through Guestway, and the case where our checkout call landed but the block
 * after it did not.
 *
 * There is no release half — the blocks expire by themselves tomorrow morning,
 * which is the whole point of using a clock instead of a cleanliness flag.
 */
export async function reconcileEarlyVacatedRooms(
  now: Date = new Date(),
): Promise<ReconcileResult> {
  const result: ReconcileResult = { blocked: [], earlyDepartures: 0 };
  if (!propId) return result;

  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  // Checked out, yet the booked departure is a LATER DAY — that IS the
  // definition of an unexpected vacancy, and it needs no cleaning-system data.
  // The window starts at midnight tonight, not at `now`: everything departing
  // today is an ordinary checkout, and asking for it from `now` is what made
  // the 10:50 pass on 2026-09-08 block two rooms that were simply leaving on
  // time. blockRoomUntilNextMorning refuses them again on its own, so this
  // narrower window is the cheap half of a belt and braces.
  try {
    const res = await Fetch<{
      reservations?: {
        id: string;
        departure: string;
        checkOutTime?: string;
        unit?: { id?: string };
      }[];
    }>(
      `/booking/v1/reservations?propertyIds=${propId}&status=CheckedOut&dateFilter=Departure` +
        `&from=${encodeURIComponent(isoAt(earliestEarlyDeparture(now)))}` +
        `&to=${encodeURIComponent(isoAt(horizon))}&pageSize=100`,
    );
    const rows = res?.reservations ?? [];
    result.earlyDepartures = rows.length;
    for (const r of rows) {
      if (!r.unit?.id) continue;
      const out = await blockRoomUntilNextMorning(r.unit.id, r.departure, {
        now,
        // Anchors the reopening to the actual departure, so a checkout from
        // last night still reopens this morning — and so a room already past
        // its reopening is left alone instead of being blocked all over again.
        checkedOutAt: r.checkOutTime,
        reservationId: r.id,
      });
      if (out.status === 'blocked') result.blocked.push(r.unit.id);
    }
  } catch (err) {
    apaleoLog.warn('early-vacated: reading early departures failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}
