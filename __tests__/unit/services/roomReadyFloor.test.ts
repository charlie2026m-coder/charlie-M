import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * No door before 11:00 — and why that is physics, not policy.
 *
 * Apaleo's night is a time slice from 15:00 to 11:00 the next morning. Ask it
 * to amend an arrival to 09:18 and the reservation now starts inside the
 * PREVIOUS night's slice, so the amend offer comes back one night longer —
 * verified live on 2026-09-14: arrival 10:59 → an extra slice of 114 EUR
 * prepended; 11:00 → the same nights as booked. The room-ready price guard
 * refuses such an offer, correctly: nobody may be charged a night for a door.
 *
 * The floor sat at 09:00 from 2026-09-07 to 2026-09-14 on the belief that it
 * was "purely an operational choice". Every attempt before 11:00 in that week
 * was refused as price drift; every door that did open, opened after 11:00
 * (11:13, 11:16, 11:54, 12:04). On 2026-09-14 at 09:15 a guest was told "your
 * room is ready, come in" by Guestway's own automation while our amend to
 * 09:18 was being refused for exactly this reason; he stood at a locked door
 * at 10:25.
 */

const fetchMock = vi.fn()
vi.mock('@/services/Request', () => ({ Fetch: (...a: unknown[]) => fetchMock(...a) }))
vi.mock('@/lib/logger', () => ({
  apaleoLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn() },
}))
vi.mock('@/lib/slack', () => ({ notifySlack: vi.fn(() => Promise.resolve()) }))

process.env.APALEO_PROPERTY_ID = 'MOT'

const { openRoomEarly } = await import('@/services/apaleo/amendStayTime')

const slices = [
  { ratePlan: { id: 'MOT-FLEX' }, from: '2026-09-14T15:00:00+02:00', to: '2026-09-15T11:00:00+02:00', totalGrossAmount: { amount: 100 } },
  { ratePlan: { id: 'MOT-FLEX' }, from: '2026-09-15T11:00:00+02:00', to: '2026-09-16T11:00:00+02:00', totalGrossAmount: { amount: 100 } },
]

/** Apaleo as openRoomEarly sees it: a clean, empty room and a guest booked for 15:00. */
function apaleo(arrival = '2026-09-14T15:00:00+02:00') {
  const reservation = {
    id: 'R-1',
    status: 'Confirmed',
    arrival,
    departure: '2026-09-16T11:00:00+02:00',
    adults: 1,
    childrenAges: [],
    unit: { id: 'MOT-QGO', name: '18' },
    property: { id: 'MOT' },
    ratePlan: { id: 'MOT-FLEX' },
    timeSlices: slices,
    primaryGuest: { lastName: 'Wallat' },
  }
  fetchMock.mockImplementation((url: string) => {
    const u = String(url)
    if (u.includes('/reservations/R-1/offers?')) {
      const asked = decodeURIComponent(u.split('arrival=')[1] ?? '')
      return Promise.resolve({
        offers: [{ arrival: asked, departure: reservation.departure, availableUnits: 1, timeSlices: slices }],
      })
    }
    if (u.includes('/reservation-actions/R-1/amend')) return Promise.resolve({})
    if (u.includes('/operations/v1/units-condition')) return Promise.resolve({})
    if (u.includes('/inventory/v1/units/')) return Promise.resolve({ status: { condition: 'Clean', isOccupied: false } })
    if (u.includes('/booking/v1/reservations?')) return Promise.resolve({ reservations: [] })
    if (u.includes('/booking/v1/reservations/R-1')) return Promise.resolve(reservation)
    return Promise.reject(new Error('unexpected ' + u))
  })
}
const askedArrival = () => {
  const call = fetchMock.mock.calls.map((c) => String(c[0])).find((u) => u.includes('/offers?arrival='))
  return call ? decodeURIComponent(call.split('arrival=')[1]) : null
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('the earliest a door may open', () => {
  it('is 11:00, however early housekeeping finished', async () => {
    // 09:15: room clean, guest booked for 15:00. The old floor asked Apaleo for
    // 09:18 and got a night added to the offer. The floor asks for 11:00.
    vi.setSystemTime(new Date('2026-09-14T09:15:00+02:00'))
    apaleo()

    const out = await openRoomEarly('R-1', { trustGuestwayClean: true })

    expect(askedArrival()).toBe('2026-09-14T11:00:00+02:00')
    expect(out).toMatchObject({ status: 'moved', to: '2026-09-14T11:00:00+02:00' })
  })

  it('is now-plus-headroom once 11:00 has passed', async () => {
    vi.setSystemTime(new Date('2026-09-14T11:15:00+02:00'))
    apaleo()

    const out = await openRoomEarly('R-1', { trustGuestwayClean: true })

    expect(askedArrival()).toBe('2026-09-14T11:18:00+02:00')
    expect(out).toMatchObject({ status: 'moved' })
  })

  it('has nothing to offer a guest already booked for 11:00', async () => {
    vi.setSystemTime(new Date('2026-09-14T09:15:00+02:00'))
    apaleo('2026-09-14T11:00:00+02:00')

    const out = await openRoomEarly('R-1', { trustGuestwayClean: true })

    expect(out).toMatchObject({ status: 'skipped', reason: 'nothing-earlier-to-gain' })
    expect(askedArrival()).toBeNull()
  })

  it('is tied to the house checkout hour in the source, not typed in twice', async () => {
    // The floor IS the end of the previous night's time slice. If the checkout
    // hour ever moves, the floor must move with it or the price guard starts
    // refusing every early door again.
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')

    expect(src).toContain('const ROOM_READY_FLOOR_HHMM = DEFAULT_CHECKOUT_HHMM')
  })
})
