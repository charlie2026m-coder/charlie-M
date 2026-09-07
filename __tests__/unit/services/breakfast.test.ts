import { describe, it, expect } from 'vitest'
import { addDays, paidBreakfastMornings } from '@/services/breakfast'
import { BREAKFAST_FOOD_ID, BREAKFAST_BEVERAGE_ID } from '@/lib/breakfastBundle'
import type { ApaleoReservationResponse } from '@/types/apaleo'

/**
 * The date shift is the one piece of this feature that is quietly catastrophic
 * when wrong: every guest gets the wrong menu on the wrong day and the kitchen
 * counts land 24 hours out, with nothing on screen looking broken.
 */

function resv(services: unknown[]): ApaleoReservationResponse {
  return { services } as unknown as ApaleoReservationResponse
}

const food = (dates: Array<{ serviceDate: string; count: number }>) => ({
  service: { id: BREAKFAST_FOOD_ID },
  dates,
})

const drink = (dates: Array<{ serviceDate: string; count: number }>) => ({
  service: { id: BREAKFAST_BEVERAGE_ID },
  dates,
})

describe('addDays', () => {
  it('adds a day', () => {
    expect(addDays('2026-09-10', 1)).toBe('2026-09-11')
  })

  it('crosses a month boundary', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('is unaffected by the DST switch — Berlin loses an hour, not a date', () => {
    // 2026-03-29 is the spring-forward night in Germany. A naive local-time
    // implementation returns the 29th again here.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    // And the autumn switch, where a naive one can skip back.
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('paidBreakfastMornings', () => {
  it('shifts each night to the morning after', () => {
    // Arrives the 10th for three nights, leaves the 13th. Nobody eats on the
    // evening of arrival; breakfasts are the 11th, 12th and 13th.
    const r = resv([
      food([
        { serviceDate: '2026-09-10', count: 2 },
        { serviceDate: '2026-09-11', count: 2 },
        { serviceDate: '2026-09-12', count: 2 },
      ]),
    ])
    expect(paidBreakfastMornings(r)).toEqual([
      { morning: '2026-09-11', persons: 2 },
      { morning: '2026-09-12', persons: 2 },
      { morning: '2026-09-13', persons: 2 },
    ])
  })

  it('counts the food half only — adding the drinks half would seat everyone twice', () => {
    const r = resv([
      food([{ serviceDate: '2026-09-10', count: 2 }]),
      drink([{ serviceDate: '2026-09-10', count: 2 }]),
    ])
    expect(paidBreakfastMornings(r)).toEqual([{ morning: '2026-09-11', persons: 2 }])
  })

  it('ignores unrelated services', () => {
    const r = resv([
      { service: { id: 'CMH-PRK' }, dates: [{ serviceDate: '2026-09-10', count: 1 }] },
      food([{ serviceDate: '2026-09-10', count: 1 }]),
    ])
    expect(paidBreakfastMornings(r)).toEqual([{ morning: '2026-09-11', persons: 1 }])
  })

  it('sums two entries landing on the same morning', () => {
    // Breakfast added twice (booking flow + cabinet) shows up as two service
    // entries rather than one with a larger count.
    const r = resv([
      food([{ serviceDate: '2026-09-10', count: 1 }]),
      food([{ serviceDate: '2026-09-10', count: 1 }]),
    ])
    expect(paidBreakfastMornings(r)).toEqual([{ morning: '2026-09-11', persons: 2 }])
  })

  it('drops entries with no count, rather than seating a phantom guest', () => {
    const r = resv([
      food([
        { serviceDate: '2026-09-10', count: 0 },
        { serviceDate: '2026-09-11', count: 2 },
      ]),
    ])
    expect(paidBreakfastMornings(r)).toEqual([{ morning: '2026-09-12', persons: 2 }])
  })

  it('tolerates a full ISO timestamp in serviceDate', () => {
    const r = resv([food([{ serviceDate: '2026-09-10T00:00:00+02:00', count: 1 }] as never)])
    expect(paidBreakfastMornings(r)).toEqual([{ morning: '2026-09-11', persons: 1 }])
  })

  it('returns nothing when no breakfast was bought', () => {
    expect(paidBreakfastMornings(resv([]))).toEqual([])
    expect(paidBreakfastMornings(resv([drink([{ serviceDate: '2026-09-10', count: 1 }])]))).toEqual([])
  })

  it('survives a reservation with no services at all', () => {
    expect(paidBreakfastMornings({} as ApaleoReservationResponse)).toEqual([])
  })

  it('returns mornings in chronological order regardless of input order', () => {
    const r = resv([
      food([
        { serviceDate: '2026-09-12', count: 1 },
        { serviceDate: '2026-09-10', count: 1 },
        { serviceDate: '2026-09-11', count: 1 },
      ]),
    ])
    expect(paidBreakfastMornings(r).map(m => m.morning)).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ])
  })
})
