'use server';
import { Fetch } from '@/services/Request';
import { markUnitClean } from '@/services/apaleo/markUnitClean';
import { sameGuest } from '@/lib/sameGuest';
import { stayExtensionQuota } from '@/services/apaleo/stayExtensionQuota';
import { isStayExtensionService } from '@/lib/extrasPrice';
import { apaleoLog } from '@/lib/logger';

const propId = process.env.APALEO_PROPERTY_ID;

// Hotel times. Regular checkout 11:00, regular check-in 15:00 (see
// lib/Constants DEFAULT_CHECKOUT_TIME / DEFAULT_CHECKIN_TIME). Both extensions
// land at 13:00 — Late Check-Out moves departure 11:00 → 13:00, Early Check-In
// moves arrival 15:00 → 13:00 (per the CMH-LCO / CMH-ECI descriptions).
const DEFAULT_CHECKOUT_HHMM = '11:00';
const DEFAULT_CHECKIN_HHMM = '15:00';
const LATE_CHECKOUT_HHMM = '13:00';
const EARLY_CHECKIN_HHMM = '13:00';

// Replace the clock time of an Apaleo ISO timestamp while preserving its date
// AND its UTC offset, so DST is handled by Apaleo's own offset for that date
// (Berlin is +02:00 in summer, +01:00 in winter). e.g.
// "2026-09-17T11:00:00+02:00" + "13:00" → "2026-09-17T13:00:00+02:00".
function withLocalTime(iso: string, hhmm: string): string {
  const date = iso.slice(0, 10);
  const m = iso.match(/([+-]\d{2}:\d{2}|Z)$/);
  const offset = m ? m[1] : 'Z';
  return `${date}T${hhmm}:00${offset}`;
}

// "HH:mm" portion of an Apaleo ISO timestamp (local time), for comparing
// against the default check-in/out clock times.
function hhmmOf(iso: string): string {
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '';
}

/**
 * Late Check-Out / Early Check-In via Apaleo's RESERVATION AMEND flow — NOT the
 * book-service flow.
 *
 * Why amend instead of a service:
 *  - Apaleo's "Departure"/"Arrival" mode services are bound to the last night /
 *    arrival night and can only be booked while that night is still in the
 *    future. A guest deciding on the morning of departure can never buy a
 *    late check-out as a service (the night already passed) → the old service
 *    flow charged then refunded ("Some services are no longer available").
 *  - Apaleo's OWN documented pattern for paid late check-out / early check-in is
 *    to amend the reservation's departure/arrival TIME and add the fee. That is
 *    bookable any time (it's a reservation change, not a night-bound service),
 *    actually extends the checkout time (so Guestway PIN / housekeeping update).
 *    ⚠️ It does NOT stop a late checkout and an early check-in being sold on the
 *    same room for the same day. Apaleo's availability is per NIGHT, not per
 *    hour: on 2026-09-11 the early-check-in amend for Motz19 room 12 went
 *    through with a 13:00 late checkout already on that unit. That is what
 *    hasOppositeExtensionConflict is for — and it can only see a collision once
 *    Apaleo has assigned the room, which for most bookings happens on the day of
 *    arrival. The room-ready sweep reports what slipped past it that morning.
 *
 * Confirmed against the live Apaleo API:
 *  - GET /booking/v1/reservations/{id}/offers?departure=<ISO> (or ?arrival=)
 *    returns an offer with `availableUnits` + `timeSlices` for the new time, or
 *    204/empty when the time equals the current one (no change). Safe to call to
 *    price/validate — it does NOT mutate the reservation.
 *  - PUT /booking/v1/reservation-actions/{id}/amend applies the change. Payload
 *    REQUIRES `adults` (top-level AND per time slice) or it 422s.
 *  - The amend re-prices from the rate plan and IGNORES a custom time-slice
 *    amount, so the fee must be a separate folio charge (below).
 *
 * Folio fee endpoints (per the Apaleo Finance v1 spec):
 *  - POST   /finance/v1/folio-actions/{folioId}/charges                       — add the fee (vatType REQUIRED).
 *  - POST   /finance/v1/folio-actions/{folioId}/charges/{chargeId}/allowances — reverse it (no DELETE-by-id exists).
 */

export interface StayAmendOffer {
  arrival: string;
  departure: string;
  availableUnits: number;
  // totalGrossAmount is optional: the amend payload doesn't need it, but the
  // room-ready price-invariance guard compares per-slice grosses (the amend
  // re-prices from the rate plan, so a drifted rate would silently change what
  // the guest owes — see openRoomEarly).
  timeSlices: Array<{
    ratePlan: { id: string };
    from: string;
    to: string;
    totalGrossAmount?: { amount?: number; currency?: string };
  }>;
}

interface OffersEnvelope {
  offers?: StayAmendOffer[];
}

/**
 * Read-only: price/availability for moving the reservation's departure (LCO) or
 * arrival (ECI) to a new time. Returns null when there's no offer (e.g. the time
 * is unchanged, or the room isn't available for the extended window). ⚠️ It is
 * NOT how a late-vs-early collision surfaces: Apaleo's availability is per night,
 * and on 2026-09-11 this returned an offer for a 13:00 early check-in on a room
 * whose guest had a 13:00 late checkout. On the FORWARD (booking)
 * path a null simply surfaces as "time not available" and the caller refuses the
 * sale — fail-safe. The reversal path does NOT use this (it restores from the
 * stored original time slices) precisely so a transient blip can't strand a
 * reservation in the extended state.
 */
export async function getStayAmendOffer(
  reservationId: string,
  change: { departure?: string; arrival?: string },
): Promise<StayAmendOffer | null> {
  if (!propId || !reservationId) return null;
  const params = new URLSearchParams();
  if (change.departure) params.set('departure', change.departure);
  if (change.arrival) params.set('arrival', change.arrival);
  try {
    const res = await Fetch<OffersEnvelope>(
      `/booking/v1/reservations/${reservationId}/offers?${params.toString()}`,
    );
    const offer = res.offers?.[0];
    if (!offer || (offer.availableUnits ?? 0) < 1) return null;
    return offer;
  } catch (err) {
    // A 204 (no change) comes back as {} → no offers → null above; a genuine
    // failure throws here. Treat as "no offer" so callers don't book blindly,
    // but log it so a transient Apaleo failure isn't silently read as
    // "unavailable".
    apaleoLog.warn('stay-extension: amend offer fetch failed — treating as unavailable', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Apply the amend (change arrival/departure time). Throws on Apaleo failure so
 * the caller can refund. `adults` is required by Apaleo on the payload.
 */
export async function applyStayAmend(
  reservationId: string,
  offer: StayAmendOffer,
  adults: number,
  childrenAges: number[] = [],
): Promise<void> {
  const a = Math.max(1, adults);
  await Fetch(`/booking/v1/reservation-actions/${reservationId}/amend`, {
    method: 'PUT',
    body: {
      arrival: offer.arrival,
      departure: offer.departure,
      adults: a,
      childrenAges,
      timeSlices: offer.timeSlices.map((ts) => ({
        ratePlanId: ts.ratePlan.id,
        adults: a,
        childrenAges,
      })),
    },
  });
}

/**
 * Add the fee (late check-out / early check-in) as a transparent, named folio
 * line — the amend itself can't carry a custom price. Throws on failure.
 * Returns the created charge id (Apaleo's AddedChargeModel echoes it) so a
 * rollback can reverse exactly this line via an allowance.
 *
 * `vatType` is REQUIRED by Apaleo. LCO/ECI are accommodation-adjacent services
 * billed at Germany's reduced rate (the live CMH-LCO service prices at
 * vatType "Reduced" / 7%), so that is the default.
 */
export async function addFolioServiceCharge(
  reservationId: string,
  charge: {
    name: string;
    amount: number;
    currency?: string;
    serviceDate?: string;
    vatType?: string;
  },
): Promise<{ chargeId?: string }> {
  const res = await Fetch<{ id?: string } | undefined>(
    `/finance/v1/folio-actions/${reservationId}-1/charges`,
    {
      method: 'POST',
      body: {
        serviceType: 'Other',
        name: charge.name,
        amount: { amount: charge.amount, currency: charge.currency ?? 'EUR' },
        vatType: charge.vatType ?? 'Reduced',
        ...(charge.serviceDate && { serviceDate: charge.serviceDate }),
      },
    },
  );
  return { chargeId: res?.id };
}

/**
 * Reverse a posted folio charge. Apaleo has NO delete-charge-by-id; a charge is
 * reversed by posting a 1:1 allowance against it. Throws on failure so the
 * caller can escalate.
 */
async function reverseFolioCharge(
  reservationId: string,
  chargeId: string,
  amount: number,
  currency: string,
): Promise<void> {
  await Fetch(
    `/finance/v1/folio-actions/${reservationId}-1/charges/${chargeId}/allowances`,
    {
      method: 'POST',
      body: { amount: { amount, currency } },
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration: book a stay extension (LCO/ECI) end-to-end, with rollback.
// ─────────────────────────────────────────────────────────────────────────────

interface AmendTimeSlice {
  ratePlanId: string;
  from: string;
  to: string;
  grossAmount?: number; // slice totalGrossAmount.amount (room-ready price guard)
}

export interface ReservationAmendContext {
  arrival: string;       // original ISO (with offset)
  departure: string;     // original ISO (with offset)
  adults: number;
  childrenAges: number[];
  unitId?: string;       // assigned unit, when Apaleo has one
  unitName?: string;     // its display name ("18") — for alerts read by people
  timeSlices: AmendTimeSlice[]; // original slices, to restore the time on rollback
  status?: string;       // Apaleo reservation status (Confirmed / InHouse / …)
  // Who is staying. The collision guard needs it to tell a guest bridging their
  // own two back-to-back reservations from a real turnover to somebody else.
  primaryGuest?: { email?: string; lastName?: string };
}

export interface AppliedStayExtension {
  reservationId: string;
  kind: 'late' | 'early';
  originalArrival: string;
  originalDeparture: string;
  adults: number;
  childrenAges: number[];
  timeSlices: AmendTimeSlice[];
  folioChargeId?: string;
  feeAmount: number;
  feeCurrency: string;
}

/** Build a StayAmendOffer from stored slices — used to restore the ORIGINAL
 *  time without re-probing availability (the room was provably bookable for the
 *  original window at booking time, so the restore must not depend on a fresh
 *  offer that could transiently fail and strand the reservation extended). */
function offerFromContext(
  arrival: string,
  departure: string,
  timeSlices: AmendTimeSlice[],
): StayAmendOffer {
  return {
    arrival,
    departure,
    availableUnits: 1,
    timeSlices: timeSlices.map((ts) => ({ ratePlan: { id: ts.ratePlanId }, from: ts.from, to: ts.to })),
  };
}

/**
 * Read the reservation once for an amend: current arrival/departure (to restore
 * on rollback), adults/children + per-slice rate plans (required by the amend
 * payload), and assigned unit (for the best-effort conflict guard). Returns null
 * if the reservation can't be read or belongs to the other hotel — the caller
 * treats that as "can't extend" and refunds.
 */
export async function loadReservationForAmend(
  reservationId: string,
): Promise<ReservationAmendContext | null> {
  if (!propId || !reservationId) return null;
  try {
    const res = await Fetch<{
      arrival: string;
      departure: string;
      adults: number;
      childrenAges?: number[];
      status?: string;
      unit?: { id?: string; name?: string };
      primaryGuest?: { email?: string; lastName?: string };
      property?: { id?: string };
      ratePlan?: { id?: string };
      timeSlices?: Array<{
        ratePlanId?: string;
        ratePlan?: { id?: string };
        from?: string;
        to?: string;
        totalGrossAmount?: { amount?: number };
      }>;
    }>(`/booking/v1/reservations/${reservationId}?expand=unit,timeSlices`);
    // The single-reservation endpoint ignores propertyIds — guard against a
    // cross-hotel reservation on the shared Apaleo account.
    if (!res || res.property?.id !== propId) return null;
    const fallbackRatePlan = res.ratePlan?.id ?? '';
    const timeSlices: AmendTimeSlice[] = (res.timeSlices ?? []).map((ts) => ({
      ratePlanId: ts.ratePlanId ?? ts.ratePlan?.id ?? fallbackRatePlan,
      from: ts.from ?? res.arrival,
      to: ts.to ?? res.departure,
      grossAmount: ts.totalGrossAmount?.amount,
    }));
    // A reservation always has at least one slice; fall back to a single slice
    // on the top-level rate plan so the amend payload is never empty.
    if (timeSlices.length === 0 && fallbackRatePlan) {
      timeSlices.push({ ratePlanId: fallbackRatePlan, from: res.arrival, to: res.departure });
    }
    return {
      arrival: res.arrival,
      departure: res.departure,
      adults: res.adults,
      childrenAges: res.childrenAges ?? [],
      unitId: res.unit?.id,
      unitName: res.unit?.name,
      timeSlices,
      status: res.status,
      primaryGuest: res.primaryGuest,
    };
  } catch (err) {
    apaleoLog.warn('stay-extension: reservation read failed', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Best-effort guard for the "late XOR early on the same room/day" rule. A late
 * check-out (departure → 13:00) and an early check-in (arrival → 13:00) collide
 * only on the SAME physical unit on the changeover day. We can only assert that
 * collision when Apaleo has assigned a unit; a group-level check would wrongly
 * block every room in the house, so when no unit is assigned we DO NOT block
 * here. Nothing else does either: the amend offer will not refuse it (Apaleo's
 * availability is per night, not per hour), and most bookings have no unit until
 * the day of arrival — 55 of 63 upcoming arrivals on 2026-09-11. An advance
 * purchase therefore goes through unchecked; the room-ready sweep's morning
 * report is where those are caught, once the room is known.
 *
 * FAIL-OPEN by default: any error returns false (allow). This guard can never
 * reject a legitimate sale — at worst it does nothing and the sale goes
 * through. The room-ready DOOR path passes failClosed=true instead: it
 * grants physical access, so an unverifiable conflict must block, not allow.
 * Detection is by clock time: a counterpart reservation "took ECI" if it
 * arrives before 15:00; "took LCO" if it departs after 11:00 (exactly how these
 * extensions present once applied via amend).
 */
export async function hasOppositeExtensionConflict(
  reservationId: string,
  kind: 'late' | 'early',
  // Only what the check reads — so the pre-payment validator, which has no
  // amend context, can ask the same question before any card is charged.
  ctx: Pick<ReservationAmendContext, 'arrival' | 'departure' | 'unitId' | 'primaryGuest'>,
  opts: { failClosed?: boolean } = {},
): Promise<boolean> {
  try {
    if (!propId) return false;
    if (!ctx.unitId) {
      // Nothing to compare against: the collision is between two reservations in
      // the SAME physical room, and a group-level check would block every room
      // in the house. Say so instead of returning a quiet false — this is the
      // one way the guard can miss a real conflict, and it used to leave no
      // trace at all.
      apaleoLog.info('stay-extension: conflict guard skipped — no unit assigned yet', {
        reservationId,
        kind,
      });
      return false;
    }
    // LCO departing day D → look at reservations ARRIVING on D in this unit.
    // ECI arriving day D  → look at reservations DEPARTING on D in this unit.
    const date = (kind === 'late' ? ctx.departure : ctx.arrival).slice(0, 10);
    // Apaleo's reservations list types from/to as date-TIME (a bare date 400s),
    // so use a full-day window in UTC — same pattern as the proven live caller
    // in services/selfCheckout.ts.
    const params = new URLSearchParams({
      propertyIds: propId,
      unitIds: ctx.unitId,
      from: `${date}T00:00:00Z`,
      to: `${date}T23:59:59Z`,
      dateFilter: kind === 'late' ? 'Arrival' : 'Departure',
      expand: 'primaryGuest',
    });
    // NO status filter on the wire, on purpose. Apaleo applies only the FIRST
    // `status` it is given and silently drops the rest — a repeated
    // `status=Confirmed&status=InHouse` therefore means `status=Confirmed`, and
    // the guest still in the room is invisible. That is not a hypothetical: it
    // is how Motz19 room 12 was sold twice over on 2026-09-11. The departing
    // guest was InHouse with a paid late checkout at 13:00, and an early
    // check-in for 13:00 was sold on the same room at 11:59 — zero minutes to
    // clean — because the query this guard sent could only ever see Confirmed
    // ones. (Apaleo does take a COMMA list — `status=Confirmed,InHouse` is a
    // real OR — but a filter whose failure mode is silent and one-directional
    // does not belong on a safety check. The set here is one unit on one day;
    // reading it whole costs nothing.)
    const list = await Fetch<{
      reservations?: Array<{
        id: string;
        arrival: string;
        departure: string;
        status?: string;
        primaryGuest?: { email?: string; lastName?: string };
      }>;
    }>(`/booking/v1/reservations?${params.toString()}`);
    for (const other of list.reservations ?? []) {
      if (other.id === reservationId) continue;
      // Only a counterpart that really holds the room can collide. Canceled and
      // NoShow never do — everything else does, CheckedOut very much included:
      // the departing guest reads CheckedOut by the afternoon, and the room they
      // left at 13:00 is no less unavailable for being empty.
      if (other.status === 'Canceled' || other.status === 'NoShow') continue;
      // The same person on both sides is not a turnover. A stay booked as two
      // reservations back to back has an 11:00–15:00 hole in the middle, and a
      // late checkout on the first plus an early check-in on the second is
      // exactly how the guest closes it — nobody leaves, nothing needs cleaning,
      // and the hotel is glad to sell both. Only a POSITIVE match passes;
      // "cannot tell" is a stranger, because a refused sale can be made by hand
      // and a room sold twice cannot be un-sold.
      if (sameGuest(ctx.primaryGuest, other.primaryGuest) === true) continue;
      if (kind === 'late') {
        if (hhmmOf(other.arrival) && hhmmOf(other.arrival) < DEFAULT_CHECKIN_HHMM) return true;
      } else {
        if (hhmmOf(other.departure) && hhmmOf(other.departure) > DEFAULT_CHECKOUT_HHMM) return true;
      }
    }
    return false;
  } catch (err) {
    apaleoLog.warn(
      `stay-extension: conflict guard errored — ${opts.failClosed ? 'BLOCKING (fail-closed)' : 'allowing (fail-open)'}`,
      {
        reservationId,
        kind,
        error: err instanceof Error ? err.message : String(err),
      },
    );
    return opts.failClosed === true;
  }
}

/**
 * Apaleo's own word on whether this extension can be applied: the amend offer
 * for the new time. `null` means Apaleo offers nothing — the time would be
 * unchanged, the reservation can no longer be amended, the rate plan has
 * nothing for that day, or Apaleo could not be reached — and the sale must not
 * go ahead without it.
 *
 * Asked twice on purpose, through this one function: by the pre-payment
 * validator, so a refusal never costs the guest a charge-and-refund, and by
 * bookStayExtension itself just before it amends, in case the world changed
 * in between. What it is NOT is a check against the opposite product on the
 * same room: Apaleo's availability is per night, not per hour — that is
 * hasOppositeExtensionConflict's job.
 */
export async function quoteStayExtension(
  reservationId: string,
  kind: 'late' | 'early',
  ctx: Pick<ReservationAmendContext, 'arrival' | 'departure'>,
): Promise<StayAmendOffer | null> {
  const newTime = kind === 'late'
    ? withLocalTime(ctx.departure, LATE_CHECKOUT_HHMM)
    : withLocalTime(ctx.arrival, EARLY_CHECKIN_HHMM);
  return getStayAmendOffer(reservationId, kind === 'late' ? { departure: newTime } : { arrival: newTime });
}

/** True if the reservation already has this extension applied (its time is
 *  already at 13:00). Used to reject an idempotent re-buy BEFORE charging.
 *  Module-private: this file is 'use server', whose exports must all be async. */
function stayExtensionAlreadyApplied(
  kind: 'late' | 'early',
  ctx: { arrival: string; departure: string },
): boolean {
  if (kind === 'late') return hhmmOf(ctx.departure) === LATE_CHECKOUT_HHMM;
  // ECI counts as applied whenever arrival is already EARLIER than the 15:00
  // default — there is nothing left to sell. Not a strict `=== 13:00`: the
  // Room-Ready webhook (openRoomEarly) moves arrivals to 13:00+ (e.g. 13:47)
  // when the room is cleaned early, and an exact match would let that guest
  // pay for an ECI that gives them nothing (charge-then-refund on live Adyen).
  // Zero-padded HH:mm ⇒ lexical `<` is chronological.
  const arr = hhmmOf(ctx.arrival);
  return arr !== '' && arr < DEFAULT_CHECKIN_HHMM;
}

/**
 * Book ONE stay extension (LCO or ECI) on a reservation:
 *   guard → price/availability offer → amend the time → post the fee charge.
 * On a fee-charge failure after the amend lands, it reverses the amend itself so
 * the caller never sees a half-applied extension. Returns `applied` on success
 * (the reversal descriptor) so the caller can roll back later if a SIBLING step
 * (another service, or the folio capture) fails.
 */
export async function bookStayExtension(
  reservationId: string,
  payload: { serviceId: string; count?: number; amount?: { amount: number; currency: string } },
  ctx: ReservationAmendContext,
): Promise<{ success: boolean; applied?: AppliedStayExtension; error?: string }> {
  const kind = isStayExtensionService(payload.serviceId);
  if (!kind) return { success: false, error: `not a stay-extension service: ${payload.serviceId}` };

  // 0. Idempotency: if the reservation is already at 13:00, the extension is
  //    already applied — re-charging would amend to an unchanged time (no offer)
  //    and pay-then-refund. Refuse up front. (The UI + validator also gate this
  //    before any Adyen auth; this is the last-line server guard.)
  if (stayExtensionAlreadyApplied(kind, ctx)) {
    return {
      success: false,
      error: `${kind === 'late' ? 'Late check-out' : 'Early check-in'} is already applied to this reservation`,
    };
  }

  // 1. Conflict guard (late XOR early, same room/day).
  if (await hasOppositeExtensionConflict(reservationId, kind, ctx)) {
    return {
      success: false,
      error: `${kind === 'late' ? 'Late check-out' : 'Early check-in'} unavailable — the opposite extension is already booked on this room for that day`,
    };
  }

  // 2. Offer for the new time. null ⇒ unchanged time OR not available (e.g. the
  //    assigned unit is occupied for the extended window) ⇒ can't extend.
  const offer = await quoteStayExtension(reservationId, kind, ctx);
  if (!offer) {
    return { success: false, error: `${kind === 'late' ? 'Late check-out' : 'Early check-in'} time is not available for this reservation` };
  }

  // 2b. Apaleo's quota for the day (Services → Availability → quantity), asked
  //     once more at the moment of sale: two guests buying the last one within
  //     the same minute both pass the validator. A refusal here means the
  //     caller refunds — rare, and right. Unreadable counts as unlimited.
  const quota = await stayExtensionQuota(kind, payload.serviceId, ctx, { excludeReservationId: reservationId });
  if (quota && quota.remaining <= 0) {
    return { success: false, error: `${kind === 'late' ? 'Late check-out' : 'Early check-in'} is sold out for that day` };
  }

  // 3. Apply the amend.
  try {
    await applyStayAmend(reservationId, offer, ctx.adults, ctx.childrenAges);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // 4. Post the fee as a folio line (the amend can't carry a custom price).
  const feeAmount = payload.amount?.amount ?? 0;
  const feeCurrency = payload.amount?.currency ?? 'EUR';
  let folioChargeId: string | undefined;
  if (feeAmount > 0) {
    try {
      const charge = await addFolioServiceCharge(reservationId, {
        name: kind === 'late' ? 'Late Check-Out' : 'Early Check-In',
        amount: feeAmount,
        currency: feeCurrency,
        serviceDate: (kind === 'late' ? ctx.departure : ctx.arrival).slice(0, 10),
      });
      folioChargeId = charge.chargeId;
    } catch (err) {
      // Fee failed AFTER the amend landed — reverse the time change so the guest
      // doesn't get a free extension, then report failure. (No charge to reverse:
      // folioChargeId is undefined.)
      await reverseStayExtension({
        reservationId,
        kind,
        originalArrival: ctx.arrival,
        originalDeparture: ctx.departure,
        adults: ctx.adults,
        childrenAges: ctx.childrenAges,
        timeSlices: ctx.timeSlices,
        feeAmount,
        feeCurrency,
      }).catch(() => {});
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  apaleoLog.success('stay-extension applied', {
    reservationId,
    kind,
    newTime: kind === 'late' ? offer.departure : offer.arrival,
    feeAmount,
  });
  return {
    success: true,
    applied: {
      reservationId,
      kind,
      originalArrival: ctx.arrival,
      originalDeparture: ctx.departure,
      adults: ctx.adults,
      childrenAges: ctx.childrenAges,
      timeSlices: ctx.timeSlices,
      folioChargeId,
      feeAmount,
      feeCurrency,
    },
  };
}

/**
 * Undo a previously-applied stay extension: reverse the fee line (via an
 * allowance — Apaleo has no delete-charge-by-id) and restore the original
 * arrival/departure time by re-amending DIRECTLY from the stored original time
 * slices (NOT a fresh availability offer, which could transiently fail and leave
 * the reservation stuck at 13:00 while the guest is refunded). Never throws;
 * escalates to apaleoLog.error for manual reconciliation if a step fails,
 * because the caller is already on the refund path.
 */
export async function reverseStayExtension(applied: AppliedStayExtension): Promise<void> {
  // 1. Reverse the fee charge (if one posted) via a 1:1 allowance.
  if (applied.folioChargeId && applied.feeAmount > 0) {
    try {
      await reverseFolioCharge(
        applied.reservationId,
        applied.folioChargeId,
        applied.feeAmount,
        applied.feeCurrency,
      );
    } catch (err) {
      apaleoLog.error('stay-extension: failed to reverse fee on rollback — manual reconciliation', {
        reservationId: applied.reservationId,
        folioChargeId: applied.folioChargeId,
        feeAmount: applied.feeAmount,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Restore the original time. The original window was bookable at booking
  //    time, so restore from the stored slices without re-probing /offers.
  try {
    const restoreOffer = offerFromContext(
      applied.originalArrival,
      applied.originalDeparture,
      applied.timeSlices,
    );
    await applyStayAmend(applied.reservationId, restoreOffer, applied.adults, applied.childrenAges);
  } catch (err) {
    apaleoLog.error('stay-extension: failed to restore original time on rollback — reservation left EXTENDED, money refunded — manual reconciliation', {
      reservationId: applied.reservationId,
      kind: applied.kind,
      originalArrival: applied.originalArrival,
      originalDeparture: applied.originalDeparture,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Room-Ready early door opening.
//
// When housekeeping marks a room clean, the Guestway "Room Ready" automation
// messages TODAY'S arriving guest ("your room is ready early") at
// max(13:00, clean-time) and, via webhook (app/api/guestway/room-ready), calls
// this to open the door at that same moment: we amend the reservation's Apaleo
// ARRIVAL to now and Guestway re-syncs the smart-lock code from the check-in
// time. That lever is PROVEN on prod: reading each door's code.validFrom back
// from Guestway shows it sitting on whatever arrival we wrote, including a
// non-round 14:01 — see the note on ROOM_READY_FLOOR_HHMM below. Guestway's own
// Open API is read-only for locks (no extend-access endpoint; checked against
// its Swagger), so the Apaleo arrival amend is the only lever there is.
//
// It applies to EVERY reservation arriving today (per the owner's spec — not
// only paid-ECI guests), charges NOTHING, and only ever moves the arrival
// EARLIER on the arrival day itself.
//
// A paid-ECI guest is NOT a no-op at an 11:00 floor: a guest who bought 13:00
// and whose room is finished at 11:30 gets moved to 11:33 — they keep what they
// paid for and gain on top. The reverse can never happen: the only-move-earlier
// guard below still refuses to push any arrival later.
//
// WHAT THIS CANNOT SEE: everything below trusts Apaleo's unit condition. If a
// room is marked Clean before it is finished, no guard here will know — the
// only signal we have says the room is ready. That is a housekeeping-process
// risk, not a code one, and it is the reason this feature stays behind
// GUESTWAY_ROOM_READY_ENABLED.
// ─────────────────────────────────────────────────────────────────────────────

// Never grant access before this local time.
//
// This used to sit at EARLY_CHECKIN_HHMM ('13:00') because that was the only
// arrival time the lock had ever been observed to follow, so a room finished at
// 12:33 still waited until 13:00 for no reason anyone could name.
//
// Measured at Motz19 on live bookings (2026-09-07) via Guestway
// GET /reservation-accesses, comparing each door's code.validFrom against the
// reservation's checkIn: most reservations showed a 0.0h gap, the amended ones
// moved with the arrival, and one landed on a NON-round 14:01 from a room-ready
// that fired at ~13:58. The last row settles that the LOCK would follow any time. What it does not
// settle is what APALEO will do with the time — and that is where 09:00 failed.
//
// Apaleo's night is a time slice from 15:00 to 11:00 the next morning. Amend an
// arrival to anything before 11:00 and the reservation now starts inside the
// PREVIOUS night's slice: the amend offer comes back one night longer. Verified
// live on 2026-09-14 — arrival 10:59 → a 114 EUR slice prepended, 11:00 → the
// nights as booked. The price guard below refuses such an offer, and rightly:
// nobody may be charged a night for a door. So with the floor at 09:00 (from
// 2026-09-07 to 2026-09-14) every attempt before 11:00 was refused as price
// drift, and every door that did open, opened after 11:00 — 11:13, 11:16,
// 11:54, 12:04. On 2026-09-14 at 09:15 a guest was told "your room is ready,
// come in" by Guestway's own automation while our amend to 09:18 was being
// refused for exactly this; he stood at a locked door at 10:25.
//
// The floor is therefore the house checkout hour — the end of the previous
// night's slice — and it is tied to that constant so the two cannot drift
// apart. It is physics, not policy: there is no earlier door by any amend.
//
// NOT the same value as EARLY_CHECKIN_HHMM: that one is what the PAID early
// check-in sells and must stay at 13:00.
const ROOM_READY_FLOOR_HHMM = DEFAULT_CHECKOUT_HHMM;
// Headroom added to "now" so the amended arrival is never in the past by the
// time Apaleo evaluates it (berlinNow truncates to the minute and the offer +
// amend round-trips take seconds).
const ROOM_READY_HEADROOM_MIN = 3;
// Unit conditions that count as ready for the guest.
//
// `Clean` only. This carried 'CleanToInspect' for months, which is NOT a value
// Apaleo knows — the enum is Clean | CleanToBeInspected | Dirty — so every
// comparison against it matched nothing. The earlier reading that "no unit in
// 147 returns CleanToInspect" was true and proved nothing: it was a search for
// a word that does not exist.
//
// The real question it was standing in for is whether an uninspected room
// counts as ready, and the answer here is no. Anything unrecognised counts as
// dirty, so switching an inspection workflow on in Apaleo tightens this rather
// than loosening it.
const ROOM_READY_OK_CONDITIONS = new Set(['Clean']);

export type RoomReadyOutcome =
  | { status: 'moved'; from: string; to: string }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; reason: string };

/** Berlin-local "now" as { date: "YYYY-MM-DD", hhmm: "HH:mm" }. */
function berlinNow(): { date: string; hhmm: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // "YYYY-MM-DD"
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return { date, hhmm: `${hh}:${mm}` };
}

/** hhmm + n minutes, or null when it would cross midnight (nothing meaningful
 *  to do that late — the only-earlier check would kill it anyway). */
function addMinutes(hhmm: string, n: number): string | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]) + n;
  if (total >= 24 * 60) return null;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Fail-closed belt: the assigned unit must actually be ready (clean, not
 *  occupied) before we open its door. Any read failure blocks. */
export type UnitReadiness = 'ready' | 'dirty' | 'occupied' | 'unknown';

/**
 * Why a room is not ready, not merely that it isn't.
 *
 * These three used to collapse into one `unit-not-ready`, which made the cases
 * indistinguishable in the logs — and they call for opposite responses.
 * `dirty` is the ordinary morning state and resolves itself once housekeeping
 * gets there. `occupied` means Apaleo still has the PREVIOUS guest in the room:
 * they were never checked out, so the sweep will keep asking until the QR
 * checkout or the night audit closes them, and if it never happens that is a
 * front-of-house problem, not a cleaning one.
 */
export async function unitReadiness(unitId: string): Promise<UnitReadiness> {
  try {
    const unit = await Fetch<{ status?: { isOccupied?: boolean; condition?: string } }>(
      `/inventory/v1/units/${unitId}`,
    );
    if (unit?.status?.isOccupied === true) return 'occupied';
    const condition = unit?.status?.condition ?? '';
    return ROOM_READY_OK_CONDITIONS.has(condition) ? 'ready' : 'dirty';
  } catch (err) {
    apaleoLog.warn('room-ready: unit status read failed — BLOCKING (fail-closed)', {
      unitId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 'unknown';
  }
}

/** Cents-precision sum of slice grosses; null when any slice lacks a price OR
 *  the list is empty (nothing to verify ⇒ caller must fail closed — a bare 0
 *  could otherwise satisfy a 0===0 price-invariance check and bypass the guard). */
function sumSliceGrossCents(slices: Array<{ grossAmount?: number }>): number | null {
  if (slices.length === 0) return null;
  let cents = 0;
  for (const s of slices) {
    if (typeof s.grossAmount !== 'number') return null;
    cents += Math.round(s.grossAmount * 100);
  }
  return cents;
}

/**
 * Move TODAY'S arriving reservation's Apaleo arrival to max(13:00, now+3min)
 * so the smart-lock code re-syncs and the door opens when the room is ready.
 * Heavily gated (see each guard) because it grants physical access and the
 * amend re-prices from the rate plan: it only proceeds when the unit is
 * verifiably ready, no counterpart late-checkout occupies it, and the offer's
 * per-slice prices EXACTLY match the reservation's current ones. Idempotent,
 * never throws, charges nothing.
 */
export async function openRoomEarly(
  reservationId: string,
  opts: { trustGuestwayClean?: boolean } = {},
): Promise<RoomReadyOutcome> {
  if (!propId || !reservationId) return { status: 'skipped', reason: 'not-configured' };

  // Reads arrival/adults/timeSlices/status AND guards property === CMH (the
  // single-reservation endpoint ignores propertyIds on the shared account).
  const ctx = await loadReservationForAmend(reservationId);
  if (!ctx) return { status: 'skipped', reason: 'not-found-or-other-property' };

  // Allowlist, not blocklist: only a Confirmed reservation gets its door
  // opened. Tentative isn't a committed stay; InHouse is already inside;
  // Canceled/NoShow/CheckedOut must obviously never gain access; and any
  // future Apaleo status stays safe by default.
  if (ctx.status !== 'Confirmed') {
    return { status: 'skipped', reason: `status-${ctx.status ?? 'unknown'}` };
  }

  const now = berlinNow();
  const arrivalDate = ctx.arrival.slice(0, 10); // Berlin local date (ISO carries the offset)

  // Only the actual arrival day. A room cleaned the day before must never open
  // the door in advance (the 13:00-anchored trigger guarantees this upstream;
  // this is the server-side belt).
  if (arrivalDate !== now.date) return { status: 'skipped', reason: 'not-arriving-today' };

  const arrHHmm = hhmmOf(ctx.arrival);
  if (!arrHHmm) return { status: 'skipped', reason: 'no-arrival-time' };

  // Target = max(floor, now + headroom): never below ROOM_READY_FLOOR_HHMM,
  // never in the past when Apaleo evaluates it. Zero-padded HH:mm ⇒ lexical
  // compare works. The floor is 11:00 since 2026-09-14 — 09:00 for the week
  // before, 13:00 before that; see ROOM_READY_FLOOR_HHMM for why 09:00 could
  // never work — and the two bullets below are what changed with it.
  const nowPlus = addMinutes(now.hhmm, ROOM_READY_HEADROOM_MIN);
  if (!nowPlus) return { status: 'skipped', reason: 'too-late-in-day' };
  const target = nowPlus > ROOM_READY_FLOOR_HHMM ? nowPlus : ROOM_READY_FLOOR_HHMM;

  // Only ever move EARLIER. This single check safely covers every case:
  //  - paid-ECI guest (arrival 13:00): moved earlier too, whenever the target
  //    beats their 13:00. Deliberate, and set out under ROOM_READY_FLOOR_HHMM
  //    above: the feature covers every reservation arriving today, so a buyer
  //    keeps what they paid for and gains on top. Do NOT "fix" this by flooring
  //    ECI arrivals at 13:00 — that would hand a paying guest their room LATER
  //    than a guest who paid nothing. What the change really costs is the ECI
  //    product's reason to exist, and that is a pricing decision, not a guard;
  //  - already moved by a previous fire: target ≥ that arrival ⇒ no-op;
  //  - regular 15:00 guest after ~15:00: target ≥ 15:00 ⇒ nothing to gain.
  if (target >= arrHHmm) return { status: 'skipped', reason: 'nothing-earlier-to-gain' };

  // Physical-readiness belt (fail-closed): a specific unit must be assigned,
  // actually clean and NOT occupied. Without an assigned unit there is no door
  // to open; a dirty/occupied unit must never open regardless of what the
  // triggering automation believed.
  if (!ctx.unitId) return { status: 'skipped', reason: 'no-unit-assigned' };
  // WHOSE WORD COUNTS ON CLEANLINESS.
  //
  // Two systems hold a housekeeping flag and they do not move together. On
  // 2026-09-10 Guestway closed the cleaning task for MXMGMNHX-1 at 09:28 and
  // Apaleo only read `Clean` at about 11:10 — an hour and three quarters apart,
  // and 07.09 showed the same shape an hour wide. Guestway is where the cleaner
  // actually works, so it is the fresher of the two by construction.
  //
  // When the Guestway webhook is what woke us, it has just asserted the room is
  // finished, and second-guessing that against a slower flag is what left a
  // guest standing at a locked door for a hundred minutes after being told to
  // come in. So on that path its word is taken (owner's call, 2026-09-10).
  //
  // The sweep gets no such assertion — Guestway's Open API has no housekeeping
  // endpoint to ask, only the one-shot webhook — so it keeps reading Apaleo,
  // which is exactly what let it rescue that same reservation at 11:13.
  //
  // Two states stay fail-closed on BOTH paths. `occupied` is Apaleo's alone to
  // know: Guestway cannot see whether the previous guest is still checked in,
  // and handing a code to a room somebody is still living in is worse than any
  // dirty floor. `unknown` means the unit could not be read at all, so we do not
  // know about occupancy either.
  //
  // What is accepted with this: on the webhook path Guestway's automation is now
  // the only thing standing between a guest and an unready room. Mis-configure
  // it and nothing here will catch it.
  //
  // Spelled out one branch per state on purpose: tests/roomReadyOutcome.test.ts
  // reads this source for `reason:` literals and fails when a new one has not
  // been classified as alertable or not. Returning the variable directly would
  // slip past that guard.
  const readiness = await unitReadiness(ctx.unitId);
  if (readiness === 'occupied') return { status: 'skipped', reason: 'unit-occupied' };
  if (readiness === 'unknown') return { status: 'skipped', reason: 'unit-unknown' };
  if (readiness === 'dirty' && !opts.trustGuestwayClean) {
    return { status: 'skipped', reason: 'unit-dirty' };
  }
  // When trusted, `dirty` passes here — Apaleo simply has not heard yet — but
  // nothing is written to Apaleo at this point. See the note past the last look.
  const apaleoBehind = readiness === 'dirty';

  // Counterpart late-checkout belt (fail-closed here — physical access): if
  // the same unit's departing guest holds a late checkout today, don't hand
  // the arriving guest a code while they may still be inside.
  if (await hasOppositeExtensionConflict(reservationId, 'early', ctx, { failClosed: true })) {
    return { status: 'skipped', reason: 'opposite-extension-conflict' };
  }

  const newArrival = withLocalTime(ctx.arrival, target);

  // Availability probe (read-only). null ⇒ no offer for the earlier window
  // (e.g. the unit is still blocked) ⇒ fail-safe skip, door stays as-is.
  const offer = await getStayAmendOffer(reservationId, { arrival: newArrival });
  if (!offer) {
    apaleoLog.warn('room-ready: no amend offer for earlier arrival — skipping', {
      reservationId,
      newArrival,
    });
    return { status: 'skipped', reason: 'no-offer' };
  }

  // PRICE-INVARIANCE guard (fail-closed): the amend re-prices every time slice
  // from the rate plan's CURRENT price (verified against the live API — see
  // the header of this file). For the paid ECI that risk is accepted per
  // explicit purchase; here the amend is automated fleet-wide, so a drifted
  // rate would silently change what an already-paid guest owes (live Adyen).
  // Proceed ONLY when the offer's slice prices exactly equal the current ones.
  const currentCents = sumSliceGrossCents(ctx.timeSlices);
  const offeredCents = sumSliceGrossCents(
    offer.timeSlices.map((ts) => ({ grossAmount: ts.totalGrossAmount?.amount })),
  );
  if (currentCents === null || offeredCents === null || currentCents !== offeredCents) {
    apaleoLog.warn('room-ready: price would change (or is unverifiable) — skipping', {
      reservationId,
      newArrival,
      currentCents,
      offeredCents,
    });
    return { status: 'skipped', reason: 'price-drift' };
  }

  // LAST LOOK before the door opens.
  //
  // Between the readiness check above and here sit two Apaleo round-trips, and
  // on a slow afternoon that has been seen taking half a minute. More to the
  // point, the room we checked is not necessarily the room the guest ends up
  // with: Apaleo can move a reservation to a different unit at any time, and
  // the early access follows the RESERVATION, not the unit we inspected. So
  // re-read both, and refuse if either has moved.
  //
  // Written after a guest walked into a room that was not ready while the
  // housekeeping flag was known to be honest — which leaves the room having
  // changed under us as the explanation the code can actually do something
  // about.
  //
  // It does not cover a re-assignment that happens AFTER the amend — nothing
  // here can, because by then the lock is already synced. That case needs the
  // front desk to notice.
  const recheck = await loadReservationForAmend(reservationId);
  if (!recheck) {
    apaleoLog.warn('room-ready: reservation unreadable at the last look — skipping', {
      reservationId,
    });
    return { status: 'skipped', reason: 'unit-reassigned' };
  }
  // The status is re-read here for free — it came back on the same call — and
  // it has to be, or this gap re-opens the very hole the Confirmed guard at the
  // top exists to close: a guest who checks in during these round-trips would
  // otherwise still get their arrival amended, on a stay they are already inside.
  if (recheck.status !== 'Confirmed') {
    apaleoLog.warn('room-ready: reservation left Confirmed before the amend — skipping', {
      reservationId,
      wasStatus: ctx.status,
      nowStatus: recheck.status ?? null,
    });
    return { status: 'skipped', reason: `status-${recheck.status ?? 'unknown'}` };
  }
  if (recheck.unitId !== ctx.unitId) {
    apaleoLog.warn('room-ready: unit reassigned under us — skipping', {
      reservationId,
      wasUnit: ctx.unitId,
      nowUnit: recheck.unitId ?? null,
    });
    return { status: 'skipped', reason: 'unit-reassigned' };
  }
  // Two different problems for two different people, so two different reasons:
  // a room being shuffled mid-afternoon is an Apaleo/front-desk question, a room
  // that stopped being clean is a housekeeping one. Sharing one string would
  // undo the split that made `unit-not-ready` legible in the first place.
  const stillReady = await unitReadiness(ctx.unitId);
  // Same asymmetry as above, and it has to be here too or the trusted signal
  // would be undone one line before the amend.
  const stillBlocked =
    stillReady === 'occupied' ||
    stillReady === 'unknown' ||
    (stillReady === 'dirty' && !opts.trustGuestwayClean);
  if (stillBlocked) {
    apaleoLog.warn('room-ready: unit stopped being ready before the amend — skipping', {
      reservationId,
      unitId: ctx.unitId,
      readiness: stillReady,
    });
    return { status: 'skipped', reason: 'unit-no-longer-ready' };
  }

  // NOW pass the cleaner's word on to Apaleo — after the last look, not before.
  //
  // The webhook names a RESERVATION, not a room, and Guestway's automation holds
  // deliberately (pre-check-in done, inside its window), so hours can sit between
  // the cleaner closing the task and this firing. Apaleo can move a guest to a
  // different unit in that time — which is what the last look above exists to
  // catch. Writing before it would have let us stamp `Clean` on a room nobody had
  // touched, and that stamp no longer costs one guest an early door: it lets the
  // room be sold, drops it off the cleaning list and silences the open-door
  // watch. Everything that makes this write useful makes a wrong one expensive.
  //
  // Past the last look the unit is confirmed to be the one the readiness check
  // saw, on a reservation still Confirmed. That is as close to "the room Guestway
  // meant" as this side can get.
  if (apaleoBehind) await markUnitClean(ctx.unitId);

  try {
    await applyStayAmend(reservationId, offer, ctx.adults, ctx.childrenAges);
  } catch (err) {
    apaleoLog.error('room-ready: amend failed', {
      reservationId,
      newArrival,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'error', reason: err instanceof Error ? err.message : String(err) };
  }

  apaleoLog.success('room-ready: arrival moved earlier — Guestway re-syncs the lock from the new time', {
    reservationId,
    from: ctx.arrival,
    to: newArrival,
  });
  return { status: 'moved', from: ctx.arrival, to: newArrival };
}
