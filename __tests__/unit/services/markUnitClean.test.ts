import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Passing the cleaner's word on to Apaleo.
 *
 * The cleaners close the task in Guestway and nowhere else, so Apaleo's
 * `condition` is not a second opinion — it is the same fact arriving late, by an
 * hour and a half on 2026-09-10. Half the system reads that field: the sweep,
 * the block that decides whether an early-vacated room may be sold, and
 * HotelCheck's cleaning list. This is what stops all three being wrong.
 *
 * The danger is the opposite direction. Writing cleanliness INTO the hotel's
 * record is a claim about work somebody did, so it may only ever say Clean, only
 * for a room nobody is in, and it must never be able to break the thing it is
 * helping.
 */

const fetchMock = vi.fn()
vi.mock('@/services/Request', () => ({ Fetch: (...a: unknown[]) => fetchMock(...a) }))
vi.mock('@/lib/logger', () => ({
  apaleoLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const notifySlack = vi.fn(() => Promise.resolve())
vi.mock('@/lib/slack', () => ({
  notifySlack: (...a: unknown[]) => notifySlack(...(a as [])),
}))

const { markUnitClean } = await import('@/services/apaleo/markUnitClean')

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockResolvedValue({})
})

describe('telling Apaleo a room is clean', () => {
  it('sends the condition Apaleo actually understands', async () => {
    // The enum is Clean | CleanToBeInspected | Dirty. `CleanToInspect` — which
    // this codebase carried for months — is not a value Apaleo knows, so code
    // comparing against it was matching nothing at all.
    await markUnitClean('MOT-PCL')

    expect(fetchMock).toHaveBeenCalledWith('/operations/v1/units-condition', {
      method: 'PUT',
      body: { unitsConditions: [{ id: 'MOT-PCL', condition: 'Clean' }] },
    })
  })

  it('only ever says Clean', async () => {
    // Taking cleanliness away is somebody else's decision and a much worse
    // thing to get wrong: a room wrongly marked dirty is merely unsellable, a
    // room wrongly marked clean gets a guest.
    await markUnitClean('MOT-PCL')

    const body = JSON.stringify(fetchMock.mock.calls[0][1])
    expect(body).toContain('Clean')
    expect(body).not.toContain('Dirty')
  })

  it('never calls Apaleo without a unit', async () => {
    expect(await markUnitClean('')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('swallows a failure instead of breaking the door', async () => {
    // Best-effort by contract. If this fails the only loss is that Apaleo stays
    // an hour behind for one room — exactly the old behaviour — and the guest
    // must still get in.
    fetchMock.mockRejectedValue(new Error('503'))

    await expect(markUnitClean('MOT-PCL')).resolves.toBe(false)
  })

  it('says so in Slack, because falling back is otherwise invisible', async () => {
    fetchMock.mockRejectedValue(new Error('403 forbidden'))
    await markUnitClean('MOT-PCL')

    expect(notifySlack).toHaveBeenCalledWith(
      'warn',
      'Room-ready: Apaleo did not accept the clean signal',
      expect.objectContaining({ room: 'MOT-PCL' }),
    )
  })

  it('keeps the room out of the message text', async () => {
    // The likely failure is systemic and would hit every room of the day. Slack
    // throttles per message text, so a constant one collapses the storm into a
    // line every ten minutes; a room-specific one would post per room instead.
    fetchMock.mockRejectedValue(new Error('403'))
    await markUnitClean('MOT-PCL')
    await markUnitClean('MOT-IJK')

    const texts = notifySlack.mock.calls.map((c) => String((c as unknown[])[1]))
    expect(new Set(texts).size).toBe(1)
  })

  it('still does not throw when Slack itself is unhappy', async () => {
    // The contract is "never throws", and openRoomEarly calls this unguarded —
    // so a Slack outage must not take the door with it. Leaning on notifySlack's
    // own promise instead of guarding here is how that would have happened.
    fetchMock.mockRejectedValue(new Error('403'))
    notifySlack.mockRejectedValueOnce(new Error('slack down'))

    await expect(markUnitClean('MOT-PCL')).resolves.toBe(false)
  })
})

describe('where the write is allowed to happen', () => {
  it('runs only on the path where Guestway actually spoke', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')

    // Guarded, never an unconditional step: the sweep has no assertion from
    // anybody and must not be inventing cleanliness. `apaleoBehind` is only set
    // on the dirty reading, and dirty only survives when the signal is trusted.
    expect(src).toContain('if (apaleoBehind) await markUnitClean(ctx.unitId)')
    expect(src).toContain("if (readiness === 'dirty' && !opts.trustGuestwayClean)")
  })

  it('happens after the last look, never before it', async () => {
    // The webhook names a reservation, not a room, and Guestway's automation
    // holds for hours — so the guest can have been moved to a different unit in
    // between. Writing before the last look would stamp Clean on a room nobody
    // cleaned, and that stamp now lets the room be sold and drops it off the
    // cleaning list. Order is the whole guarantee here.
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')

    const lastLookAt = src.indexOf('LAST LOOK')
    const writeAt = src.indexOf('if (apaleoBehind) await markUnitClean')
    expect(lastLookAt).toBeGreaterThan(0)
    expect(writeAt).toBeGreaterThan(lastLookAt)
  })

  it('cannot reach an occupied room', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(process.cwd(), 'services/apaleo/amendStayTime.ts'), 'utf8')

    // The occupied branch returns before the write is reachable. Marking a room
    // clean while the previous guest is still checked in would be a plain lie,
    // and one the hotel would act on.
    const occupiedAt = src.indexOf("reason: 'unit-occupied'")
    const writeAt = src.indexOf('if (apaleoBehind) await markUnitClean')
    expect(occupiedAt).toBeGreaterThan(0)
    expect(writeAt).toBeGreaterThan(occupiedAt)
  })
})
