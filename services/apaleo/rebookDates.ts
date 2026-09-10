import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { Fetch } from '@/services/Request'
import { bookingLog, priceLog } from '@/lib/logger'
import { loadReservationForAmend, applyStayAmend, type StayAmendOffer } from '@/services/apaleo/amendStayTime'
import { getReservationFolioPayments } from '@/services/getReservationFolioPayments'
import { getFolioRefundsByPayment } from '@/services/apaleo/refundFolioPayment'
import { isUnitFree } from '@/services/apaleo/isUnitFree'
import { getBerlinToday, getDate } from '@/lib/utils'
import { HOTEL_INFO, FLEX_WEB_CODES as FLEX_WEB_LIST, getRatePlanByNights } from '@/lib/Constants'
import type { ApaleoReservationResponse } from '@/types/apaleo'
import { unitGroupFromRatePlanId as unitGroupOf, pickOfferIndex } from '@/lib/rebookMath'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Moving a refundable booking to different dates ("Umbuchung").
 *
 * The money model: the guest already paid for the old stay, Apaleo re-prices the
 * new one, and the difference settles. That makes this a money path on a LIVE
 * Adyen account, so every number is derived server-side — the client sends two
 * dates and nothing else.
 *
 * Why a guest may do this at all: FLEX is free-cancellation until Apaleo's own
 * deadline, so until then they can already cancel for a full refund and rebook
 * at today's price without asking. A date change is that, in one step. Past the
 * deadline cancelling costs 100%, the equivalence breaks, and the feature turns
 * itself off — see `deadline-passed`.
 *
 * This deliberately reuses the amend machinery rather than re-deriving it:
 * `loadReservationForAmend` (property guard, time slices, childrenAges, unit)
 * and `applyStayAmend` (which sends childrenAges at both levels — omitting it
 * drops children from the reservation). The refund planner mirrors
 * cancelAndRefundReservation: per-payment remaining balances, and a hard refusal
 * to auto-refund when the folio carries anything it cannot read confidently.
 */

/** Refundable web rates. The calendar greys by the SAME list, so a date it
 *  offers is a date this can actually price. */
const FLEX_WEB_CODES = new Set<string>(FLEX_WEB_LIST)

/**
 * Only our own bookings. OTA reservations are governed by the platform's terms.
 * Compared case-insensitively: booking-create writes `channelCode: 'IBE'` while
 * Apaleo reads back `Ibe`, and an exact match would silently disable the whole
 * feature if that normalisation ever changed.
 */
const OWN_CHANNELS = new Set(['ibe', 'direct'])

/** How far ahead a booking may move — beyond this it is a new booking decision. */
const MAX_MOVE_AHEAD_DAYS = 365

export type RebookRefusal =
  | 'not-found'
  | 'not-own-channel'
  | 'not-confirmed'
  | 'not-refundable'
  | 'deadline-passed'
  | 'already-rebooked'
  | 'dates-invalid'
  | 'too-far-ahead'
  | 'no-offer'
  | 'rate-plan-mismatch'
  | 'unit-unavailable'
  | 'top-up-required'
  | 'price-unreadable'
  | 'needs-manual'

/** One refund instruction, already capped at that payment's remaining balance. */
export interface RefundLine {
  folioId: string
  paymentId: string
  amountCents: number
  currency: string
}

export interface RebookQuote {
  reservationId: string
  oldArrival: string
  oldDeparture: string
  newArrival: string
  newDeparture: string
  /** Accommodation charges on the old stay — the only part a date change moves. */
  oldRoomCents: number
  /** What Apaleo charges for the new dates on the same rate-plan family. */
  newRoomCents: number
  /** <0 we refund, >0 the guest owes and the move must go through the top-up
   *  payment flow, 0 a straight swap. */
  deltaCents: number
  currency: string
  ratePlanId: string
  /** The studio to pin the amended reservation back to, when Apaleo assigned one. */
  unitId?: string
  /** Exactly what to refund, per payment. Empty for a straight swap. */
  refundPlan: RefundLine[]
  /** Amend payload, in the shape applyStayAmend expects. */
  offer: StayAmendOffer
  adults: number
  childrenAges: number[]
}

export type RebookQuoteResult =
  | { ok: true; quote: RebookQuote }
  | { ok: false; reason: RebookRefusal; detail?: string }

/**
 * The subset of the Apaleo reservation the caller already holds.
 *
 * Picked from ApaleoReservationResponse rather than re-declared: every
 * eligibility guard below reads these fields, and a hand-written mirror would
 * let a rename drift to `undefined` with no compile error. `unitGroup` in
 * particular gates the room-category check, so it must not be optional here.
 */
export type RebookReservationFacts = Pick<
  ApaleoReservationResponse,
  'status' | 'channelCode' | 'ratePlan' | 'unitGroup' | 'cancellationFee' | 'hasCityTax'
>

interface OffersRead {
  offers?: Array<{
    arrival?: string
    departure?: string
    availableUnits?: number
    unitGroup?: { id?: string }
    totalGrossAmount?: { amount?: number; currency?: string }
    timeSlices?: Array<{
      from?: string
      to?: string
      ratePlan?: { id?: string; code?: string }
      totalGrossAmount?: { amount?: number; currency?: string }
    }>
  }>
}

const toCents = (n: number | undefined): number => Math.round((n ?? 0) * 100)

const ymd = (iso: string): string => iso.slice(0, 10)

/** Berlin-local ISO for Apaleo, so DST is applied for that date, not today's. */
const berlinIso = (date: string, hhmm: string): string =>
  dayjs.tz(`${date} ${hhmm}`, 'Europe/Berlin').format()

/** The Berlin time-of-day a reservation actually carries — 13:00 when the guest
 *  bought an early check-in or a late check-out, otherwise the hotel default. */
const berlinHm = (iso: string, fallback: string): string => {
  const d = dayjs(iso).tz('Europe/Berlin')
  return d.isValid() ? d.format('HH:mm') : fallback
}

/**
 * Price a date change and run every eligibility check.
 *
 * Read-only. `facts` is the reservation the route already fetched for the access
 * check — passing it avoids a second read of the same resource.
 */
export async function quoteRebook(params: {
  reservationId: string
  newArrival: string // YYYY-MM-DD
  newDeparture: string // YYYY-MM-DD
  /**
   * The reservation, when the caller already read it — the ownership check
   * hands it on so this does not fetch it twice. Optional because that check
   * omits it on its cached-email fast path; then it is read here.
   */
  facts?: RebookReservationFacts
  /** True when a COMPLETED move already exists for this reservation. */
  alreadyRebooked: boolean
}): Promise<RebookQuoteResult> {
  const { reservationId, newArrival, newDeparture, alreadyRebooked } = params

  let facts = params.facts
  if (!facts) {
    try {
      facts = await Fetch<ApaleoReservationResponse>(
        `/booking/v1/reservations/${encodeURIComponent(reservationId)}?propertyIds=${process.env.APALEO_PROPERTY_ID}`,
      )
    } catch {
      return { ok: false, reason: 'not-found' }
    }
  }

  if (alreadyRebooked) return { ok: false, reason: 'already-rebooked' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newArrival) || !/^\d{4}-\d{2}-\d{2}$/.test(newDeparture)) {
    return { ok: false, reason: 'dates-invalid' }
  }
  if (newDeparture <= newArrival) return { ok: false, reason: 'dates-invalid' }

  // Berlin, not UTC: on a UTC server the late-evening hours belong to the next
  // Berlin day, and a UTC "today" would admit a move onto the current date whose
  // night audit is hours away.
  const today = getDate(getBerlinToday())!
  if (newArrival <= today) return { ok: false, reason: 'dates-invalid' }

  // Both ends: bounding only the arrival let a stay run hundreds of nights past
  // the published calendar, onto rates we have not set, and PUT that many slices
  // into the amend.
  const horizon = getDate(dayjs(today).add(MAX_MOVE_AHEAD_DAYS, 'day').toDate())!
  if (newArrival > horizon || newDeparture > horizon) {
    return { ok: false, reason: 'too-far-ahead' }
  }

  if (!OWN_CHANNELS.has((facts.channelCode ?? '').toLowerCase())) {
    return { ok: false, reason: 'not-own-channel', detail: facts.channelCode }
  }
  // Confirmed only: an in-house guest has consumed nights, so the folio maths
  // below no longer describes a stay that can be moved wholesale.
  if (facts.status !== 'Confirmed') {
    return { ok: false, reason: 'not-confirmed', detail: facts.status }
  }
  if (facts.cancellationFee?.code !== 'FLEX') {
    return { ok: false, reason: 'not-refundable', detail: facts.cancellationFee?.code }
  }

  // The deadline switch-off, read per reservation so a policy change in Apaleo
  // moves it with us. Fails CLOSED on an unparseable value — `Date.now() >= NaN`
  // is false, which would have silently skipped the whole guard.
  const dueMs = facts.cancellationFee?.dueDateTime
    ? Date.parse(facts.cancellationFee.dueDateTime)
    : NaN
  if (!Number.isFinite(dueMs) || Date.now() >= dueMs) {
    return { ok: false, reason: 'deadline-passed' }
  }

  const oldCode = facts.ratePlan?.code ?? ''
  if (!FLEX_WEB_CODES.has(oldCode)) {
    return { ok: false, reason: 'rate-plan-mismatch', detail: oldCode }
  }

  // City tax is billed as its own per-night folio line, and both sides of this
  // quote are accommodation only — so a move would re-price the tax while the
  // refund (or top-up) ignored it, leaving the folio out by the difference.
  //
  // The hotel stopped charging city tax in mid-May 2026: every booking made
  // since carries hasCityTax=false and a fresh offer returns no cityTaxes at
  // all. Only bookings made before that still have it — one of the eight
  // currently eligible, and a shrinking number as they depart. Not worth
  // teaching the money path a case that is disappearing; refuse those few and
  // let staff handle them, exactly as the second-guest sale does.
  //
  // The flag rather than a folio read: it matched the folio on every live
  // booking checked, and it is already on the reservation, so this costs no
  // extra Apaleo call.
  if (facts.hasCityTax === true) {
    return { ok: false, reason: 'needs-manual', detail: 'city tax billed separately' }
  }

  // Shared amend context: property guard, current slices, childrenAges, unit.
  const ctx = await loadReservationForAmend(reservationId)
  if (!ctx) return { ok: false, reason: 'not-found' }

  // Carry the guest's ACTUAL times of day across, don't re-impose the hotel
  // defaults. A paid early check-in / late check-out lives as a 13:00 arrival or
  // departure on the reservation (that is how amendStayTime sells it), so
  // quoting at 15:00/11:00 would take back the hour they paid for while the fee
  // stayed on their folio.
  const arrivalHm = berlinHm(ctx.arrival, HOTEL_INFO.checkinTime)
  const departureHm = berlinHm(ctx.departure, HOTEL_INFO.checkoutTime)

  // Price the new dates. Both params are required — arrival alone returns 204 —
  // and the times are Berlin-local so DST is applied for the target date.
  let offers: OffersRead
  try {
    offers = await Fetch<OffersRead>(
      `/booking/v1/reservations/${encodeURIComponent(reservationId)}/offers` +
        `?arrival=${encodeURIComponent(berlinIso(newArrival, arrivalHm))}` +
        `&departure=${encodeURIComponent(berlinIso(newDeparture, departureHm))}`,
    )
  } catch {
    return { ok: false, reason: 'no-offer' }
  }

  // A 204 arrives as an empty object: nothing bookable on those dates.
  const candidates = (offers.offers ?? []).filter(o => (o.availableUnits ?? 0) >= 1)
  if (candidates.length === 0) return { ok: false, reason: 'no-offer' }

  // Same room category AND the same rate-plan family on EVERY slice.
  //
  // Category: this endpoint does NOT return `unitGroup` (verified live), but the
  // rate-plan id encodes it — MOT-FLEX_WEB4-SKB → MOT-SKB — which is how the
  // payment validator derives it too. Without this a sold-out category would
  // silently downgrade the guest to a smaller studio and read as a price drop.
  //
  // Family on every slice, not just the first: the response carries NR_AIR and
  // *_EXTN, and a multi-night offer can straddle plans, so checking slice 0
  // alone could put later nights on a non-refundable rate.
  const eligible = candidates.filter(o => {
    const slices = o.timeSlices ?? []
    if (slices.length === 0) return false
    if (!slices.every(s => FLEX_WEB_CODES.has(s.ratePlan?.code ?? ''))) return false
    // Fails CLOSED. This is the only thing standing between a sold-out category
    // and a silent downgrade into a smaller studio that reads as a price drop —
    // so an unreadable category must reject the offer, not wave it through.
    if (!facts.unitGroup?.id) return false
    return slices.every(s => unitGroupOf(s.ratePlan?.id) === facts.unitGroup.id)
  })

  // Pick the tier that matches the new length of stay, exactly as the booking
  // funnel does. The plans are length-tiered and priced accordingly: on a live
  // 4-night probe FLEX_WEB quoted 538 and FLEX_WEB4 quoted 411, so taking the
  // first family match would have cost the guest 127 EUR of their refund.
  const nights = dayjs(newDeparture).diff(dayjs(newArrival), 'day')
  const preferredCode = getRatePlanByNights(nights)
  // Length-matched tier, else the cheapest on offer. See lib/rebookMath.
  const picked = pickOfferIndex(
    eligible.map(o => ({
      code: o.timeSlices?.[0]?.ratePlan?.code,
      amount: o.totalGrossAmount?.amount,
    })),
    preferredCode,
  )
  // Distinguish the two ways this can come up empty. Offers DID pass the
  // category and rate-family filter, so telling the guest their studio type is
  // unavailable would be false — and it reads as terminal, where a missing
  // price is worth retrying.
  if (picked === -1 && eligible.length > 0) {
    priceLog.error('rebook: eligible offers carry no price', {
      reservationId,
      eligible: eligible.length,
    })
    return { ok: false, reason: 'price-unreadable' }
  }
  const match = picked === -1 ? undefined : eligible[picked]
  if (!match) return { ok: false, reason: 'rate-plan-mismatch' }

  const arrivalIso = match.arrival
  const departureIso = match.departure
  const slices = (match.timeSlices ?? []).map(s => ({
    ratePlan: { id: s.ratePlan?.id ?? '' },
    from: s.from ?? arrivalIso ?? '',
    to: s.to ?? departureIso ?? '',
    totalGrossAmount: s.totalGrossAmount,
  }))
  // Never PUT a half-built amend: an empty slice list or a blank plan id would
  // be sent verbatim and rewrite the reservation with nothing.
  if (!arrivalIso || !departureIso || slices.length === 0 || slices.some(s => !s.ratePlan.id)) {
    return { ok: false, reason: 'no-offer' }
  }

  const newRoomCents = toCents(match.totalGrossAmount?.amount)
  const currency = match.totalGrossAmount?.currency ?? 'EUR'
  if (newRoomCents <= 0) return { ok: false, reason: 'price-unreadable' }

  // Keep the guest in their own studio. The amend re-assigns within the category
  // otherwise, and their room number and door PIN are already in their hands.
  // The exclusion is load-bearing: the reservation still sits on this unit on
  // its OLD dates, which overlap the new window on any ordinary shift, so
  // without it the booking blocks its own move (verified live).
  if (ctx.unitId) {
    const free = await isUnitFree(ctx.unitId, newArrival, newDeparture, reservationId)
    if (!free) return { ok: false, reason: 'unit-unavailable' }
  }

  // The old room price comes from the reservation's own time slices, NOT from
  // summing folio charges by serviceType.
  //
  // Apaleo types the same add-on inconsistently: across live folios the very
  // same Late Check-Out appears as serviceType 'Other' on some reservations and
  // 'Accommodation' on others (measured: ECI 4x Other / 1x Accommodation, LCO
  // 1x Other / 2x Accommodation). Filtering on 'Accommodation' therefore folded
  // a paid 30 EUR late checkout into the room price for some guests and not
  // others — the same product, refunded on a date change or not depending on
  // how Apaleo happened to tag it. Time slices carry accommodation only and are
  // the same basis as an offer's totalGrossAmount, so both sides of the
  // subtraction now mean the same thing. (City tax sits outside both: separate
  // CityTax charge lines, excluded from slice totals and offer totals alike.)
  if (ctx.timeSlices.some(t => typeof t.grossAmount !== 'number')) {
    priceLog.error('rebook: reservation slices carry no price — refusing to quote', {
      reservationId,
      slices: ctx.timeSlices.length,
    })
    return { ok: false, reason: 'price-unreadable' }
  }
  const oldRoomCents = ctx.timeSlices.reduce((sum, t) => sum + toCents(t.grossAmount), 0)
  if (oldRoomCents <= 0) return { ok: false, reason: 'price-unreadable' }

  const deltaCents = newRoomCents - oldRoomCents

  // Both directions are quoted. They are APPLIED very differently, though:
  // giving money back settles inside one request, while collecting it needs an
  // authorisation the guest has to approve, so a positive delta is handed to
  // the top-up flow (save-pending -> Adyen -> webhook) and never to applyRebook.
  // The refund route enforces that; see the guard in its POST.
  const refundPlan: RefundLine[] = []
  if (deltaCents < 0) {
    const planned = await planRefund(reservationId, Math.abs(deltaCents), currency)
    if (!planned.ok) return { ok: false, reason: planned.reason, detail: planned.detail }
    refundPlan.push(...planned.lines)
  }

  const quote: RebookQuote = {
    reservationId,
    oldArrival: ymd(ctx.arrival),
    oldDeparture: ymd(ctx.departure),
    newArrival,
    newDeparture,
    oldRoomCents,
    newRoomCents,
    deltaCents,
    currency,
    ratePlanId: slices[0].ratePlan.id,
    unitId: ctx.unitId,
    refundPlan,
    offer: {
      arrival: arrivalIso,
      departure: departureIso,
      availableUnits: match.availableUnits ?? 0,
      timeSlices: slices,
    },
    adults: Math.max(1, ctx.adults),
    childrenAges: ctx.childrenAges,
  }

  bookingLog.info('rebook quoted', {
    reservationId,
    from: `${quote.oldArrival}->${quote.oldDeparture}`,
    to: `${newArrival}->${newDeparture}`,
    oldRoomCents,
    newRoomCents,
    deltaCents,
    refundLines: refundPlan.length,
  })

  return { ok: true, quote }
}

/**
 * Work out exactly which payments to refund and by how much.
 *
 * Mirrors cancelAndRefundReservation: every line is capped at that payment's
 * REMAINING balance (capture − already refunded), because Apaleo ACCEPTS an
 * over-refund and only fails it asynchronously — which would look like success
 * here and leave the guest unpaid.
 *
 * Refuses outright ('needs-manual') on anything it cannot read confidently: a
 * payment still in flight, a negative folio line whose cardholder direction is
 * unverified, a capture in another currency, or a target the remaining balances
 * cannot cover.
 */
async function planRefund(
  reservationId: string,
  owedCents: number,
  currency: string,
): Promise<
  | { ok: true; lines: RefundLine[] }
  | { ok: false; reason: RebookRefusal; detail?: string }
> {
  try {
    const folio = await getReservationFolioPayments(reservationId)

    // Money in flight makes any auto-refund amount untrustworthy — the helper's
    // own contract says to route to manual rather than drop it.
    if (folio.unsettled > 0) {
      return { ok: false, reason: 'needs-manual', detail: 'pending payments on folio' }
    }
    // A negative line is a reversal or chargeback; netting it could over-refund
    // money the hotel no longer holds.
    if (folio.payments.some(p => p.amountCents < 0)) {
      return { ok: false, reason: 'needs-manual', detail: 'reversal on folio' }
    }
    if (folio.payments.some(p => p.amountCents > 0 && p.currency !== currency)) {
      return { ok: false, reason: 'needs-manual', detail: 'capture currency differs' }
    }

    const folioIds = [...new Set(folio.payments.filter(p => p.amountCents > 0).map(p => p.folioId))]
    const refundedByPayment = await getFolioRefundsByPayment(folioIds)

    const lines: RefundLine[] = []
    let need = owedCents
    for (const p of folio.payments) {
      if (need <= 0) break
      if (p.amountCents <= 0 || !p.paymentId) continue
      const remaining = Math.max(0, p.amountCents - (refundedByPayment.get(p.paymentId) ?? 0))
      if (remaining <= 0) continue
      const amountCents = Math.min(need, remaining)
      lines.push({ folioId: p.folioId, paymentId: p.paymentId, amountCents, currency: p.currency })
      need -= amountCents
    }

    // Cannot cover the drop from refundable captures — a human must settle it
    // rather than us moving the dates and paying part of what we owe.
    if (need > 0) {
      return { ok: false, reason: 'needs-manual', detail: `short by ${need} cents` }
    }
    return { ok: true, lines }
  } catch (err) {
    priceLog.error('rebook: folio payments unreadable — refusing to quote', {
      reservationId,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, reason: 'price-unreadable' }
  }
}

/**
 * Did Apaleo actually move this reservation onto these dates?
 *
 * A thrown Fetch cannot tell "Apaleo rejected the PUT" from "Apaleo applied it
 * and the response was lost" — a gateway timeout looks identical either way. So
 * both callers ask the reservation instead of guessing, and both need the SAME
 * answer, which is why this lives here rather than in one of them.
 *
 * Returns null when even the re-read fails. That is "unknown", and must never
 * be collapsed into "nothing happened": the difference decides whether a guest
 * is released to try again or handed to a human.
 */
export async function datesMoved(
  reservationId: string,
  newArrival: string,
  newDeparture: string,
): Promise<boolean | null> {
  const after = await loadReservationForAmend(reservationId).catch(() => null)
  if (!after) return null
  return ymd(after.arrival) === newArrival && ymd(after.departure) === newDeparture
}

/**
 * Apply a quoted date change.
 *
 * Money is the caller's business — this direction only ever pays back, and the
 * caller issues that refund after the dates have actually moved. Throws so the
 * caller can record that nothing happened.
 */
export async function applyRebook(quote: RebookQuote): Promise<void> {
  await applyStayAmend(quote.reservationId, quote.offer, quote.adults, quote.childrenAges)
  bookingLog.success('rebook applied', {
    reservationId: quote.reservationId,
    to: `${quote.newArrival}->${quote.newDeparture}`,
    ratePlanId: quote.ratePlanId,
  })
}
