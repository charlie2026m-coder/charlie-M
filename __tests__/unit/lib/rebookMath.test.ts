import { describe, expect, it } from 'vitest'
import { unitGroupFromRatePlanId, pickOfferIndex } from '@/lib/rebookMath'
import { getRatePlanByNights, isExtensionRatePlan, FLEX_WEB_CODES, RATE_PLANS } from '@/lib/Constants'

describe('room category from a rate-plan id', () => {
  it('reads the real Charlie M ids', () => {
    expect(unitGroupFromRatePlanId('CMH-FLEX_WEB3-SGB')).toBe('CMH-SGB')
    expect(unitGroupFromRatePlanId('CMH-NR_WEB2-BUQ')).toBe('CMH-BUQ')
    expect(unitGroupFromRatePlanId('CMH-FLEX_EXTN-SPK')).toBe('CMH-SPK')
  })

  it('refuses to guess from something it cannot parse', () => {
    // The caller compares the result against the reservation's category, so an
    // undefined can never match — an unparseable id declines the offer instead
    // of waving a possibly-different studio through.
    expect(unitGroupFromRatePlanId(undefined)).toBeUndefined()
    expect(unitGroupFromRatePlanId('')).toBeUndefined()
    expect(unitGroupFromRatePlanId('NODASHES')).toBeUndefined()
  })
})

describe('which offer a date change moves onto', () => {
  it('takes the tier that matches the new length of stay', () => {
    const offers = [
      { code: 'FLEX_WEB', amount: 538 },
      { code: 'FLEX_WEB4', amount: 411 },
      { code: 'FLEX_WEB2', amount: 470 },
    ]
    expect(pickOfferIndex(offers, 'FLEX_WEB4')).toBe(1)
  })

  it('falls back to the cheapest, never to base FLEX_WEB', () => {
    // The regression this pins: base FLEX_WEB is the ONE-night tier and the
    // dearest of the family. Preferring it as a fallback took 127 EUR off a
    // real guest's refund on a live four-night probe.
    const offers = [
      { code: 'FLEX_WEB', amount: 538 },
      { code: 'FLEX_WEB3', amount: 455 },
      { code: 'FLEX_WEB2', amount: 470 },
    ]
    const picked = pickOfferIndex(offers, 'FLEX_WEB4') // tier not on offer
    expect(offers[picked].code).toBe('FLEX_WEB3')
    expect(offers[picked].amount).toBe(455)
  })

  it('prefers the matching tier even when something else is cheaper', () => {
    // Length tiers are the published prices; undercutting them is not ours to do.
    const offers = [
      { code: 'FLEX_WEB2', amount: 300 },
      { code: 'FLEX_WEB4', amount: 411 },
    ]
    expect(pickOfferIndex(offers, 'FLEX_WEB4')).toBe(1)
  })

  it('ignores offers with no price rather than treating them as free', () => {
    const offers = [{ code: 'FLEX_WEB3', amount: undefined }, { code: 'FLEX_WEB2', amount: 470 }]
    expect(pickOfferIndex(offers, 'FLEX_WEB5')).toBe(1)
  })

  it('says so when there is nothing to pick', () => {
    expect(pickOfferIndex([], 'FLEX_WEB2')).toBe(-1)
    expect(pickOfferIndex([{ code: 'FLEX_WEB2', amount: undefined }], 'FLEX_WEB3')).toBe(-1)
  })
})

describe('the rate-plan tiers a date change may use', () => {
  it('maps nights to the published tier', () => {
    expect(getRatePlanByNights(1)).toBe(RATE_PLANS.FLEX_WEB)
    expect(getRatePlanByNights(2)).toBe(RATE_PLANS.FLEX_WEB2)
    // FLEX_WEB3 is published as "3 nights and up" here, so it is the top tier.
    expect(getRatePlanByNights(3)).toBe(RATE_PLANS.FLEX_WEB3)
    expect(getRatePlanByNights(4)).toBe(RATE_PLANS.FLEX_WEB3)
    expect(getRatePlanByNights(30)).toBe(RATE_PLANS.FLEX_WEB3)
  })

  it('never resolves to an extension rate', () => {
    // FLEX_EXTN / NR_EXTN are the discounted stay-extension plans. A date change
    // landing on one would hand out that discount.
    //
    // Asserts on what the RESOLVER returns, not just on the contents of the
    // constant: an earlier version of this test only walked FLEX_WEB_CODES, so
    // adding an extension branch to getRatePlanByNights would have sailed
    // through — and that is precisely the change that would leak the discount.
    for (const nights of [1, 2, 3, 4, 5, 7, 14, 30, 90]) {
      const code = getRatePlanByNights(nights)
      expect(isExtensionRatePlan(code)).toBe(false)
      expect(FLEX_WEB_CODES).toContain(code)
    }
    expect(FLEX_WEB_CODES).not.toContain(RATE_PLANS.FLEX_EXTN)
    expect(FLEX_WEB_CODES).not.toContain(RATE_PLANS.NR_EXTN)
  })

  it('never resolves to a non-refundable rate', () => {
    // Only a refundable booking may be moved, and it must stay refundable.
    for (const nights of [1, 2, 3, 4, 5, 9]) {
      expect(FLEX_WEB_CODES).toContain(getRatePlanByNights(nights))
    }
    expect(FLEX_WEB_CODES).not.toContain(RATE_PLANS.NR_WEB)
  })

  it('covers every tier the length mapping can produce', () => {
    // Guards the drift that would silently empty the eligible-offer list: a new
    // FLEX_WEB6 reachable from getRatePlanByNights but missing from the set the
    // calendar and the quote both filter on.
    const reachable = new Set([1, 2, 3, 4, 5, 6, 7, 14, 30].map(getRatePlanByNights))
    for (const code of reachable) expect(FLEX_WEB_CODES).toContain(code)
  })
})
