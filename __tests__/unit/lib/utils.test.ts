import { describe, it, expect } from 'vitest';
import { calculateNights } from '@/lib/utils';

describe('calculateNights', () => {
  it('returns correct night count', () => {
    expect(calculateNights('2026-05-10', '2026-05-13')).toBe(3);
  });

  it('returns 1 for same-day arrival and departure (min 1 night)', () => {
    expect(calculateNights('2026-05-10', '2026-05-10')).toBe(1);
  });

  it('handles single night', () => {
    expect(calculateNights('2026-06-01', '2026-06-02')).toBe(1);
  });

  it('handles long stay', () => {
    expect(calculateNights('2026-06-01', '2026-06-30')).toBe(29);
  });
});
