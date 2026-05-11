import { describe, it, expect } from 'vitest';
import {
  RATE_PLANS,
  getRatePlanByNights,
  getNonRefundableRatePlanByNights,
  resolveRatePlan,
} from '@/lib/Constants';

// CharlieM does not export CITY_TAX_RATE from lib/Constants directly

describe('getRatePlanByNights', () => {
  it('returns FLEX_WEB for 1 night', () => expect(getRatePlanByNights(1)).toBe(RATE_PLANS.FLEX_WEB));
  it('returns FLEX_WEB2 for 2 nights', () => expect(getRatePlanByNights(2)).toBe(RATE_PLANS.FLEX_WEB2));
  it('returns FLEX_WEB3 for 3+ nights', () => {
    expect(getRatePlanByNights(3)).toBe(RATE_PLANS.FLEX_WEB3);
    expect(getRatePlanByNights(7)).toBe(RATE_PLANS.FLEX_WEB3);
  });
});

describe('getNonRefundableRatePlanByNights', () => {
  it('returns NR_WEB for 1 night', () => expect(getNonRefundableRatePlanByNights(1)).toBe(RATE_PLANS.NR_WEB));
  it('returns NR_WEB2 for 2 nights', () => expect(getNonRefundableRatePlanByNights(2)).toBe(RATE_PLANS.NR_WEB2));
  it('returns NR_WEB3 for 3+ nights', () => expect(getNonRefundableRatePlanByNights(3)).toBe(RATE_PLANS.NR_WEB3));
});

describe('resolveRatePlan', () => {
  const makeRoom = (code: string) => ({ ratePlan: { code }, id: code });

  it('returns preferred FLEX_WEB2 for 2-night refundable', () => {
    const rooms = [makeRoom('FLEX_WEB'), makeRoom('FLEX_WEB2'), makeRoom('NR_WEB')];
    expect(resolveRatePlan(rooms, 2, true)?.ratePlan.code).toBe('FLEX_WEB2');
  });

  it('falls back to FLEX_WEB when preferred absent', () => {
    const rooms = [makeRoom('FLEX_WEB')];
    expect(resolveRatePlan(rooms, 2, true)?.ratePlan.code).toBe('FLEX_WEB');
  });

  it('returns null when no matching room', () => {
    expect(resolveRatePlan([makeRoom('NR_WEB')], 1, true)).toBeNull();
  });

  it('resolves NR_WEB for non-refundable', () => {
    const rooms = [makeRoom('NR_WEB'), makeRoom('FLEX_WEB')];
    expect(resolveRatePlan(rooms, 1, false)?.ratePlan.code).toBe('NR_WEB');
  });
});
