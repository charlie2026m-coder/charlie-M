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

const notifySlack = vi.fn(() => Promise.resolve())
vi.mock('@/lib/slack', () => ({
  notifySlack: (...a: unknown[]) => notifySlack(...(a as [])),
}))

process.env.APALEO_PROPERTY_ID = 'MOT'
process.env.GUESTWAY_ROOM_READY_ENABLED = 'true'
delete process.env.CRON_SECRET

const { GET } = await import('@/app/api/cron/room-ready-sweep/route')

const call = () => GET(new Request('https://motz19.de/api/cron/room-ready-sweep'))

/** Today's arrival list as Apaleo would answer it, plus optionally today's
 *  departures — the sweep asks for those separately to spot a guest simply
 *  carrying on in the same room. */
function arrivals(
  rows: {
    id: string
    arrival: string
    status?: string
    unit?: { id?: string; name?: string }
    primaryGuest?: { email?: string; lastName?: string }
  }[],
  departures: unknown[] = [],
) {
  fetchMock.mockImplementation((endpoint: string) =>
    Promise.resolve({
      reservations: String(endpoint).includes('dateFilter=Departure') ? departures : rows,
    }),
  )
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

    expect(runRoomReady.mock.calls.map((c) => c[0])).toEqual(['AAA-1', 'CCC-1'])
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
    // Each call burns 20 simulated seconds; the 45s budget allows three starts.
    runRoomReady.mockImplementation(async () => {
      vi.setSystemTime(new Date(Date.now() + 20_000))
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

  it('opens no doors while switched off — but still watches the rooms', async () => {
    // The switch is for the doors. A guest twenty minutes from a dirty room is
    // owed a word at every hotel, including the ones where early doors are off.
    process.env.GUESTWAY_ROOM_READY_ENABLED = 'false'
    vi.setSystemTime(new Date('2026-09-08T14:40:00+02:00'))
    arrivals([
      { id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed', unit: { id: 'MOT-DUO', name: '310' } },
    ])
    unitReadiness.mockResolvedValue('dirty')
    const res = await call()
    process.env.GUESTWAY_ROOM_READY_ENABLED = 'true'

    expect(runRoomReady).not.toHaveBeenCalled()
    expect(await res.json()).toMatchObject({ doors: 'off', tried: 0 })
    expect(log.error).toHaveBeenCalledWith(
      'Room 310: not ready, guest arrives in 20 min',
      expect.objectContaining({ room: '310' }),
    )
  })

  it('keeps the door-only audits quiet while switched off', async () => {
    // "Nobody got in early — feature may be dead" is not a finding at a hotel
    // where the feature is deliberately off; it would cry wolf every day.
    process.env.GUESTWAY_ROOM_READY_ENABLED = 'false'
    vi.setSystemTime(new Date('2026-09-08T14:10:00+02:00'))
    arrivals([{ id: 'AAA-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' }])
    await call()
    process.env.GUESTWAY_ROOM_READY_ENABLED = 'true'

    expect(log.error).not.toHaveBeenCalled()
    expect(notifySlack).not.toHaveBeenCalledWith('info', 'Room-ready: today in full', expect.anything())
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

describe('the once-a-day report', () => {
  // Every other alert catches one specific breakage. None of them answers "did
  // it work today, for everyone?" — a guest who quietly never got an early door
  // is not a breakage anywhere, so four of five opening reads exactly like five
  // of five from the inside. This is what makes the fifth visible.
  const opened = {
    id: 'OPEN-1',
    arrival: '2026-09-08T11:38:00+02:00',
    status: 'Confirmed',
    unit: { id: 'MOT-VCQ', name: '308' },
  }
  const waiting = {
    id: 'WAIT-1',
    arrival: '2026-09-08T15:00:00+02:00',
    status: 'Confirmed',
    unit: { id: 'MOT-IJK', name: '13' },
  }

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-08T14:10:00+02:00'))
  })

  it('names each guest and says why in words, not reason codes', async () => {
    arrivals([opened, waiting])
    runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'unit-dirty' })
    await call()

    expect(notifySlack).toHaveBeenCalledWith(
      'info',
      'Room-ready: today in full',
      expect.objectContaining({
        arrivals: 2,
        'opened early': 1,
        'arriving at the normal hour': 1,
        'room 13': expect.stringContaining('not cleaned yet'),
        'room 308': expect.stringContaining('opened 11:38'),
      }),
    )
  })

  it('never raises the level just because somebody has no early door', async () => {
    // The regression this was rewritten for. A guest arriving at the booked
    // hour has lost a bonus, not a room, and levelling on it made an ordinary
    // 14:10 read as two broken rooms. The alarm for a room that will genuinely
    // not be ready is separate and fires close to the arrival.
    arrivals([opened, waiting])
    runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'unit-dirty' })
    await call()

    const levels = notifySlack.mock.calls.map((c) => String((c as unknown[])[0]))
    expect(levels).not.toContain('warn')
    expect(levels).toContain('info')
  })

  it('does not report outside the audit window', async () => {
    // Once a day, not thirty-six times.
    vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
    arrivals([opened, waiting])
    await call()

    expect(notifySlack).not.toHaveBeenCalled()
  })

  it('says nothing on a day with no arrivals', async () => {
    arrivals([])
    await call()

    expect(notifySlack).not.toHaveBeenCalled()
  })
})

describe('the guest is nearly here and the room is not ready', () => {
  // The only room-ready outcome a person has to act on. Everything else is
  // either a bonus that did not happen or a state that clears itself.
  const soon = {
    id: 'SOON-1',
    arrival: '2026-09-08T15:00:00+02:00',
    status: 'Confirmed',
    unit: { id: 'MOT-DUO', name: '310' },
  }

  it('says it plainly: room, minutes, reason', async () => {
    vi.setSystemTime(new Date('2026-09-08T14:40:00+02:00'))
    arrivals([soon])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'Room 310: not ready, guest arrives in 20 min',
      expect.objectContaining({ room: '310', arrival: '15:00', problem: 'not cleaned yet' }),
    )
  })

  it('gets LOUDER once the guest is at the door, not quieter', async () => {
    // The first version stopped at the arrival time and went silent exactly when
    // it mattered most. Measured live on 2026-09-10: room 310 still dirty at
    // 15:17, seventeen minutes past its hour, and nothing had said so since
    // 15:00 — the guest was outside and the channel was calm.
    vi.setSystemTime(new Date('2026-09-08T15:17:00+02:00'))
    arrivals([soon])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'Room 310: not ready, guest was due 17 min ago and cannot get in',
      expect.objectContaining({ room: '310', problem: 'not cleaned yet' }),
    )
  })

  it('stops on its own once the guest has checked in', async () => {
    // Apaleo leaves Confirmed at check-in, so the guest being inside ends it
    // without anyone having to remember to switch it off.
    vi.setSystemTime(new Date('2026-09-08T15:17:00+02:00'))
    arrivals([{ ...soon, status: 'InHouse' }])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('stays quiet while there is still time to clean', async () => {
    // At 13:00 a dirty room with a 15:00 arrival is housekeeping's ordinary
    // day, not an incident. Calling it one is what caused the false alarm.
    vi.setSystemTime(new Date('2026-09-08T13:00:00+02:00'))
    arrivals([soon])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('stays quiet when the room is ready in time', async () => {
    vi.setSystemTime(new Date('2026-09-08T14:40:00+02:00'))
    arrivals([soon])
    unitReadiness.mockResolvedValue('ready')
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('puts the room in the message text so one room cannot mute another', async () => {
    vi.setSystemTime(new Date('2026-09-08T14:40:00+02:00'))
    arrivals([soon, { ...soon, id: 'SOON-2', unit: { id: 'MOT-IJK', name: '13' } }])
    unitReadiness.mockResolvedValue('occupied')
    await call()

    const texts = log.error.mock.calls.map((c) => String((c as unknown[])[0])).filter((t) => t.startsWith('Room '))
    expect(new Set(texts).size).toBe(2)
    expect(texts.some((t) => t.includes('310'))).toBe(true)
    expect(texts.some((t) => t.includes('13'))).toBe(true)
  })
})

describe('a guest simply carrying on in the same room', () => {
  // A stay can be split across two reservations — four nights booked in advance
  // plus the night before added later. Apaleo treats the seam as a checkout and
  // a check-in, and marks the room Dirty because every checkout is marked Dirty.
  // Nobody left, nobody is locked out, no turnover clean is owed.
  //
  // Measured on prod 2026-09-10, room 310: AVVEXQIM-1 09→10 Sept and
  // NSMDXCVX-1 10→14 Sept, one room, one address. The alert called that
  // "guest was due 21 min ago and cannot get in" while he was upstairs.
  const carrying = {
    id: 'NEXT-1',
    arrival: '2026-09-08T15:00:00+02:00',
    status: 'Confirmed',
    unit: { id: 'MOT-BFF', name: '310' },
    primaryGuest: { email: 'Michael@Example.at', lastName: 'Sommer' },
  }
  const samePersonLeaving = {
    id: 'PREV-1',
    arrival: '2026-09-07T15:00:00+02:00',
    unit: { id: 'MOT-BFF', name: '310' },
    primaryGuest: { email: 'michael@example.at', lastName: 'Sommer' },
  }

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-08T15:21:00+02:00'))
    unitReadiness.mockResolvedValue('dirty')
  })

  it('says nothing when the same address is leaving that room today', async () => {
    arrivals([carrying], [samePersonLeaving])
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('matches the address regardless of how it was typed', async () => {
    // Real data differed in case and carried a double space in the name.
    arrivals([carrying], [{ ...samePersonLeaving, primaryGuest: { email: '  MICHAEL@example.AT ' } }])
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('still shouts for a real turnover to a different guest', async () => {
    // The dangerous direction: silencing a genuinely unready room. A different
    // guest leaving that room today is exactly when the alert must survive.
    arrivals([carrying], [{ ...samePersonLeaving, id: 'OTHER-1', primaryGuest: { email: 'someone@else.com', lastName: 'Other' } }])
    await call()

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('Room 310'),
      expect.anything(),
    )
  })

  it('falls back to the surname when no address is on file', async () => {
    arrivals(
      [{ ...carrying, primaryGuest: { lastName: 'Sommer' } }],
      [{ ...samePersonLeaving, primaryGuest: { lastName: 'sommer' } }],
    )
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('shouts anyway when it cannot tell', async () => {
    // Unknown is not proof of a continuation. A needless page beats a guest
    // locked out in silence.
    arrivals([carrying], [])
    await call()

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('Room 310'),
      expect.anything(),
    )
  })

  it('does not mistake the same name leaving a DIFFERENT room for a continuation', async () => {
    // The departures are read for the whole house now, so the room has to be
    // matched here — a Sommer leaving 12 says nothing about 310.
    arrivals([carrying], [{ ...samePersonLeaving, unit: { id: 'MOT-IIM', name: '12' } }])
    await call()

    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Room 310'), expect.anything())
  })
})

describe('a paid early check-in into a room that is not ready', () => {
  // Two kinds of arrival sit before 15:00 and they could not be more different.
  // One WE moved, on Guestway's word that the room was finished — Apaleo's flag
  // lags an hour or two behind that, so a dirty reading is noise and gets the
  // three-hour grace. The other the guest PAID for: nobody said the room was
  // clean, the hour was simply sold. Room 12, 2026-09-11 — a late checkout at
  // 13:00 and an early check-in at 13:00 on the same room, and under the grace
  // nothing would have said so until 16:10.
  const paid = {
    id: 'PAID-1',
    arrival: '2026-09-08T13:00:00+02:00',
    status: 'Confirmed',
    unit: { id: 'MOT-IIM', name: '12' },
    primaryGuest: { email: 'lahti@example.com', lastName: 'Lahti' },
  }
  const leavingLate = {
    id: 'LEAVING-1',
    arrival: '2026-09-02T14:09:00+02:00',
    departure: '2026-09-08T13:00:00+02:00',
    status: 'InHouse',
    unit: { id: 'MOT-IIM', name: '12' },
    primaryGuest: { email: 'popovich@example.com', lastName: 'popovich' },
  }

  /** Apaleo as the sweep sees it: arrivals, departures, and whose folio carries
   *  our own "Early Check-In" line. */
  function world(rows: unknown[], departures: unknown[], paidIds: string[]) {
    fetchMock.mockImplementation((endpoint: string) => {
      const url = String(endpoint)
      if (url.includes('/finance/v1/folios')) {
        const id = decodeURIComponent(url.match(/reservationIds=([^&]+)/)?.[1] ?? '')
        return Promise.resolve({
          folios: paidIds.includes(id) ? [{ charges: [{ name: 'Early Check-In' }] }] : [{ charges: [] }],
        })
      }
      return Promise.resolve({ reservations: url.includes('dateFilter=Departure') ? departures : rows })
    })
  }

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-08T12:40:00+02:00'))
    unitReadiness.mockResolvedValue('occupied')
  })

  it('pages at the urgent distance, not after the three-hour grace', async () => {
    world([paid], [], ['PAID-1'])
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'Room 12: not ready, guest arrives in 20 min',
      expect.objectContaining({ room: '12', arrival: '13:00', problem: 'previous guest still checked in' }),
    )
  })

  it('names the collision when a late checkout is on the same room', async () => {
    world([paid], [leavingLate], ['PAID-1'])
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'Room 12: not ready, guest arrives in 20 min — sold twice over: late checkout 13:00 + early check-in 13:00, 0 min to clean',
      expect.objectContaining({ 'late checkout': 'LEAVING-1 until 13:00' }),
    )
  })

  it('leaves a door WE opened to the grace — a dirty reading there is Apaleo lagging', async () => {
    // Same shape, no fee on the folio: room-ready moved this one.
    world([paid], [leavingLate], [])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('treats an unreadable folio as not paid, so a hiccup cannot page for every moved guest', async () => {
    fetchMock.mockImplementation((endpoint: string) =>
      String(endpoint).includes('/finance/v1/folios')
        ? Promise.reject(new Error('503'))
        : Promise.resolve({ reservations: String(endpoint).includes('dateFilter=Departure') ? [] : [paid] }),
    )
    unitReadiness.mockResolvedValue('dirty')
    await call()

    expect(log.error).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledWith(
      'room-ready sweep: could not read the folio',
      expect.objectContaining({ reservationId: 'PAID-1' }),
    )
  })

  it('is one voice, not two, once the hour has long passed', async () => {
    // 16:10: three hours past 13:00, when the open-door watch would also start
    // talking about this room. It leaves paid hours to the urgent alert.
    vi.setSystemTime(new Date('2026-09-08T16:10:00+02:00'))
    world([paid], [leavingLate], ['PAID-1'])
    unitReadiness.mockResolvedValue('dirty')
    await call()

    const texts = log.error.mock.calls.map((c) => String((c as unknown[])[0]))
    expect(texts.filter((t) => t.startsWith('Room 12')).length).toBe(1)
    expect(texts.some((t) => t.startsWith('room-ready: door already open'))).toBe(false)
    expect(texts[0]).toContain('guest was due 190 min ago')
  })

  it('stays quiet for the same guest bridging their own two reservations', async () => {
    world([paid], [{ ...leavingLate, primaryGuest: paid.primaryGuest }], ['PAID-1'])
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('stops the moment the guest is in', async () => {
    vi.setSystemTime(new Date('2026-09-08T13:20:00+02:00'))
    world([{ ...paid, status: 'InHouse' }], [leavingLate], ['PAID-1'])
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('reads the folio only for a room that is not ready — never for the whole list', async () => {
    world([paid], [leavingLate], ['PAID-1'])
    unitReadiness.mockResolvedValue('ready')
    await call()

    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('/finance/v1/folios')).length).toBe(0)
  })
})

describe('reading the day whole', () => {
  it('asks for the whole day, not the first hundred', async () => {
    // Apaleo has no page ceiling (1000 is accepted) but pageSize=100 against a
    // count of 150 returns 100 rows and a 200. A full turnover day at 125
    // studios must still come back whole.
    arrivals([])
    await call()

    expect(String(fetchMock.mock.calls[0][0])).toContain('pageSize=500')
  })

  it('shouts when Apaleo hands back fewer rows than it says it has', async () => {
    // Every check in this job runs over that list. A row quietly dropped off the
    // end is a guest nobody watches, and the list itself looks healthy.
    fetchMock.mockImplementation((endpoint: string) =>
      Promise.resolve({
        count: 150,
        reservations: String(endpoint).includes('dateFilter=Departure')
          ? []
          : [{ id: 'R1-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed' }],
      }),
    )
    await call()

    expect(log.error).toHaveBeenCalledWith("room-ready sweep: today's arrival list is truncated", {
      count: 150,
      returned: 1,
    })
  })

  it('starts somewhere else on each pass, so no guest is starved all day', async () => {
    // Apaleo returns the day in a stable order. A fixed slice(0, 40) was not a
    // cap — it was a list of guests who never got an early door.
    const fifty = Array.from({ length: 50 }, (_, i) => ({
      id: `R${String(i).padStart(2, '0')}-1`,
      arrival: '2026-09-08T15:00:00+02:00',
      status: 'Confirmed',
    }))
    arrivals(fifty)
    vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
    await call()

    expect(runRoomReady).toHaveBeenCalledTimes(40)
    expect(runRoomReady.mock.calls[0][0]).toBe('R40-1')
  })

  it('runs late enough in winter for a 15:00 guest to still be heard', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const cfg = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons: { path: string; schedule: string }[]
    }
    const sweep = cfg.crons.find((c) => c.path === '/api/cron/room-ready-sweep')

    // UTC hours. 5-15 is 07:10–17:55 Berlin in summer and 06:10–16:55 in winter;
    // the old 6-14 fell silent at 15:55 Berlin in winter — 55 minutes after the
    // house check-in hour, with the urgent alert still owing its loudest part.
    expect(sweep?.schedule).toBe('10,25,40,55 5-15 * * *')
  })
})

describe('the morning report: rooms sold twice over today', () => {
  // The guard at the point of sale only sees a collision once the room is
  // known, and Apaleo assigns rooms on the day of arrival — 55 of 63 upcoming
  // arrivals had none on 2026-09-11. So an early check-in bought in advance is
  // never checked against the late checkout it will collide with. The first
  // pass after assignment is the first chance to say so, and the morning is
  // when the arriving guest can still be moved to a clean room.
  const paid = {
    id: 'PAID-1',
    arrival: '2026-09-08T13:00:00+02:00',
    status: 'Confirmed',
    unit: { id: 'MOT-IIM', name: '12' },
    primaryGuest: { email: 'lahti@example.com', lastName: 'Lahti' },
  }
  const leavingLate = {
    id: 'LEAVING-1',
    arrival: '2026-09-02T14:09:00+02:00',
    departure: '2026-09-08T13:00:00+02:00',
    status: 'InHouse',
    unit: { id: 'MOT-IIM', name: '12' },
    primaryGuest: { email: 'popovich@example.com', lastName: 'popovich' },
  }
  function world(rows: unknown[], departures: unknown[], paidIds: string[]) {
    fetchMock.mockImplementation((endpoint: string) => {
      const url = String(endpoint)
      if (url.includes('/finance/v1/folios')) {
        const id = decodeURIComponent(url.match(/reservationIds=([^&]+)/)?.[1] ?? '')
        return Promise.resolve({
          folios: paidIds.includes(id) ? [{ charges: [{ name: 'Early Check-In' }] }] : [{ charges: [] }],
        })
      }
      return Promise.resolve({ reservations: url.includes('dateFilter=Departure') ? departures : rows })
    })
  }
  const reported = () =>
    notifySlack.mock.calls.filter((c) => (c as unknown[])[1] === 'Room-ready: zero cleaning time sold today')

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-09-08T08:10:00+02:00'))
    unitReadiness.mockResolvedValue('occupied')
  })

  it('names the pair and the minutes between them, once, at 08:10', async () => {
    world([paid], [leavingLate], ['PAID-1'])
    await call()

    expect(notifySlack).toHaveBeenCalledWith(
      'warn',
      'Room-ready: zero cleaning time sold today',
      expect.objectContaining({ 'room 12': 'LEAVING-1 out 13:00 → PAID-1 in 13:00 · 0 min to clean' }),
    )
    // Hours before the guest is due, so the urgent alert has nothing to say yet.
    expect(log.error).not.toHaveBeenCalled()
  })

  it('says nothing when nothing collides', async () => {
    world([paid], [], ['PAID-1'])
    await call()

    expect(reported()).toHaveLength(0)
  })

  it('ignores a door we opened ourselves — no fee, no collision', async () => {
    world([paid], [leavingLate], [])
    await call()

    expect(reported()).toHaveLength(0)
  })

  it('ignores the same guest carrying on in their own room', async () => {
    world([paid], [{ ...leavingLate, primaryGuest: paid.primaryGuest }], ['PAID-1'])
    await call()

    expect(reported()).toHaveLength(0)
  })

  it('is said once — not on the other forty-three passes', async () => {
    vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
    world([paid], [leavingLate], ['PAID-1'])
    await call()

    expect(reported()).toHaveLength(0)
  })
})

describe('the sweep and the reasons no retry can clear', () => {
  // Said once an hour — the :10 pass — with the room and in words. Every pass
  // would be a storm; never would hide a door that will not open all day.
  const guest = { id: 'HARD-1', arrival: '2026-09-08T15:00:00+02:00', status: 'Confirmed', unit: { id: 'MOT-DUO', name: '310' } }

  it('says so on the hour pass', async () => {
    vi.setSystemTime(new Date('2026-09-08T10:10:00+02:00'))
    arrivals([guest])
    runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'no-offer' })
    await call()

    expect(log.error).toHaveBeenCalledWith(
      'Room 310: door not opened — Apaleo offered nothing for the earlier time',
      expect.objectContaining({ reservationId: 'HARD-1', 'what to do': expect.stringContaining('Extend access') }),
    )
  })

  it('holds its tongue on the other three passes of the hour', async () => {
    vi.setSystemTime(new Date('2026-09-08T10:25:00+02:00'))
    arrivals([guest])
    runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'no-offer' })
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })

  it('never says it for a room that is merely not clean yet', async () => {
    vi.setSystemTime(new Date('2026-09-08T10:10:00+02:00'))
    arrivals([guest])
    runRoomReady.mockResolvedValue({ status: 'skipped', reason: 'unit-dirty' })
    await call()

    expect(log.error).not.toHaveBeenCalled()
  })
})
