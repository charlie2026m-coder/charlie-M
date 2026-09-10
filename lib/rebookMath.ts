/**
 * The decisions a date change makes about categories and prices.
 *
 * Pure, and in lib/ rather than beside the Apaleo calls, so tests can reach it
 * without pulling in the API client. Both of these got a money detail wrong
 * once already; tests/rebookMath.test.ts is what keeps them honest.
 */

/**
 * Room category out of a rate-plan id: `CMH-FLEX_WEB3-SGB` -> `CMH-SGB`.
 *
 * The reservation-scoped offers endpoint does not return `unitGroup` (verified
 * against live Apaleo), and the rate-plan id is the only place the category
 * survives. Without it a sold-out category silently downgrades the guest into a
 * smaller studio and the lower price reads as a legitimate refund.
 */
export function unitGroupFromRatePlanId(ratePlanId: string | undefined): string | undefined {
  if (!ratePlanId) return undefined
  const parts = ratePlanId.split('-')
  if (parts.length < 2) return undefined
  return `${parts[0]}-${parts[parts.length - 1]}`
}

export interface PricedOffer {
  code?: string
  amount?: number
}

/**
 * Which offer to move the guest onto.
 *
 * The length-matched tier first — the plans are priced by length of stay, so a
 * 4-night stay belongs on FLEX_WEB4. When that tier is not on offer, the
 * CHEAPEST of what remains, never a fixed fallback: an earlier version fell
 * back to base FLEX_WEB, which is the one-night tier and the dearest of the
 * family. On a live 4-night probe that was 538 against FLEX_WEB4's 411, so the
 * fallback quietly took 127 EUR off the guest's refund — or turned a cheaper
 * move into a "costs more" refusal.
 *
 * Returns the index into `offers`, or -1 when there is nothing to pick.
 */
export function pickOfferIndex(offers: PricedOffer[], preferredCode: string): number {
  const priced = (o: PricedOffer) => typeof o.amount === 'number' && Number.isFinite(o.amount)

  // The tier has to be priced to be picked. Matching on the code alone handed
  // back an offer with no amount, which the caller then read as a zero price
  // and refused — declining a move a priced same-category offer could serve.
  const preferred = offers.findIndex((o) => o.code === preferredCode && priced(o))
  if (preferred !== -1) return preferred

  let best = -1
  for (let i = 0; i < offers.length; i++) {
    if (!priced(offers[i])) continue
    if (best === -1 || (offers[i].amount as number) < (offers[best].amount as number)) best = i
  }
  return best
}
