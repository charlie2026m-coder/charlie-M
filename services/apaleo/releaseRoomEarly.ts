import {
  loadReservationForAmend,
  getStayAmendOffer,
  applyStayAmend,
  addFolioServiceCharge,
  type StayAmendOffer,
  type ReservationAmendContext,
} from '@/services/apaleo/amendStayTime';
import { apaleoLog } from '@/lib/logger';
import { notifySlack } from '@/lib/slack';

/**
 * Early departure → give the room back to inventory the NEXT DAY.
 *
 * Why this exists
 * ---------------
 * A guest who self-checks-out before their booked departure leaves the room
 * physically empty, but Apaleo keeps the reservation's time slices — so the
 * unit stays `soldCount` until the ORIGINAL departure. Verified on prod
 * (JKRFDSBD-1: guest left 26 Jul, departure stayed 27 Jul 11:00, and the night
 * 26→27 showed soldCount 13/13, availableCount 0). A week-long booking that is
 * ended on day one therefore blocks the room for the whole remaining week.
 *
 * This shortens the reservation to TOMORROW so the remaining nights return to
 * sale — deliberately tomorrow and never today:
 *   - housekeeping runs in the morning, so a room vacated tonight can only be
 *     guest-ready tomorrow;
 *   - it leaves the guest a full night of buffer. The Guestway door code is
 *     re-synced from the reservation, so it stays valid until the new departure
 *     — someone who tapped the QR by mistake, or who comes back for luggage,
 *     is not locked out on the spot.
 *
 * The rule is one expression, and it is intentionally clamping, never extending:
 *
 *     newDeparture = min(originalDeparture, tomorrow)
 *
 *   departure today (regular checkout) → min(today, tomorrow)       = today    → no-op
 *   departure tomorrow                 → min(tomorrow, tomorrow)    = tomorrow → no-op
 *   departure in a week                → min(in-a-week, tomorrow)   = tomorrow → shortened
 *
 * So a guest checking out on their actual departure day can never be pushed to
 * tomorrow: the clamp can only ever move a departure EARLIER, and for those two
 * cases it resolves to the value the reservation already has, which we detect
 * up front and skip without touching Apaleo at all.
 *
 * Money
 * -----
 * The amend re-prices from the rate plan (see amendStayTime's header), so
 * dropping nights removes their charges. Ziff. 6.5 AGB entitles us to the full
 * agreed price for the whole booked period, so the removed amount is posted
 * back as ONE named folio line. Net effect on the folio is zero — the guest
 * owes exactly what they owed before, the room is simply sellable again.
 * If that charge fails, the shortening is rolled back, so we never end up
 * having released the room AND lost the money.
 *
 * Off by default: set SELF_CHECKOUT_EARLY_RELEASE_ENABLED=true to arm it.
 */

const scoLog = apaleoLog;

/** Charge posted for the forfeited nights. Ziff. 6.5 AGB. */
const EARLY_DEPARTURE_CHARGE_NAME = 'Vorzeitige Abreise (Ziff. 6.5 AGB)';
/**
 * The forfeited nights are payment for the booked ACCOMMODATION, so they carry
 * the same reduced German rate (7%) as the room nights they replace — this
 * keeps the folio's VAT split unchanged by the operation. Confirm with the
 * Steuerberater before treating it as compensation (which would be VAT-free).
 */
const EARLY_DEPARTURE_VAT_TYPE = 'Reduced';

export type EarlyReleaseOutcome =
  | { status: 'released'; from: string; to: string; forfeitedAmount: number; currency: string }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; reason: string };

function isEnabled(): boolean {
  return process.env.SELF_CHECKOUT_EARLY_RELEASE_ENABLED === 'true';
}

/** Today's date (YYYY-MM-DD) in the hotel's timezone. */
function todayBerlin(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
}

function addDaysIso(isoDate: string, days: number): string {
  const t = Date.parse(`${isoDate}T00:00:00Z`);
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Berlin's UTC offset ON A GIVEN DATE ("+02:00" / "+01:00"). The new departure
 * can sit on the other side of a DST switch from the original one (a booking
 * ending in November shortened to a day in July), so the offset must be derived
 * for the TARGET date — carrying the original timestamp's offset across the
 * switch would shift the checkout by an hour.
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

/**
 * Move an Apaleo ISO timestamp onto another date, preserving its clock time and
 * re-deriving the offset for the new date. The clock time is preserved on
 * purpose: a guest who bought a late check-out keeps their 13:00, everyone else
 * keeps the standard 11:00.
 */
function withLocalDate(iso: string, isoDate: string): string {
  const time = iso.slice(11, 19) || '11:00:00';
  return `${isoDate}T${time}${berlinOffsetOn(isoDate)}`;
}

/** Cents-precision sum; null when any slice lacks a price or the list is empty
 *  (nothing verifiable ⇒ the caller must not compute a forfeit from it). */
function sumSliceGrossCents(slices: Array<{ grossAmount?: number }>): number | null {
  if (slices.length === 0) return null;
  let cents = 0;
  for (const s of slices) {
    if (typeof s.grossAmount !== 'number') return null;
    cents += Math.round(s.grossAmount * 100);
  }
  return cents;
}

/** Rebuild the ORIGINAL stay from the stored slices, for rollback. Restoring
 *  from stored slices (not a fresh /offers probe) is the same fail-safe
 *  amendStayTime's reversal uses: a transient probe failure must never strand
 *  the reservation in the shortened state. */
function offerFromContext(ctx: ReservationAmendContext): StayAmendOffer {
  return {
    arrival: ctx.arrival,
    departure: ctx.departure,
    availableUnits: 1,
    timeSlices: ctx.timeSlices.map((ts) => ({
      ratePlan: { id: ts.ratePlanId },
      from: ts.from,
      to: ts.to,
    })),
  };
}

/**
 * Shorten an early-departed reservation to tomorrow so the remaining nights go
 * back on sale, and post the forfeited nights back onto the folio.
 *
 * Best-effort by contract: NEVER throws and never blocks the checkout that
 * triggers it. Every failure path degrades to today's behaviour — the guest is
 * checked out and the room simply frees up at the original departure.
 *
 * Call this BEFORE the Apaleo checkout: an amend expects a live reservation,
 * and this ordering means a failure here leaves the guest's checkout untouched.
 */
export async function releaseRoomAfterEarlyCheckout(
  reservationId: string,
  opts: { today?: string; departure?: string } = {},
): Promise<EarlyReleaseOutcome> {
  if (!isEnabled()) return { status: 'skipped', reason: 'disabled' };
  if (!reservationId) return { status: 'skipped', reason: 'no-reservation' };

  const today = opts.today ?? todayBerlin();
  const tomorrow = addDaysIso(today, 1);

  // Cheap pre-check before any network call. The caller already read the
  // reservation to decide the guest may check out, so when it passes the
  // departure along we can drop out here for the common case — a guest leaving
  // the night before their booked departure, which is every early checkout seen
  // on prod so far and where there is nothing to shorten anyway.
  if (opts.departure && opts.departure.slice(0, 10) <= tomorrow) {
    return { status: 'skipped', reason: 'departure-not-beyond-tomorrow' };
  }

  // Reads arrival/departure/adults/slices AND enforces that the reservation
  // belongs to this property (the single-reservation endpoint ignores
  // propertyIds on the shared Apaleo account).
  const ctx = await loadReservationForAmend(reservationId);
  if (!ctx) return { status: 'skipped', reason: 'not-found-or-other-property' };

  // Only a guest who is actually still in the house can be released early.
  // Anything else (already CheckedOut, Canceled, NoShow, Confirmed-not-arrived)
  // must never have its dates rewritten by this path.
  if (ctx.status !== 'InHouse') {
    return { status: 'skipped', reason: `status-${ctx.status ?? 'unknown'}` };
  }

  const departureDate = ctx.departure.slice(0, 10);

  // THE clamp. Departure today or tomorrow ⇒ already correct ⇒ touch nothing.
  // This is what guarantees a regular same-day checkout is never moved.
  if (departureDate <= tomorrow) {
    return { status: 'skipped', reason: 'departure-not-beyond-tomorrow' };
  }

  const newDeparture = withLocalDate(ctx.departure, tomorrow);

  // Read-only price/availability probe for the shortened stay.
  const offer = await getStayAmendOffer(reservationId, { departure: newDeparture });
  if (!offer) {
    scoLog.warn('early-release: no amend offer for the shortened stay — leaving the booking as is', {
      reservationId,
      newDeparture,
    });
    await notifySlack('warn', 'Early departure: room NOT released (Apaleo gave no offer)', {
      reservation: reservationId,
      room: ctx.unitId ?? 'unassigned',
      'booked until': ctx.departure.slice(0, 16).replace('T', ' '),
      'wanted until': newDeparture.slice(0, 16).replace('T', ' '),
      effect: 'guest checked out; room stays blocked until the original departure',
    });
    return { status: 'skipped', reason: 'no-offer' };
  }

  // What the guest owes today vs after the shortening. Both must be verifiable:
  // without exact numbers we cannot post an exact forfeit, and shortening
  // without the forfeit line would hand back money Ziff. 6.5 AGB entitles us to.
  const currentCents = sumSliceGrossCents(ctx.timeSlices);
  const shortenedCents = sumSliceGrossCents(
    offer.timeSlices.map((ts) => ({ grossAmount: ts.totalGrossAmount?.amount })),
  );
  if (currentCents === null || shortenedCents === null) {
    scoLog.warn('early-release: stay price not verifiable — skipping', {
      reservationId,
      currentCents,
      shortenedCents,
    });
    await notifySlack('warn', 'Early departure: room NOT released (stay price unreadable)', {
      reservation: reservationId,
      room: ctx.unitId ?? 'unassigned',
      'current cents': currentCents ?? 'unreadable',
      'shortened cents': shortenedCents ?? 'unreadable',
      effect: 'refused rather than post a guessed forfeit charge; room stays blocked',
    });
    return { status: 'skipped', reason: 'price-unverifiable' };
  }

  const forfeitCents = currentCents - shortenedCents;
  // The shortened stay must cost LESS. A zero or negative delta means the amend
  // would re-price the remaining nights upward (rate drift) — that would raise
  // what an already-settled guest owes, so refuse.
  if (forfeitCents <= 0) {
    scoLog.warn('early-release: shortening would not reduce the stay price — skipping', {
      reservationId,
      currentCents,
      shortenedCents,
    });
    await notifySlack('warn', 'Early departure: room NOT released (rate drift — shortening would cost MORE)', {
      reservation: reservationId,
      room: ctx.unitId ?? 'unassigned',
      now: `${(currentCents / 100).toFixed(2)}`,
      'if shortened': `${(shortenedCents / 100).toFixed(2)}`,
      effect: "refused so an already-settled guest's bill can't go up; room stays blocked",
    });
    return { status: 'skipped', reason: 'no-price-reduction' };
  }

  const currency =
    offer.timeSlices.find((ts) => ts.totalGrossAmount?.currency)?.totalGrossAmount?.currency ?? 'EUR';
  const forfeitedAmount = Math.round(forfeitCents) / 100;

  // 1. Shorten the stay — this is what returns the nights to inventory.
  try {
    await applyStayAmend(reservationId, offer, ctx.adults, ctx.childrenAges);
  } catch (err) {
    scoLog.error('early-release: amend failed — booking untouched', {
      reservationId,
      newDeparture,
      error: err instanceof Error ? err.message : String(err),
    });
    await notifySlack('error', 'Early departure: shortening the stay FAILED', {
      reservation: reservationId,
      room: ctx.unitId ?? 'unassigned',
      'booked until': ctx.departure.slice(0, 16).replace('T', ' '),
      error: err instanceof Error ? err.message : String(err),
      effect: 'booking untouched, guest checked out normally; room stays blocked',
    });
    return { status: 'error', reason: err instanceof Error ? err.message : String(err) };
  }

  // 2. Post the forfeited nights back. If this fails the guest would silently
  //    owe less than Ziff. 6.5 AGB entitles us to, so undo the shortening.
  try {
    await addFolioServiceCharge(reservationId, {
      name: EARLY_DEPARTURE_CHARGE_NAME,
      amount: forfeitedAmount,
      currency,
      serviceDate: tomorrow,
      vatType: EARLY_DEPARTURE_VAT_TYPE,
    });
  } catch (err) {
    scoLog.error('early-release: forfeit charge failed — rolling the stay back', {
      reservationId,
      forfeitedAmount,
      currency,
      error: err instanceof Error ? err.message : String(err),
    });
    try {
      await applyStayAmend(reservationId, offerFromContext(ctx), ctx.adults, ctx.childrenAges);
      await notifySlack('error', 'Early departure: forfeit charge failed — stay rolled back', {
        reservation: reservationId,
        room: ctx.unitId ?? 'unassigned',
        'forfeit not posted': `${forfeitedAmount.toFixed(2)} ${currency}`,
        error: err instanceof Error ? err.message : String(err),
        effect: 'no money lost — booking restored to its original departure; room stays blocked',
      });
    } catch (rollbackErr) {
      // Shortened but unpaid for the dropped nights: the room is back on sale
      // while the guest owes less. Needs a human.
      scoLog.error(
        'early-release: rollback FAILED — stay is shortened WITHOUT the forfeit charge, manual reconciliation',
        {
          reservationId,
          originalDeparture: ctx.departure,
          shortenedTo: newDeparture,
          forfeitedAmount,
          error: rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
        },
      );
      await notifySlack(
        'critical',
        'Early departure: stay SHORTENED but forfeit NOT charged — fix in Apaleo today',
        {
          reservation: reservationId,
          room: ctx.unitId ?? 'unassigned',
          'was booked until': ctx.departure.slice(0, 16).replace('T', ' '),
          'now ends': newDeparture.slice(0, 16).replace('T', ' '),
          'missing charge': `${forfeitedAmount.toFixed(2)} ${currency}`,
          'to do': `post "${EARLY_DEPARTURE_CHARGE_NAME}" on folio ${reservationId}-1, or restore the departure`,
          'why it matters': 'the freed nights are already back on sale while the guest owes that much less',
        },
      );
    }
    return { status: 'error', reason: err instanceof Error ? err.message : String(err) };
  }

  scoLog.success('early-release: stay shortened to tomorrow, forfeited nights re-charged', {
    reservationId,
    from: ctx.departure,
    to: newDeparture,
    forfeitedAmount,
    currency,
  });
  // Reported even on success: it moved money on a folio with nobody watching,
  // and at a few cases a month the noise is negligible.
  await notifySlack('info', 'Early departure: room released for tomorrow', {
    reservation: reservationId,
    room: ctx.unitId ?? 'unassigned',
    'was booked until': ctx.departure.slice(0, 16).replace('T', ' '),
    'now ends': newDeparture.slice(0, 16).replace('T', ' '),
    'nights back on sale': `${forfeitedAmount.toFixed(2)} ${currency} worth`,
    'charged as': EARLY_DEPARTURE_CHARGE_NAME,
    'guest owes': 'unchanged',
  });
  return {
    status: 'released',
    from: ctx.departure,
    to: newDeparture,
    forfeitedAmount,
    currency,
  };
}
