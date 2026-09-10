import { Fetch } from '@/services/Request';
import {
  loadReservationForAmend,
  applyStayAmend,
  type StayAmendOffer,
  type ReservationAmendContext,
} from '@/services/apaleo/amendStayTime';
import { apaleoLog } from '@/lib/logger';
import { notifySlack } from '@/lib/slack';

/**
 * Add a second guest to an existing reservation, from the guest cabinet.
 *
 * How Apaleo behaves here (verified against the live API, not assumed):
 *  - GET /booking/v1/reservations/{id}/offers?adults=2 prices the SAME stay for
 *    two. It returns nothing at all when the unit group cannot hold a second
 *    person (MOT-SSB is maxPersons 1), so Apaleo itself is the capacity gate —
 *    we never have to guess which studios qualify.
 *  - The surcharge is per RATE PLAN and varies: +9/night on FLEX_WEB, +5 on
 *    FLEX_WEB2, +2 on NR_WEB4, and 0 on the Airbnb plans. So the price MUST come
 *    from the offer. lib/Constants' DOUBLE_OCCUPANCY_SURCHARGE_PER_NIGHT (9) is
 *    a display fallback only — charging by it would have billed +36 instead of
 *    +8 on a real booking (WBLXEPTO-1).
 *  - The amend rewrites the folio charges, so the money owed changes. Apaleo
 *    does not pull the card by itself from the API — the capture is ours.
 *
 * How the money is taken (and how it is NOT):
 * This rides the cabinet's existing extras flow: the guest authorises the
 * surcharge through Adyen like any other add-on, and the webhook captures that
 * dedicated authorization against the folio, then applies the amend.
 * It must NOT use the reservation's Apaleo Payment Account. Apaleo allows one
 * per reservation, booking-create already consumed it as a ONE-SHOT capture of
 * the room authorization, and it was created without a recurring payerReference
 * — so it can neither be re-created nor re-charged. (Same reason
 * payServicesFolioByAuthorization exists for late-added services; see its note
 * in bookReservationServices.)
 */

const propId = process.env.APALEO_PROPERTY_ID;

/**
 * Off by default: set SECOND_GUEST_ENABLED=true to arm it. With the flag unset
 * the quote is always ineligible, so the cabinet card never renders and the
 * POST refuses — the feature can ship dark and be switched on once it has been
 * exercised on a real booking.
 */
/**
 * Ceiling for a plausible double-occupancy supplement, per night.
 *
 * The baseline is the price the guest BOOKED at, so any rate movement since then
 * lands inside the surcharge and would be billed to them as a "second guest"
 * fee. The real supplements on this property are 0 (OTA plans), +2, +5 and +9
 * per night, so 12 clears the top rate with headroom while keeping the worst
 * mis-bill small. Anything above it is drift, not occupancy — refuse instead.
 */
const MAX_SECOND_GUEST_PER_NIGHT_CENTS = 1200;

function isEnabled(): boolean {
  return process.env.SECOND_GUEST_ENABLED === 'true';
}

/** Berlin's calendar date as YYYY-MM-DD. Lexically comparable with the date
 *  portion of an Apaleo ISO timestamp. */
function berlinTodayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
}

export type SecondGuestIneligibleReason =
  | 'disabled'
  | 'not-found'
  | 'not-confirmed'
  | 'already-two'
  | 'unit-cannot-fit'
  | 'price-unverifiable'
  | 'price-decrease'
  | 'price-drift'
  | 'no-charge-path'
  | 'city-tax-separate'
  | 'stay-window-ended';

export interface SecondGuestQuote {
  eligible: boolean;
  reason?: SecondGuestIneligibleReason;
  /** What the guest pays extra, in EUR. Always > 0 when eligible: a zero
   *  surcharge has no payable path and is refused as 'no-charge-path'. */
  surcharge: number;
  currency: string;
  currentTotal: number;
  newTotal: number;
}

const INELIGIBLE = (reason: SecondGuestIneligibleReason): SecondGuestQuote => ({
  eligible: false,
  reason,
  surcharge: 0,
  currency: 'EUR',
  currentTotal: 0,
  newTotal: 0,
});

/** Cents-precision sum; null when any slice lacks a price or the list is empty —
 *  an unverifiable total must never be turned into a charge. */
function sumSliceGrossCents(slices: Array<{ grossAmount?: number }>): number | null {
  if (slices.length === 0) return null;
  let cents = 0;
  for (const s of slices) {
    if (typeof s.grossAmount !== 'number') return null;
    cents += Math.round(s.grossAmount * 100);
  }
  return cents;
}

/** Read-only: the same stay priced for N adults. Null when Apaleo offers
 *  nothing — which is also how "this studio only sleeps one" surfaces. */
async function fetchOfferForAdults(
  reservationId: string,
  adults: number,
): Promise<StayAmendOffer | null> {
  try {
    const res = await Fetch<{ offers?: StayAmendOffer[] }>(
      `/booking/v1/reservations/${reservationId}/offers?adults=${adults}`,
    );
    const offer = res?.offers?.[0];
    if (!offer || (offer.availableUnits ?? 0) < 1) return null;
    return offer;
  } catch (err) {
    // A 204 (nothing on offer) arrives here as an empty body; a real failure
    // also lands here. Treat both as "cannot offer" so we never amend blind,
    // but log so an outage isn't silently read as a capacity limit.
    apaleoLog.warn('second-guest: offer unavailable', {
      reservationId,
      adults,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * True when the reservation's folio bills city tax as its OWN line rather than
 * inside the nightly rate. Fail-CLOSED: an unreadable folio returns true, so an
 * outage refuses the sale instead of risking an under-collected folio.
 */
async function hasSeparateCityTaxLine(reservationId: string): Promise<boolean> {
  try {
    const folios = await Fetch<{ folios?: Array<{ id?: string }> }>(
      `/finance/v1/folios?reservationIds=${encodeURIComponent(reservationId)}`,
    );
    const folioId = folios?.folios?.[0]?.id;
    if (!folioId) return true;
    const folio = await Fetch<{ charges?: Array<{ name?: string }> }>(
      `/finance/v1/folios/${encodeURIComponent(folioId)}`,
    );
    return (folio?.charges ?? []).some((c) => /city tax/i.test(c?.name ?? ''));
  } catch (err) {
    apaleoLog.warn('second-guest: folio read failed — refusing (fail-closed)', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return true;
  }
}

/** Shared pre-flight for both the quote and the apply path, so the button and
 *  the action can never disagree about eligibility or price. */
async function evaluate(reservationId: string): Promise<{
  quote: SecondGuestQuote;
  ctx?: ReservationAmendContext;
  offer?: StayAmendOffer;
}> {
  if (!isEnabled()) return { quote: INELIGIBLE('disabled') };
  if (!propId || !reservationId) return { quote: INELIGIBLE('not-found') };

  // Also guards that the reservation belongs to THIS property — the single
  // reservation endpoint ignores propertyIds on the shared Apaleo account.
  const ctx = await loadReservationForAmend(reservationId);
  if (!ctx) return { quote: INELIGIBLE('not-found') };

  // Only a stay that is still ahead or running can gain a guest.
  if (ctx.status !== 'Confirmed' && ctx.status !== 'InHouse') {
    return { quote: INELIGIBLE('not-confirmed') };
  }
  if ((ctx.adults ?? 1) >= 2) return { quote: INELIGIBLE('already-two') };

  // No nights left to host anyone. The payment validator treats SECOND_GUEST as
  // night-based and refuses it once the stay window has ended, so quoting it on
  // departure day would show a card that can only fail at the payment step.
  if (ctx.departure.slice(0, 10) <= berlinTodayISO()) {
    return { quote: INELIGIBLE('stay-window-ended') };
  }

  // Baseline = what the guest is booked at. Apaleo will NOT quote the stay at
  // its current occupancy — `offers?adults=1` on a 1-adult reservation answers
  // 204 No Content ("nothing to change"), verified against the live API on
  // every candidate booking. So a two-offer comparison is impossible; the
  // reservation's own slices are the only available baseline.
  const offer = await fetchOfferForAdults(reservationId, 2);
  if (!offer) return { quote: INELIGIBLE('unit-cannot-fit') };

  const bookedCents = sumSliceGrossCents(ctx.timeSlices);
  const newCents = sumSliceGrossCents(
    offer.timeSlices.map((ts) => ({ grossAmount: ts.totalGrossAmount?.amount })),
  );
  if (bookedCents === null || newCents === null) {
    return { quote: INELIGIBLE('price-unverifiable') };
  }

  // The surcharge is a difference of TIME SLICES, i.e. accommodation only. On
  // our own bookings that is the whole bill — city tax is already inside the
  // nightly price (checked across every live booking: the ones carrying a
  // separate "City Tax" folio line are all OTA, and OTA plans price per unit so
  // they never produce a surcharge anyway). But if a folio ever does carry city
  // tax as its own line, the amend would raise it while our charge would not
  // cover it, leaving the folio short. Refuse that combination rather than
  // under-collect.
  if (await hasSeparateCityTaxLine(reservationId)) {
    apaleoLog.warn('second-guest: folio bills city tax separately — refusing to under-collect', {
      reservationId,
    });
    return { quote: INELIGIBLE('city-tax-separate') };
  }

  // Using the booked price as the baseline means any rate movement since
  // booking lands inside the surcharge. Bound it: a genuine double-occupancy
  // supplement is a per-night amount in the single digits, so anything beyond
  // a sane ceiling is drift, not occupancy — refuse rather than bill it as a
  // "second guest" fee. Same fail-closed stance the room-ready amend takes.
  const surchargeCents = newCents - bookedCents;
  const nights = Math.max(1, ctx.timeSlices.length);
  const maxPlausibleCents = nights * MAX_SECOND_GUEST_PER_NIGHT_CENTS;
  if (surchargeCents > maxPlausibleCents) {
    apaleoLog.warn('second-guest: surcharge implausibly large — rate drift, refusing', {
      reservationId,
      bookedCents,
      twoAdultCents: newCents,
      surchargeCents,
      maxPlausibleCents,
      nights,
    });
    return { quote: INELIGIBLE('price-drift') };
  }
  // A cheaper two-adult price means the rate moved under us; refuse rather than
  // quietly reduce what an already-settled guest paid.
  if (surchargeCents < 0) return { quote: INELIGIBLE('price-decrease') };

  // A free second guest (the OTA plans price per unit, not per person) has no
  // way through: the basket pays via one Adyen authorization and Adyen rejects
  // a zero amount, so the line would sit in the order forever with no Pay
  // button. Say so instead of showing a card that leads nowhere. Adding those
  // guests needs a payment-free path, which is a separate change.
  if (surchargeCents === 0) return { quote: INELIGIBLE('no-charge-path') };

  const currency =
    offer.timeSlices.find((ts) => ts.totalGrossAmount?.currency)?.totalGrossAmount?.currency ??
    'EUR';

  return {
    quote: {
      eligible: true,
      surcharge: Math.round(surchargeCents) / 100,
      currency,
      currentTotal: bookedCents / 100,
      newTotal: newCents / 100,
    },
    ctx,
    offer,
  };
}

/** What the cabinet shows before the guest commits: can they add someone, and
 *  what will it cost. Never mutates. */
export async function getSecondGuestQuote(reservationId: string): Promise<SecondGuestQuote> {
  const { quote } = await evaluate(reservationId);
  return quote;
}

/** Everything needed to put the reservation back to one adult. */
export interface AppliedSecondGuest {
  reservationId: string;
  originalArrival: string;
  originalDeparture: string;
  originalAdults: number;
  childrenAges: number[];
  timeSlices: Array<{ ratePlanId: string; from: string; to: string }>;
  /** Accommodation total the guest was booked at BEFORE the amend, in cents.
   *  The revert re-amends, and an amend always re-prices from the rate plan's
   *  CURRENT price — so this is the only way to notice that undoing the second
   *  guest also quietly moved what an already-settled guest owes. Null when the
   *  slices carried no price (nothing to compare against). */
  bookedGrossCents: number | null;
}

export type SecondGuestApplyResult =
  | { ok: true; applied: AppliedSecondGuest; surcharge: number; currency: string }
  | { ok: false; reason: SecondGuestIneligibleReason | 'amend-failed' };

/**
 * Reprice the stay for two adults.
 *
 * MONEY IS NOT TAKEN HERE. This runs inside the cabinet's extras flow, whose
 * dedicated Adyen authorization is captured against the folio afterwards — the
 * same route Late Check-Out uses. It deliberately does NOT touch the
 * reservation's Apaleo Payment Account: Apaleo allows one per reservation and
 * booking-create already consumed it as a one-shot capture of the room
 * authorization, so it can neither be re-created nor re-charged (see the note
 * above payServicesFolioByAuthorization in bookReservationServices).
 *
 * Re-evaluates server-side: the client's quote is never trusted and the rate
 * may have moved since it was shown.
 */
export async function applySecondGuest(reservationId: string): Promise<SecondGuestApplyResult> {
  const { quote, ctx, offer } = await evaluate(reservationId);
  if (!quote.eligible || !ctx || !offer) {
    return { ok: false, reason: quote.reason ?? 'not-found' };
  }

  const applied: AppliedSecondGuest = {
    reservationId,
    originalArrival: ctx.arrival,
    originalDeparture: ctx.departure,
    originalAdults: ctx.adults,
    childrenAges: ctx.childrenAges,
    timeSlices: ctx.timeSlices.map((ts) => ({ ratePlanId: ts.ratePlanId, from: ts.from, to: ts.to })),
    bookedGrossCents: sumSliceGrossCents(ctx.timeSlices),
  };

  try {
    await applyStayAmend(reservationId, offer, 2, ctx.childrenAges);
  } catch (err) {
    apaleoLog.error('second-guest: amend failed — reservation untouched', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: 'amend-failed' };
  }

  apaleoLog.success('second-guest: stay repriced for two', {
    reservationId,
    surcharge: quote.surcharge,
    currency: quote.currency,
  });
  return { ok: true, applied, surcharge: quote.surcharge, currency: quote.currency };
}

/**
 * Put the reservation back to its original occupancy. Restores from the STORED
 * slices rather than a fresh offer, so a transient Apaleo blip can't strand the
 * booking at two guests. Never throws — the caller is already on a refund path.
 */
export async function revertSecondGuest(applied: AppliedSecondGuest): Promise<void> {
  try {
    await applyStayAmend(
      applied.reservationId,
      {
        arrival: applied.originalArrival,
        departure: applied.originalDeparture,
        availableUnits: 1,
        timeSlices: applied.timeSlices.map((ts) => ({
          ratePlan: { id: ts.ratePlanId },
          from: ts.from,
          to: ts.to,
        })),
      },
      applied.originalAdults,
      applied.childrenAges,
    );

    // The revert is itself an amend, so Apaleo re-priced the stay from the rate
    // plan as it stands NOW. If that no longer matches what the guest was booked
    // at, undoing the second guest has silently changed an already-settled bill —
    // in either direction. We do not try to correct it automatically (writing
    // compensating folio lines blind is how you turn one wrong number into two);
    // a human gets the before/after and decides.
    if (applied.bookedGrossCents !== null) {
      const after = await loadReservationForAmend(applied.reservationId);
      const restoredCents = after ? sumSliceGrossCents(after.timeSlices) : null;
      if (restoredCents === null || restoredCents !== applied.bookedGrossCents) {
        apaleoLog.error('second-guest: revert changed the stay price — folio no longer matches what was paid', {
          reservationId: applied.reservationId,
          bookedCents: applied.bookedGrossCents,
          restoredCents,
        });
        await notifySlack('critical', 'Second guest: rolling back changed the room price', {
          reservation: applied.reservationId,
          'was booked at': `${(applied.bookedGrossCents / 100).toFixed(2)} EUR`,
          'now shows': restoredCents === null ? 'unreadable' : `${(restoredCents / 100).toFixed(2)} EUR`,
          'to do': 'check the folio — the rate moved while we undid the second guest, so the guest may now owe more or less than they paid',
        });
      }
    }
  } catch (err) {
    apaleoLog.error(
      'second-guest: revert FAILED — reservation still shows 2 guests while the guest is refunded',
      {
        reservationId: applied.reservationId,
        error: err instanceof Error ? err.message : String(err),
      },
    );
    await notifySlack('critical', 'Second guest: revert failed — reservation stuck at 2 guests', {
      reservation: applied.reservationId,
      'guests now': 2,
      'should be': applied.originalAdults,
      'to do': `set adults back to ${applied.originalAdults} in Apaleo — the guest has been refunded`,
    });
  }
}
