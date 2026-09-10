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

const unitReadiness = vi.fn()
vi.mock('@/services/apaleo/amendStayTime', () => ({
  unitReadiness: (...a: unknown[]) => unitReadiness(...a),
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
  unitReadiness.mockResolvedValue('ready')
  vi.useFakeTimers()
  // Mid-morning: rooms are still dirty and the audit window is hours away.
  vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('who the sweep touches', () => {
  it('tries every arrival that could still be moved', async () => {
    arrivals([
      { id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
      { id: 'CCC-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
    ])
    await call()

    // Set, not sequence: the pass starts at a different point each quarter of
    // an hour (see the rotation test below), so the order is not fixed.
    expect(runRoomReady.mock.calls.map((c) => c[0]).sort()).toEqual(['AAA-1', 'CCC-1'])
  })

  it('starts at a different arrival each quarter of an hour', async () => {
    // The budget below stops a long pass, which protects the function. It does
    // not protect the guests at the END of the list: Apaleo returns the day's
    // arrivals in a stable order, so without rotating, the same names would be
    // reached every time and the ones past the cut-off never once — they would
    // lose the feature silently. This is what makes the starvation impossible.
    const rows = [
      { id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
      { id: 'BBB-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
      { id: 'CCC-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
    ]

    const firstTouched = async (time: string) => {
      vi.setSystemTime(new Date(time))
      vi.clearAllMocks()
      runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'unit-dirty' })
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

  it('does not re-ask about guests who already checked in', async () => {
    // openRoomEarly refuses anything but Confirmed, so asking costs a
    // reservation fetch purely to be told no — on every one of 36 daily passes.
    arrivals([
      { id: 'IN-1', arrival: '2026-09-08T11:00:00+02:00', status: 'InHouse' },
      { id: 'OUT-1', arrival: '2026-09-08T11:00:00+02:00', status: 'CheckedOut' },
      { id: 'LIVE-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' },
    ])
    await call()

    expect(runRoomReady.mock.calls.map((c) => c[0])).toEqual(['LIVE-1'])
  })

  it('keeps an arrival whose status Apaleo did not send', async () => {
    // Unknown is not a reason to skip a guest: the worst case is one wasted
    // call, the best case is a door that opens.
    arrivals([{ id: 'NOSTATUS-1', arrival: '2026-09-08T15:00:00+02:00' }])
    await call()

    expect(runRoomReady.mock.calls.map((c) => c[0])).toEqual(['NOSTATUS-1'])
  })

  it('stops starting new work before the function is killed', async () => {
    // maxDuration is 60s and one reservation can cost >25s on a busy Apaleo
    // afternoon. Without a budget the pass is killed mid-loop — and because the
    // day's arrivals come back in a stable order, the SAME tail would be starved
    // on every pass instead of a different one each time.
    arrivals(
      Array.from({ length: 5 }, (_, i) => ({
        id: `R${i}-1`,
        arrival: '2026-09-08T15:00:00+02:00',
        status: 'Confirmed',
      })),
    )
    // Each call burns 100 simulated seconds; the 240s budget allows three
    // starts. (Charlie M runs a longer budget than Motz19 — 124 rooms rather
    // than 13 — so the arithmetic here is scaled to match, not the behaviour.)
    runRoomReady.mockImplementation(async () => {
      vi.setSystemTime(new Date(Date.now() + 100_000))
      return { status: 'skipped', reason: 'unit-dirty' }
    })
    const res = await call()

    expect(runRoomReady).toHaveBeenCalledTimes(3)
    expect(await res.json()).toMatchObject({ tried: 3 })
    expect(log.warn).toHaveBeenCalledWith(
      'room-ready sweep: out of time, leaving the rest to the next pass',
      { done: 3, left: 2 },
    )
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

describe('a door already open onto a room that is not ready', () => {
  // The half of the problem the last-look guard inside openRoomEarly cannot
  // reach: once the amend lands the lock is synced, and Apaleo can still move
  // the guest to another unit or the room can stop being clean. Nothing was
  // watching that, which is why the 2026-09-08 incident had no trace.
  const openEarly = {
    id: 'EARLY-1',
    arrival: '2026-09-08T11:38:00+02:00',
    status: 'Confirmed',
    unit: { id: 'MOT-VCQ', name: '308' },
  }

  it('says so once the room has stayed unready for hours', async () => {
    // 11:38 open, 14:50 now — past any plausible flag lag, so this is real.
    vi.setSystemTime(new Date('2026-09-08T14:50:00+02:00'))
    arrivals([openEarly])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'room-ready: door already open onto a room that is not ready — EARLY-1',
      expect.objectContaining({ room: '308', readiness: 'dirty', openSince: '11:38' }),
    )
  })

  it('holds its tongue while Apaleo is merely catching up', async () => {
    // Since the webhook takes Guestway's word, a door opens while Apaleo can
    // still read Dirty for an hour or two — measured at 60 and 105 minutes. If
    // that alerted, every successfully served guest would page somebody.
    vi.setSystemTime(new Date('2026-09-08T12:00:00+02:00'))
    arrivals([openEarly])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(unitReadiness).toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })

  it('never waits when the previous guest is still checked in', async () => {
    // No lag explains this one: Apaleo alone knows about occupancy, Guestway
    // cannot vouch for it, and a code handed to an occupied room is immediate.
    vi.setSystemTime(new Date('2026-09-08T11:45:00+02:00'))
    arrivals([openEarly])
    unitReadiness.mockResolvedValue('occupied')
    await call()

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('EARLY-1'),
      expect.objectContaining({ readiness: 'occupied' }),
    )
  })

  it('puts the id in the message, not only the payload', async () => {
    // Slack throttles per message text and Sentry groups by it. With the id
    // outside the text, one stuck room would silence every other one for ten
    // minutes — the same trap the room-ready reasons were shaped around.
    vi.setSystemTime(new Date('2026-09-08T12:00:00+02:00'))
    arrivals([openEarly, { ...openEarly, id: 'EARLY-2', unit: { id: 'MOT-IJK', name: '13' } }])
    unitReadiness.mockResolvedValue('occupied')
    await call()

    const texts = log.error.mock.calls.map((c) => String(c[0]))
    expect(new Set(texts).size).toBe(2)
  })

  it('stays quiet while the room is fine', async () => {
    vi.setSystemTime(new Date('2026-09-08T12:00:00+02:00'))
    arrivals([openEarly])
    unitReadiness.mockResolvedValue('ready')
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('ignores a paid early check-in whose hour has not come yet', async () => {
    // The one that would have flooded the channel every morning: an ECI guest
    // sits at 13:00 by purchase, not because we moved them, and at 08:10 their
    // room is legitimately still dirty. Nothing is open and nothing is wrong.
    vi.setSystemTime(new Date('2026-09-08T08:10:00+02:00'))
    arrivals([{ ...openEarly, arrival: '2026-09-08T13:00:00+02:00' }])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(unitReadiness).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })

  it('starts watching that same guest once their hour has passed', async () => {
    // The gate opens — the room does get read — even though nothing is said yet,
    // because twenty-five minutes is well inside the flag's lag.
    vi.setSystemTime(new Date('2026-09-08T13:25:00+02:00'))
    arrivals([{ ...openEarly, arrival: '2026-09-08T13:00:00+02:00' }])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(unitReadiness).toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })

  it('ignores a guest whose door was never opened early', async () => {
    arrivals([{ ...openEarly, arrival: '2026-09-08T15:00:00+02:00' }])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(unitReadiness).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })

  it('ignores a guest who has already checked in', async () => {
    // Apaleo rewrites `arrival` to the check-in moment, so an early time stops
    // meaning "we opened the door ahead of the hour" — reading it as one would
    // alert on every guest who simply arrived before three.
    arrivals([{ ...openEarly, status: 'InHouse' }])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(unitReadiness).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })
})
