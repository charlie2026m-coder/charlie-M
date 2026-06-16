import { describe, it, expect } from 'vitest';
import { calculateNights, searchReservations } from '@/lib/utils';

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

describe('searchReservations', () => {
  const sample = [
    {
      id: 'ABCDE-1',
      name: 'Classic Double Room',
      unitGroup: { name: 'Classic Double Room', code: 'BUQ' },
      primaryGuest: { firstName: 'Sina', lastName: 'Gottwald' },
      arrival: '2026-06-15T14:00:00Z',
      departure: '2026-06-17T11:00:00Z',
      status: 'Confirmed',
    },
    {
      id: 'XYZ99-1',
      name: 'Single Room',
      unitGroup: { name: 'Single Room', code: 'SGB' },
      primaryGuest: { firstName: 'Max', lastName: 'Mustermann' },
      arrival: '2026-07-02T14:00:00Z',
      departure: '2026-07-05T11:00:00Z',
      status: 'CheckedOut',
    },
  ];

  it('returns all reservations for an empty query', () => {
    expect(searchReservations(sample, '')).toHaveLength(2);
    expect(searchReservations(sample, '   ')).toHaveLength(2);
  });

  it('matches by reservation id (case-insensitive)', () => {
    const res = searchReservations(sample, 'abcde');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('ABCDE-1');
  });

  it('matches by room name', () => {
    const res = searchReservations(sample, 'single');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('XYZ99-1');
  });

  it('matches by guest last name', () => {
    const res = searchReservations(sample, 'gottwald');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('ABCDE-1');
  });

  it('matches by ISO date fragment', () => {
    const res = searchReservations(sample, '2026-07');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('XYZ99-1');
  });

  it('matches by localized month name', () => {
    const res = searchReservations(sample, 'jul');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('XYZ99-1');
  });

  it('AND-combines multiple terms', () => {
    expect(searchReservations(sample, 'classic gottwald')).toHaveLength(1);
    expect(searchReservations(sample, 'single gottwald')).toHaveLength(0);
  });

  it('returns nothing when no reservation matches', () => {
    expect(searchReservations(sample, 'nomatch')).toHaveLength(0);
  });
});
