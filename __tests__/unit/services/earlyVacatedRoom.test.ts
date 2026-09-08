import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Holding a room a guest left EARLY off sale until the next morning.
 *
 * Two ways this can do real damage, pulling in opposite directions. Fail to
 * block, and somebody buys the room a guest walked out of an hour ago and walks
 * into it dirty — the case this was built for (2026-09-07, room 308: a channel
 * booking landed on the unit 47 minutes after an early self-checkout). Block the
 * wrong thing, and a sellable room quietly disappears from every channel, or a
 * whole day's turnover does, with nobody watching.
 *
 * So what is pinned here is the blast radius: when a block is created at all,
 * and how far it may ever reach.
 */

const fetchMock = vi.fn()
vi.mock('@/services/Request', () => ({
  Fetch: (...args: unknown[]) => fetchMock(...args),
}))
vi.mock('@/lib/slack', () => ({ notifySlack: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/logger', () => ({
  apaleoLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

process.env.APALEO_PROPERTY_ID = 'CMH'

const { blockRoomUntilNextMorning, isOurBlock, isCleanCondition, reopensAt, earliestEarlyDeparture } = await import(
  '@/services/apaleo/blockEarlyVacatedRoom'
)

const OURS =
  'Fruehzeitige Abreise - Zimmer ungereinigt, wieder buchbar ab morgen [auto:early-departure]'

/** Apaleo stand-in: condition of the unit, existing blocks, next arrivals. */
function apaleo(state: {
  condition?: string
  maintenances?: unknown[]
  arrivals?: { arrival: string; status?: string }[]
}) {
  const posted: Record<string, unknown>[] = []
  fetchMock.mockImplementation((endpoint: string, options?: { method?: string; body?: unknown }) => {
    if (endpoint.startsWith('/inventory/v1/units/')) {
      return Promise.resolve({ status: { condition: state.condition ?? 'Dirty' } })
    }
    if (endpoint.startsWith('/booking/v1/reservations')) {
      return Promise.resolve({ reservations: state.arrivals ?? [] })
    }
    if (endpoint.startsWith('/operations/v1/maintenances')) {
      if (options?.method === 'POST') {
        posted.push(options.body as Record<string, unknown>)
        return Promise.resolve({ id: 'CMH-VCQ-TESTID' })
      }
      return Promise.resolve({ maintenances: state.maintenances ?? [] })
    }
    throw new Error(`unexpected endpoint ${endpoint}`)
  })
  return posted
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('when the room comes back on sale', () => {
  it('reopens tomorrow at the house checkout hour', () => {
    // The whole rule in one line: left today → back on sale tomorrow 11:00.
    expect(reopensAt(new Date('2026-09-07T19:46:00+02:00')).toISOString()).toBe(
      '2026-09-08T09:00:00.000Z',
    )
  })

  it('counts a departure as early only from midnight tonight', () => {
    // What the reconcile cron asks Apaleo for. Starting the window at `now`
    // instead pulled in every remaining departure of today — the same mistake
    // as the date guard, one layer up.
    expect(earliestEarlyDeparture(new Date('2026-09-08T10:50:00+02:00')).toISOString()).toBe(
      '2026-09-08T22:00:00.000Z',
    )
  })

  it('still means 11:00 local across a DST switch', () => {
    // Berlin drops to +01:00 on 2026-10-25. Carrying the previous evening's
    // offset would reopen the room at 10:00 local — an hour before housekeeping
    // is done with it.
    expect(reopensAt(new Date('2026-10-24T20:00:00+02:00')).toISOString()).toBe(
      '2026-10-25T10:00:00.000Z',
    )
  })

  it('reopens tomorrow even when the booking ran for another week', async () => {
    // The rule is a clock, not the booking: housekeeping comes tomorrow morning
    // either way. A guest leaving six days early does not keep the room off
    // sale for six days.
    const posted = apaleo({ condition: 'Dirty' })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-14T11:00:00+02:00', {
      now: new Date('2026-09-07T19:46:00+02:00'),
    })

    expect(out.status).toBe('blocked')
    expect(posted[0].to).toBe('2026-09-08T09:00:00Z')
    expect(posted[0].type).toBe('OutOfService')
    expect(String(posted[0].description)).toContain('[auto:early-departure]')
  })

  it('gives way to a guest who has already booked the room', async () => {
    // Someone arriving tonight already holds this unit. Blocking over them
    // would be a self-inflicted outage on a room that is genuinely sold.
    const posted = apaleo({
      condition: 'Dirty',
      arrivals: [{ arrival: '2026-09-07T22:00:00+02:00', status: 'Confirmed' }],
    })
    await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-10T11:00:00+02:00', {
      now: new Date('2026-09-07T19:46:00+02:00'),
    })

    expect(posted[0].to).toBe('2026-09-07T20:00:00Z')
  })

  it('is not pushed around by a cancelled reservation', async () => {
    const posted = apaleo({
      condition: 'Dirty',
      arrivals: [{ arrival: '2026-09-07T22:00:00+02:00', status: 'Canceled' }],
    })
    await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-10T11:00:00+02:00', {
      now: new Date('2026-09-07T19:46:00+02:00'),
    })

    expect(posted[0].to).toBe('2026-09-08T09:00:00Z')
  })
})

describe('when it declines to act', () => {
  const now = new Date('2026-09-07T19:46:00+02:00')

  it('leaves an ordinary same-day checkout alone', async () => {
    // Departure today is not an early departure: the room is already on the
    // morning cleaning list and tonight is exactly when it is meant to sell.
    // Blocking these would take the whole day's turnover off sale.
    const posted = apaleo({ condition: 'Dirty' })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-07T11:00:00+02:00', { now })

    expect(out).toEqual({ status: 'skipped', reason: 'departure-not-beyond-today' })
    expect(posted).toHaveLength(0)
  })

  it('leaves it alone in the morning too, before the checkout hour strikes', async () => {
    // The regression. Comparing timestamps made 10:50 < 11:00 read as "departs
    // in the future" and therefore "left early", and the 10:50 cron pass on
    // 2026-09-08 duly blocked rooms 15 and 308 — both simply leaving on time.
    // The decision is by DATE; the clock has no say in it.
    const posted = apaleo({ condition: 'Dirty' })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-08T11:00:00+02:00', {
      now: new Date('2026-09-08T10:50:00+02:00'),
    })

    expect(out).toEqual({ status: 'skipped', reason: 'departure-not-beyond-today' })
    expect(posted).toHaveLength(0)
  })

  it('still acts on a guest who leaves the day before, minutes before checkout', async () => {
    // The mirror of the above: the date is what counts in BOTH directions, so
    // a tomorrow departure is early even at 10:59 today.
    const posted = apaleo({ condition: 'Dirty' })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-09T11:00:00+02:00', {
      now: new Date('2026-09-08T10:59:00+02:00'),
    })

    expect(out.status).toBe('blocked')
    expect(posted).toHaveLength(1)
  })

  it('reopens the morning after the guest left, not the morning after it looks', async () => {
    // The cron can meet a checkout from last night. Anchoring on `now` would
    // push the reopening a further day out every time it ran.
    const posted = apaleo({ condition: 'Dirty' })
    await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-14T11:00:00+02:00', {
      now: new Date('2026-09-08T05:00:00+02:00'),
      checkedOutAt: '2026-09-07T19:46:00+02:00',
    })

    expect(posted[0].to).toBe('2026-09-08T09:00:00Z')
  })

  it('holds the room back once per departure and never renews', async () => {
    // Past the reopening moment there is nothing left to do. Blocking again —
    // which is what a fresh 11:05 pass would otherwise do while the room still
    // reads Dirty — would quietly restore "reopens when Apaleo says clean", the
    // exact rule a fixed window was chosen to replace. Apaleo's condition is
    // not dependable enough to carry that: all 13 units read Dirty at 09:39,
    // 10:00 and 10:56 on 2026-09-08, occupied ones included.
    const posted = apaleo({ condition: 'Dirty' })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-14T11:00:00+02:00', {
      now: new Date('2026-09-08T11:05:00+02:00'),
      checkedOutAt: '2026-09-07T19:46:00+02:00',
    })

    expect(out).toEqual({ status: 'skipped', reason: 'reopening-already-due' })
    expect(posted).toHaveLength(0)
  })

  it('leaves an already-clean room on sale', async () => {
    // Serviced mid-stay and then vacated: nothing to protect anyone from, and
    // blocking it would be pure lost revenue.
    const posted = apaleo({ condition: 'Clean' })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-09T11:00:00+02:00', { now })

    expect(out).toEqual({ status: 'skipped', reason: 'already-clean-Clean' })
    expect(posted).toHaveLength(0)
  })

  it('does not stack a second block on the same room', async () => {
    // The checkout hook and the cron both call this, four times an hour.
    // Without this the room would collect one maintenance per pass.
    const posted = apaleo({
      condition: 'Dirty',
      maintenances: [
        {
          id: 'CMH-VCQ-EXISTS',
          unit: { id: 'CMH-VCQ' },
          from: '2026-09-07T19:46:00+02:00',
          to: '2026-09-08T11:00:00+02:00',
          description: OURS,
        },
      ],
    })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-09T11:00:00+02:00', { now })

    expect(out).toEqual({ status: 'skipped', reason: 'already-blocked' })
    expect(posted).toHaveLength(0)
  })

  it('is not fooled by a standing block on a different room', async () => {
    const posted = apaleo({
      condition: 'Dirty',
      maintenances: [
        {
          id: 'MOT-IJK-OTHER',
          unit: { id: 'MOT-IJK' },
          from: '2026-09-07T19:46:00+02:00',
          to: '2026-09-08T11:00:00+02:00',
          description: OURS,
        },
      ],
    })
    const out = await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-09T11:00:00+02:00', { now })

    expect(out.status).toBe('blocked')
    expect(posted).toHaveLength(1)
  })

  it('does nothing when the reservation has no room assigned', async () => {
    const posted = apaleo({ condition: 'Dirty' })
    const out = await blockRoomUntilNextMorning('', '2026-09-09T11:00:00+02:00', { now })

    expect(out).toEqual({ status: 'skipped', reason: 'no-unit-assigned' })
    expect(posted).toHaveLength(0)
  })
})

describe('scoping every call to this hotel', () => {
  it('filters maintenances with propertyId, not propertyIds', async () => {
    // Apaleo ignores the plural on this endpoint and answers HTTP 200 with the
    // whole shared account — Prenzl Place's 12 maintenances included (measured
    // measured: a real property id and a nonsense one returned the same list).
    // Nothing about the response says the filter did not apply, so only this
    // test stands between a rename and quietly reading another hotel's rooms.
    apaleo({ condition: 'Dirty' })
    await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-09T11:00:00+02:00', {
      now: new Date('2026-09-07T19:46:00+02:00'),
    })

    const url = fetchMock.mock.calls
      .map((c) => String(c[0]))
      .find((u) => u.startsWith('/operations/v1/maintenances?'))
    expect(url).toBeDefined()
    expect(url).toContain('propertyId=CMH')
    expect(url).not.toContain('propertyIds=')
  })

  it('filters reservations with propertyIds, the other way round', async () => {
    // The mirror image, and the reason the two must never be copied from each
    // other: on /booking/v1/reservations the SINGULAR is the ignored one.
    apaleo({ condition: 'Dirty' })
    await blockRoomUntilNextMorning('CMH-VCQ', '2026-09-09T11:00:00+02:00', {
      now: new Date('2026-09-07T19:46:00+02:00'),
    })

    const url = fetchMock.mock.calls
      .map((c) => String(c[0]))
      .find((u) => u.startsWith('/booking/v1/reservations?'))
    expect(url).toBeDefined()
    expect(url).toContain('propertyIds=CMH')
  })
})

describe('telling our blocks from the hotel s own', () => {
  it('claims only what carries our marker', () => {
    expect(isOurBlock({ id: 'a', from: '', to: '', description: OURS })).toBe(true)
  })

  it('never claims a hand-made block', () => {
    // Real records from the property. Mistaking one of these for ours would
    // make the idempotency check skip a room that needs blocking — and if a
    // delete path is ever added here, it would release a broken room onto sale.
    const human = [
      { id: 'MOT-PCL-IAAMX', from: '', to: '', type: 'OutOfInventory', description: 'Occupied by tenants' },
      { id: 'MOT-TUO-PAQNC', from: '', to: '', type: 'OutOfInventory', description: '309 the shower is clocked.' },
      { id: 'MOT-NUT-FUOVA', from: '', to: '', type: 'OutOfOrder', description: 'Jaime Shooting' },
      { id: 'MOT-XXX-NODESC', from: '', to: '', type: 'OutOfService' },
    ]
    for (const m of human) expect(isOurBlock(m), m.id).toBe(false)
  })
})

describe('reading the cleaning condition', () => {
  it('treats an unreadable unit as not clean', () => {
    // Fail closed: an Apaleo hiccup must never look like "the room is ready",
    // because that is the one answer that skips the block.
    expect(isCleanCondition(null)).toBe(false)
  })

  it('accepts only the conditions a guest can walk into', () => {
    expect(isCleanCondition('Clean')).toBe(true)
    expect(isCleanCondition('Dirty')).toBe(false)
    expect(isCleanCondition('Inspected')).toBe(false)
    // "Cleaned, not yet inspected" is NOT walked into. Reading all 147 units
    // across the three properties returned nothing but Clean and Dirty, so an
    // inspection state would be new behaviour rather than something already in
    // use — and a room nobody has checked is the wrong thing to guess "ready"
    // about, in either direction: here it would keep a room on sale, and in
    // room-ready it would open the door.
    expect(isCleanCondition('CleanToInspect')).toBe(false)
    expect(isCleanCondition('CleanToBeInspected')).toBe(false)
  })
})
