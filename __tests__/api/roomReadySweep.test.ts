import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The sweep that re-tries the early door all day.
 *
 * It exists because the Guestway webhook fires once and can arrive an hour
 * before Apaleo agrees the room is clean (2026-09-07, DMAPVJFC-1: refused at
 * 10:46, went through by hand at 11:45). So the thing to protect is that it
 * keeps asking, keeps its hands off reservations that are not ours to touch,
 * and — running 36 times a day — never turns into a pager.
 */

const fetchMock = vi.fn()
vi.mock('@/services/Request', () => ({ Fetch: (...a: unknown[]) => fetchMock(...a) }))

const runRoomReady = vi.fn()
vi.mock('@/services/roomReady', () => ({
  runRoomReady: (...a: unknown[]) => runRoomReady(...a),
}))

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@/lib/logger', () => ({ bookingLog: log }))

process.env.APALEO_PROPERTY_ID = 'CMH'
process.env.GUESTWAY_ROOM_READY_ENABLED = 'true'
delete process.env.CRON_SECRET

const { GET } = await import('@/app/api/cron/room-ready-sweep/route')

const call = () => GET(new Request('https://www.charlie-m.de/api/cron/room-ready-sweep'))

/** Today's arrival list as Apaleo would answer it. */
function arrivals(rows: { id: string; arrival: string; status?: string }[]) {
  fetchMock.mockResolvedValue({ reservations: rows })
}

beforeEach(() => {
  vi.clearAllMocks()
  runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'unit-dirty' })
  vi.useFakeTimers()
  // Mid-morning: rooms are still dirty and the audit window is hours away.
  vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('who the sweep touches', () => {
  it('tries every live arrival of the day', async () => {
    arrivals([
      { id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
      { id: 'BBB-1', arrival: '2026-09-08T15:00:00+02:00', status: 'InHouse' },
    ])
    await call()

    expect(runRoomReady).toHaveBeenCalledTimes(2)
    // Set, not sequence: the pass starts at a different point each quarter of
    // an hour (see below), so the order is deliberately not fixed.
    expect(runRoomReady.mock.calls.map((c) => c[0]).sort()).toEqual(['AAA-1', 'BBB-1'])
  })

  it('starts at a different arrival each quarter of an hour', async () => {
    // A pass that runs out of time stops wherever it got to. Always starting at
    // the top of the list would mean the names after the cut-off are never
    // reached at all — they would lose the feature silently. Rotating gives
    // every arrival its turn within the hour.
    const rows = [
      { id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
      { id: 'BBB-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
      { id: 'CCC-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
    ]

    const firstTouched = async (time: string) => {
      vi.setSystemTime(new Date(time))
      vi.clearAllMocks()
      arrivals(rows)
      await call()
      return runRoomReady.mock.calls[0][0]
    }

    expect(await firstTouched('2026-09-08T10:10:00+02:00')).toBe('AAA-1')
    expect(await firstTouched('2026-09-08T10:25:00+02:00')).toBe('BBB-1')
    expect(await firstTouched('2026-09-08T10:40:00+02:00')).toBe('CCC-1')
    // Wraps rather than falling off the end.
    expect(await firstTouched('2026-09-08T10:55:00+02:00')).toBe('AAA-1')
  })

  it('leaves cancelled and no-show reservations alone', async () => {
    // openRoomEarly would refuse them anyway; not asking saves a round trip per
    // dead booking on every one of the day's 36 passes.
    arrivals([
      { id: 'DEAD-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Canceled' },
      { id: 'GONE-1', arrival: '2026-09-08T15:00:00+02:00', status: 'NoShow' },
      { id: 'LIVE-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
    ])
    await call()

    expect(runRoomReady.mock.calls.map((c) => c[0])).toEqual(['LIVE-1'])
  })

  it('never pages per reservation', async () => {
    // The whole reason the alerting was rewritten: at 36 passes a day, one
    // alert per not-yet-clean room is a storm every morning.
    arrivals([{ id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' }])
    await call()

    expect(runRoomReady).toHaveBeenCalledWith('AAA-1', { alertOnFailure: false })
  })

  it('keeps going when one reservation throws', async () => {
    arrivals([
      { id: 'BOOM-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
      { id: 'FINE-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
    ])
    runRoomReady.mockRejectedValueOnce(new Error('apaleo hiccup'))
    const res = await call()

    expect(runRoomReady).toHaveBeenCalledTimes(2)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('does nothing at all while the feature is switched off', async () => {
    process.env.GUESTWAY_ROOM_READY_ENABLED = 'false'
    arrivals([{ id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' }])
    const res = await call()
    process.env.GUESTWAY_ROOM_READY_ENABLED = 'true'

    expect(runRoomReady).not.toHaveBeenCalled()
    expect(await res.json()).toMatchObject({ skipped: 'disabled' })
  })

  it('alerts when it cannot reach Apaleo at all', async () => {
    // Listing the day's arrivals is this job's one hard requirement: fail that
    // and it is not sweeping anything, however healthy it looks.
    fetchMock.mockRejectedValue(new Error('502'))
    const res = await call()

    expect(res.status).toBe(500)
    expect(log.error).toHaveBeenCalledWith(
      'room-ready sweep: could not list today arrivals',
      expect.anything(),
    )
  })
})

describe('the once-a-day audit', () => {
  const stillWaiting = [
    { id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
    { id: 'BBB-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
  ]

  it('says so when not one guest got in early all day', async () => {
    // The failure that used to be invisible: Guestway silent AND every sweep
    // refusing, where each individual refusal reads like an ordinary
    // "not ready yet" and nothing adds them up.
    vi.setSystemTime(new Date('2026-09-08T14:10:00+02:00'))
    arrivals(stillWaiting)
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'room-ready: nobody got in early today — feature may be dead',
      expect.objectContaining({ arrivalsToday: 2 }),
    )
  })

  it('stays quiet when somebody did get in early', async () => {
    vi.setSystemTime(new Date('2026-09-08T14:10:00+02:00'))
    arrivals([
      { id: 'AAA-1', arrival: '2026-09-08T11:48:00+02:00', status: 'Confirmed' },
      ...stillWaiting,
    ])
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('holds its tongue outside the audit window', async () => {
    // At 10:25 every room being dirty is simply the morning. Auditing on every
    // pass would produce the same storm the per-reservation alerts did.
    vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
    arrivals(stillWaiting)
    const res = await call()

    expect(log.error).not.toHaveBeenCalled()
    expect(await res.json()).toMatchObject({ audited: false })
  })

  it('names the rooms whose previous guest was never checked out', async () => {
    // The one refusal that never clears by itself: Apaleo keeps the departed
    // guest in the room until somebody checks them out, so the door cannot
    // open however clean the room is. It used to hide inside `unit-not-ready`
    // and read like an unmade bed.
    vi.setSystemTime(new Date('2026-09-08T14:10:00+02:00'))
    arrivals([{ id: 'STUCK-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' }])
    runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'unit-occupied' })
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'room-ready: previous guest still checked in — room cannot open',
      { arrivals: ['STUCK-1'] },
    )
  })

  it('does not raise the checked-in warning outside the audit window', async () => {
    // At 10:25 the previous guest simply has not left yet.
    vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
    arrivals([{ id: 'STUCK-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' }])
    runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'unit-occupied' })
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('says nothing on a day with no arrivals', async () => {
    // Nobody arriving is not the feature being dead.
    vi.setSystemTime(new Date('2026-09-08T14:10:00+02:00'))
    arrivals([])
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })
})
